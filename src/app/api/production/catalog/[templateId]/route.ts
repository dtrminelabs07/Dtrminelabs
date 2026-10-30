
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productTemplateUpdateSchema } from "@/lib/validators";

type Context = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { templateId } = await context.params;
  const parsed = productTemplateUpdateSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Perubahan Core tidak valid." },
      { status: 400 }
    );
  }

  const existing = await db.productTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Core tidak ditemukan." },
      { status: 404 }
    );
  }

  const template = await db.productTemplate.update({
    where: { id: templateId },
    data: parsed.data,
  });

  return NextResponse.json(template, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function DELETE(_request: Request, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { templateId } = await context.params;

  const template = await db.productTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      _count: {
        select: { assignments: true },
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Core tidak ditemukan." },
      { status: 404 }
    );
  }

  if (template._count.assignments > 0) {
    return NextResponse.json(
      {
        error: `Core tidak bisa dihapus karena masih digunakan oleh ${template._count.assignments} produk akun produksi.`,
      },
      { status: 409 }
    );
  }

  await db.productTemplate.delete({
    where: { id: templateId },
  });

  return NextResponse.json({ deleted: true });
}
