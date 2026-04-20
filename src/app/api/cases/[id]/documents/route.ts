import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const ConfirmUploadSchema = z.object({
  key: z.string().min(1).max(1024),
  name: z.string().trim().min(1).max(500),
  fileType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  checklistItemId: z.string().nullish(),
}).strict();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = await prisma.document.findMany({
    where: { caseId: id },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      checklistItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

// Called by the client after a successful direct-to-S3 upload.
// Receives the S3 key (storagePath) plus file metadata, saves the Document record.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, ConfirmUploadSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { key, name, fileType, fileSize, checklistItemId } = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the S3 key was issued for this exact firm + case — prevents a user
  // from confirming a key that belongs to a different firm or case.
  if (!key.startsWith(`${firmId}/${id}/`)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const document = await prisma.document.create({
    data: {
      caseId: id,
      checklistItemId: checklistItemId ?? null,
      name,
      storagePath: key,
      fileType,
      fileSize,
      uploadedById: userId,
    },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      checklistItem: { select: { id: true, name: true } },
    },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: id,
      actorUserId: userId,
      eventType: "FILE_UPLOADED",
      eventDetails: `File uploaded: "${name}"`,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
