import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireUser } from "@/lib/auth";
import { productionCommentSchema } from "@/lib/validators";

type Context = { params: Promise<{ accountId: string }> };

export async function GET(_request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { accountId } = await context.params;
  const account = await db.account.findFirst({ where: { id: accountId, ...accountOwnerScope(user!) }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun produksi tidak ditemukan." }, { status: 404 });
  const comments = await db.productionAccountComment.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } });
  return NextResponse.json(comments, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: Context) {
  const { response, user } = await requireUser();
  if (response) return response;
  const { accountId } = await context.params;
  const parsed = productionCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Komentar wajib diisi (maksimal 2.000 karakter)." }, { status: 400 });
  const account = await db.account.findFirst({ where: { id: accountId, ...accountOwnerScope(user!) }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun produksi tidak ditemukan." }, { status: 404 });
  const comment = await db.productionAccountComment.create({ data: { accountId, authorId: user!.id, content: parsed.data.content }, include: { author: { select: { id: true, name: true } } } });
  return NextResponse.json(comment, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
