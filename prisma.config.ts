import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed-admin.ts" },
  datasource: {
    // CLI migrations use the direct Neon URL; the app's driver adapter uses DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/dtrminelabs"
  }
});
