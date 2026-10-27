import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyCredentials } from "@/lib/auth";
const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email atau kata sandi tidak valid." }, { status: 400 });
  try {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login configuration/database error", error);
    const message = error instanceof Error && error.message.includes("DATABASE_URL")
      ? "Database belum dikonfigurasi. Tambahkan DATABASE_URL dan DIRECT_URL ke .env, lalu jalankan migrasi."
      : error instanceof Error && error.message.includes("AUTH_SECRET")
        ? "AUTH_SECRET belum dikonfigurasi. Atur secret aplikasi sebelum masuk."
        : "Layanan login belum siap. Periksa konfigurasi server dan database.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
