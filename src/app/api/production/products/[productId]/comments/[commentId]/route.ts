import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type Context = { params: Promise<{ productId: string; commentId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { productId, commentId } = await context.params;
  const comment = await db.productionComment.findFirst({ where: { id: commentId, productId, product: { account: { ownerId: user!.role === "DEMO" ? user!.id : null } } } });
  if (!comment) return NextResponse.json({ error: "Komentar tidak ditemukan." }, { status: 404 });
  if (comment.authorId !== user!.id && user!.role !== "ADMIN") return NextResponse.json({ error: "Anda hanya dapat menghapus komentar sendiri." }, { status: 403 });
  await db.productionComment.delete({ where: { id: commentId } });
  return NextResponse.json({ deleted: true });
}
