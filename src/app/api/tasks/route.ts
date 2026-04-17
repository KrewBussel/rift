import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const firmId = session.user.firmId;

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: "COMPLETED" },
      case: { firmId },
    },
    include: {
      case: { select: { id: true, clientFirstName: true, clientLastName: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
}
