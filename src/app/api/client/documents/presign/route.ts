import { NextRequest, NextResponse } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { parseQuery } from "@/lib/validation";
import { requireClientSession, requireScope } from "@/lib/client-auth";
import { z } from "zod";

const PresignQuerySchema = z.object({
  filename: z.string().min(1).max(500),
  fileType: z.string().min(1).max(200),
  fileSize: z.coerce.number().int().positive(),
  checklistItemId: z.string().min(1).max(64),
});

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Client uploads are ONLY allowed when attached to a specific checklist item
 * that the firm has marked REQUESTED. This prevents a client from dumping
 * arbitrary files into the case.
 */
export async function GET(request: NextRequest) {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const scopeErr = requireScope(session, "UPLOAD");
  if (scopeErr) return scopeErr;

  const parsed = parseQuery(request, PresignQuerySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { filename, fileType, fileSize, checklistItemId } = parsed.data;

  if (!ALLOWED_TYPES[fileType]) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPG, PNG, WEBP, or DOCX." },
      { status: 400 },
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
  }

  const item = await prisma.checklistItem.findFirst({
    where: {
      id: checklistItemId,
      caseId: session.caseId,
      case: { firmId: session.firmId },
    },
    select: { id: true, status: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }
  if (item.status !== "REQUESTED" && item.status !== "NOT_STARTED") {
    return NextResponse.json(
      { error: "This item is not currently open for uploads." },
      { status: 409 },
    );
  }

  const ext = ALLOWED_TYPES[fileType];
  const safeName = filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  // Key includes /client/ segment so firm-side storage key checks never
  // accidentally allow a client-uploaded key on a firm write path.
  const key = `${session.firmId}/${session.caseId}/client/${Date.now()}-${safeName}.${ext}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: S3_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_FILE_SIZE],
      ["eq", "$Content-Type", fileType],
    ],
    Fields: { "Content-Type": fileType },
    Expires: 300,
  });

  return NextResponse.json({ url, fields, key });
}
