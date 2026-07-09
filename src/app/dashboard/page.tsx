import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import AdminDashboard, {
  type V2PipelineBucket,
  type V2NeedsAttentionItem,
  type V2ActivityItem,
  type V2WorkloadRow,
  type V2InflowWeek,
} from "@/components/AdminDashboard";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { computeOnboardingChecklist } from "@/lib/onboarding";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { getFirmStageConfig } from "@/lib/stageConfig";
import { maybePollOnPageLoad } from "@/lib/crmSync";
import { STATUSES, resolveStageLabel, resolveEnabledStages } from "@/components/casesDesignTokens";

const DEFAULT_STATUS_LABELS: Record<string, string> = {
  PROPOSAL_ACCEPTED: "Proposal Accepted",
  AWAITING_CLIENT_ACTION: "Awaiting Client Action",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  WON: "Won",
};

function describeEvent(type: string): string {
  switch (type) {
    case "CASE_CREATED":          return "opened case";
    case "CASE_UPDATED":          return "updated case";
    case "STATUS_CHANGED":        return "moved case";
    case "NOTE_ADDED":            return "added a note to";
    case "OWNER_CHANGED":         return "reassigned";
    case "TASK_CREATED":          return "created a task on";
    case "TASK_COMPLETED":        return "completed a task on";
    case "TASK_REOPENED":         return "reopened a task on";
    case "FILE_UPLOADED":         return "uploaded a file to";
    case "FILE_DELETED":          return "deleted a file from";
    case "CHECKLIST_ITEM_UPDATED": return "updated the checklist for";
    default:                      return "touched";
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Non-admins land directly on the cases list — that's their primary
  // workspace. The dashboard summary view is admin-only.
  if (role !== "ADMIN") redirect("/dashboard/cases");

  // Auto-pull from CRM on dashboard load. Throttled + time-boxed so a slow
  // upstream API never blocks the render.
  await maybePollOnPageLoad(firmId);

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true, bio: true, emailSignature: true },
  });
  const prefs: Record<string, unknown> =
    userRecord?.preferences !== null && typeof userRecord?.preferences === "object" && !Array.isArray(userRecord?.preferences)
      ? (userRecord.preferences as Record<string, unknown>)
      : {};
  const onboardingHidden = prefs.onboardingHidden === true;
  const userName = session.user?.name?.split(" ")[0] ?? "Your";

  const firmSettings = await getOrCreateFirmSettings(firmId);
  const stageConfig = await getFirmStageConfig(firmId);
  const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    STATUSES.map((s) => [s.value, resolveStageLabel(s.value, stageConfig) || DEFAULT_STATUS_LABELS[s.value]]),
  );
  const now = new Date();
  const stalledThreshold = new Date(now.getTime() - firmSettings.stalledCaseDays * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    firm,
    allCases,
    stalledCases,
    overdueTasks,
    activityRows,
    crmConnection,
    teamUsers,
    completedThisMonth,
    completedLastMonth,
    recentlyCompleted,
  ] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: firmId },
      select: {
        name: true,
        logoUrl: true,
        supportEmail: true,
        businessAddress: true,
      },
    }),
    prisma.rolloverCase.findMany({
      where: { firmId },
      select: { status: true },
    }),
    prisma.rolloverCase.findMany({
      where: {
        firmId,
        status: { not: "WON" },
        updatedAt: { lt: stalledThreshold },
      },
      select: {
        id: true,
        clientFirstName: true,
        clientLastName: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 6,
    }),
    prisma.task.findMany({
      where: {
        case: { firmId },
        status: { not: "COMPLETED" },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        case: { select: { id: true, clientFirstName: true, clientLastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.activityEvent.findMany({
      where: { case: { firmId } },
      include: {
        actor: { select: { firstName: true, lastName: true } },
        case: { select: { id: true, clientFirstName: true, clientLastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.crmConnection.findUnique({
      where: { firmId },
      select: { provider: true },
    }),
    prisma.user.findMany({
      where: {
        firmId,
        deactivatedAt: null,
        role: { in: ["ADVISOR", "OPS"] },
      },
      select: {
        id: true, firstName: true, lastName: true, role: true,
        _count: {
          select: {
            assignedCases: { where: { status: { not: "WON" } } },
            ownedCases: { where: { status: { not: "WON" } } },
          },
        },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
    prisma.rolloverCase.count({
      where: { firmId, status: "WON", statusUpdatedAt: { gte: thisMonthStart } },
    }),
    prisma.rolloverCase.count({
      where: { firmId, status: "WON", statusUpdatedAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    prisma.rolloverCase.findMany({
      where: { firmId, status: "WON", statusUpdatedAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, statusUpdatedAt: true },
    }),
  ]);

  // Pull all team users (including the admin) for workload panels — note this
  // is a SECOND user query (the first one excludes ADMIN). The first one
  // drives velocity-only stats; this one drives the per-person workload UI.
  const allTeamUsers = await prisma.user.findMany({
    where: { firmId, deactivatedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      assignedCases: {
        where: { status: { not: "WON" } },
        select: { status: true },
      },
      ownedCases: {
        where: { status: { not: "WON" } },
        select: { status: true },
      },
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  // Weekly inflow — last 12 weeks of case createdAt counts
  const inflowSince = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const inflowCases = await prisma.rolloverCase.findMany({
    where: { firmId, createdAt: { gte: inflowSince } },
    select: { createdAt: true },
  });
  const inflowBuckets: V2InflowWeek[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    inflowBuckets.push({
      weekStart: weekStart.toISOString(),
      count: inflowCases.filter((c) => c.createdAt >= weekStart && c.createdAt < weekEnd).length,
    });
  }

  // Only the firm's enabled stages appear in the pipeline summary — mirrors the
  // cases board, which hides disabled intermediate stages.
  const pipeline: V2PipelineBucket[] = resolveEnabledStages(stageConfig).map((s) => ({
    status: s.value,
    label: s.label,
    count: allCases.filter((c) => c.status === s.value).length,
  }));

  const daysAgo = (d: Date) => Math.max(1, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));

  const needsAttention: V2NeedsAttentionItem[] = [
    ...stalledCases.map<V2NeedsAttentionItem>((c) => ({
      id: `case-${c.id}`,
      kind: "stalled_case",
      title: `${c.clientFirstName} ${c.clientLastName}`,
      detail: `${STATUS_LABELS[c.status]} · stalled`,
      href: `/dashboard/cases/${c.id}`,
      daysAgo: daysAgo(c.updatedAt),
    })),
    ...overdueTasks.map<V2NeedsAttentionItem>((t) => ({
      id: `task-${t.id}`,
      kind: "overdue_task",
      title: t.title,
      detail: `${t.case.clientFirstName} ${t.case.clientLastName}${t.assignee ? ` · ${t.assignee.firstName} ${t.assignee.lastName}` : ""}`,
      href: `/dashboard/cases/${t.case.id}`,
      daysAgo: t.dueDate ? daysAgo(t.dueDate) : 1,
    })),
  ].sort((a, b) => b.daysAgo - a.daysAgo);

  const activity: V2ActivityItem[] = activityRows.map((e) => ({
    id: e.id,
    actor: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : null,
    verb: describeEvent(e.eventType),
    target: e.case ? `${e.case.clientFirstName} ${e.case.clientLastName}` : null,
    href: e.case ? `/dashboard/cases/${e.case.id}` : null,
    createdAt: e.createdAt.toISOString(),
  }));

  const workloadAdvisors: V2WorkloadRow[] = allTeamUsers
    .filter((u) => u.role === "ADVISOR" || u.role === "ADMIN")
    .map((u) => {
      const byStatus: Record<string, number> = {};
      for (const c of u.assignedCases) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role as "ADMIN" | "ADVISOR",
        total: u.assignedCases.length,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const workloadOps: V2WorkloadRow[] = allTeamUsers
    .filter((u) => u.role === "OPS" || u.role === "ADMIN")
    .map((u) => {
      const byStatus: Record<string, number> = {};
      for (const c of u.ownedCases) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role as "ADMIN" | "OPS",
        total: u.ownedCases.length,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalMs = recentlyCompleted.reduce(
    (sum, c) => sum + (c.statusUpdatedAt.getTime() - c.createdAt.getTime()),
    0
  );
  const avgDaysToComplete =
    recentlyCompleted.length === 0
      ? null
      : totalMs / recentlyCompleted.length / (1000 * 60 * 60 * 24);

  const awaitingClientCount = allCases.filter((c) => c.status === "AWAITING_CLIENT_ACTION").length;
  const activeCount = allCases.filter((c) => c.status !== "WON").length;

  const onboarding = onboardingHidden
    ? null
    : computeOnboardingChecklist({
        role,
        user: {
          bio: userRecord?.bio ?? null,
          emailSignature: userRecord?.emailSignature ?? null,
        },
        prefs,
        hasAnyCase: allCases.length > 0,
        firm: firm
          ? {
              logoUrl: firm.logoUrl,
              supportEmail: firm.supportEmail,
              businessAddress: firm.businessAddress,
            }
          : { logoUrl: null, supportEmail: null, businessAddress: null },
        crmConnected: !!crmConnection,
        teamMemberCount: teamUsers.length,
      });

  return (
    <>
      {onboarding && (
        <div style={{ padding: "20px 36px 0" }}>
          <OnboardingChecklist {...onboarding} />
        </div>
      )}
      <AdminDashboard
        firmName={firm?.name ?? "Workspace"}
        userFirstName={userName}
        pipeline={pipeline}
        needsAttention={needsAttention}
        activity={activity}
        workloadAdvisors={workloadAdvisors}
        workloadOps={workloadOps}
        throughput={{
          activeCases: activeCount,
          awaitingClient: awaitingClientCount,
          avgCycleDays: avgDaysToComplete,
          completedThisMonth,
          completedLastMonth,
        }}
        inflow={inflowBuckets}
      />
    </>
  );
}
