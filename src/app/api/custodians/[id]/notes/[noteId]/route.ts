import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: custodianId, noteId } = await params;

  const note = await prisma.custodianNote.findUnique({
    where: { id: noteId },
    select: { authorId: true, firmId: true, custodianId: true },
  });

  if (!note || note.custodianId !== custodianId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (note.firmId !== session.user.firmId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canDelete = note.authorId === session.user.id || session.user.role === "ADMIN";
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.custodianNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
