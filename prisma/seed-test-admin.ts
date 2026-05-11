/**
 * Idempotent seed: creates a "V2 Test Firm" with one ADMIN user, a few ADVISOR/OPS
 * teammates, and ~15 sample cases spread across all 7 stages. Skips onboarding.
 *
 * Run:
 *   DATABASE_URL=$(grep DIRECT_URL .env | sed -e 's/DIRECT_URL=//' -e 's/"//g') \
 *     npx tsx prisma/seed-test-admin.ts
 */
import { PrismaClient, type CaseStatus, type AccountType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TEST_EMAIL = "v2admin@rift.test";
const TEST_PASSWORD = "TestAdmin!2026";
const TEST_FIRM_SLUG = "v2-test-firm";

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  // Firm
  const firm = await prisma.firm.upsert({
    where: { slug: TEST_FIRM_SLUG },
    update: { onboardedAt: new Date() },
    create: {
      name: "Summit Wealth (V2 Test)",
      slug: TEST_FIRM_SLUG,
      planTier: "PRO",
      seatsLimit: 12,
      onboardedAt: new Date(),
      legalName: "Summit Wealth Partners, LLC",
      supportEmail: "hello@summit.test",
      supportPhone: "(303) 555-0142",
      businessAddress: "1340 Pearl Street, Suite 200\nBoulder, CO 80302",
      websiteUrl: "https://summit.test",
    },
  });

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { password: passwordHash, role: "ADMIN", firmId: firm.id, deactivatedAt: null },
    create: {
      email: TEST_EMAIL,
      password: passwordHash,
      firstName: "Sarah",
      lastName: "Mitchell",
      role: "ADMIN",
      firmId: firm.id,
      bio: "CFP® with 12 years helping retirees navigate rollovers. Based in Boulder.",
      emailSignature: "Sarah Mitchell, CFP®\nSummit Wealth Partners\n(303) 555-0142",
    },
  });

  // Teammates
  const team = await Promise.all(
    [
      { email: "daniel@summit.test", first: "Daniel", last: "Park", role: "ADVISOR" as const },
      { email: "priya@summit.test", first: "Priya", last: "Raman", role: "ADVISOR" as const },
      { email: "marco@summit.test", first: "Marco", last: "Bianchi", role: "ADVISOR" as const },
      { email: "jordan@summit.test", first: "Jordan", last: "Lee", role: "OPS" as const },
      { email: "aisha@summit.test", first: "Aisha", last: "Khan", role: "OPS" as const },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { firmId: firm.id, role: u.role, deactivatedAt: null },
        create: {
          email: u.email,
          password: passwordHash, // same password for all test users
          firstName: u.first,
          lastName: u.last,
          role: u.role,
          firmId: firm.id,
          lastLoginAt: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
        },
      })
    )
  );

  const advisors = team.filter((u) => u.role === "ADVISOR");
  const ops = team.filter((u) => u.role === "OPS");

  // Seed cases — distribute across stages
  const statuses: CaseStatus[] = [
    "PROPOSAL_ACCEPTED",
    "AWAITING_CLIENT_ACTION",
    "READY_TO_SUBMIT",
    "SUBMITTED",
    "PROCESSING",
    "IN_TRANSIT",
    "WON",
  ];
  const accountTypes: AccountType[] = [
    "TRADITIONAL_IRA_401K",
    "ROTH_IRA_401K",
    "IRA_403B",
    "OTHER",
  ];
  const custodians = [
    "Fidelity",
    "Charles Schwab",
    "Vanguard",
    "Altruist",
    "Empower",
    "TIAA",
    "Pershing",
    "Raymond James",
  ];

  const clients: Array<[string, string]> = [
    ["Margaret", "Chen"],
    ["Robert", "Whitfield"],
    ["Lin", "Okafor"],
    ["Hannah", "Goldberg"],
    ["David", "Park"],
    ["Patricia", "Ngo"],
    ["Anthony", "Reeves"],
    ["Sofia", "Marquez"],
    ["James", "OBrien"],
    ["Yusuf", "Demir"],
    ["Kenji", "Watanabe"],
    ["Helen", "Cartwright"],
    ["Ada", "Okonkwo"],
    ["Brian", "Holloway"],
    ["Camila", "Vega"],
  ];

  // Wipe existing test-firm cases so the seed is idempotent and stage distribution stays even.
  await prisma.rolloverCase.deleteMany({ where: { firmId: firm.id } });

  let i = 0;
  for (const [first, last] of clients) {
    const status = statuses[i % statuses.length];
    const accountType = accountTypes[i % accountTypes.length];
    const sourceProvider = custodians[(i * 3) % custodians.length];
    const destinationCustodian = custodians[(i * 5 + 1) % custodians.length];
    const advisor = advisors[i % advisors.length];
    const opsUser = ops[i % ops.length];
    const amount = 50_000 + ((i * 41117) % 800_000);
    const createdAt = new Date(Date.now() - (30 + (i % 60)) * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(Date.now() - (i % 14) * 24 * 60 * 60 * 1000);

    await prisma.rolloverCase.create({
      data: {
        firmId: firm.id,
        clientFirstName: first,
        clientLastName: last,
        clientEmail: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        clientPhone: `+1 (415) 555-0${(100 + i).toString()}`,
        sourceProvider,
        destinationCustodian,
        accountType,
        status,
        highPriority: i % 5 === 0,
        needsReview: i % 7 === 0,
        wealthboxAmount: amount,
        wealthboxAmountCurrency: "USD",
        assignedAdvisorId: advisor.id,
        assignedOpsId: opsUser.id,
        createdAt,
        updatedAt,
        statusUpdatedAt: updatedAt,
        internalNotes:
          i % 3 === 0
            ? "Client traveling next week. Authorized e-sign in writing — confirmed."
            : null,
      },
    });
    i++;
  }

  console.log(`\n  Seeded V2 test firm "${firm.name}" (${firm.id})`);
  console.log(`  Admin login: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  console.log(`  ${team.length} teammates, ${clients.length} cases across all stages.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
