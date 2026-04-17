import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const assignedAdvisorId = searchParams.get("advisorId") ?? "";

  const firmId = session.user.firmId;

  const cases = await prisma.rolloverCase.findMany({
    where: {
      firmId,
      ...(search ? {
        OR: [
          { clientFirstName: { contains: search, mode: "insensitive" } },
          { clientLastName: { contains: search, mode: "insensitive" } },
          { clientEmail: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
      ...(status ? { status: status as CaseStatus } : {}),
      ...(assignedAdvisorId ? { assignedAdvisorId } : {}),
    },
    include: {
      assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
      assignedOps: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = session.user.firmId;
  const userId = session.user.id;
  const body = await request.json();

  const newCase = await prisma.rolloverCase.create({
    data: {
      clientFirstName: body.clientFirstName,
      clientLastName: body.clientLastName,
      clientEmail: body.clientEmail,
      sourceProvider: body.sourceProvider,
      destinationCustodian: body.destinationCustodian,
      accountType: body.accountType,
      status: "INTAKE",
      highPriority: body.highPriority ?? false,
      internalNotes: body.internalNotes ?? null,
      assignedAdvisorId: body.assignedAdvisorId || null,
      assignedOpsId: body.assignedOpsId || null,
      firmId,
    },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: newCase.id,
      actorUserId: userId,
      eventType: "CASE_CREATED",
      eventDetails: "Case created",
    },
  });

  return NextResponse.json(newCase, { status: 201 });
}
