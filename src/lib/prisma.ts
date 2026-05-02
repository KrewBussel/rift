import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makePrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
  });
  // Supabase's pooler kills idle connections; without a listener, the
  // resulting ECONNRESET on the idle socket crashes the dev server.
  pool.on("error", (err) => {
    console.error("[prisma pool] idle client error:", err.message);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

globalForPrisma.prisma = prisma;
