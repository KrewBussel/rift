import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { requireClientSession } from "@/lib/client-auth";

const MessageSchema = z
  .object({
    body: z.string().trim().min(1).max(5_000),
  })
  .strict();

/**
 * POST /api/client/messages — client sends a message. Stored as a Note with
 * fromClient=true and authorUserId=null. Firm users see it in the same
 * activity feed they already use.
 */
export async function POST(request: NextRequest) {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const parsed = await parseBody(request, MessageSchema);
  if (parsed instanceof NextResponse) return parsed;

  const note = await prisma.note.create({
    data: {
      caseId: session.caseId,
      authorUserId: null,
      fromClient: true,
      body: parsed.data.body,
    },
    select: { id: true, body: true, createdAt: true, fromClient: true },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: session.caseId,
      clientSessionId: session.sessionId,
      actorUserId: null,
      eventType: "NOTE_ADDED",
      eventDetails: "Client sent a message",
    },
  });

  return NextResponse.json(note, { status: 201 });
}

/**
 * GET /api/client/messages — conversation history (all notes, client-visible).
 */
export async function GET() {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const notes = await prisma.note.findMany({
    where: { caseId: session.caseId, case: { firmId: session.firmId } },
    select: {
      id: true,
      body: true,
      createdAt: true,
      fromClient: true,
      author: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notes);
}
