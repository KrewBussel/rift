import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;
  const userId = session.user.id as string;
  const body = await request.json();

  const existing = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!body.body?.trim()) return NextResponse.json({ error: "Note body required" }, { status: 400 });

  const note = await prisma.note.create({
    data: { caseId: id, authorUserId: userId, body: body.body.trim() },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: id,
      actorUserId: userId,
      eventType: "NOTE_ADDED",
      eventDetails: "Note added",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
