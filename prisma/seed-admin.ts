import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the initial admin.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });

async function main() {
  const { INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = process.env;
  if (!INITIAL_ADMIN_NAME || !INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD || INITIAL_ADMIN_PASSWORD.length < 12) {
    throw new Error("Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and a 12+ character INITIAL_ADMIN_PASSWORD first.");
  }
  const email = INITIAL_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== UserRole.ADMIN) throw new Error("That email belongs to a non-admin user; choose a different INITIAL_ADMIN_EMAIL.");
    console.log(`Admin account already exists: ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, 12);
  await prisma.user.create({ data: { name: INITIAL_ADMIN_NAME, email, passwordHash, role: UserRole.ADMIN } });
  console.log(`Admin account created: ${email}`);
}

main().finally(() => prisma.$disconnect());
