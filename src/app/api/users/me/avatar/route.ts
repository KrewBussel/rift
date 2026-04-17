import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs: Record<string, unknown> =
    user?.preferences !== null && typeof user?.preferences === "object" && !Array.isArray(user?.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};
  const key = prefs.avatarKey as string | undefined;

  if (!key) return new Response("Not Found", { status: 404 });

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return new Response("Not Found", { status: 404 });

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": result.ContentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
