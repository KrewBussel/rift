import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const CreateNoteSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
}).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, CreateNoteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { body: noteBody } = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id as string;

  const existing = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = await prisma.note.create({
    data: { caseId: id, authorUserId: userId, body: noteBody },
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
