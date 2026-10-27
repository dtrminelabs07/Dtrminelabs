import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";
import bcrypt from "bcryptjs";

const environment = process.env.APP_ENV;
if (environment !== "development" && environment !== "staging") {
  throw new Error("Demo seeding is allowed only when APP_ENV=development or APP_ENV=staging.");
}
if (process.env.VERCEL_ENV === "production") {
  throw new Error("Demo seeding is disabled on Vercel Production.");
}
if (process.env.DEMO_LOGIN_ENABLED !== "true") {
  throw new Error("Set DEMO_LOGIN_ENABLED=true only in the development or staging environment.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to create the demo account.");
const email = process.env.DEMO_ADMIN_EMAIL?.toLowerCase();
const password = process.env.DEMO_ADMIN_PASSWORD;
if (email !== "admin@dtrminelabs.com" || !password || password.length < 12) {
  throw new Error("Set DEMO_ADMIN_EMAIL to the documented demo email and DEMO_ADMIN_PASSWORD to a 12+ character secret before seeding.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name: "Dtrminelabs Demo Admin", passwordHash, role: UserRole.ADMIN },
    create: { name: "Dtrminelabs Demo Admin", email, passwordHash, role: UserRole.ADMIN }
  });
  console.log(`Demo admin ready for ${environment}: ${email}`);
}

main().catch(error => {
  console.error("Demo account was not created.", error instanceof Error ? error.message : "Unknown database error.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
