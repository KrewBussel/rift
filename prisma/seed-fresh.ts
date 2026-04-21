/**
 * Fresh seed — wipes all firm-scoped data and reseeds one firm.
 *
 * Login credentials (all accounts use password: password123):
 *   krewb003@gmail.com     — Admin
 *   kbussel821@gmail.com   — Admin
 *   + 5 advisors, 5 ops
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function wipe() {
  console.log("Wiping firm-scoped data…");
  // Order respects FK dependencies (leaves cascade, but explicit is safer across schema edits).
  await prisma.activityEvent.deleteMany();
  await prisma.clientSession.deleteMany();
  await prisma.clientAccessToken.deleteMany();
  await prisma.document.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.rolloverCase.deleteMany();
  await prisma.custodianNote.deleteMany();
  await prisma.aIUsageLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reminderLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.firmSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();
  console.log("Wipe complete.\n");
}

async function main() {
  await wipe();

  const firm = await prisma.firm.create({
    data: {
      name: "Summit Wealth Partners",
      legalName: "Summit Wealth Partners, LLC",
      supportEmail: "support@summitwealth.example",
      supportPhone: "(555) 123-4567",
      websiteUrl: "https://summitwealth.example",
      planTier: "PRO",
      seatsLimit: 25,
      billingEmail: "billing@summitwealth.example",
      settings: { create: {} },
    },
  });
  console.log(`Firm: ${firm.name} (${firm.id})\n`);

  const password = await bcrypt.hash("password123", 10);

  const userDefs = [
    { email: "krewb003@gmail.com",    firstName: "Krew",     lastName: "Bussel",    role: "ADMIN"   as const },
    { email: "kbussel821@gmail.com",  firstName: "Kaden",    lastName: "Bussel",    role: "ADMIN"   as const },

    { email: "sarah.mitchell@summitwealth.example",   firstName: "Sarah",   lastName: "Mitchell",  role: "ADVISOR" as const },
    { email: "james.carter@summitwealth.example",     firstName: "James",   lastName: "Carter",    role: "ADVISOR" as const },
    { email: "elena.rodriguez@summitwealth.example",  firstName: "Elena",   lastName: "Rodriguez", role: "ADVISOR" as const },
    { email: "david.chen@summitwealth.example",       firstName: "David",   lastName: "Chen",      role: "ADVISOR" as const },
    { email: "rachel.okonkwo@summitwealth.example",   firstName: "Rachel",  lastName: "Okonkwo",   role: "ADVISOR" as const },

    { email: "priya.sharma@summitwealth.example",     firstName: "Priya",   lastName: "Sharma",    role: "OPS"     as const },
    { email: "marcus.lee@summitwealth.example",       firstName: "Marcus",  lastName: "Lee",       role: "OPS"     as const },
    { email: "natalie.brooks@summitwealth.example",   firstName: "Natalie", lastName: "Brooks",    role: "OPS"     as const },
    { email: "derek.patel@summitwealth.example",      firstName: "Derek",   lastName: "Patel",     role: "OPS"     as const },
    { email: "sofia.alvarez@summitwealth.example",    firstName: "Sofia",   lastName: "Alvarez",   role: "OPS"     as const },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: { ...u, password, firmId: firm.id },
    });
    users[u.email] = created;
    console.log(`✓ ${u.role.padEnd(7)} ${u.firstName} ${u.lastName} — ${u.email}`);
  }
  console.log();

  const advisorIds = [
    users["sarah.mitchell@summitwealth.example"].id,
    users["james.carter@summitwealth.example"].id,
    users["elena.rodriguez@summitwealth.example"].id,
    users["david.chen@summitwealth.example"].id,
    users["rachel.okonkwo@summitwealth.example"].id,
  ];
  const opsIds = [
    users["priya.sharma@summitwealth.example"].id,
    users["marcus.lee@summitwealth.example"].id,
    users["natalie.brooks@summitwealth.example"].id,
    users["derek.patel@summitwealth.example"].id,
    users["sofia.alvarez@summitwealth.example"].id,
  ];
  const admin = users["krewb003@gmail.com"];

  type CaseSeed = {
    clientFirstName: string;
    clientLastName: string;
    clientEmail: string;
    sourceProvider: string;
    destinationCustodian: string;
    accountType: "TRADITIONAL_IRA_401K" | "ROTH_IRA_401K" | "IRA_403B" | "OTHER";
    status: "INTAKE" | "AWAITING_CLIENT_ACTION" | "READY_TO_SUBMIT" | "SUBMITTED" | "PROCESSING" | "IN_TRANSIT" | "COMPLETED";
    highPriority?: boolean;
    advisorIdx: number;
    opsIdx: number;
  };

  const caseSeeds: CaseSeed[] = [
    { clientFirstName: "Robert",   clientLastName: "Nguyen",    clientEmail: "robert.nguyen@example.com",   sourceProvider: "Fidelity NetBenefits",  destinationCustodian: "Schwab",        accountType: "TRADITIONAL_IRA_401K", status: "AWAITING_CLIENT_ACTION", highPriority: true,  advisorIdx: 0, opsIdx: 0 },
    { clientFirstName: "Linda",    clientLastName: "Torres",    clientEmail: "linda.torres@example.com",    sourceProvider: "Vanguard 401k",         destinationCustodian: "Fidelity",      accountType: "ROTH_IRA_401K",        status: "READY_TO_SUBMIT",        advisorIdx: 0, opsIdx: 1 },
    { clientFirstName: "David",    clientLastName: "Kim",       clientEmail: "david.kim@example.com",       sourceProvider: "Empower Retirement",    destinationCustodian: "Schwab",        accountType: "TRADITIONAL_IRA_401K", status: "SUBMITTED",              advisorIdx: 1, opsIdx: 2 },
    { clientFirstName: "Patricia", clientLastName: "Walsh",     clientEmail: "patricia.walsh@example.com",  sourceProvider: "T. Rowe Price",         destinationCustodian: "Pershing",      accountType: "IRA_403B",             status: "PROCESSING",             advisorIdx: 1, opsIdx: 3 },
    { clientFirstName: "Michael",  clientLastName: "Patel",     clientEmail: "michael.patel@example.com",   sourceProvider: "Principal Financial",   destinationCustodian: "Schwab",        accountType: "TRADITIONAL_IRA_401K", status: "INTAKE",                 advisorIdx: 2, opsIdx: 0 },
    { clientFirstName: "Susan",    clientLastName: "Blake",     clientEmail: "susan.blake@example.com",     sourceProvider: "John Hancock",          destinationCustodian: "TD Ameritrade", accountType: "TRADITIONAL_IRA_401K", status: "IN_TRANSIT",             advisorIdx: 2, opsIdx: 4 },
    { clientFirstName: "Kevin",    clientLastName: "Anderson",  clientEmail: "kevin.anderson@example.com",  sourceProvider: "Merrill Lynch",         destinationCustodian: "Schwab",        accountType: "ROTH_IRA_401K",        status: "COMPLETED",              advisorIdx: 3, opsIdx: 1 },
    { clientFirstName: "Olivia",   clientLastName: "Martinez",  clientEmail: "olivia.martinez@example.com", sourceProvider: "Charles Schwab 401k",   destinationCustodian: "Fidelity",      accountType: "TRADITIONAL_IRA_401K", status: "AWAITING_CLIENT_ACTION", highPriority: true,  advisorIdx: 3, opsIdx: 2 },
    { clientFirstName: "William",  clientLastName: "Foster",    clientEmail: "william.foster@example.com",  sourceProvider: "TIAA",                  destinationCustodian: "Pershing",      accountType: "IRA_403B",             status: "PROCESSING",             advisorIdx: 4, opsIdx: 3 },
    { clientFirstName: "Amira",    clientLastName: "Hassan",    clientEmail: "amira.hassan@example.com",    sourceProvider: "ADP Retirement",        destinationCustodian: "Schwab",        accountType: "ROTH_IRA_401K",        status: "INTAKE",                 advisorIdx: 4, opsIdx: 4 },
    { clientFirstName: "Thomas",   clientLastName: "O'Connor",  clientEmail: "thomas.oconnor@example.com",  sourceProvider: "Voya Financial",        destinationCustodian: "Fidelity",      accountType: "TRADITIONAL_IRA_401K", status: "READY_TO_SUBMIT",        advisorIdx: 0, opsIdx: 3 },
    { clientFirstName: "Grace",    clientLastName: "Chen",      clientEmail: "grace.chen@example.com",      sourceProvider: "Fidelity NetBenefits",  destinationCustodian: "Schwab",        accountType: "OTHER",                status: "SUBMITTED",              advisorIdx: 1, opsIdx: 0 },
  ];

  const checklistTemplate = (accountType: CaseSeed["accountType"]) => [
    { name: "Government-issued ID (front & back)", required: true,  sortOrder: 0 },
    { name: "Most recent 401(k)/403(b) statement", required: true,  sortOrder: 1 },
    { name: "Signed rollover authorization form",  required: true,  sortOrder: 2 },
    { name: "Destination account confirmation",    required: true,  sortOrder: 3 },
    ...(accountType === "IRA_403B"
      ? [{ name: "403(b) plan summary description", required: true, sortOrder: 4 }]
      : []),
    { name: "Spousal consent (if applicable)",     required: false, sortOrder: 5 },
  ];

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  for (const c of caseSeeds) {
    const created = await prisma.rolloverCase.create({
      data: {
        clientFirstName: c.clientFirstName,
        clientLastName: c.clientLastName,
        clientEmail: c.clientEmail,
        sourceProvider: c.sourceProvider,
        destinationCustodian: c.destinationCustodian,
        accountType: c.accountType,
        status: c.status,
        highPriority: c.highPriority ?? false,
        firmId: firm.id,
        assignedAdvisorId: advisorIds[c.advisorIdx],
        assignedOpsId: opsIds[c.opsIdx],
      },
    });

    await prisma.activityEvent.create({
      data: {
        caseId: created.id,
        actorUserId: admin.id,
        eventType: "CASE_CREATED",
        eventDetails: "Case created (demo seed)",
      },
    });

    // Checklist
    const items = checklistTemplate(c.accountType).map((it, i) => ({
      ...it,
      status: i < 2 ? ("RECEIVED" as const) : i === 2 ? ("REQUESTED" as const) : ("NOT_STARTED" as const),
    }));
    for (const it of items) {
      await prisma.checklistItem.create({
        data: { ...it, caseId: created.id },
      });
    }

    // Tasks
    const taskDefs: Array<{ title: string; status: "OPEN" | "COMPLETED" | "BLOCKED"; dueInDays: number; assigneeId: string; description?: string }> = [
      { title: "Collect signed rollover authorization form", status: "OPEN",      dueInDays: 5,  assigneeId: opsIds[c.opsIdx], description: "Client needs to sign and return." },
      { title: "Verify destination account is open",         status: "COMPLETED", dueInDays: -3, assigneeId: opsIds[c.opsIdx] },
      { title: "Schedule follow-up call with client",        status: "OPEN",      dueInDays: 2,  assigneeId: advisorIds[c.advisorIdx] },
    ];
    for (const t of taskDefs) {
      await prisma.task.create({
        data: {
          caseId: created.id,
          title: t.title,
          description: t.description,
          status: t.status,
          dueDate: new Date(Date.now() + t.dueInDays * 24 * 60 * 60 * 1000),
          assigneeId: t.assigneeId,
          createdById: admin.id,
        },
      });
    }

    // Notes
    await prisma.note.create({
      data: {
        caseId: created.id,
        authorUserId: advisorIds[c.advisorIdx],
        fromClient: false,
        body: `Kicked off ${c.accountType.replace(/_/g, " ")} rollover from ${c.sourceProvider} to ${c.destinationCustodian}.`,
        createdAt: daysAgo(5),
      },
    });
    if (c.status !== "INTAKE") {
      await prisma.note.create({
        data: {
          caseId: created.id,
          authorUserId: opsIds[c.opsIdx],
          fromClient: false,
          body: "Verified client identity and pulled latest statement.",
          createdAt: daysAgo(3),
        },
      });
    }

    console.log(`✓ Case  ${c.clientFirstName} ${c.clientLastName.padEnd(10)} — ${c.status}`);
  }

  console.log(`\n${caseSeeds.length} cases seeded. Password for all accounts: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
