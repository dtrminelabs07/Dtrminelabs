import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin, requireUser } from "@/lib/auth";
import { accountUpdateSchema } from "@/lib/validators";
import { encryptAccountPassword } from "@/lib/account-credentials";
import { ActivityAction } from "@/generated/prisma/enums";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Ctx) {
  const { response, user } = await requireAdmin(); if (response) return response;
  const { id } = await context.params;
  const parsed = accountUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa kembali data akun." }, { status: 400 });
  const { password, ...fields } = parsed.data;
  let passwordEncrypted: string | undefined;
  if (password) {
    try { passwordEncrypted = encryptAccountPassword(password); }
    catch { return NextResponse.json({ error: "Kredensial akun belum dapat disimpan. Periksa konfigurasi server." }, { status: 503 }); }
  }
  const result = await db.$transaction(async tx => {
    const updated = await tx.account.updateMany({ where: { id, ownerId: null }, data: { ...fields, ...(passwordEncrypted ? { passwordEncrypted } : {}) } });
    if (updated.count) await tx.activityLog.create({ data: { accountId: id, actorId: user!.id, action: ActivityAction.UPDATED, description: "Memperbarui detail akun" } });
    return updated;
  });
  if (!result.count) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(await db.account.findUnique({ where: { id }, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, internalNotes: true, createdAt: true, updatedAt: true } }), { headers: { "Cache-Control": "private, no-store" } });
}
export async function GET(_request: NextRequest, context: Ctx) {
  const { response, user } = await requireUser(); if (response) return response;
  const { id } = await context.params;
  const account = await db.account.findFirst({ where: { id, ...accountOwnerScope(user!) }, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, ...(user!.role === "ADMIN" ? { internalNotes: true } : {}), createdAt: true, updatedAt: true, uploads: { orderBy: { date: "desc" }, take: 90, select: { id: true, date: true, status: true, notes: true, updatedAt: true } }, activities: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, description: true, createdAt: true, actor: { select: { name: true } } } } } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(account, { headers: { "Cache-Control": "private, no-store" } });
}
