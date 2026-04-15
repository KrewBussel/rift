import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";

// GET — generate a short-lived presigned download URL for the document
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;

  const doc = await prisma.document.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!doc || doc.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: doc.storagePath,
    // Sets Content-Disposition so browsers download with the original filename
    ResponseContentDisposition: `attachment; filename="${doc.name}"`,
  });

  // 5-minute window — enough to open, not long enough to share meaningfully
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return NextResponse.json({ url, name: doc.name });
}

// DELETE — admin/ops only; removes from S3 and then the database
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  if (role !== "ADMIN" && role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await prisma.document.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!doc || doc.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.storagePath }));

  await prisma.document.delete({ where: { id } });

  await prisma.activityEvent.create({
    data: {
      caseId: doc.caseId,
      actorUserId: userId,
      eventType: "FILE_DELETED",
      eventDetails: `File deleted: "${doc.name}"`,
    },
  });

  return new NextResponse(null, { status: 204 });
}
