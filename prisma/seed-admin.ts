import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the initial admin.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });

async function main() {
  const { INITIAL_ADMIN_NAME, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = process.env;
  if (!INITIAL_ADMIN_NAME || !INITIAL_ADMIN_USERNAME || !/^[a-zA-Z0-9._-]{3,80}$/.test(INITIAL_ADMIN_USERNAME) || !INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD || INITIAL_ADMIN_PASSWORD.length < 12) {
    throw new Error("Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, and a 12+ character INITIAL_ADMIN_PASSWORD first.");
  }
  const email = INITIAL_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== UserRole.ADMIN) throw new Error("That email belongs to a non-admin user; choose a different INITIAL_ADMIN_EMAIL.");
    if (existing.username && existing.username !== INITIAL_ADMIN_USERNAME.toLowerCase()) {
      throw new Error("That admin already has a different username; update it through the protected user management flow.");
    }
    if (!existing.username) await prisma.user.update({ where: { id: existing.id }, data: { username: INITIAL_ADMIN_USERNAME.toLowerCase() } });
    console.log("Admin account is ready.");
    return;
  }
  const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, 12);
  await prisma.user.create({ data: { name: INITIAL_ADMIN_NAME, username: INITIAL_ADMIN_USERNAME.toLowerCase(), email, passwordHash, role: UserRole.ADMIN } });
  console.log("Admin account created.");
}

main().finally(() => prisma.$disconnect());

