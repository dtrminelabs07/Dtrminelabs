import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyCredentials } from "@/lib/auth";
const schema = z.object({ username: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9._-]+$/), password: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Username atau kata sandi tidak valid." }, { status: 400 });
  try {
    const user = await verifyCredentials(parsed.data.username, parsed.data.password);
    if (!user) return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login configuration/database error", error instanceof Error ? error.name : "Unknown error");
    const message = error instanceof Error && error.message.includes("DATABASE_URL")
      ? "Database belum dikonfigurasi. Tambahkan DATABASE_URL dan DIRECT_URL ke .env, lalu jalankan migrasi."
      : error instanceof Error && error.message.includes("AUTH_SECRET")
        ? "AUTH_SECRET belum dikonfigurasi. Atur secret aplikasi sebelum masuk."
        : "Layanan login belum siap. Periksa konfigurasi server dan database.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

