import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const unavailable = () => NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
  const username = process.env.DEMO_USERNAME?.trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  if (process.env.DEMO_LOGIN_ENABLED !== "true" || !email || !username || !password) return unavailable();

  try {
    const demoUser = await db.user.findUnique({
      where: { email },
      select: { username: true, passwordHash: true, role: true },
    });
    if (!demoUser || demoUser.role !== UserRole.DEMO || demoUser.username !== username || !(await bcrypt.compare(password, demoUser.passwordHash))) return unavailable();

    // This endpoint intentionally reveals only credentials for a verified, isolated DEMO-role user.
    return NextResponse.json({ enabled: true, username, password }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return unavailable();
  }
}
