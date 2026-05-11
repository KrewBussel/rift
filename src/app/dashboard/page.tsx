import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@prisma/client";
import CaseList from "@/components/CaseList";
import DashboardWidgets from "@/components/DashboardWidgets";
// AdminDashboard (v1) is still used by non-admin paths indirectly; v2 lives in components/v2

import AdminDashboardV2, {
  type V2PipelineBucket,
  type V2NeedsAttentionItem,
  type V2ActivityItem,
  type V2WorkloadRow,
  type V2InflowWeek,
} from "@/components/v2/AdminDashboardV2";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import OnboardingChecklistV2 from "@/components/v2/OnboardingChecklistV2";
import { computeOnboardingChecklist } from "@/lib/onboarding";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { getFirmStageConfig } from "@/lib/stageConfig";
import { maybePollOnPageLoad } from "@/lib/crmSync";
import { STATUSES, resolveStageLabel } from "@/components/casesDesignTokens";

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

const STALE_DAYS = 7;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; advisorId?: string; opsId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Auto-pull from Wealthbox on dashboard load — same throttled, time-boxed
  // helper used by the cases list page. Newly-created cases land in the
  // pipeline counts and "needs attention" lists in this same render.
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

  /* ── ADMIN path ─────────────────────────────────────────────────────── */
  if (role === "ADMIN") {
    const firmSettings = await getOrCreateFirmSettings(firmId);
    const stageConfig = await getFirmStageConfig(firmId);
    const STATUS_LABELS: Record<string, string> = Object.fromEntries(
      STATUSES.map((s) => [s.value, resolveStageLabel(s.value, stageConfig) || DEFAULT_STATUS_LABELS[s.value]]),
    );
    const stalledThreshold = new Date(Date.now() - firmSettings.stalledCaseDays * 24 * 60 * 60 * 1000);
    const now = new Date();
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
      openedThisMonth,
      completedThisMonth,
      openedLastMonth,
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
          where: { firmId, createdAt: { gte: thisMonthStart } },
        }),
        prisma.rolloverCase.count({
          where: { firmId, status: "WON", statusUpdatedAt: { gte: thisMonthStart } },
        }),
        prisma.rolloverCase.count({
          where: { firmId, createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
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

    const pipeline: V2PipelineBucket[] = (Object.keys(STATUS_LABELS) as CaseStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: allCases.filter((c) => c.status === status).length,
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
            <OnboardingChecklistV2 {...onboarding} />
          </div>
        )}
        <AdminDashboardV2
          firmName={firm?.name ?? "Workspace"}
          userFirstName={userName}
          pipeline={pipeline}
          needsAttention={needsAttention}
          activity={activity}
          team={[]}
          workloadAdvisors={workloadAdvisors}
          workloadOps={workloadOps}
          throughput={{
            activeCases: activeCount,
            awaitingClient: awaitingClientCount,
            avgCycleDays: avgDaysToComplete,
            completedThisMonth,
            completedLastMonth,
            openedThisMonth,
            openedLastMonth,
          }}
          inflow={inflowBuckets}
        />
      </>
    );
  }

  /* ── Non-admin path ──────────────────────────────────────────────────── */
  const staleThreshold = new Date(new Date().getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const search = params.search ?? "";
  const status = params.status ?? (prefs.defaultStatusFilter as string | undefined) ?? "";
  const showWidgets = prefs.showDashboardWidgets !== false;
  const compactList = prefs.compactCaseList === true;

  const roleVisibilityFilter =
    role === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : role === "OPS"
      ? { assignedOpsId: userId }
      : {};

  const caseWhere = {
    firmId,
    ...roleVisibilityFilter,
    ...(search
      ? {
          OR: [
            { clientFirstName: { contains: search, mode: "insensitive" as const } },
            { clientLastName: { contains: search, mode: "insensitive" as const } },
            { clientEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status: status as CaseStatus } : {}),
  };

  const [cases, myTasks, staleCases, firm] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: caseWhere,
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        case: { firmId },
      },
      include: {
        case: { select: { id: true, clientFirstName: true, clientLastName: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.rolloverCase.findMany({
      where: {
        firmId,
        ...roleVisibilityFilter,
        status: { not: "WON" },
        updatedAt: { lt: staleThreshold },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.firm.findUnique({ where: { id: firmId }, select: { name: true } }),
  ]);

  const stageConfig = await getFirmStageConfig(firmId);
  const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    STATUSES.map((s) => [s.value, resolveStageLabel(s.value, stageConfig) || DEFAULT_STATUS_LABELS[s.value]]),
  );

  // Compute dashboard stats before serialization (dates are still Date objects here)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + 7);

  const statusCounts = cases.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const accountTypeCounts = cases.reduce((acc, c) => {
    acc[c.accountType] = (acc[c.accountType] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalActive = cases.filter((c) => c.status !== "WON").length;
  const totalCompleted = cases.filter((c) => c.status === "WON").length;
  const completedThisMonth = cases.filter(
    (c) => c.status === "WON" && c.updatedAt >= startOfMonth
  ).length;

  const taskBreakdown = {
    overdue: myTasks.filter((t) => t.dueDate && t.dueDate < now).length,
    dueToday: myTasks.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= endOfToday).length,
    dueThisWeek: myTasks.filter((t) => t.dueDate && t.dueDate > endOfToday && t.dueDate <= endOfWeek).length,
    noDueDate: myTasks.filter((t) => !t.dueDate).length,
  };

  const serializedCases = cases.map((c) => ({
    ...c,
    statusUpdatedAt: c.statusUpdatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const serializedTasks = myTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializedStale = staleCases.map((c) => ({
    id: c.id,
    clientFirstName: c.clientFirstName,
    clientLastName: c.clientLastName,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
    daysSinceActivity: Math.floor(
      (new Date().getTime() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  const onboarding = onboardingHidden
    ? null
    : computeOnboardingChecklist({
        role,
        user: {
          bio: userRecord?.bio ?? null,
          emailSignature: userRecord?.emailSignature ?? null,
        },
        prefs,
        hasAnyCase: cases.length > 0,
      });

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "#e4e6ea" }}
          >
            {userName}&rsquo;s Dashboard
          </h1>
          {firm?.name && (
            <span
              className="px-2.5 py-1 text-xs font-medium"
              style={{ background: "#161b22", border: "1px solid #21262d", color: "#7d8590", borderRadius: 4 }}
            >
              {firm.name}
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: "#7d8590" }}>
          Welcome back. Here&rsquo;s an overview of your active cases and tasks.
        </p>
      </div>
      {onboarding && <OnboardingChecklist {...onboarding} />}
      {showWidgets && (
        <DashboardWidgets
          myTasks={serializedTasks}
          staleCases={serializedStale}
          statusCounts={statusCounts}
          accountTypeCounts={accountTypeCounts}
          totalActive={totalActive}
          totalCompleted={totalCompleted}
          completedThisMonth={completedThisMonth}
          taskBreakdown={taskBreakdown}
        />
      )}
      <CaseList
        cases={serializedCases}
        users={[]}
        statusLabels={STATUS_LABELS}
        filters={{ search, status, advisorId: "", opsId: "" }}
        compact={compactList}
        userRole={role}
      />
    </>
  );
}
