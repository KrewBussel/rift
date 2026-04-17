import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@prisma/client";
import CaseList from "@/components/CaseList";

const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  AWAITING_CLIENT_ACTION: "Awaiting Client Action",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
};

export default async function CasesPage({
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
    select: { preferences: true },
  });
  const prefs: Record<string, unknown> =
    userRecord?.preferences !== null && typeof userRecord?.preferences === "object" && !Array.isArray(userRecord?.preferences)
      ? (userRecord.preferences as Record<string, unknown>)
      : {};

  const search = params.search ?? "";
  const status = params.status ?? (prefs.defaultStatusFilter as string | undefined) ?? "";
  const advisorId = role === "ADMIN" ? (params.advisorId ?? "") : "";
  const opsId = role === "ADMIN" ? (params.opsId ?? "") : "";

  const roleVisibilityFilter =
    role === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : role === "OPS"
      ? { assignedOpsId: userId }
      : {};

  const advisorFilter =
    role === "ADMIN" && advisorId
      ? advisorId === "unassigned"
        ? { assignedAdvisorId: null }
        : { assignedAdvisorId: advisorId }
      : {};

  const opsFilter =
    role === "ADMIN" && opsId
      ? opsId === "unassigned"
        ? { assignedOpsId: null }
        : { assignedOpsId: opsId }
      : {};

  const caseWhere = {
    firmId,
    ...roleVisibilityFilter,
    ...advisorFilter,
    ...opsFilter,
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

  const [cases, users, advisorCountRows, opsCountRows] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: caseWhere,
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    role === "ADMIN"
      ? prisma.user.findMany({
          where: { firmId },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([] as { id: string; firstName: string; lastName: string; role: string }[]),
    role === "ADMIN"
      ? prisma.rolloverCase.groupBy({
          by: ["assignedAdvisorId"],
          where: { firmId },
          _count: { id: true },
        })
      : Promise.resolve([] as { assignedAdvisorId: string | null; _count: { id: number } }[]),
    role === "ADMIN"
      ? prisma.rolloverCase.groupBy({
          by: ["assignedOpsId"],
          where: { firmId },
          _count: { id: true },
        })
      : Promise.resolve([] as { assignedOpsId: string | null; _count: { id: number } }[]),
  ]);

  const advisorCounts: Record<string, number> = {};
  for (const row of advisorCountRows) {
    advisorCounts[row.assignedAdvisorId ?? "unassigned"] = row._count.id;
  }
  const opsCounts: Record<string, number> = {};
  for (const row of opsCountRows) {
    opsCounts[row.assignedOpsId ?? "unassigned"] = row._count.id;
  }

  const serializedCases = cases.map((c) => ({
    ...c,
    statusUpdatedAt: c.statusUpdatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
          All Cases
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
          Full case list for your firm.
        </p>
      </div>
      <CaseList
        cases={serializedCases}
        users={users}
        statusLabels={STATUS_LABELS}
        filters={{ search, status, advisorId, opsId }}
        compact={prefs.compactCaseList === true}
        userRole={role}
        advisorCounts={advisorCounts}
        opsCounts={opsCounts}
      />
    </>
  );
}
