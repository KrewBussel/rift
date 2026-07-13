import { redirect } from "next/navigation";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { getClientSessionFromCookie } from "@/lib/client-auth";
import { ensureCaseChecklist } from "@/lib/checklist";
import { s3, S3_BUCKET } from "@/lib/s3";
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
      firm: { select: { name: true, supportEmail: true, supportPhone: true, logoUrl: true } },
      assignedAdvisor: { select: { firstName: true, lastName: true } },
    },
  });

  if (!rolloverCase) redirect("/client/expired");

  // A case with no checklist gives the client nothing to act on (and no
  // upload targets) — seed the defaults before rendering.
  await ensureCaseChecklist(session.caseId);

  // Firm logos are stored as S3 keys, not URLs — presign for the browser.
  let logoUrl = rolloverCase.firm.logoUrl;
  if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
    try {
      logoUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: logoUrl }),
        { expiresIn: 3600 },
      );
    } catch {
      logoUrl = null; // fall back to the monogram
    }
  }

  const [checklist, notes] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { caseId: session.caseId },
      select: {
        id: true,
        name: true,
        required: true,
        status: true,
        sortOrder: true,
        documents: {
          select: {
            id: true,
            name: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            uploadedByClientSessionId: true,
          },
          orderBy: { createdAt: "desc" },
        },
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
        firm: { ...rolloverCase.firm, logoUrl },
        statusLabel: STATUS_LABELS[rolloverCase.status] ?? rolloverCase.status,
        statusUpdatedAt: rolloverCase.statusUpdatedAt.toISOString(),
        createdAt: rolloverCase.createdAt.toISOString(),
      }}
      checklist={checklist.map((c) => ({
        ...c,
        documents: c.documents.map((d) => ({
          id: d.id,
          name: d.name,
          fileType: d.fileType,
          fileSize: d.fileSize,
          createdAt: d.createdAt.toISOString(),
          uploadedByClient: d.uploadedByClientSessionId !== null,
        })),
      }))}
      initialNotes={notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
      scope={session.scope}
    />
  );
}
