import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { requireClientSession, requireScope } from "@/lib/client-auth";

const ConfirmSchema = z
  .object({
    key: z.string().min(1).max(1024),
    name: z.string().trim().min(1).max(500),
    fileType: z.string().min(1).max(200),
    fileSize: z.number().int().positive().max(20 * 1024 * 1024),
    checklistItemId: z.string().min(1).max(64),
  })
  .strict();

/**
 * POST /api/client/documents/confirm — confirms a client-side S3 upload and
 * creates the Document row. The storage key must start with
 * `{firmId}/{caseId}/client/` — prevents cross-case or cross-firm key smuggling.
 */
export async function POST(request: NextRequest) {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const scopeErr = requireScope(session, "UPLOAD");
  if (scopeErr) return scopeErr;

  const parsed = await parseBody(request, ConfirmSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { key, name, fileType, fileSize, checklistItemId } = parsed.data;

  const expectedPrefix = `${session.firmId}/${session.caseId}/client/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const item = await prisma.checklistItem.findFirst({
    where: {
      id: checklistItemId,
      caseId: session.caseId,
      case: { firmId: session.firmId },
    },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }

  // There is no client User record. Document.uploadedById is required, so we
  // attribute client uploads to the firm user who issued the link.
  const token = await prisma.clientAccessToken.findUnique({
    where: { id: (await prisma.clientSession.findUnique({ where: { id: session.sessionId }, select: { tokenId: true } }))!.tokenId },
    select: { issuedByUserId: true },
  });
  const uploadedById = token!.issuedByUserId;

  const document = await prisma.document.create({
    data: {
      caseId: session.caseId,
      checklistItemId,
      name,
      storagePath: key,
      fileType,
      fileSize,
      uploadedById,
    },
    select: { id: true, name: true, fileType: true, fileSize: true, createdAt: true },
  });

  // Move the checklist item to RECEIVED so firm sees it's awaiting review.
  await prisma.checklistItem.update({
    where: { id: checklistItemId },
    data: { status: "RECEIVED" },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: session.caseId,
      clientSessionId: session.sessionId,
      actorUserId: null,
      eventType: "FILE_UPLOADED",
      eventDetails: `Client uploaded: "${name}"`,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
