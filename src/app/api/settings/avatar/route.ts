import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
  }

  const key = `avatars/${userId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const prefs: Record<string, unknown> =
    user?.preferences !== null && typeof user?.preferences === "object" && !Array.isArray(user?.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: { ...prefs, avatarKey: key } },
  });

  return NextResponse.json({ key });
}
