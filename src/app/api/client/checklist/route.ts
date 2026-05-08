import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/client-auth";

/**
 * GET /api/client/checklist — checklist items for the case, with client-visible status.
 * Internal `notes` field is omitted.
 */
export async function GET() {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;

  const items = await prisma.checklistItem.findMany({
    where: { caseId: guard.session.caseId, case: { firmId: guard.session.firmId } },
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
  });

  // Mark each document as `uploadedByClient` so the UI can render
  // "You uploaded" vs "Shared by your team" without leaking firm-user identity.
  const sanitized = items.map((item) => ({
    ...item,
    documents: item.documents.map((d) => ({
      id: d.id,
      name: d.name,
      fileType: d.fileType,
      fileSize: d.fileSize,
      createdAt: d.createdAt,
      uploadedByClient: d.uploadedByClientSessionId !== null,
    })),
  }));

  return NextResponse.json(sanitized);
}
