import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountOwnerScope, requireAdmin } from "@/lib/auth";
import { productionAssignmentsSchema } from "@/lib/validators";

type Context = { params: Promise<{ accountId: string }> };

export async function POST(request: Request, context: Context) {
  const { response, user } = await requireAdmin();
  if (response) return response;
  const { accountId } = await context.params;
  const parsed = productionAssignmentsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pilih sedikitnya satu produk yang valid." }, { status: 400 });
  const ids = parsed.data.assignments.map(item => item.templateId);
  const account = await db.account.findFirst({ where: { id: accountId, ...accountOwnerScope(user!), isActive: true }, select: { id: true } });
  if (!account) return NextResponse.json({ error: "Akun aktif tidak ditemukan." }, { status: 404 });
  const templates = await db.productTemplate.findMany({ where: { id: { in: ids }, isArchived: false }, select: { id: true, name: true, description: true, defaultTarget: true } });
  if (templates.length !== ids.length) return NextResponse.json({ error: "Satu atau lebih produk tidak tersedia lagi di katalog." }, { status: 409 });
  const existing = await db.productionProduct.findMany({ where: { accountId, templateId: { in: ids } }, select: { templateId: true } });
  if (existing.length) return NextResponse.json({ error: "Produk yang dipilih sudah ditambahkan ke akun ini. Muat ulang daftar produk." }, { status: 409 });
  const byId = new Map(parsed.data.assignments.map(item => [item.templateId, item]));
  const missingDefault = templates.find(template => !byId.get(template.id)?.targetCount && !template.defaultTarget);
  if (missingDefault) return NextResponse.json({ error: `Tentukan target aktual untuk produk ${missingDefault.name}.` }, { status: 400 });
  const result = await db.productionProduct.createMany({
    data: templates.map(template => {
      const assignment = byId.get(template.id)!;
      return { accountId, templateId: template.id, name: template.name, description: template.description, targetCount: assignment.targetCount ?? template.defaultTarget!, completedCount: 0, createdById: user!.id };
    }),
    skipDuplicates: true
  });
  return NextResponse.json({ created: result.count, requested: ids.length }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
