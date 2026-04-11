/**
 * Seed: Meridian Wealth Partners (seed-firm-2)
 *
 * Login credentials:
 *   admin@meridian.com   / demo1234   (Admin)
 *   claire@meridian.com  / demo1234   (Advisor)
 *   ethan@meridian.com   / demo1234   (Advisor)
 *   natalie@meridian.com / demo1234   (Ops)
 *   derek@meridian.com   / demo1234   (Ops)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function createCase(
  firmId: string,
  actorId: string,
  data: {
    clientFirstName: string;
    clientLastName: string;
    clientEmail: string;
    sourceProvider: string;
    destinationCustodian: string;
    accountType: "TRADITIONAL_IRA_401K" | "ROTH_IRA_401K" | "IRA_403B" | "OTHER";
    status: "INTAKE" | "AWAITING_CLIENT_ACTION" | "READY_TO_SUBMIT" | "SUBMITTED" | "PROCESSING" | "IN_TRANSIT" | "COMPLETED";
    highPriority?: boolean;
    internalNotes?: string;
    assignedAdvisorId?: string;
    assignedOpsId?: string;
  },
  extras?: {
    notes?: { body: string; authorId: string; daysAgo: number }[];
    tasks?: { title: string; description?: string; assigneeId?: string; dueInDays?: number; duePastDays?: number; status?: "OPEN" | "COMPLETED" | "BLOCKED" }[];
    checklist?: { name: string; required?: boolean; status?: "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE" }[];
  }
) {
  // Skip if already exists
  const existing = await prisma.rolloverCase.findFirst({
    where: { clientEmail: data.clientEmail, firmId },
  });
  if (existing) {
    console.log(`  skipped (exists): ${data.clientFirstName} ${data.clientLastName}`);
    return existing;
  }

  const created = await prisma.rolloverCase.create({
    data: { ...data, highPriority: data.highPriority ?? false, firmId },
  });

  // Activity: created
  await prisma.activityEvent.create({
    data: { caseId: created.id, actorUserId: actorId, eventType: "CASE_CREATED", eventDetails: "Case opened" },
  });

  // Notes
  for (const note of extras?.notes ?? []) {
    const n = await prisma.note.create({
      data: { caseId: created.id, authorUserId: note.authorId, body: note.body },
    });
    await prisma.activityEvent.create({
      data: { caseId: created.id, actorUserId: note.authorId, eventType: "NOTE_ADDED", eventDetails: "Note added" },
    });
  }

  // Tasks
  for (const task of extras?.tasks ?? []) {
    let dueDate: Date | undefined;
    if (task.dueInDays !== undefined) dueDate = new Date(Date.now() + task.dueInDays * 86400000);
    if (task.duePastDays !== undefined) dueDate = daysAgo(task.duePastDays);

    await prisma.task.create({
      data: {
        caseId: created.id,
        title: task.title,
        description: task.description ?? null,
        assigneeId: task.assigneeId ?? null,
        dueDate: dueDate ?? null,
        status: task.status ?? "OPEN",
        createdById: actorId,
      },
    });
  }

  // Checklist
  let sortOrder = 0;
  for (const item of extras?.checklist ?? []) {
    await prisma.checklistItem.create({
      data: {
        caseId: created.id,
        name: item.name,
        required: item.required ?? true,
        status: item.status ?? "NOT_STARTED",
        sortOrder: sortOrder++,
      },
    });
  }

  console.log(`✓ Case    ${data.clientFirstName} ${data.clientLastName} — ${data.status}`);
  return created;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const FIRM_ID = "seed-firm-2";

  const firm = await prisma.firm.upsert({
    where: { id: FIRM_ID },
    update: {},
    create: { id: FIRM_ID, name: "Meridian Wealth Partners" },
  });

  const password = await bcrypt.hash("demo1234", 10);

  const userDefs = [
    { email: "admin@meridian.com",   firstName: "Alexandra", lastName: "Rhodes",   role: "ADMIN"   as const },
    { email: "claire@meridian.com",  firstName: "Claire",    lastName: "Donovan",  role: "ADVISOR" as const },
    { email: "ethan@meridian.com",   firstName: "Ethan",     lastName: "Caldwell", role: "ADVISOR" as const },
    { email: "natalie@meridian.com", firstName: "Natalie",   lastName: "Voss",     role: "OPS"     as const },
    { email: "derek@meridian.com",   firstName: "Derek",     lastName: "Huang",    role: "OPS"     as const },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password, firmId: FIRM_ID },
    });
    console.log(`✓ ${u.role.padEnd(7)} ${u.firstName} ${u.lastName} — ${u.email} / demo1234`);
  }

  const [admin, claire, ethan, natalie, derek] = await Promise.all(
    userDefs.map((u) => prisma.user.findUnique({ where: { email: u.email } }))
  );

  // ─── Cases ─────────────────────────────────────────────────────────────────

  // 1. High-priority stalled case — AWAITING_CLIENT_ACTION, overdue tasks
  await createCase(firm.id, admin!.id, {
    clientFirstName: "Margaret",
    clientLastName: "Osei",
    clientEmail: "margaret.osei@email.com",
    sourceProvider: "Fidelity NetBenefits",
    destinationCustodian: "Schwab",
    accountType: "TRADITIONAL_IRA_401K",
    status: "AWAITING_CLIENT_ACTION",
    highPriority: true,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
    internalNotes: "Client has been unresponsive. Try calling before end of week.",
  }, {
    notes: [
      { body: "Left voicemail on 4/1. Sent follow-up email with transfer authorization form attached.", authorId: claire!.id, daysAgo: 9 },
      { body: "Client responded — says she needs another week to review. Will follow up on 4/8.", authorId: claire!.id, daysAgo: 6 },
      { body: "No response yet. Sending final reminder today.", authorId: natalie!.id, daysAgo: 1 },
    ],
    tasks: [
      { title: "Send transfer authorization form", assigneeId: natalie!.id, status: "COMPLETED" },
      { title: "Follow up call with client", assigneeId: claire!.id, duePastDays: 3, status: "OPEN" },
      { title: "Confirm client signature received", assigneeId: natalie!.id, dueInDays: 2 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "REQUESTED" },
      { name: "Government-issued ID", required: true, status: "NOT_STARTED" },
      { name: "Most recent 401(k) statement", required: true, status: "RECEIVED" },
      { name: "Beneficiary designation form", required: false, status: "NOT_STARTED" },
    ],
  });

  // 2. In progress — READY_TO_SUBMIT
  await createCase(firm.id, admin!.id, {
    clientFirstName: "Thomas",
    clientLastName: "Carver",
    clientEmail: "thomas.carver@email.com",
    sourceProvider: "Vanguard 401(k)",
    destinationCustodian: "Fidelity IRA",
    accountType: "TRADITIONAL_IRA_401K",
    status: "READY_TO_SUBMIT",
    highPriority: false,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
  }, {
    notes: [
      { body: "All documents received and reviewed. Ready to submit to Fidelity.", authorId: natalie!.id, daysAgo: 2 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", assigneeId: claire!.id, status: "COMPLETED" },
      { title: "Request required forms from provider", assigneeId: natalie!.id, status: "COMPLETED" },
      { title: "Review received documents", assigneeId: natalie!.id, status: "COMPLETED" },
      { title: "Submit paperwork to custodian", assigneeId: natalie!.id, dueInDays: 1 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "RECEIVED" },
      { name: "Most recent 401(k) statement", required: true, status: "REVIEWED" },
      { name: "IRA account opening confirmation", required: true, status: "COMPLETE" },
      { name: "Spousal consent form", required: false, status: "RECEIVED" },
    ],
  });

  // 3. Just submitted — SUBMITTED
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Priscilla",
    clientLastName: "Hawkins",
    clientEmail: "priscilla.hawkins@email.com",
    sourceProvider: "Empower Retirement",
    destinationCustodian: "Schwab",
    accountType: "ROTH_IRA_401K",
    status: "SUBMITTED",
    highPriority: false,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
  }, {
    notes: [
      { body: "Submitted to Schwab today. Confirmation number: SW-2024-88312.", authorId: derek!.id, daysAgo: 3 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", status: "COMPLETED", assigneeId: ethan!.id },
      { title: "Request required forms from provider", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Submit paperwork to custodian", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Confirm transfer progress", assigneeId: derek!.id, dueInDays: 5 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Government-issued ID", required: true, status: "COMPLETE" },
      { name: "Most recent 401(k) statement", required: true, status: "COMPLETE" },
    ],
  });

  // 4. Actively processing — PROCESSING
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Raymond",
    clientLastName: "Fitzgerald",
    clientEmail: "raymond.fitzgerald@email.com",
    sourceProvider: "T. Rowe Price",
    destinationCustodian: "Pershing",
    accountType: "IRA_403B",
    status: "PROCESSING",
    highPriority: false,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
    internalNotes: "T. Rowe Price has a 10-business-day processing window.",
  }, {
    notes: [
      { body: "T. Rowe Price confirmed receipt of transfer request. Processing window is 10 business days.", authorId: derek!.id, daysAgo: 5 },
      { body: "Day 5 of processing. No issues flagged.", authorId: derek!.id, daysAgo: 1 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", status: "COMPLETED", assigneeId: ethan!.id },
      { title: "Request required forms from provider", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Submit paperwork to custodian", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Confirm transfer progress", assigneeId: derek!.id, dueInDays: 3 },
      { title: "Notify client when funds land", assigneeId: ethan!.id, dueInDays: 7 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "403(b) plan distribution form", required: true, status: "COMPLETE" },
      { name: "IRA account number confirmation", required: true, status: "COMPLETE" },
      { name: "Withholding election form", required: true, status: "COMPLETE" },
    ],
  });

  // 5. In transit — IN_TRANSIT
  await createCase(firm.id, claire!.id, {
    clientFirstName: "Vanessa",
    clientLastName: "Morales",
    clientEmail: "vanessa.morales@email.com",
    sourceProvider: "Principal Financial",
    destinationCustodian: "Schwab",
    accountType: "TRADITIONAL_IRA_401K",
    status: "IN_TRANSIT",
    highPriority: false,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
  }, {
    notes: [
      { body: "Check issued by Principal on 4/2. Schwab confirms it should arrive within 5–7 business days.", authorId: natalie!.id, daysAgo: 4 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", status: "COMPLETED", assigneeId: claire!.id },
      { title: "Submit paperwork to custodian", status: "COMPLETED", assigneeId: natalie!.id },
      { title: "Confirm check receipt at Schwab", assigneeId: natalie!.id, dueInDays: 2 },
      { title: "Invest funds per IPS", assigneeId: claire!.id, dueInDays: 5 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Most recent statement", required: true, status: "COMPLETE" },
      { name: "Check deposit confirmation", required: true, status: "NOT_STARTED" },
    ],
  });

  // 6. Completed
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Harold",
    clientLastName: "Benson",
    clientEmail: "harold.benson@email.com",
    sourceProvider: "Merrill Lynch",
    destinationCustodian: "Schwab",
    accountType: "ROTH_IRA_401K",
    status: "COMPLETED",
    highPriority: false,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
  }, {
    notes: [
      { body: "Funds received at Schwab and invested per client's model portfolio. Case closed.", authorId: ethan!.id, daysAgo: 14 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", status: "COMPLETED", assigneeId: ethan!.id },
      { title: "Request required forms from provider", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Submit paperwork to custodian", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Confirm transfer progress", status: "COMPLETED", assigneeId: derek!.id },
      { title: "Invest funds per IPS", status: "COMPLETED", assigneeId: ethan!.id },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Government-issued ID", required: true, status: "COMPLETE" },
      { name: "Most recent 401(k) statement", required: true, status: "COMPLETE" },
      { name: "Schwab account opened", required: true, status: "COMPLETE" },
    ],
  });

  // 7. Completed — second completed case
  await createCase(firm.id, claire!.id, {
    clientFirstName: "Diane",
    clientLastName: "Kowalski",
    clientEmail: "diane.kowalski@email.com",
    sourceProvider: "John Hancock",
    destinationCustodian: "Fidelity IRA",
    accountType: "TRADITIONAL_IRA_401K",
    status: "COMPLETED",
    highPriority: false,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
  }, {
    notes: [
      { body: "Smooth process from start to finish. Fidelity IRA funded and invested. Client very happy.", authorId: claire!.id, daysAgo: 21 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Most recent 401(k) statement", required: true, status: "COMPLETE" },
      { name: "Beneficiary designation form", required: false, status: "COMPLETE" },
    ],
  });

  // 8. Blocked task — AWAITING_CLIENT_ACTION
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Jerome",
    clientLastName: "Whitfield",
    clientEmail: "jerome.whitfield@email.com",
    sourceProvider: "Nationwide",
    destinationCustodian: "Vanguard",
    accountType: "TRADITIONAL_IRA_401K",
    status: "AWAITING_CLIENT_ACTION",
    highPriority: true,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
    internalNotes: "Nationwide requires medallion signature guarantee — client is travelling and cannot get to a branch.",
  }, {
    notes: [
      { body: "Medallion signature required by Nationwide. Client is out of the country until 4/18.", authorId: derek!.id, daysAgo: 4 },
      { body: "Suggested client use a US consulate or bank branch overseas. Waiting on confirmation.", authorId: ethan!.id, daysAgo: 2 },
    ],
    tasks: [
      { title: "Confirm rollover details with client", status: "COMPLETED", assigneeId: ethan!.id },
      { title: "Request medallion signature from client", status: "BLOCKED", assigneeId: derek!.id },
      { title: "Submit transfer paperwork to Nationwide", assigneeId: derek!.id, dueInDays: 10 },
    ],
    checklist: [
      { name: "Medallion Signature Guarantee", required: true, status: "REQUESTED" },
      { name: "Most recent statement", required: true, status: "RECEIVED" },
      { name: "Government-issued ID", required: true, status: "RECEIVED" },
      { name: "Vanguard IRA account confirmation", required: true, status: "COMPLETE" },
    ],
  });

  // 9. Fresh intake
  await createCase(firm.id, claire!.id, {
    clientFirstName: "Yolanda",
    clientLastName: "Reyes",
    clientEmail: "yolanda.reyes@email.com",
    sourceProvider: "Mass Mutual",
    destinationCustodian: "Schwab",
    accountType: "ROTH_IRA_401K",
    status: "INTAKE",
    highPriority: false,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
  }, {
    tasks: [
      { title: "Confirm rollover details with client", assigneeId: claire!.id, dueInDays: 2 },
      { title: "Request required forms from provider", assigneeId: natalie!.id, dueInDays: 4 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "NOT_STARTED" },
      { name: "Most recent 401(k) statement", required: true, status: "NOT_STARTED" },
      { name: "Government-issued ID", required: true, status: "NOT_STARTED" },
    ],
  });

  // 10. Another fresh intake
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Gerald",
    clientLastName: "Sutton",
    clientEmail: "gerald.sutton@email.com",
    sourceProvider: "Lincoln Financial",
    destinationCustodian: "Pershing",
    accountType: "IRA_403B",
    status: "INTAKE",
    highPriority: false,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
  }, {
    tasks: [
      { title: "Confirm rollover details with client", assigneeId: ethan!.id, dueInDays: 3 },
    ],
    checklist: [
      { name: "403(b) plan distribution form", required: true, status: "NOT_STARTED" },
      { name: "Most recent statement", required: true, status: "NOT_STARTED" },
      { name: "Pershing account number", required: true, status: "NOT_STARTED" },
      { name: "Withholding election form", required: false, status: "NOT_STARTED" },
    ],
  });

  // 11. Stale — PROCESSING, old update date (will appear in stale widget)
  await createCase(firm.id, claire!.id, {
    clientFirstName: "Beverly",
    clientLastName: "Chambers",
    clientEmail: "beverly.chambers@email.com",
    sourceProvider: "Prudential",
    destinationCustodian: "Fidelity",
    accountType: "TRADITIONAL_IRA_401K",
    status: "PROCESSING",
    highPriority: false,
    assignedAdvisorId: claire!.id,
    assignedOpsId: natalie!.id,
    internalNotes: "Prudential has been slow to respond. Need to escalate.",
  }, {
    notes: [
      { body: "Submitted to Prudential on 3/24. Still waiting on confirmation. Will call tomorrow.", authorId: natalie!.id, daysAgo: 16 },
    ],
    tasks: [
      { title: "Follow up call with Prudential ops team", assigneeId: natalie!.id, duePastDays: 8 },
      { title: "Escalate if no response by 4/12", assigneeId: claire!.id, duePastDays: 2 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Most recent statement", required: true, status: "COMPLETE" },
      { name: "Fidelity IRA confirmation", required: true, status: "COMPLETE" },
      { name: "Transfer confirmation from Prudential", required: true, status: "REQUESTED" },
    ],
  });

  // 12. Stale — SUBMITTED, old
  await createCase(firm.id, ethan!.id, {
    clientFirstName: "Curtis",
    clientLastName: "Flemming",
    clientEmail: "curtis.flemming@email.com",
    sourceProvider: "Guardian Life",
    destinationCustodian: "Vanguard",
    accountType: "OTHER",
    status: "SUBMITTED",
    highPriority: false,
    assignedAdvisorId: ethan!.id,
    assignedOpsId: derek!.id,
  }, {
    notes: [
      { body: "Submitted to Guardian. Their processing team noted possible hold period due to ERISA plan type.", authorId: derek!.id, daysAgo: 12 },
    ],
    tasks: [
      { title: "Confirm ERISA plan type with Guardian", assigneeId: derek!.id, duePastDays: 5 },
      { title: "Notify client of potential delay", assigneeId: ethan!.id, duePastDays: 3 },
    ],
    checklist: [
      { name: "Transfer Authorization Form", required: true, status: "COMPLETE" },
      { name: "Plan distribution form", required: true, status: "COMPLETE" },
      { name: "ERISA plan verification", required: true, status: "REQUESTED" },
      { name: "Vanguard account confirmation", required: true, status: "COMPLETE" },
    ],
  });

  console.log(`
╔══════════════════════════════════════════════════════╗
║         Meridian Wealth Partners — seeded            ║
╠══════════════════════════════════════════════════════╣
║  admin@meridian.com     / demo1234   (Admin)         ║
║  claire@meridian.com    / demo1234   (Advisor)       ║
║  ethan@meridian.com     / demo1234   (Advisor)       ║
║  natalie@meridian.com   / demo1234   (Ops)           ║
║  derek@meridian.com     / demo1234   (Ops)           ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
