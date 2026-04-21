import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { syncOpportunityStage } from "@/lib/crmSync";
import { z } from "zod";

const CaseStatusSchema = z.enum([
  "INTAKE",
  "AWAITING_CLIENT_ACTION",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "PROCESSING",
  "IN_TRANSIT",
  "COMPLETED",
]);

const AccountTypeSchema = z.enum(["TRADITIONAL_IRA_401K", "ROTH_IRA_401K", "IRA_403B", "OTHER"]);

const UpdateCaseSchema = z
  .object({
    clientFirstName: z.string().trim().min(1).max(100).optional(),
    clientLastName: z.string().trim().min(1).max(100).optional(),
    clientEmail: z.string().trim().toLowerCase().email().max(200).optional(),
    sourceProvider: z.string().trim().min(1).max(200).optional(),
    destinationCustodian: z.string().trim().min(1).max(200).optional(),
    accountType: AccountTypeSchema.optional(),
    highPriority: z.boolean().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
    assignedAdvisorId: z.string().nullable().optional(),
    assignedOpsId: z.string().nullable().optional(),
    status: CaseStatusSchema.optional(),
  })
  .strict();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

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

  const parsed = await parseBody(request, UpdateCaseSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;

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

  if (body.status !== undefined && body.status !== existing.status) {
    await prisma.activityEvent.create({
      data: {
        caseId: id,
        actorUserId: userId,
        eventType: "STATUS_CHANGED",
        eventDetails: `Status changed from ${existing.status} to ${body.status}`,
      },
    });
    if (existing.wealthboxOpportunityId) {
      await syncOpportunityStage(id);
    }
  } else if (body.status === undefined) {
    await prisma.activityEvent.create({
      data: {
        caseId: id,
        actorUserId: userId,
        eventType: "CASE_UPDATED",
        eventDetails: "Case details updated",
      },
    });
  }

  return NextResponse.json(updated);
}
