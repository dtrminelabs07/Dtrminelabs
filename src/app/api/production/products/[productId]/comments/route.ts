import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { productionCommentSchema } from "@/lib/validators";

type Context = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { productId } = await context.params;
  const comments = await db.productionComment.findMany({
    where: { productId, product: { account: { ownerId: user!.role === "DEMO" ? user!.id : null } } },
    orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } }
  });
  return NextResponse.json(comments, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: Context) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { productId } = await context.params;
  const parsed = productionCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Komentar wajib diisi (maksimal 2.000 karakter)." }, { status: 400 });
  const product = await db.productionProduct.findFirst({ where: { id: productId, account: { ownerId: null } }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  const comment = await db.productionComment.create({ data: { productId, authorId: user!.id, content: parsed.data.content }, include: { author: { select: { id: true, name: true } } } });
  return NextResponse.json(comment, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
