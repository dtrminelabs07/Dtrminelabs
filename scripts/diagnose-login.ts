import "dotenv/config";
import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("=== DIAGNOSE LOGIN START ===");
  console.log("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));
  console.log("AUTH_SECRET present:", Boolean(process.env.AUTH_SECRET), "length:", process.env.AUTH_SECRET?.length);

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      createdAt: true
    }
  });

  console.log(`Total users in DB: ${users.length}`);
  for (const u of users) {
    console.log("USER RECORD:", {
      id: u.id,
      name: u.name,
      username: u.username,
      usernameType: typeof u.username,
      usernameLength: u.username?.length,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      hashLength: u.passwordHash?.length,
      hashPrefix: u.passwordHash?.slice(0, 10),
      createdAt: u.createdAt
    });
  }

  // Test findUnique with 'adminbaru'
  const byUsername = await db.user.findUnique({
    where: { username: "adminbaru" }
  });
  console.log("findUnique({ where: { username: 'adminbaru' } }):", byUsername ? `FOUND id=${byUsername.id}` : "NOT FOUND");

  // Test findFirst with insensitive mode or trim
  const byUsernameInsensitive = await db.user.findFirst({
    where: { username: { equals: "adminbaru", mode: "insensitive" } }
  });
  console.log("findFirst insensitive 'adminbaru':", byUsernameInsensitive ? `FOUND id=${byUsernameInsensitive.id}` : "NOT FOUND");

  // Test find by email
  const byEmail = await db.user.findUnique({
    where: { email: "adminbaru@dtrminelabs.com" }
  });
  console.log("findUnique by email 'adminbaru@dtrminelabs.com':", byEmail ? `FOUND id=${byEmail.id}` : "NOT FOUND");

  console.log("=== DIAGNOSE LOGIN END ===");
  process.exit(0);
}

main().catch(err => {
  console.error("DIAGNOSE ERROR:", err);
  process.exit(1);
});

