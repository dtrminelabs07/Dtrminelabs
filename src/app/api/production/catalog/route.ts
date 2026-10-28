import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin, requireUser } from "@/lib/auth";
import { productTemplateCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response) return response;
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (accountId) {
    const account = await db.account.findFirst({ where: { id: accountId, ...accountOwnerScope(user!), isActive: true }, select: { id: true } });
    if (!account) return NextResponse.json({ error: "Akun aktif tidak ditemukan." }, { status: 404 });
  }
  const [templates, assigned] = await Promise.all([
    db.productTemplate.findMany({ orderBy: [{ isArchived: "asc" }, { name: "asc" }], select: { id: true, name: true, core: true, subCore: true, description: true, defaultTarget: true, isArchived: true, createdAt: true, updatedAt: true, _count: { select: { assignments: true } } } }),
    accountId ? db.productionProduct.findMany({ where: { accountId }, select: { templateId: true } }) : Promise.resolve([])
  ]);
  const assignedIds = new Set(assigned.map(item => item.templateId));
  return NextResponse.json(templates.map(template => ({ ...template, assigned: accountId ? assignedIds.has(template.id) : undefined })), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const parsed = productTemplateCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nama dan target default positif wajib diisi." }, { status: 400 });
  const input = parsed.data;
  const created = await db.$transaction(async tx => {
    const existing = await tx.productTemplate.findUnique({ where: { creationKey: input.creationKey } });
    if (existing) return { template: existing, assigned: false };
    let account: { id: string } | null = null;
    if (input.assignAccountId) {
      account = await tx.account.findFirst({ where: { id: input.assignAccountId, ...accountOwnerScope(user!), isActive: true }, select: { id: true } });
      if (!account) throw new Error("ACTIVE_ACCOUNT_NOT_FOUND");
    }
    const template = await tx.productTemplate.create({ data: { name: input.name, core: input.core || null, subCore: input.subCore || null, description: input.description || null, defaultTarget: input.defaultTarget, creationKey: input.creationKey, createdById: user!.id } });
    if (account) {
      await tx.productionProduct.create({ data: { accountId: account.id, templateId: template.id, name: template.name, description: template.description, targetCount: input.accountTarget ?? template.defaultTarget!, completedCount: 0, creationKey: input.creationKey, createdById: user!.id } });
    }
    return { template, assigned: Boolean(account) };
  }).catch(error => {
    if (error instanceof Error && error.message === "ACTIVE_ACCOUNT_NOT_FOUND") return null;
    throw error;
  });
  if (!created) return NextResponse.json({ error: "Akun aktif tidak ditemukan." }, { status: 404 });
  return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
