/**
 * Sets up test data for Phase 4 reminder testing.
 * - Back-dates 2 cases' updatedAt by 10 days (triggers stalled case reminders)
 * - Creates 2 overdue tasks assigned to Priya and Marcus
 * - Creates checklist items with NOT_STARTED status on an active case
 *
 * Run with: npx tsx prisma/seed-reminder-test.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const firm = await prisma.firm.findFirst({ where: { id: "seed-firm-1" } });
  if (!firm) throw new Error("Demo firm not found. Run seed-demo.ts first.");

  const [priya, marcus] = await Promise.all([
    prisma.user.findUnique({ where: { email: "priya@demo.com" } }),
    prisma.user.findUnique({ where: { email: "marcus@demo.com" } }),
  ]);
  if (!priya || !marcus) throw new Error("Demo users not found.");

  const cases = await prisma.rolloverCase.findMany({
    where: { firmId: firm.id, status: { not: "COMPLETED" } },
    orderBy: { createdAt: "asc" },
  });

  if (cases.length < 2) throw new Error("Not enough cases. Run seed-demo.ts first.");

  // 1. Back-date 2 cases by 10 days (makes them stalled)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const staleIds = [cases[0].id, cases[1].id];

  await prisma.$executeRawUnsafe(
    `UPDATE "RolloverCase" SET "updatedAt" = $1 WHERE id = ANY($2::text[])`,
    tenDaysAgo,
    staleIds
  );
  console.log(`✓ Back-dated cases: ${cases[0].clientFirstName} ${cases[0].clientLastName}, ${cases[1].clientFirstName} ${cases[1].clientLastName}`);

  // 2. Create overdue tasks (due 3 days ago)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const admin = await prisma.user.findUnique({ where: { email: "admin@demo.com" } });

  const task1 = await prisma.task.create({
    data: {
      caseId: cases[0].id,
      title: "Follow up on missing distribution form",
      description: "Client has not returned the signed form",
      assigneeId: priya.id,
      createdById: admin!.id,
      dueDate: threeDaysAgo,
      status: "OPEN",
    },
  });
  console.log(`✓ Created overdue task for Priya: "${task1.title}"`);

  const task2 = await prisma.task.create({
    data: {
      caseId: cases[1].id,
      title: "Request medallion signature guarantee",
      assigneeId: marcus.id,
      createdById: admin!.id,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
      status: "OPEN",
    },
  });
  console.log(`✓ Created overdue task for Marcus: "${task2.title}"`);

  // 3. Seed reminder test summary
  console.log("\n=== Reminder test data ready ===");
  console.log(`Stalled cases (${staleIds.length}): ${staleIds.join(", ")}`);
  console.log(`Overdue tasks: task for Priya (3d), task for Marcus (5d)`);
  console.log("\nNow run:");
  console.log(`  curl -s -X POST "http://localhost:3000/api/cron/reminders?dry_run=true&secret=rift-cron-secret-change-in-production"`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
