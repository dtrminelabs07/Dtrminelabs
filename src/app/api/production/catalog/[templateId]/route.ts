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
      { error: "Perubahan template tidak valid." },
      { status: 400 }
    );
  }

  const existing = await db.productTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Template tidak ditemukan." },
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

export async function DELETE(request: Request, context: Context) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { templateId } = await context.params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action"); // "archive" | "delete" | null

  try {
    const template = await db.productTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        isArchived: true,
        _count: { select: { assignments: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template tidak ditemukan." },
        { status: 404 }
      );
    }

    // Kasus 1: Permintaan arsipkan secara eksplisit
    if (action === "archive") {
      if (template.isArchived) {
        return NextResponse.json(
          { error: `Template “${template.name}” sudah diarsipkan.` },
          { status: 400 }
        );
      }
      await db.productTemplate.update({
        where: { id: templateId },
        data: { isArchived: true },
      });
      return NextResponse.json({
        ok: true,
        archived: true,
        message: `Template “${template.name}” berhasil diarsipkan.`,
      });
    }

    // Kasus 2: Template belum pernah digunakan (0 penugasan) -> Hapus permanen dari database
    if (template._count.assignments === 0) {
      await db.productTemplate.delete({ where: { id: templateId } });
      return NextResponse.json({
        ok: true,
        deleted: true,
        message: `Template “${template.name}” berhasil dihapus secara permanen.`,
      });
    }

    // Kasus 3: Permintaan hapus permanen eksplisit namun template masih memiliki penugasan aktif
    if (action === "delete") {
      return NextResponse.json(
        {
          error: `Core tidak bisa dihapus karena masih digunakan oleh ${template._count.assignments} produk akun produksi. Arsipkan template jika ingin menonaktifkannya dari penugasan baru.`,
        },
        { status: 409 }
      );
    }

    // Kasus 4: Panggilan DELETE default pada template yang memiliki penugasan
    // Jika belum diarsipkan, amankan dengan mengarsipkan template agar data akun tetap aman
    if (!template.isArchived) {
      await db.productTemplate.update({
        where: { id: templateId },
        data: { isArchived: true },
      });
      return NextResponse.json({
        ok: true,
        archived: true,
        message: `Template “${template.name}” diarsipkan karena masih digunakan oleh ${template._count.assignments} produk pada akun produksi.`,
      });
    }

    // Kasus 5: Sudah diarsipkan namun masih memiliki relasi penugasan
    return NextResponse.json(
      {
        error: `Core tidak bisa dihapus karena masih digunakan oleh ${template._count.assignments} produk akun produksi. Hapus produk terkait pada akun terlebih dahulu jika ingin menghapus template ini secara permanen.`,
      },
      { status: 409 }
    );
  } catch (error) {
    console.error("[catalog:delete] Error deleting template:", error);
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
    if (code === "P2003") {
      return NextResponse.json(
        {
          error: "Template masih memiliki relasi penugasan produk pada akun dan tidak dapat dihapus permanen.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memproses template.",
      },
      { status: 500 }
    );
  }
}
