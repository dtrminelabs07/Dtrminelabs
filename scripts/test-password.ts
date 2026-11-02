import "dotenv/config";
import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function testPassword() {
  const admin = await db.user.findUnique({
    where: { username: "adminbaru" }
  });
  if (!admin) {
    console.log("adminbaru not found");
    return;
  }
  const candidate = process.env.INITIAL_ADMIN_PASSWORD;
  if (!candidate) {
    console.log("No INITIAL_ADMIN_PASSWORD in .env");
    return;
  }
  const match = await bcrypt.compare(candidate, admin.passwordHash);
  console.log("Does INITIAL_ADMIN_PASSWORD match adminbaru's passwordHash?", match);

  // What if $2b$ vs $2a$?
  const modifiedHash2a = admin.passwordHash.replace(/^\$2b\$/, "$2a$");
  const match2a = await bcrypt.compare(candidate, modifiedHash2a);
  console.log("Does candidate match if prefix changed from $2b$ to $2a$?", match2a);

  // Also check if admin @ admin@dtrminelabs.com works with its demo password
  const admin1 = await db.user.findUnique({
    where: { username: "detaminela" }
  });
  if (admin1 && process.env.DEMO_ADMIN_PASSWORD) {
    const matchAdmin1 = await bcrypt.compare(process.env.DEMO_ADMIN_PASSWORD, admin1.passwordHash);
    console.log("Does DEMO_ADMIN_PASSWORD match detaminela?", matchAdmin1);
  }

  process.exit(0);
}

testPassword().catch(console.error);

