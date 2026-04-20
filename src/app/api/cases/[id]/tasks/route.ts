import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullish(),
  assigneeId: z.string().nullish(),
  dueDate: z.string().datetime().nullish(),
}).strict();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { caseId: id },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, CreateTaskSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      caseId: id,
      title: body.title,
      description: body.description ?? null,
      assigneeId: body.assigneeId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: "OPEN",
      createdById: userId,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: id,
      actorUserId: userId,
      eventType: "TASK_CREATED",
      eventDetails: `Task created: "${task.title}"`,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
