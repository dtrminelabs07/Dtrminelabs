import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";

type Context = { params: Promise<{ accountId: string }> };

export async function GET(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { accountId } = await context.params;
  const account = await db.account.findFirst({
    where: { id: accountId, ...accountOwnerScope(user!) },
    select: {
      id: true, name: true, username: true, platform: true, core: true, subCore: true, isActive: true,
      productionProducts: { orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }], include: { _count: { select: { comments: true } } } }
    }
  });
  if (!account) return NextResponse.json({ error: "Akun produksi tidak ditemukan." }, { status: 404 });
  const activeProducts = account.productionProducts.filter(product => !product.isArchived);
  const target = activeProducts.reduce((sum, product) => sum + product.targetCount, 0);
  const completed = activeProducts.reduce((sum, product) => sum + product.completedCount, 0);
  const done = activeProducts.filter(product => product.completedCount === product.targetCount).length;
  const inProgress = activeProducts.filter(product => product.completedCount > 0 && product.completedCount < product.targetCount).length;
  const notStarted = activeProducts.filter(product => product.completedCount === 0).length;
  return NextResponse.json({ account, summary: { target, completed, progress: target ? Math.round(completed / target * 100) : 0, products: activeProducts.length, done, inProgress, notStarted, archived: account.productionProducts.length - activeProducts.length } }, { headers: { "Cache-Control": "private, no-store" } });
}
