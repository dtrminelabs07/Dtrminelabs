import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const userSelect = { id: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true } as const;

export async function PATCH(request: NextRequest, context: Context) {
  const { response, user: actor } = await requireAdmin();
  if (response) return response;
  const { id } = await context.params;
  const schema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/).optional(),
    role: z.enum(["ADMIN", "STAFF"]).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(12).max(200).optional(),
  }).strict();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid. Kata sandi baru harus berisi sedikitnya 12 karakter." }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
  if (actor?.id === id && parsed.data.isActive === false) return NextResponse.json({ error: "Anda tidak dapat menonaktifkan akun sendiri." }, { status: 400 });
  if (actor?.id === id && parsed.data.role === "STAFF") return NextResponse.json({ error: "Admin tidak dapat menurunkan peran akunnya sendiri." }, { status: 400 });

  try {
    const updated = await db.$transaction(async tx => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
      if (!target || target.role === "DEMO") return null;
      const willLoseAdminAccess = target.role === "ADMIN" && target.isActive && (parsed.data.role === "STAFF" || parsed.data.isActive === false);
      if (willLoseAdminAccess) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) throw new Error("LAST_ACTIVE_ADMIN");
      }
      const { password, ...fields } = parsed.data;
      return tx.user.update({
        where: { id },
        data: { ...fields, ...(fields.username ? { username: fields.username.toLowerCase() } : {}), ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
        select: userSelect,
      });
    }, { isolationLevel: "Serializable" });
    if (!updated) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "LAST_ACTIVE_ADMIN") return NextResponse.json({ error: "Admin aktif terakhir tidak dapat dinonaktifkan atau diubah menjadi User." }, { status: 409 });
    return NextResponse.json({ error: "Username sudah digunakan atau perubahan tidak dapat disimpan." }, { status: 409 });
  }
}
