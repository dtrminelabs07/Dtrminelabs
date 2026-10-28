import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin, requireUser } from "@/lib/auth";
import { productionProductCreateSchema } from "@/lib/validators";

export async function GET() {
  const { response, user } = await requireUser();
  if (response) return response;
  const accounts = await db.account.findMany({
    where: { ...accountOwnerScope(user!), isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, core: true, subCore: true, isActive: true, productionProducts: { where: { isArchived: false }, select: { targetCount: true, completedCount: true } } }
  });
  const accountRows = accounts.map(account => {
    const planned = account.productionProducts.reduce((total, product) => total + product.targetCount, 0);
    const completed = account.productionProducts.reduce((total, product) => total + product.completedCount, 0);
    const doneProducts = account.productionProducts.filter(product => product.completedCount === product.targetCount).length;
    const inProgress = account.productionProducts.filter(product => product.completedCount > 0 && product.completedCount < product.targetCount).length;
    const notStarted = account.productionProducts.filter(product => product.completedCount === 0).length;
    return { id: account.id, name: account.name, username: account.username, core: account.core, subCore: account.subCore, isActive: account.isActive, planned, completed, doneProducts, inProgress, notStarted, progress: planned ? Math.round(completed / planned * 100) : 0, productCount: account.productionProducts.length };
  });
  const totals = accountRows.reduce((result, account) => ({ accounts: result.accounts + 1, planned: result.planned + account.planned, completed: result.completed + account.completed, doneProducts: result.doneProducts + account.doneProducts, inProgress: result.inProgress + account.inProgress, notStarted: result.notStarted + account.notStarted }), { accounts: 0, planned: 0, completed: 0, doneProducts: 0, inProgress: 0, notStarted: 0 });
  return NextResponse.json({ accounts: accountRows, totals: { ...totals, progress: totals.planned ? Math.round(totals.completed / totals.planned * 100) : 0 } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const parsed = productionProductCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nama produk dan target positif wajib diisi." }, { status: 400 });
  const account = await db.account.findFirst({ where: { id: parsed.data.accountId, ...accountOwnerScope(user!), isActive: true }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun aktif tidak ditemukan." }, { status: 404 });
  const { requestKey, ...fields } = parsed.data;
  const completedCount = fields.completedCount ?? 0;
  if (completedCount > fields.targetCount) return NextResponse.json({ error: "Progres awal tidak boleh melebihi target." }, { status: 400 });
  const { initialNote, ...productFields } = fields;
  const { product, isNew } = await db.$transaction(async tx => {
    const existingProduct = await tx.productionProduct.findUnique({ where: { accountId_creationKey: { accountId: productFields.accountId, creationKey: requestKey } } });
    if (existingProduct) return { product: existingProduct, isNew: false };
    const created = await tx.productionProduct.create({ data: { ...productFields, completedCount, creationKey: requestKey, createdById: user!.id } });
    if (completedCount > 0 || initialNote?.trim()) {
      await tx.productionProgressChange.create({ data: { productId: created.id, actorId: user!.id, previousCompletedCount: 0, newCompletedCount: created.completedCount, note: initialNote?.trim() || null } });
    }
    return { product: created, isNew: true };
  });
  return NextResponse.json(product, { status: isNew ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
}
