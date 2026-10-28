import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyCredentials } from "@/lib/auth";

const schema = z.object({ username: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9._-]+$/), password: z.string().min(1).max(200) });

type CodedError = { code?: unknown; cause?: unknown; name?: unknown };

function safeDatabaseCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as CodedError;
    if (typeof candidate.code === "string" && (/^[A-Z][A-Z0-9]{2,8}$/.test(candidate.code) || /^\d{2}[A-Z0-9]{3}$/.test(candidate.code))) return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

function logLoginFailure(error: unknown, stage: "database.credential_lookup" | "session.creation") {
  const code = safeDatabaseCode(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  let category = stage === "database.credential_lookup" ? "database.query_failed" : "session.creation_failed";

  if (code === "P2021" || code === "P2022") category = "database.schema_mismatch";
  else if (code === "P1000" || code === "28P01") category = "database.credentials_rejected";
  else if (code?.startsWith("P100") || code === "P1017" || code?.startsWith("08") || ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT"].includes(code ?? "")) category = "database.connection_failed";
  else if (errorName.includes("PrismaClient")) category = "database.query_or_initialization_failed";

  // Only stable categories, error class names, and allowlisted driver codes are logged.
  // Never log request bodies, usernames, database URLs, exception messages, or tokens.
  console.error("[auth.login] request failed", { category, errorName, ...(code ? { code } : {}) });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Username atau kata sandi tidak valid." }, { status: 400 });

  if (!process.env.DATABASE_URL) {
    console.error("[auth.login] request failed", { category: "configuration.database_url_missing" });
    return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi server dan database." }, { status: 503 });
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    console.error("[auth.login] request failed", { category: "configuration.auth_secret_missing_or_invalid" });
    return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi server dan database." }, { status: 503 });
  }

  let stage: "database.credential_lookup" | "session.creation" = "database.credential_lookup";
  try {
    const user = await verifyCredentials(parsed.data.username, parsed.data.password);
    if (!user) return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    stage = "session.creation";
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    logLoginFailure(error, stage);
    return NextResponse.json({ error: "Layanan login belum siap. Periksa konfigurasi server dan database." }, { status: 503 });
  }
}

