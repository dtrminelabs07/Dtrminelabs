import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const cookieName = "dtrminelabs_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
};
export type SessionUser = { id: string; name: string; username: string | null; email: string; role: "ADMIN" | "STAFF" | "DEMO" };
export function accountOwnerScope(user: Pick<SessionUser, "id" | "role">) {
  return { ownerId: user.role === "DEMO" ? user.id : null };
}
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret());
  const jar = await cookies();
  jar.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}
export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== "string") return null;
    const current = await db.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, name: true, username: true, role: true, isActive: true } });
    if (!current?.isActive) return null;
    return { id: current.id, email: current.email, name: current.name, username: current.username, role: current.role };
  } catch { return null; }
}
export async function requireUser() {
  const user = await getSession();
  if (!user) return { user: null, response: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  return { user, response: null };
}
export async function requireAdmin() {
  const result = await requireUser();
  if (result.response) return result;
  if (result.user?.role !== "ADMIN") return { user: null, response: NextResponse.json({ error: "Akses khusus admin." }, { status: 403 }) };
  return result;
}
export async function verifyCredentials(username: string, password: string) {
  const user = await db.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!user || !user.isActive) return null;
  const bcrypt = await import("bcryptjs");
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } as SessionUser;
}

