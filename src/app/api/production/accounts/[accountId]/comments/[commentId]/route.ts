import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";

type Context = { params: Promise<{ accountId: string; commentId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { accountId, commentId } = await context.params;
  const comment = await db.productionAccountComment.findFirst({ where: { id: commentId, accountId, account: accountOwnerScope(user!) } });
  if (!comment) return NextResponse.json({ error: "Komentar tidak ditemukan." }, { status: 404 });
  if (comment.authorId !== user!.id && user!.role !== "ADMIN") return NextResponse.json({ error: "Anda hanya dapat menghapus komentar sendiri." }, { status: 403 });
  await db.productionAccountComment.delete({ where: { id: commentId } });
  return NextResponse.json({ deleted: true });
}
