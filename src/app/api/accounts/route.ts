import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { accountSchema } from "@/lib/validators";
export async function GET(request: NextRequest) {
  const { response } = await requireUser(); if (response) return response;
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const core = request.nextUrl.searchParams.get("core") ?? "";
  const subCore = request.nextUrl.searchParams.get("subCore") ?? "";
  const active = request.nextUrl.searchParams.get("active");
  return NextResponse.json(await db.account.findMany({ where: { ...(active === "all" ? {} : { isActive: active !== "false" }), ...(core ? { core } : {}), ...(subCore ? { subCore } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { core: { contains: q, mode: "insensitive" } }, { subCore: { contains: q, mode: "insensitive" } }, { platform: { contains: q, mode: "insensitive" } }, { notes: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ core: "asc" }, { subCore: "asc" }, { name: "asc" }] }));
}
export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(); if (response) return response;
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa kembali data akun.", issues: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await db.account.create({ data: parsed.data }), { status: 201 });
}
