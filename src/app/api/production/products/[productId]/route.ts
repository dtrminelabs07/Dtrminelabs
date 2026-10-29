import { NextResponse } from "next/server";
import { ActivityAction } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { productionProductUpdateSchema } from "@/lib/validators";
import { getProductionProgress, getProductionStatus } from "@/lib/production-status";

type Context = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { productId } = await context.params;
  const product = await db.productionProduct.findFirst({
    where: { id: productId, account: { ownerId: user!.role === "DEMO" ? user!.id : null } },
    include: {
      account: { select: { id: true, name: true, username: true, core: true, subCore: true, isActive: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } },
      progressHistory: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } }
    }
  });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ...product, progress: getProductionProgress(product.completedCount, product.targetCount), status: getProductionStatus(product.completedCount, product.targetCount) === "done" ? "COMPLETED" : getProductionStatus(product.completedCount, product.targetCount) === "progress" ? "IN_PROGRESS" : "NOT_STARTED" }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: Context) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { productId } = await context.params;
  const parsed = productionProductUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan produk tidak valid.", issues: parsed.error.flatten() }, { status: 400 });
  const existing = await db.productionProduct.findFirst({ where: { id: productId, account: { ownerId: null } } });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  const isRestore = parsed.data.isArchived === false && existing.isArchived;
  if (existing.isArchived && !isRestore) return NextResponse.json({ error: "Produk diarsipkan. Pulihkan produk sebelum mengubahnya." }, { status: 409 });
  const nextTarget = parsed.data.targetCount ?? existing.targetCount;
  const nextCompleted = parsed.data.completedCount ?? existing.completedCount;
  if (nextCompleted < 0 || nextTarget < 1) return NextResponse.json({ error: "Target harus positif dan progres tidak boleh negatif." }, { status: 400 });
  const { note, ...fields } = parsed.data;
  const updated = await db.$transaction(async tx => {
    const write = await tx.productionProduct.updateMany({ where: { id: productId, targetCount: existing.targetCount, completedCount: existing.completedCount, isArchived: existing.isArchived }, data: fields });
    if (!write.count) return null;
    if (parsed.data.completedCount !== undefined && (nextCompleted !== existing.completedCount || note?.trim() || nextTarget !== existing.targetCount)) {
      await tx.productionProgressChange.create({ data: { productId, actorId: user!.id, previousCompletedCount: existing.completedCount, newCompletedCount: nextCompleted, ...(nextTarget !== existing.targetCount ? { previousTargetCount: existing.targetCount, newTargetCount: nextTarget } : {}), note: note?.trim() || null } });
    }
    if (fields.isArchived !== undefined && fields.isArchived !== existing.isArchived) {
      await tx.activityLog.create({ data: { accountId: existing.accountId, actorId: user!.id, action: ActivityAction.UPDATED, description: `${fields.isArchived ? "Mengarsipkan" : "Memulihkan"} produk ${existing.name}` } });
    }
    return tx.productionProduct.findUniqueOrThrow({ where: { id: productId } });
  });
  if (!updated) return NextResponse.json({ error: "Produk baru saja diubah pengguna lain. Muat ulang dan coba lagi." }, { status: 409 });
  return NextResponse.json({ ...updated, progress: getProductionProgress(updated.completedCount, updated.targetCount), status: getProductionStatus(updated.completedCount, updated.targetCount) === "done" ? "COMPLETED" : getProductionStatus(updated.completedCount, updated.targetCount) === "progress" ? "IN_PROGRESS" : "NOT_STARTED" }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: Request, context: Context) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { productId } = await context.params;
  const existing = await db.productionProduct.findFirst({ where: { id: productId, account: { ownerId: null } } });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  if (existing.isArchived) return NextResponse.json({ error: "Produk sudah diarsipkan." }, { status: 409 });
  const result = await db.$transaction(async tx => {
    const changed = await tx.productionProduct.updateMany({ where: { id: productId, isArchived: false }, data: { isArchived: true } });
    if (!changed.count) return false;
    await tx.activityLog.create({ data: { accountId: existing.accountId, actorId: user!.id, action: ActivityAction.UPDATED, description: `Mengarsipkan produk ${existing.name}` } });
    return true;
  });
  if (!result) return NextResponse.json({ error: "Produk baru saja diubah pengguna lain. Muat ulang dan coba lagi." }, { status: 409 });
  return NextResponse.json({ archived: true }, { headers: { "Cache-Control": "private, no-store" } });
}
