import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productTemplateUpdateSchema } from "@/lib/validators";

type Context = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { templateId } = await context.params;
  const parsed = productTemplateUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan template tidak valid." }, { status: 400 });
  const existing = await db.productTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  const template = await db.productTemplate.update({ where: { id: templateId }, data: parsed.data });
  return NextResponse.json(template, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: Request, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { templateId } = await context.params;
  const template = await db.productTemplate.updateMany({ where: { id: templateId, isArchived: false }, data: { isArchived: true } });
  if (!template.count) return NextResponse.json({ error: "Template tidak ditemukan atau sudah diarsipkan." }, { status: 404 });
  return NextResponse.json({ archived: true });
}
