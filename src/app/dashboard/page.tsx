import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CaseList from "@/components/CaseList";
import DashboardWidgets from "@/components/DashboardWidgets";
import AdminDashboard from "@/components/AdminDashboard";

const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  AWAITING_CLIENT_ACTION: "Awaiting Client Action",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
};

const STALE_DAYS = 7;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; advisorId?: string; opsId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const firmId = (session.user as any).firmId as string;
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as "ADMIN" | "ADVISOR" | "OPS";

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const prefs = (userRecord?.preferences as Record<string, any>) ?? {};

  const userName =
    (session.user as any).firstName ?? session.user?.name?.split(" ")[0] ?? "Your";

  /* ── ADMIN path ─────────────────────────────────────────────────────── */
  if (role === "ADMIN") {
    const recentIds = (prefs.recentlyViewedCaseIds ?? []) as string[];

    const caseInclude = {
      assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
      assignedOps: { select: { id: true, firstName: true, lastName: true } },
    };

    const fillCount = Math.max(0, 6 - recentIds.length);

    const [users, allCases, viewedCases, fillCases, firm] = await Promise.all([
      prisma.user.findMany({
        where: { firmId },
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: { firstName: "asc" },
      }),
      prisma.rolloverCase.findMany({
        where: { firmId },
        select: { assignedAdvisorId: true, assignedOpsId: true, status: true },
      }),
      recentIds.length > 0
        ? prisma.rolloverCase.findMany({
            where: { id: { in: recentIds }, firmId },
            include: caseInclude,
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof prisma.rolloverCase.findMany<{ include: typeof caseInclude }>>>),
      fillCount > 0
        ? prisma.rolloverCase.findMany({
            where: { firmId, ...(recentIds.length > 0 ? { id: { notIn: recentIds } } : {}) },
            include: caseInclude,
            orderBy: { updatedAt: "desc" },
            take: fillCount,
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof prisma.rolloverCase.findMany<{ include: typeof caseInclude }>>>),
      prisma.firm.findUnique({ where: { id: firmId }, select: { name: true } }),
    ]);

    // Viewed cases in view order, padded with recently updated
    const viewedSorted = recentIds
      .map((id) => viewedCases.find((c) => c.id === id))
      .filter(Boolean) as typeof viewedCases;
    const recentCases = [...viewedSorted, ...fillCases].slice(0, 6);

    const statusCounts: Record<string, number> = {};
    for (const c of allCases) {
      statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
    }

    const advisors = users.filter((u) => u.role === "ADVISOR");
    const opsUsers = users.filter((u) => u.role === "OPS");

    const advisorStats = advisors.map((u) => {
      const mine = allCases.filter((c) => c.assignedAdvisorId === u.id);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        total: mine.length,
        active: mine.filter((c) => c.status !== "COMPLETED").length,
        completed: mine.filter((c) => c.status === "COMPLETED").length,
      };
    });

    const opsStats = opsUsers.map((u) => {
      const mine = allCases.filter((c) => c.assignedOpsId === u.id);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        total: mine.length,
        active: mine.filter((c) => c.status !== "COMPLETED").length,
        completed: mine.filter((c) => c.status === "COMPLETED").length,
      };
    });

    const firmTotals = {
      total: allCases.length,
      active: allCases.filter((c) => c.status !== "COMPLETED").length,
      completed: allCases.filter((c) => c.status === "COMPLETED").length,
      awaitingClient: allCases.filter((c) => c.status === "AWAITING_CLIENT_ACTION").length,
    };

    const serializedRecent = recentCases.map((c) => ({
      ...c,
      statusUpdatedAt: c.statusUpdatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

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
            Overview of your firm&rsquo;s cases and team performance.
          </p>
        </div>
        <AdminDashboard
          recentCases={serializedRecent}
          advisorStats={advisorStats}
          opsStats={opsStats}
          firmTotals={firmTotals}
          statusCounts={statusCounts}
          statusLabels={STATUS_LABELS}
        />
      </>
    );
  }

  /* ── Non-admin path ──────────────────────────────────────────────────── */
  const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const search = params.search ?? "";
  const status = params.status ?? prefs.defaultStatusFilter ?? "";
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
    ...(status ? { status: status as any } : {}),
  };

  const [cases, myTasks, staleCases] = await Promise.all([
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
        status: { not: "COMPLETED" },
        updatedAt: { lt: staleThreshold },
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

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
      (Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return (
    <>
      <div className="mb-7">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "#e4e6ea" }}
        >
          {userName}&rsquo;s Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
          Welcome back. Here&rsquo;s an overview of your active cases and tasks.
        </p>
      </div>
      {showWidgets && (
        <DashboardWidgets myTasks={serializedTasks} staleCases={serializedStale} />
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
