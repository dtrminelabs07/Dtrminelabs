import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ActivityAction, UploadStatus, UserRole } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

const environment = process.env.APP_ENV;
const productionSeed = environment === "production" && process.env.DEMO_SEED_PRODUCTION === "true";
if (process.env.VERCEL_ENV === "production") {
  throw new Error("Run the demo seed from a trusted shell, never during a Vercel Production build.");
}
if (environment !== "development" && environment !== "staging" && !productionSeed) {
  throw new Error("Demo seeding requires APP_ENV=development/staging, or APP_ENV=production with DEMO_SEED_PRODUCTION=true.");
}
if (process.env.DEMO_LOGIN_ENABLED !== "true") {
  throw new Error("Set DEMO_LOGIN_ENABLED=true in the target environment before seeding.");
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to create the demo account.");
if (productionSeed) {
  let targetHost = "";
  try { targetHost = new URL(connectionString).hostname; } catch { throw new Error("The configured database URL is invalid."); }
  const confirmedHost = process.env.DEMO_SEED_PRODUCTION_DATABASE_HOST;
  const confirmation = process.env.DEMO_SEED_PRODUCTION_CONFIRM;
  if (!targetHost || confirmedHost !== targetHost || confirmation !== `create-demo-on:${targetHost}`) {
    throw new Error("Production demo seeding requires the exact database host and DEMO_SEED_PRODUCTION_CONFIRM=create-demo-on:<host>.");
  }
}
const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
const username = process.env.DEMO_USERNAME?.trim().toLowerCase();
const password = process.env.DEMO_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !username || !/^[a-z0-9._-]{3,80}$/.test(username) || !password || password.length < 8) {
  throw new Error("Set a valid DEMO_EMAIL, DEMO_USERNAME, and a DEMO_PASSWORD of at least 8 characters.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
const demoAccounts = [
  { name: "Northstar Daily", username: "@northstar.daily", core: "Social", subCore: "Lifestyle", platform: "Instagram", status: UploadStatus.COMPLETED },
  { name: "Studio River", username: "@studio.river", core: "Social", subCore: "Creative", platform: "TikTok", status: UploadStatus.UPLOADED },
  { name: "Fieldnotes Co", username: "@fieldnotes.co", core: "Commerce", subCore: "Stationery", platform: "Instagram", status: UploadStatus.PENDING },
  { name: "Morning Goods", username: "@morning.goods", core: "Commerce", subCore: "Lifestyle", platform: "TikTok", status: UploadStatus.LIMIT }
];

async function main() {
  const demoEmail = email!;
  const demoPassword = password!;
  const existing = await prisma.user.findUnique({ where: { email: demoEmail }, select: { id: true, role: true } });
  if (existing && existing.role !== UserRole.DEMO) {
    throw new Error("That email already belongs to a non-demo user. Choose a dedicated demo email; the existing account was not changed.");
  }

  const passwordHash = bcrypt.hashSync(demoPassword, 12);
  const demoUser = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name: "Dtrminelabs Demo", username, passwordHash, role: UserRole.DEMO } })
    : await prisma.user.create({ data: { name: "Dtrminelabs Demo", username, email: demoEmail, passwordHash, role: UserRole.DEMO } });

  const today = new Date();
  const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  for (const [index, sample] of demoAccounts.entries()) {
    let account = await prisma.account.findFirst({ where: { ownerId: demoUser.id, name: sample.name }, select: { id: true } });
    if (!account) {
      account = await prisma.account.create({ data: { name: sample.name, username: sample.username, core: sample.core, subCore: sample.subCore, platform: sample.platform, ownerId: demoUser.id }, select: { id: true } });
    }
    const uploadDate = new Date(date.getTime() - index * 86_400_000);
    const existingUpload = await prisma.dailyUpload.findUnique({ where: { accountId_date: { accountId: account.id, date: uploadDate } }, select: { id: true } });
    if (!existingUpload) {
      const upload = await prisma.dailyUpload.create({ data: { accountId: account.id, date: uploadDate, status: sample.status, notes: "Contoh data akun demo", createdById: demoUser.id, updatedById: demoUser.id } });
      await prisma.activityLog.create({ data: { accountId: account.id, dailyUploadId: upload.id, actorId: demoUser.id, action: ActivityAction.CREATED, newStatus: sample.status, description: `Demo mencatat status ${sample.name}` } });
    }
  }
  console.log(`Isolated demo account provisioned for ${environment}.`);
}

main().catch(error => {
  console.error("Demo account was not created.", error instanceof Error ? error.message : "Unknown database error.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

