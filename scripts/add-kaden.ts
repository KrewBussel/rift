import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const firm = await prisma.firm.findFirst({
    where: { name: "Meridian Wealth Partners" },
  });

  if (!firm) {
    throw new Error("Meridian Wealth Partners firm not found. Run seed-firm2 first.");
  }

  const hashed = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "kaden@demo.com" },
    update: { password: hashed },
    create: {
      email: "kaden@demo.com",
      firstName: "Kaden",
      lastName: "Demo",
      password: hashed,
      role: "ADMIN",
      firmId: firm.id,
    },
  });

  console.log(`✓ User created: ${user.email} / password123 (ADMIN) @ ${firm.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
