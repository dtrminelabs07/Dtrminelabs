import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin, requireUser } from "@/lib/auth";
import { accountSchema } from "@/lib/validators";
import { ActivityAction } from "@/generated/prisma/enums";
export async function GET(request: NextRequest) {
  const { response, user } = await requireUser(); if (response) return response;
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const core = request.nextUrl.searchParams.get("core") ?? "";
  const subCore = request.nextUrl.searchParams.get("subCore") ?? "";
  const active = request.nextUrl.searchParams.get("active");
  const accounts = await db.account.findMany({ where: { ...accountOwnerScope(user!), ...(active === "all" ? {} : { isActive: active !== "false" }), ...(core ? { core } : {}), ...(subCore ? { subCore } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { core: { contains: q, mode: "insensitive" } }, { subCore: { contains: q, mode: "insensitive" } }, { platform: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ core: "asc" }, { subCore: "asc" }, { name: "asc" }], select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, createdAt: true, updatedAt: true } });
  return NextResponse.json(accounts, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: NextRequest) {
  const { response, user } = await requireAdmin(); if (response) return response;
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa kembali data akun.", issues: parsed.error.flatten() }, { status: 400 });
  const account = await db.$transaction(async tx => {
    const created = await tx.account.create({ data: parsed.data, select: { id: true, name: true, username: true, avatarUrl: true, platform: true, core: true, subCore: true, isActive: true, createdAt: true, updatedAt: true } });
    await tx.activityLog.create({ data: { accountId: created.id, actorId: user!.id, action: ActivityAction.CREATED, description: `Menambahkan akun ${created.name}` } });
    return created;
  });
  return NextResponse.json(account, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
