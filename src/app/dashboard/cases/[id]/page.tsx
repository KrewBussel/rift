import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CaseDetail from "@/components/CaseDetail";
import CaseViewTracker from "@/components/CaseViewTracker";
import { getFirmStageConfig } from "@/lib/stageConfig";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;
  const userRole = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Non-admins can only access cases they are directly assigned to
  const roleAccessFilter =
    userRole === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : userRole === "OPS"
      ? { assignedOpsId: userId }
      : {};

  const [rolloverCase, users, checklistItems, documents] = await Promise.all([
    prisma.rolloverCase.findFirst({
      where: { id, firmId, ...roleAccessFilter },
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
        notes: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        activityEvents: {
          include: { actor: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.user.findMany({
      where: { firmId },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.checklistItem.findMany({
      where: { caseId: id },
      include: {
        documents: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.document.findMany({
      where: { caseId: id },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        checklistItem: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!rolloverCase) notFound();

  const [crmConnection, stageConfig] = await Promise.all([
    prisma.crmConnection.findUnique({
      where: { firmId },
      select: { id: true, provider: true, connectedUserName: true },
    }),
    getFirmStageConfig(firmId),
  ]);
  const crmProviderLabel = crmConnection
    ? crmConnection.provider === "SALESFORCE" ? "Salesforce" : "Wealthbox"
    : null;

  // Serialize dates
  const serializedCase = {
    ...rolloverCase,
    statusUpdatedAt: rolloverCase.statusUpdatedAt.toISOString(),
    createdAt: rolloverCase.createdAt.toISOString(),
    updatedAt: rolloverCase.updatedAt.toISOString(),
    wealthboxLinkedAt: rolloverCase.wealthboxLinkedAt?.toISOString() ?? null,
    wealthboxLastSyncedAt: rolloverCase.wealthboxLastSyncedAt?.toISOString() ?? null,
    wealthboxTargetClose: rolloverCase.wealthboxTargetClose?.toISOString() ?? null,
    wealthboxOppCreatedAt: rolloverCase.wealthboxOppCreatedAt?.toISOString() ?? null,
    notes: rolloverCase.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    activityEvents: rolloverCase.activityEvents.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    tasks: rolloverCase.tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  };

  const serializedChecklist = checklistItems.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    documents: item.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), checklistItem: null as { id: string; name: string } | null })),
  }));

  const serializedDocuments = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <>
      <CaseViewTracker caseId={id} />
      <CaseDetail
        rolloverCase={serializedCase}
        users={users}
        currentUserId={session.user.id}
        userRole={userRole}
        initialChecklist={serializedChecklist}
        initialDocuments={serializedDocuments}
        crmConnected={!!crmConnection}
        crmProviderLabel={crmProviderLabel}
        stageConfig={stageConfig}
      />
    </>
  );
}
