import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@prisma/client";
import CaseList from "@/components/CaseList";
import DashboardWidgets from "@/components/DashboardWidgets";
import AdminDashboard, {
  type AdminDashboardData,
  type PipelineBucket,
  type NeedsAttentionItem,
  type ActivityItem,
  type TeamMember,
} from "@/components/AdminDashboard";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { computeOnboardingChecklist } from "@/lib/onboarding";
import { getFirmUsageSummary } from "@/lib/aiUsage";
import { getOrCreateFirmSettings } from "@/lib/reminders";

const STATUS_LABELS: Record<string, string> = {
  PROPOSAL_ACCEPTED: "Proposal Accepted",
  AWAITING_CLIENT_ACTION: "Awaiting Client Action",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  WON: "Won",
};

const STATUS_COLORS: Record<string, string> = {
  PROPOSAL_ACCEPTED: "#6e7681",
  AWAITING_CLIENT_ACTION: "#d29922",
  READY_TO_SUBMIT: "#388bfd",
  SUBMITTED: "#a78bfa",
  PROCESSING: "#fb923c",
  IN_TRANSIT: "#818cf8",
  WON: "#3fb950",
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
    const savedLayout = Array.isArray(prefs.dashboardWidgets)
      ? (prefs.dashboardWidgets as string[]).filter((x) => typeof x === "string")
      : null;

    const firmSettings = await getOrCreateFirmSettings(firmId);
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
      aiUsage,
      crmConnection,
      crmLinkedCount,
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
        getFirmUsageSummary(firmId),
        prisma.crmConnection.findUnique({
          where: { firmId },
          select: {
            provider: true,
            lastHealthCheckAt: true,
            lastHealthOk: true,
            lastHealthError: true,
          },
        }),
        prisma.rolloverCase.count({
          where: { firmId, wealthboxOpportunityId: { not: null } },
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

    const pipeline: PipelineBucket[] = (Object.keys(STATUS_LABELS) as CaseStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: allCases.filter((c) => c.status === status).length,
      color: STATUS_COLORS[status],
    }));

    const daysAgo = (d: Date) => Math.max(1, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));

    const needsAttention: NeedsAttentionItem[] = [
      ...stalledCases.map<NeedsAttentionItem>((c) => ({
        id: `case-${c.id}`,
        kind: "stalled_case",
        title: `${c.clientFirstName} ${c.clientLastName}`,
        detail: `${STATUS_LABELS[c.status]} · stalled`,
        href: `/dashboard/cases/${c.id}`,
        daysAgo: daysAgo(c.updatedAt),
      })),
      ...overdueTasks.map<NeedsAttentionItem>((t) => ({
        id: `task-${t.id}`,
        kind: "overdue_task",
        title: t.title,
        detail: `${t.case.clientFirstName} ${t.case.clientLastName}${t.assignee ? ` · ${t.assignee.firstName} ${t.assignee.lastName}` : ""}`,
        href: `/dashboard/cases/${t.case.id}`,
        daysAgo: t.dueDate ? daysAgo(t.dueDate) : 1,
      })),
    ].sort((a, b) => b.daysAgo - a.daysAgo);

    const activity: ActivityItem[] = activityRows.map((e) => ({
      id: e.id,
      actor: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : null,
      verb: describeEvent(e.eventType),
      target: e.case ? `${e.case.clientFirstName} ${e.case.clientLastName}` : null,
      href: e.case ? `/dashboard/cases/${e.case.id}` : null,
      createdAt: e.createdAt.toISOString(),
    }));

    const team: TeamMember[] = teamUsers
      .map<TeamMember>((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role as "ADVISOR" | "OPS",
        activeCases: u.role === "ADVISOR" ? u._count.assignedCases : u._count.ownedCases,
      }))
      .sort((a, b) => b.activeCases - a.activeCases);

    const totalMs = recentlyCompleted.reduce(
      (sum, c) => sum + (c.statusUpdatedAt.getTime() - c.createdAt.getTime()),
      0
    );
    const avgDaysToComplete =
      recentlyCompleted.length === 0
        ? null
        : totalMs / recentlyCompleted.length / (1000 * 60 * 60 * 24);

    const data: AdminDashboardData = {
      pipeline,
      needsAttention,
      activity,
      team,
      throughput: {
        openedThisMonth,
        completedThisMonth,
        openedLastMonth,
        completedLastMonth,
      },
      velocity: {
        avgDaysToComplete,
        completedIn30Days: recentlyCompleted.length,
      },
      aiUsage: {
        planName: aiUsage.planName,
        tokensUsed: aiUsage.tokensUsed,
        tokensLimit: aiUsage.monthlyTokenLimit,
        percentUsed: aiUsage.percentUsed,
        periodResetsAt: aiUsage.periodEnd.toISOString(),
      },
      crm: {
        connected: !!crmConnection,
        provider: crmConnection?.provider ?? null,
        lastSyncedAt: crmConnection?.lastHealthCheckAt?.toISOString() ?? null,
        healthOk: crmConnection?.lastHealthOk ?? true,
        healthError: crmConnection?.lastHealthError ?? null,
        linkedCaseCount: crmLinkedCount,
      },
    };

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
        <div className="mb-6 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
              {userName}&rsquo;s Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
              Firm-wide overview. Customize widgets to match how your team works.
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: "#7d8590" }}>Today</p>
            <p className="text-base font-semibold mt-1 font-[family-name:var(--font-inter-tight)]" style={{ color: "#e4e6ea" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        {onboarding && <OnboardingChecklist {...onboarding} />}
        <AdminDashboard data={data} initialLayout={savedLayout as never} />
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
