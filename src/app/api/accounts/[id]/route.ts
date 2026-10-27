import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { accountSchema } from "@/lib/validators";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Ctx) {
  const { response } = await requireAdmin(); if (response) return response;
  const { id } = await context.params;
  const parsed = accountSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa kembali data akun." }, { status: 400 });
  return NextResponse.json(await db.account.update({ where: { id }, data: parsed.data }));
}
export async function GET(_request: NextRequest, context: Ctx) {
  const { response } = await requireUser(); if (response) return response;
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id }, include: { uploads: { orderBy: { date: "desc" }, take: 90 }, activities: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } } } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(account);
}
