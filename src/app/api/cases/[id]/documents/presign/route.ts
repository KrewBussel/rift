import { NextRequest, NextResponse } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { parseQuery } from "@/lib/validation";
import { z } from "zod";

const PresignQuerySchema = z.object({
  filename: z.string().min(1).max(500),
  fileType: z.string().min(1).max(200),
  fileSize: z.coerce.number().int().positive(),
});

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// GET /api/cases/[id]/documents/presign?filename=...&fileType=...&fileSize=...
// Returns a presigned POST url + fields. The client submits a multipart POST
// directly to S3, then calls POST /api/cases/[id]/documents to confirm.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseQuery(request, PresignQuerySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { filename, fileType, fileSize } = parsed.data;

  const { id: caseId } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id: caseId, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!ALLOWED_TYPES[fileType]) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPG, PNG, WEBP, or DOCX." },
      { status: 400 }
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[fileType];
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${firmId}/${caseId}/${Date.now()}-${safeName}.${ext}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: S3_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_FILE_SIZE],
      ["eq", "$Content-Type", fileType],
    ],
    Fields: { "Content-Type": fileType },
    Expires: 300, // 5 minutes
  });

  return NextResponse.json({ url, fields, key });
}
