import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CasesView, { type CasesViewCase, type CasesViewUser } from "@/components/CasesView";
import { getFirmStageConfig } from "@/lib/stageConfig";
import { maybePollOnPageLoad } from "@/lib/crmSync";
import WealthboxSyncButton from "@/components/WealthboxSyncButton";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Role visibility: advisors and ops only see cases they are assigned.
  // Admins see everything for the firm.
  const roleVisibilityFilter =
    role === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : role === "OPS"
      ? { assignedOpsId: userId }
      : {};

  // Auto-pull from Wealthbox on page load. Throttled (10s) and timeboxed (2.5s)
  // so a refresh during the cron's 1-minute gap can surface new opportunities
  // immediately, without letting a slow CRM hang the page or letting a refresh
  // spam burn API quota. Failure is swallowed; the page always renders.
  await maybePollOnPageLoad(firmId);

  const [cases, users, stageConfig, crmConn] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: { firmId, ...roleVisibilityFilter },
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // Only admins need the user list (for the Owner filter dropdown)
    role === "ADMIN"
      ? prisma.user.findMany({
          where: { firmId, deactivatedAt: null, role: { in: ["ADVISOR", "OPS", "ADMIN"] } },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: [{ role: "asc" }, { firstName: "asc" }],
        })
      : Promise.resolve([] as CasesViewUser[]),
    getFirmStageConfig(firmId),
    role === "ADMIN"
      ? prisma.crmConnection.findUnique({ where: { firmId }, select: { provider: true } })
      : Promise.resolve(null),
  ]);
  const wealthboxConnected = crmConn?.provider === "WEALTHBOX";

  const serialized: CasesViewCase[] = cases.map((c) => ({
    id: c.id,
    clientFirstName: c.clientFirstName,
    clientLastName: c.clientLastName,
    clientEmail: c.clientEmail,
    sourceProvider: c.sourceProvider,
    destinationCustodian: c.destinationCustodian,
    accountType: c.accountType,
    status: c.status,
    highPriority: c.highPriority,
    needsReview: c.needsReview,
    reviewReason: c.reviewReason,
    statusUpdatedAt: c.statusUpdatedAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    assignedAdvisor: c.assignedAdvisor,
    assignedOps: c.assignedOps,
  }));

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
            {role === "ADMIN" ? "All cases" : "Your cases"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            {role === "ADMIN"
              ? "Every rollover case across your firm."
              : "Rollover cases assigned to you."}
          </p>
        </div>
        {role === "ADMIN" && wealthboxConnected && <WealthboxSyncButton />}
      </div>
      <CasesView
        cases={serialized}
        users={users}
        userRole={role}
        initialStatus={params.status ?? ""}
        stageConfig={stageConfig}
      />
    </>
  );
}
