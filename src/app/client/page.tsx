import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientSessionFromCookie } from "@/lib/client-auth";
import ClientPortal from "@/components/ClientPortal";

const STATUS_LABELS: Record<string, string> = {
  PROPOSAL_ACCEPTED: "Proposal accepted",
  AWAITING_CLIENT_ACTION: "Awaiting your input",
  READY_TO_SUBMIT: "Ready to submit",
  SUBMITTED: "Submitted to custodian",
  PROCESSING: "Processing",
  IN_TRANSIT: "In transit",
  WON: "Completed",
};

export default async function ClientHomePage() {
  const session = await getClientSessionFromCookie();
  if (!session) redirect("/client/expired");

  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id: session.caseId, firmId: session.firmId },
    select: {
      id: true,
      clientFirstName: true,
      clientLastName: true,
      sourceProvider: true,
      destinationCustodian: true,
      accountType: true,
      status: true,
      statusUpdatedAt: true,
      createdAt: true,
      firm: { select: { name: true, supportEmail: true, supportPhone: true } },
      assignedAdvisor: { select: { firstName: true, lastName: true } },
    },
  });

  if (!rolloverCase) redirect("/client/expired");

  const [checklist, notes] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { caseId: session.caseId },
      select: {
        id: true,
        name: true,
        required: true,
        status: true,
        sortOrder: true,
        documents: { select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.note.findMany({
      where: { caseId: session.caseId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        fromClient: true,
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <ClientPortal
      rolloverCase={{
        ...rolloverCase,
        statusLabel: STATUS_LABELS[rolloverCase.status] ?? rolloverCase.status,
        statusUpdatedAt: rolloverCase.statusUpdatedAt.toISOString(),
        createdAt: rolloverCase.createdAt.toISOString(),
      }}
      checklist={checklist.map((c) => ({
        ...c,
        documents: c.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      }))}
      initialNotes={notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
      scope={session.scope}
    />
  );
}
