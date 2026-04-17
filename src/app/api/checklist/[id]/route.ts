import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;
  const body = await request.json();

  const item = await prisma.checklistItem.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!item || item.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.checklistItem.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.required !== undefined && { required: body.required }),
    },
    include: {
      documents: {
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (body.status !== undefined && body.status !== item.status) {
    await prisma.activityEvent.create({
      data: {
        caseId: item.caseId,
        actorUserId: userId,
        eventType: "CHECKLIST_ITEM_UPDATED",
        eventDetails: `"${item.name}" marked ${body.status.toLowerCase().replace("_", " ")}`,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

  const item = await prisma.checklistItem.findFirst({
    where: { id },
    include: { case: { select: { firmId: true } } },
  });
  if (!item || item.case.firmId !== firmId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.checklistItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
