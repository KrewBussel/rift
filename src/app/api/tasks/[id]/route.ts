import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const firmId = (session.user as any).firmId as string;
  const body = await request.json();

  const task = await prisma.task.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!task || task.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (body.status && body.status !== task.status) {
    const eventType =
      body.status === "COMPLETED" ? "TASK_COMPLETED" :
      body.status === "OPEN" ? "TASK_REOPENED" :
      "TASK_CREATED";

    await prisma.activityEvent.create({
      data: {
        caseId: task.caseId,
        actorUserId: userId,
        eventType,
        eventDetails: `Task "${task.title}" marked ${body.status.toLowerCase()}`,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = (session.user as any).firmId as string;

  const task = await prisma.task.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!task || task.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
