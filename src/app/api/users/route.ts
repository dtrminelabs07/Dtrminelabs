import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
const userSelect = { id: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true } as const;

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const users = await db.user.findMany({ where: { role: { not: "DEMO" } }, select: userSelect, orderBy: { name: "asc" } });
  return NextResponse.json(users, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const schema = z.object({
    name: z.string().trim().min(1).max(120),
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(200),
    role: z.enum(["ADMIN", "STAFF"]),
    isActive: z.boolean().default(true),
  }).strict();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Periksa nama, username, email, kata sandi minimal 12 karakter, peran, dan status." }, { status: 400 });

  try {
    const { password, ...fields } = parsed.data;
    const user = await db.user.create({
      data: { ...fields, username: fields.username.toLowerCase(), email: fields.email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) },
      select: userSelect,
    });
    return NextResponse.json(user, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Username atau email sudah digunakan, atau data tidak dapat disimpan." }, { status: 409 });
  }
}
