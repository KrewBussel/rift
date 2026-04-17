import { prisma } from "./prisma";
import {
  sendEmail,
  buildOverdueTasksEmail,
  buildStalledCasesEmail,
  buildMissingDocsEmail,
  type OverdueTaskItem,
  type StalledCaseItem,
  type MissingDocCase,
} from "./email";

interface OverdueTaskPreview {
  type: "OVERDUE_TASKS";
  to: string;
  name: string;
  subject: string;
  taskCount: number;
}

interface StalledCasePreview {
  type: "STALLED_CASES";
  to: string;
  name: string;
  subject: string;
  caseCount: number;
}

interface MissingDocPreview {
  type: "MISSING_DOCS";
  to: string;
  name: string;
  subject: string;
  caseCount: number;
}

export interface ReminderResult {
  firmId: string;
  firmName: string;
  overdueTaskEmails: number;
  stalledCaseEmails: number;
  missingDocEmails: number;
  skipped: string[];
  dryRun: boolean;
}

// Check if a reminder of this type was already sent to this recipient in the last 20 hours
async function alreadySentToday(
  firmId: string,
  type: string,
  referenceId: string,
  sentTo: string
): Promise<boolean> {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const existing = await prisma.reminderLog.findFirst({
    where: { firmId, type, referenceId, sentTo, sentAt: { gte: since } },
  });
  return !!existing;
}

async function logReminder(
  firmId: string,
  type: string,
  referenceId: string,
  sentTo: string
): Promise<void> {
  await prisma.reminderLog.create({ data: { firmId, type, referenceId, sentTo } });
}

// ─── Overdue Tasks ────────────────────────────────────────────────────────────

async function sendOverdueTaskReminders(
  firmId: string,
  dryRun: boolean
): Promise<{ sent: number; previews: OverdueTaskPreview[] }> {
  const now = new Date();

  // Find all open overdue tasks for this firm, grouped by assignee
  const tasks = await prisma.task.findMany({
    where: {
      case: { firmId },
      status: "OPEN",
      dueDate: { lt: now, not: null },
      assigneeId: { not: null },
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      case: { select: { id: true, clientFirstName: true, clientLastName: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  if (tasks.length === 0) return { sent: 0, previews: [] };

  // Group by assignee
  const byAssignee = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.assignee) continue;
    const key = task.assignee.id;
    if (!byAssignee.has(key)) byAssignee.set(key, []);
    byAssignee.get(key)!.push(task);
  }

  let sent = 0;
  const previews: OverdueTaskPreview[] = [];

  for (const [assigneeId, assigneeTasks] of byAssignee) {
    const assignee = assigneeTasks[0].assignee!;
    const refId = `overdue-tasks-${assigneeId}`;

    if (!dryRun && (await alreadySentToday(firmId, "OVERDUE_TASKS", refId, assignee.email))) {
      continue;
    }

    const items: OverdueTaskItem[] = assigneeTasks.map((t) => ({
      taskTitle: t.title,
      caseId: t.case.id,
      clientName: `${t.case.clientFirstName} ${t.case.clientLastName}`,
      daysOverdue: Math.floor((now.getTime() - t.dueDate!.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const { subject, html } = buildOverdueTasksEmail(assignee.firstName, items);

    previews.push({
      type: "OVERDUE_TASKS",
      to: assignee.email,
      name: `${assignee.firstName} ${assignee.lastName}`,
      subject,
      taskCount: items.length,
    });

    if (!dryRun) {
      const ok = await sendEmail(assignee.email, subject, html);
      if (ok) await logReminder(firmId, "OVERDUE_TASKS", refId, assignee.email);
      sent++;
    }
  }

  return { sent: dryRun ? 0 : sent, previews };
}

// ─── Stalled Cases ────────────────────────────────────────────────────────────

async function sendStalledCaseReminders(
  firmId: string,
  thresholdDays: number,
  dryRun: boolean
): Promise<{ sent: number; previews: StalledCasePreview[] }> {
  const threshold = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

  const stalledCases = await prisma.rolloverCase.findMany({
    where: {
      firmId,
      status: { not: "COMPLETED" },
      updatedAt: { lt: threshold },
    },
    include: {
      assignedAdvisor: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  if (stalledCases.length === 0) return { sent: 0, previews: [] };

  // Send to all admins and ops users at the firm
  const recipients = await prisma.user.findMany({
    where: { firmId, role: { in: ["ADMIN", "OPS"] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (recipients.length === 0) return { sent: 0, previews: [] };

  const caseItems: StalledCaseItem[] = stalledCases.map((c) => ({
    caseId: c.id,
    clientName: `${c.clientFirstName} ${c.clientLastName}`,
    status: c.status,
    daysIdle: Math.floor((Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    assignedAdvisor: c.assignedAdvisor
      ? `${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`
      : null,
  }));

  let sent = 0;
  const previews: StalledCasePreview[] = [];

  for (const user of recipients) {
    const refId = `stalled-digest-${firmId}`;

    if (!dryRun && (await alreadySentToday(firmId, "STALLED_CASES", refId, user.email))) {
      continue;
    }

    const { subject, html } = buildStalledCasesEmail(user.firstName, caseItems, thresholdDays);

    previews.push({
      type: "STALLED_CASES",
      to: user.email,
      name: `${user.firstName} ${user.lastName}`,
      subject,
      caseCount: caseItems.length,
    });

    if (!dryRun) {
      const ok = await sendEmail(user.email, subject, html);
      if (ok) await logReminder(firmId, "STALLED_CASES", refId, user.email);
      sent++;
    }
  }

  return { sent: dryRun ? 0 : sent, previews };
}

// ─── Missing Documents ────────────────────────────────────────────────────────

async function sendMissingDocReminders(
  firmId: string,
  dryRun: boolean
): Promise<{ sent: number; previews: MissingDocPreview[] }> {
  // Find active cases (past INTAKE) with required checklist items not yet received
  const cases = await prisma.rolloverCase.findMany({
    where: {
      firmId,
      status: { notIn: ["INTAKE", "COMPLETED"] },
    },
    include: {
      checklistItems: {
        where: { required: true, status: { in: ["NOT_STARTED", "REQUESTED"] } },
        select: { name: true },
      },
      assignedOps: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  const casesWithMissing = cases.filter((c) => c.checklistItems.length > 0);
  if (casesWithMissing.length === 0) return { sent: 0, previews: [] };

  // Group by assigned ops user; fallback to all ops/admin if no ops assigned
  const byOps = new Map<string, { user: NonNullable<(typeof cases)[0]["assignedOps"]>; cases: MissingDocCase[] }>();

  for (const c of casesWithMissing) {
    if (!c.assignedOps) continue;
    const key = c.assignedOps.id;
    if (!byOps.has(key)) byOps.set(key, { user: c.assignedOps, cases: [] });
    byOps.get(key)!.cases.push({
      caseId: c.id,
      clientName: `${c.clientFirstName} ${c.clientLastName}`,
      missingItems: c.checklistItems.map((i) => i.name),
    });
  }

  let sent = 0;
  const previews: MissingDocPreview[] = [];

  for (const [opsId, { user, cases: opsCases }] of byOps) {
    const refId = `missing-docs-${opsId}`;

    if (!dryRun && (await alreadySentToday(firmId, "MISSING_DOCS", refId, user.email))) {
      continue;
    }

    const { subject, html } = buildMissingDocsEmail(user.firstName, opsCases);

    previews.push({
      type: "MISSING_DOCS",
      to: user.email,
      name: `${user.firstName} ${user.lastName}`,
      subject,
      caseCount: opsCases.length,
    });

    if (!dryRun) {
      const ok = await sendEmail(user.email, subject, html);
      if (ok) await logReminder(firmId, "MISSING_DOCS", refId, user.email);
      sent++;
    }
  }

  return { sent: dryRun ? 0 : sent, previews };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function runReminders(dryRun = false): Promise<ReminderResult[]> {
  const firms = await prisma.firm.findMany({
    include: {
      settings: true,
    },
  });

  const results: ReminderResult[] = [];

  for (const firm of firms) {
    const settings = firm.settings ?? {
      remindersEnabled: true,
      stalledCaseDays: 7,
      overdueTaskReminders: true,
      stalledCaseReminders: true,
      missingDocsReminders: false,
    };

    if (!settings.remindersEnabled) {
      results.push({
        firmId: firm.id,
        firmName: firm.name,
        overdueTaskEmails: 0,
        stalledCaseEmails: 0,
        missingDocEmails: 0,
        skipped: ["reminders disabled"],
        dryRun,
      });
      continue;
    }

    const skipped: string[] = [];
    let overdueTaskEmails = 0;
    let stalledCaseEmails = 0;
    let missingDocEmails = 0;

    if (settings.overdueTaskReminders) {
      const r = await sendOverdueTaskReminders(firm.id, dryRun);
      overdueTaskEmails = r.previews.length;
      if (dryRun && r.previews.length > 0) {
        r.previews.forEach((p) =>
          console.log(`[dry-run] Would send "${p.subject}" to ${p.to}`)
        );
      }
    } else {
      skipped.push("overdue task reminders disabled");
    }

    if (settings.stalledCaseReminders) {
      const r = await sendStalledCaseReminders(firm.id, settings.stalledCaseDays, dryRun);
      stalledCaseEmails = r.previews.length;
      if (dryRun && r.previews.length > 0) {
        r.previews.forEach((p) =>
          console.log(`[dry-run] Would send "${p.subject}" to ${p.to}`)
        );
      }
    } else {
      skipped.push("stalled case reminders disabled");
    }

    if (settings.missingDocsReminders) {
      const r = await sendMissingDocReminders(firm.id, dryRun);
      missingDocEmails = r.previews.length;
    } else {
      skipped.push("missing docs reminders disabled");
    }

    results.push({
      firmId: firm.id,
      firmName: firm.name,
      overdueTaskEmails,
      stalledCaseEmails,
      missingDocEmails,
      skipped,
      dryRun,
    });
  }

  return results;
}

// ─── Firm Settings helpers ────────────────────────────────────────────────────

export async function getOrCreateFirmSettings(firmId: string) {
  const existing = await prisma.firmSettings.findUnique({ where: { firmId } });
  if (existing) return existing;

  return prisma.firmSettings.create({
    data: {
      firmId,
      remindersEnabled: true,
      stalledCaseDays: 7,
      overdueTaskReminders: true,
      stalledCaseReminders: true,
      missingDocsReminders: false,
    },
  });
}
