import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const firm = await prisma.firm.findUnique({
    where: { id: session.user.firmId },
    select: { logoUrl: true },
  });

  const key = firm?.logoUrl;
  if (!key) return new Response("Not Found", { status: 404 });

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return new Response("Not Found", { status: 404 });

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": result.ContentType ?? "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "File must be JPEG, PNG, WebP, or SVG" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
  }

  const key = `firms/${firmId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  // If a previous upload used a different extension, clean it up.
  const existing = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { logoUrl: true },
  });
  if (existing?.logoUrl && existing.logoUrl !== key && existing.logoUrl.startsWith(`firms/${firmId}.`)) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: existing.logoUrl }));
    } catch {
      // best-effort
    }
  }

  await prisma.firm.update({
    where: { id: firmId },
    data: { logoUrl: key },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.logo.uploaded",
    resource: "Firm",
    resourceId: firmId,
    metadata: { contentType: file.type, size: file.size },
    ...meta,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { logoUrl: true },
  });

  if (firm?.logoUrl && firm.logoUrl.startsWith(`firms/${firmId}.`)) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: firm.logoUrl }));
    } catch {
      // best-effort
    }
  }

  await prisma.firm.update({
    where: { id: firmId },
    data: { logoUrl: null },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.logo.removed",
    resource: "Firm",
    resourceId: firmId,
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
