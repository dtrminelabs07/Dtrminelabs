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
export async function DELETE(_request: NextRequest, context: Ctx) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { id } = await context.params;

  try {
    const deleted = await db.$transaction(async tx => {
      // 1. Verify account exists
      const account = await tx.account.findFirst({
        where: { id, ownerId: null },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              uploads: true,
              privateNotes: true,
              productionComments: true,
              productionProducts: true
            }
          }
        }
      });
      if (!account) return { kind: "missing" as const };

      // 2. Delete all production product dependencies for this account
      const products = await tx.productionProduct.findMany({
        where: { accountId: id },
        select: { id: true }
      });
      const productIds = products.map(p => p.id);

      if (productIds.length > 0) {
        await tx.productionComment.deleteMany({ where: { productId: { in: productIds } } });
        await tx.productionProgressChange.deleteMany({ where: { productId: { in: productIds } } });
        await tx.productionProduct.deleteMany({ where: { accountId: id } });
      }

      // 3. Delete production account comments
      await tx.productionAccountComment.deleteMany({ where: { accountId: id } });

      // 4. Delete private notes
      await tx.accountNote.deleteMany({ where: { accountId: id } });

      // 5. Preserve audit history in ActivityLog before removing foreign keys
      await tx.activityLog.updateMany({
        where: { accountId: id },
        data: { accountName: account.name, dailyUploadId: null }
      });

      // 6. Delete daily uploads (ActivityLog.dailyUploadId is set to null, preserving activity history)
      await tx.dailyUpload.deleteMany({ where: { accountId: id } });

      // 7. Delete the account record
      await tx.account.delete({ where: { id } });

      // 8. Log deletion action in ActivityLog for compliance & audit history
      await tx.activityLog.create({
        data: {
          accountName: account.name,
          actorId: user!.id,
          action: ActivityAction.UPDATED,
          description: `Menghapus akun “${account.name}” secara permanen`
        }
      });

      return { kind: "deleted" as const, name: account.name, count: account._count };
    });

    if (deleted.kind === "missing") {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: `Akun “${deleted.name}” berhasil dihapus secara permanen.`
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
    console.error("[accounts:delete] Account deletion failed:", error);
    if (code === "P2003") {
      return NextResponse.json({
        error: "Akun masih memiliki relasi data yang mencegah penghapusan. Periksa relasi data terkait atau nonaktifkan akun."
      }, { status: 409 });
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Akun sudah tidak ditemukan. Muat ulang daftar akun." }, { status: 404 });
    }
    if (code === "P1001" || code === "P1002" || (error instanceof Error && error.name === "PrismaClientInitializationError")) {
      return NextResponse.json({ error: "Database sedang tidak dapat dihubungi. Coba lagi beberapa saat." }, { status: 503 });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Akun gagal dihapus. Coba lagi atau nonaktifkan akun agar datanya tetap tersimpan."
    }, { status: 500 });
  }
}
export async function GET(_request: NextRequest, context: Ctx) {
  const { response, user } = await requireUser(); if (response) return response;
  const { id } = await context.params;
  const account = await db.account.findFirst({ where: { id, ...accountOwnerScope(user!) }, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, ...(user!.role === "ADMIN" ? { internalNotes: true } : {}), createdAt: true, updatedAt: true, uploads: { orderBy: { date: "desc" }, take: 90, select: { id: true, date: true, status: true, notes: true, updatedAt: true } }, activities: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, description: true, createdAt: true, actor: { select: { name: true } } } } } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(account, { headers: { "Cache-Control": "private, no-store" } });
}
