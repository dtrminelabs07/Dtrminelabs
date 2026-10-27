import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { trackerSchema } from "@/lib/validators";
import { ActivityAction } from "@/generated/prisma/enums";
function validMonth(value: string | null) { return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value); }
export async function GET(request: NextRequest) {
  const { response, user } = await requireUser(); if (response) return response;
  const month = request.nextUrl.searchParams.get("month");
  if (!validMonth(month)) return NextResponse.json({ error: "Bulan tidak valid." }, { status: 400 });
  const [year, m] = month!.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1)); const end = new Date(Date.UTC(year, m, 1));
  const [accounts, uploads] = await Promise.all([
    db.account.findMany({ where: { ...accountOwnerScope(user!), isActive: true }, orderBy: [{ core: "asc" }, { name: "asc" }] }),
    db.dailyUpload.findMany({ where: { date: { gte: start, lt: end }, account: accountOwnerScope(user!) }, select: { id: true, accountId: true, date: true, status: true, notes: true, updatedAt: true } })
  ]);
  return NextResponse.json({ accounts, uploads });
}
export async function PUT(request: NextRequest) {
  const { user, response } = await requireUser(); if (response) return response;
  const parsed = trackerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa tanggal, akun, dan status." }, { status: 400 });
  const { accountId, date: day, status, notes } = parsed.data;
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  const account = await db.account.findFirst({ where: { id: accountId, ...accountOwnerScope(user!) }, select: { id: true, isActive: true, name: true } });
  if (!account || !account.isActive) return NextResponse.json({ error: "Akun aktif tidak ditemukan." }, { status: 404 });
  const existing = await db.dailyUpload.findUnique({ where: { accountId_date: { accountId, date } } });
  const result = await db.$transaction(async (tx) => {
    const upload = await tx.dailyUpload.upsert({ where: { accountId_date: { accountId, date } }, create: { accountId, date, status, notes, createdById: user!.id, updatedById: user!.id }, update: { status, notes, updatedById: user!.id } });
    await tx.activityLog.create({ data: { accountId, dailyUploadId: upload.id, actorId: user!.id, action: existing ? ActivityAction.UPDATED : ActivityAction.CREATED, previousStatus: existing?.status, newStatus: status, description: `${existing ? "Memperbarui" : "Mencatat"} status ${account.name} untuk ${day}` } });
    return upload;
  });
  return NextResponse.json(result);
}
