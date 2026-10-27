import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { statusSchema } from "@/lib/validators";

function isDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export async function GET(request: NextRequest) {
  const { response, user } = await requireUser();
  if (response) return response;
  const params = request.nextUrl.searchParams;
  const requestedPage = Number(params.get("page") ?? 1);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) return NextResponse.json({ error: "Nomor halaman tidak valid." }, { status: 400 });
  const from = params.get("from"); const to = params.get("to");
  if ((from && !isDateKey(from)) || (to && !isDateKey(to)) || (from && to && from > to)) return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  const rawStatus = params.get("status"); const parsedStatus = statusSchema.safeParse(rawStatus);
  if (rawStatus && !parsedStatus.success) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  const size = 40;
  const accountId = params.get("accountId") || undefined; const actorId = params.get("actorId") || undefined; const q = params.get("q")?.trim();
  const accountScope = accountOwnerScope(user!);
  const where = {
    account: accountScope,
    ...(accountId ? { accountId } : {}), ...(actorId ? { actorId } : {}), ...(parsedStatus.success ? { newStatus: parsedStatus.data } : {}),
    ...(q ? { OR: [{ account: { name: { contains: q, mode: "insensitive" as const } } }, { actor: { name: { contains: q, mode: "insensitive" as const } } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000) } : {}) } } : {})
  };
  const [items, total, accounts, users] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (requestedPage - 1) * size, take: size, include: { account: { select: { name: true } }, actor: { select: { name: true } }, dailyUpload: { select: { date: true } } } }),
    db.activityLog.count({ where }),
    db.account.findMany({ where: accountScope, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: user!.role === "DEMO" ? { id: user!.id } : { role: { not: "DEMO" } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return NextResponse.json({ items, total, page: requestedPage, pages: Math.max(1, Math.ceil(total / size)), accounts, users });
}
