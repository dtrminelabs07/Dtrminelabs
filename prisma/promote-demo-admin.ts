import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";

const target = process.env.PROMOTE_DEMO_ADMIN_TARGET;
if (target !== "local" && target !== "production") {
  throw new Error("Set PROMOTE_DEMO_ADMIN_TARGET to local or production after verifying DATABASE_URL.");
}
if (process.env.PROMOTE_DEMO_ADMIN_CONFIRM !== target) {
  throw new Error("PROMOTE_DEMO_ADMIN_CONFIRM must exactly match the verified target.");
}
if (process.env.VERCEL_ENV === "production") {
  throw new Error("Run this one-time operation from a trusted shell, never during a Vercel build.");
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const expectedHost = process.env.PROMOTE_DEMO_ADMIN_DATABASE_HOST?.trim().toLowerCase();
const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
const adminName = process.env.ADMIN_DISPLAY_NAME?.trim() || username;
if (!connectionString) throw new Error("DATABASE_URL is required.");
let actualHost: string;
try { actualHost = new URL(connectionString).hostname.toLowerCase(); }
catch { throw new Error("The configured database URL is invalid."); }
if (!expectedHost || actualHost !== expectedHost) {
  throw new Error("PROMOTE_DEMO_ADMIN_DATABASE_HOST must exactly match the configured database hostname.");
}
if (target === "production" && !actualHost.endsWith(".neon.tech")) {
  throw new Error("Production promotion is restricted to a verified Neon database hostname.");
}
if (!email || !username || !/^[a-z0-9._-]{3,80}$/.test(username)) {
  throw new Error("Set the configured DEMO_EMAIL and the official ADMIN_USERNAME (3â€“80 letters, numbers, dots, underscores, or hyphens).");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });

async function main() {
  await prisma.$transaction(async tx => {
    const demoUsers = await tx.user.findMany({ where: { role: UserRole.DEMO }, select: { id: true, email: true, role: true } });
    if (demoUsers.length !== 1 || demoUsers[0].email.toLowerCase() !== email) {
      throw new Error("Expected exactly one DEMO user matching configured DEMO_EMAIL; no records were changed.");
    }
    const demo = demoUsers[0];
    const usernameOwner = await tx.user.findUnique({ where: { username }, select: { id: true } });
    if (usernameOwner && usernameOwner.id !== demo.id) {
      throw new Error("ADMIN_USERNAME is already assigned to another user; no records were changed.");
    }

    await tx.account.updateMany({ where: { ownerId: demo.id }, data: { ownerId: null } });
    await tx.user.update({
      where: { id: demo.id },
      data: { username, name: adminName, role: UserRole.ADMIN },
    });
  }, { maxWait: 15_000, timeout: 30_000 });
  console.log(`Configured demo account promoted to administrator on the verified ${target} database. Password hash and tracker history were retained.`);
}

main().catch(error => {
  console.error("Administrator promotion stopped safely.", error instanceof Error ? error.message : "Unknown database error.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

