import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/client-auth";

/**
 * POST /api/client/checklist/[id]/acknowledge — client confirms they have
 * read/completed a checklist item. Moves NOT_STARTED/REQUESTED → RECEIVED;
 * does NOT touch items already reviewed/completed by the firm.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const { id } = await params;

  const item = await prisma.checklistItem.findFirst({
    where: { id, caseId: session.caseId, case: { firmId: session.firmId } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (item.status === "NOT_STARTED" || item.status === "REQUESTED") {
    await prisma.checklistItem.update({
      where: { id },
      data: { status: "RECEIVED" },
    });
  }

  await prisma.activityEvent.create({
    data: {
      caseId: session.caseId,
      clientSessionId: session.sessionId,
      actorUserId: null,
      eventType: "CHECKLIST_ITEM_UPDATED",
      eventDetails: `Client acknowledged: "${item.name}"`,
    },
  });

  return NextResponse.json({ ok: true });
}
