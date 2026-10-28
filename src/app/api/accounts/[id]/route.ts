import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin, requireUser } from "@/lib/auth";
import { accountSchema } from "@/lib/validators";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Ctx) {
  const { response } = await requireAdmin(); if (response) return response;
  const { id } = await context.params;
  const parsed = accountSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa kembali data akun." }, { status: 400 });
  const result = await db.account.updateMany({ where: { id, ownerId: null }, data: parsed.data });
  if (!result.count) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(await db.account.findUnique({ where: { id }, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, createdAt: true, updatedAt: true } }), { headers: { "Cache-Control": "private, no-store" } });
}
export async function GET(_request: NextRequest, context: Ctx) {
  const { response, user } = await requireUser(); if (response) return response;
  const { id } = await context.params;
  const account = await db.account.findFirst({ where: { id, ...accountOwnerScope(user!) }, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, createdAt: true, updatedAt: true, uploads: { orderBy: { date: "desc" }, take: 90, select: { id: true, date: true, status: true, notes: true, updatedAt: true } }, activities: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, description: true, createdAt: true, actor: { select: { name: true } } } } } });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json(account, { headers: { "Cache-Control": "private, no-store" } });
}
