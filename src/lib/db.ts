import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
function getClient() {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required to connect to the Neon PostgreSQL database.");
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });
  }
  return globalForPrisma.prisma;
}

// Defer client construction until a request actually queries the database so static build steps need no secrets.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  }
});
