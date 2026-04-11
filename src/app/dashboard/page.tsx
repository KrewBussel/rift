import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CaseList from "@/components/CaseList";
import DashboardWidgets from "@/components/DashboardWidgets";

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
  searchParams: Promise<{ search?: string; status?: string; advisorId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const firmId = (session.user as any).firmId as string;
  const userId = (session.user as any).id as string;
  const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  // Load user preferences to apply defaults
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const prefs = (userRecord?.preferences as Record<string, any>) ?? {};

  // Apply URL params first; fall back to saved preferences
  const search = params.search ?? "";
  const status = params.status ?? prefs.defaultStatusFilter ?? "";
  const advisorId =
    params.advisorId ?? (prefs.defaultViewFilter === "mine" ? userId : "");
  const showWidgets = prefs.showDashboardWidgets !== false;
  const compactList = prefs.compactCaseList === true;

  const [cases, users, myTasks, staleCases] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: {
        firmId,
        ...(search
          ? {
              OR: [
                { clientFirstName: { contains: search, mode: "insensitive" } },
                { clientLastName: { contains: search, mode: "insensitive" } },
                { clientEmail: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status: status as any } : {}),
        ...(advisorId ? { assignedAdvisorId: advisorId } : {}),
      },
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { firmId },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: "asc" },
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

  const userName = (session.user as any).firstName ?? session.user?.name?.split(" ")[0] ?? "Your";

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
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
        users={users}
        statusLabels={STATUS_LABELS}
        filters={{ search, status, advisorId }}
        compact={compactList}
      />
    </>
  );
}
