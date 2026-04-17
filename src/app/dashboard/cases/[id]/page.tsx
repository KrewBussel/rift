import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CaseDetail from "@/components/CaseDetail";
import CaseViewTracker from "@/components/CaseViewTracker";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;
  const userId = (session.user as any).id as string;
  const userRole = (session.user as any).role as "ADMIN" | "ADVISOR" | "OPS";

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

  // Serialize dates
  const serializedChecklist = checklistItems.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    documents: item.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
  }));

  const serializedDocuments = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <>
      <CaseViewTracker caseId={id} />
      <CaseDetail
        rolloverCase={rolloverCase as any}
        users={users}
        currentUserId={(session.user as any)?.id as string}
        userRole={userRole}
        initialChecklist={serializedChecklist as any}
        initialDocuments={serializedDocuments as any}
      />
    </>
  );
}
