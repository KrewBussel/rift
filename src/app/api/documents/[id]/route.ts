import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

// GET — generate a signed download URL
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

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storagePath, 60 * 5); // 5 minute expiry

  if (error || !data) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, name: doc.name });
}

// DELETE — admin only
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

  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);

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
