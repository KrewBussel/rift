import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const firm = await prisma.firm.upsert({
    where: { id: "seed-firm-1" },
    update: {},
    create: { id: "seed-firm-1", name: "Demo Firm" },
  });

  const hashed = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      firstName: "Admin",
      lastName: "User",
      password: hashed,
      role: "ADMIN",
      firmId: firm.id,
    },
  });

  console.log("Seeded:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
