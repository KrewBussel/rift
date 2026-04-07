import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Ensure firm exists
  const firm = await prisma.firm.upsert({
    where: { id: "seed-firm-1" },
    update: {},
    create: { id: "seed-firm-1", name: "Demo Firm" },
  });

  const password = await bcrypt.hash("password123", 10);

  const users = [
    { email: "admin@demo.com",   firstName: "Admin",   lastName: "User",     role: "ADMIN"   as const },
    { email: "sarah@demo.com",   firstName: "Sarah",   lastName: "Mitchell", role: "ADVISOR" as const },
    { email: "james@demo.com",   firstName: "James",   lastName: "Carter",   role: "ADVISOR" as const },
    { email: "priya@demo.com",   firstName: "Priya",   lastName: "Sharma",   role: "OPS"     as const },
    { email: "marcus@demo.com",  firstName: "Marcus",  lastName: "Lee",      role: "OPS"     as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password, firmId: firm.id },
    });
    console.log(`✓ ${u.role.padEnd(7)} ${u.firstName} ${u.lastName} — ${u.email}`);
  }

  // Seed demo rollover cases
  const [sarah, james, priya, marcus] = await Promise.all([
    prisma.user.findUnique({ where: { email: "sarah@demo.com" } }),
    prisma.user.findUnique({ where: { email: "james@demo.com" } }),
    prisma.user.findUnique({ where: { email: "priya@demo.com" } }),
    prisma.user.findUnique({ where: { email: "marcus@demo.com" } }),
  ]);

  const cases = [
    {
      clientFirstName: "Robert",
      clientLastName: "Nguyen",
      clientEmail: "robert.nguyen@email.com",
      sourceProvider: "Fidelity NetBenefits",
      destinationCustodian: "Schwab",
      accountType: "TRADITIONAL_IRA_401K" as const,
      status: "AWAITING_CLIENT_ACTION" as const,
      highPriority: true,
      assignedAdvisorId: sarah!.id,
      assignedOpsId: priya!.id,
    },
    {
      clientFirstName: "Linda",
      clientLastName: "Torres",
      clientEmail: "linda.torres@email.com",
      sourceProvider: "Vanguard 401k",
      destinationCustodian: "Fidelity",
      accountType: "ROTH_IRA_401K" as const,
      status: "READY_TO_SUBMIT" as const,
      highPriority: false,
      assignedAdvisorId: sarah!.id,
      assignedOpsId: priya!.id,
    },
    {
      clientFirstName: "David",
      clientLastName: "Kim",
      clientEmail: "david.kim@email.com",
      sourceProvider: "Empower Retirement",
      destinationCustodian: "Schwab",
      accountType: "TRADITIONAL_IRA_401K" as const,
      status: "SUBMITTED" as const,
      highPriority: false,
      assignedAdvisorId: james!.id,
      assignedOpsId: marcus!.id,
    },
    {
      clientFirstName: "Patricia",
      clientLastName: "Walsh",
      clientEmail: "patricia.walsh@email.com",
      sourceProvider: "T. Rowe Price",
      destinationCustodian: "Pershing",
      accountType: "IRA_403B" as const,
      status: "PROCESSING" as const,
      highPriority: false,
      assignedAdvisorId: james!.id,
      assignedOpsId: marcus!.id,
    },
    {
      clientFirstName: "Michael",
      clientLastName: "Patel",
      clientEmail: "michael.patel@email.com",
      sourceProvider: "Principal Financial",
      destinationCustodian: "Schwab",
      accountType: "TRADITIONAL_IRA_401K" as const,
      status: "INTAKE" as const,
      highPriority: false,
      assignedAdvisorId: sarah!.id,
      assignedOpsId: priya!.id,
    },
    {
      clientFirstName: "Susan",
      clientLastName: "Blake",
      clientEmail: "susan.blake@email.com",
      sourceProvider: "John Hancock",
      destinationCustodian: "TD Ameritrade",
      accountType: "TRADITIONAL_IRA_401K" as const,
      status: "IN_TRANSIT" as const,
      highPriority: false,
      assignedAdvisorId: james!.id,
      assignedOpsId: priya!.id,
    },
    {
      clientFirstName: "Kevin",
      clientLastName: "Anderson",
      clientEmail: "kevin.anderson@email.com",
      sourceProvider: "Merrill Lynch",
      destinationCustodian: "Schwab",
      accountType: "ROTH_IRA_401K" as const,
      status: "COMPLETED" as const,
      highPriority: false,
      assignedAdvisorId: sarah!.id,
      assignedOpsId: marcus!.id,
    },
  ];

  const adminUser = await prisma.user.findUnique({ where: { email: "admin@demo.com" } });

  for (const c of cases) {
    const existing = await prisma.rolloverCase.findFirst({
      where: { clientEmail: c.clientEmail, firmId: firm.id },
    });
    if (existing) {
      console.log(`  skipped (exists): ${c.clientFirstName} ${c.clientLastName}`);
      continue;
    }

    const created = await prisma.rolloverCase.create({
      data: { ...c, firmId: firm.id },
    });

    await prisma.activityEvent.create({
      data: {
        caseId: created.id,
        actorUserId: adminUser!.id,
        eventType: "CASE_CREATED",
        eventDetails: "Case created (demo seed)",
      },
    });

    console.log(`✓ Case    ${c.clientFirstName} ${c.clientLastName} — ${c.status}`);
  }

  console.log("\nAll demo data seeded. Password for all accounts: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
