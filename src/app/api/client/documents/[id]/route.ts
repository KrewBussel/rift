import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { requireClientSession } from "@/lib/client-auth";

/**
 * GET /api/client/documents/[id] — short-lived presigned download URL for a
 * document on the client's own case. Scope-checked at the case level: the
 * document must belong to the session's case + firm. Five-minute expiry.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, caseId: session.caseId, case: { firmId: session.firmId } },
    select: { id: true, name: true, storagePath: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: doc.storagePath,
    ResponseContentDisposition: `attachment; filename="${doc.name}"`,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return NextResponse.json({ url, name: doc.name });
}
