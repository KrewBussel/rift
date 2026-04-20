import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@prisma/client";
import { parseBody, parseQuery } from "@/lib/validation";
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

const CaseListQuerySchema = z.object({
  search: z.string().max(200).optional().default(""),
  status: z.string().optional().default(""),
  advisorId: z.string().optional().default(""),
});

const CreateCaseSchema = z
  .object({
    clientFirstName: z.string().trim().min(1).max(100),
    clientLastName: z.string().trim().min(1).max(100),
    clientEmail: z.string().trim().toLowerCase().email().max(200),
    sourceProvider: z.string().trim().min(1).max(200),
    destinationCustodian: z.string().trim().min(1).max(200),
    accountType: AccountTypeSchema,
    highPriority: z.boolean().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
    assignedAdvisorId: z.string().nullable().optional(),
    assignedOpsId: z.string().nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseQuery(request, CaseListQuerySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { search, status, advisorId } = parsed.data;

  const validStatus = status && CaseStatusSchema.safeParse(status).success ? (status as CaseStatus) : undefined;

  const firmId = session.user.firmId;

  const cases = await prisma.rolloverCase.findMany({
    where: {
      firmId,
      ...(search
        ? {
            OR: [
              { clientFirstName: { contains: search, mode: "insensitive" } },
              { clientLastName: { contains: search, mode: "insensitive" } },
              { clientEmail: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(validStatus ? { status: validStatus } : {}),
      ...(advisorId ? { assignedAdvisorId: advisorId } : {}),
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

  const parsed = await parseBody(request, CreateCaseSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const firmId = session.user.firmId;
  const userId = session.user.id;

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
