import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CasesView, { type CasesViewCase, type CasesViewUser } from "@/components/CasesView";
import CasesViewV2, { type V2CasesCase } from "@/components/v2/CasesViewV2";
import { getFirmStageConfig } from "@/lib/stageConfig";
import { maybePollOnPageLoad } from "@/lib/crmSync";
import CrmSyncButton from "@/components/WealthboxSyncButton";

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

  // Auto-pull from Wealthbox on page load.
  await maybePollOnPageLoad(firmId);

  const [cases, users, stageConfig, crmConn, firm] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: { firmId, ...roleVisibilityFilter },
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
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
    prisma.firm.findUnique({ where: { id: firmId }, select: { name: true } }),
  ]);
  const crmProvider = crmConn?.provider ?? null;

  /* ── Admin V2 path ──────────────────────────────────────────────────── */
  if (role === "ADMIN") {
    const v2Cases: V2CasesCase[] = cases.map((c) => ({
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
      wealthboxAmount: c.wealthboxAmount ?? null,
      assignedAdvisor: c.assignedAdvisor,
      assignedOps: c.assignedOps,
    }));
    return (
      <CasesViewV2
        cases={v2Cases}
        users={users}
        userRole={role}
        initialStatus={params.status ?? ""}
        stageConfig={stageConfig}
        firmName={firm?.name ?? "Workspace"}
        crmProvider={crmProvider}
      />
    );
  }

  /* ── Legacy non-admin path ──────────────────────────────────────────── */
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
            Your cases
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            Rollover cases assigned to you.
          </p>
        </div>
        {crmProvider && <CrmSyncButton provider={crmProvider} />}
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
