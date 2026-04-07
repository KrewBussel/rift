import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;

  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id, firmId },
    include: {
      assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
      assignedOps: { select: { id: true, firstName: true, lastName: true } },
      notes: {
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      activityEvents: {
        include: { actor: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(rolloverCase);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;
  const userId = session.user.id as string;
  const body = await request.json();

  const existing = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.rolloverCase.update({
    where: { id },
    data: {
      ...(body.clientFirstName !== undefined && { clientFirstName: body.clientFirstName }),
      ...(body.clientLastName !== undefined && { clientLastName: body.clientLastName }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail }),
      ...(body.sourceProvider !== undefined && { sourceProvider: body.sourceProvider }),
      ...(body.destinationCustodian !== undefined && { destinationCustodian: body.destinationCustodian }),
      ...(body.accountType !== undefined && { accountType: body.accountType }),
      ...(body.highPriority !== undefined && { highPriority: body.highPriority }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
      ...(body.assignedAdvisorId !== undefined && { assignedAdvisorId: body.assignedAdvisorId || null }),
      ...(body.assignedOpsId !== undefined && { assignedOpsId: body.assignedOpsId || null }),
      ...(body.status !== undefined && { status: body.status, statusUpdatedAt: new Date() }),
    },
  });

  const events = [];

  if (body.status !== undefined && body.status !== existing.status) {
    events.push(prisma.activityEvent.create({
      data: {
        caseId: id,
        actorUserId: userId,
        eventType: "STATUS_CHANGED",
        eventDetails: `Status changed from ${existing.status} to ${body.status}`,
      },
    }));
  } else if (body.status === undefined) {
    events.push(prisma.activityEvent.create({
      data: {
        caseId: id,
        actorUserId: userId,
        eventType: "CASE_UPDATED",
        eventDetails: "Case details updated",
      },
    }));
  }

  if (events.length) await Promise.all(events);

  return NextResponse.json(updated);
}
