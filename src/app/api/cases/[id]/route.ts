import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { caseVisibilityFilter, isSameFirmUser } from "@/lib/caseVisibility";
import { syncOpportunityStage } from "@/lib/crmSync";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { s3, S3_BUCKET } from "@/lib/s3";
import { z } from "zod";

const CaseStatusSchema = z.enum([
  "PROPOSAL_ACCEPTED",
  "AWAITING_CLIENT_ACTION",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "PROCESSING",
  "IN_TRANSIT",
  "WON",
]);

const AccountTypeSchema = z.enum(["TRADITIONAL_IRA_401K", "ROTH_IRA_401K", "IRA_403B", "OTHER"]);

const UpdateCaseSchema = z
  .object({
    clientFirstName: z.string().trim().min(1).max(100).optional(),
    clientLastName: z.string().trim().min(1).max(100).optional(),
    // Allow either a valid email or an empty string (cases imported from a CRM
    // without a Contact Role have clientEmail = "" until the user fills it in).
    clientEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "Must be a valid email or empty",
      })
      .optional(),
    clientPhone: z.string().trim().max(40).nullable().optional(),
    sourceProvider: z.string().trim().min(1).max(200).optional(),
    destinationCustodian: z.string().trim().min(1).max(200).optional(),
    accountType: AccountTypeSchema.optional(),
    highPriority: z.boolean().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
    assignedAdvisorId: z.string().nullable().optional(),
    assignedOpsId: z.string().nullable().optional(),
    status: CaseStatusSchema.optional(),
    needsReview: z.boolean().optional(),
    reviewReason: z.string().max(2000).nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id, firmId, ...caseVisibilityFilter(session.user.role, session.user.id) },
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
      // Must match the include in dashboard/cases/[id]/page.tsx — CaseDetail
      // replaces its entire state with this response on refresh, so a missing
      // relation here crashes the page after any save.
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
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

  const existing = await prisma.rolloverCase.findFirst({
    where: { id, firmId, ...caseVisibilityFilter(session.user.role, userId) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Assignment targets must be users in this firm (or null to unassign) — never
  // a cross-firm / nonexistent id.
  if (
    !(await isSameFirmUser(body.assignedAdvisorId, firmId)) ||
    !(await isSameFirmUser(body.assignedOpsId, firmId))
  ) {
    return NextResponse.json({ error: "Assigned user must belong to your firm" }, { status: 400 });
  }

  const updated = await prisma.rolloverCase.update({
    where: { id },
    data: {
      ...(body.clientFirstName !== undefined && { clientFirstName: body.clientFirstName }),
      ...(body.clientLastName !== undefined && { clientLastName: body.clientLastName }),
      ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail }),
      ...(body.clientPhone !== undefined && { clientPhone: body.clientPhone || null }),
      ...(body.sourceProvider !== undefined && { sourceProvider: body.sourceProvider }),
      ...(body.destinationCustodian !== undefined && { destinationCustodian: body.destinationCustodian }),
      ...(body.accountType !== undefined && { accountType: body.accountType }),
      ...(body.highPriority !== undefined && { highPriority: body.highPriority }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
      ...(body.assignedAdvisorId !== undefined && { assignedAdvisorId: body.assignedAdvisorId || null }),
      ...(body.assignedOpsId !== undefined && { assignedOpsId: body.assignedOpsId || null }),
      ...(body.status !== undefined && { status: body.status, statusUpdatedAt: new Date() }),
      ...(body.needsReview !== undefined && { needsReview: body.needsReview }),
      ...(body.reviewReason !== undefined && { reviewReason: body.reviewReason }),
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

// DELETE — admin only; permanently removes the case and everything hanging off
// it. Notes, tasks, activity events, checklist items, documents, and client
// portal tokens/sessions all cascade at the DB level (see schema.prisma), so the
// only manual cleanup is the S3 objects behind the document rows.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Deleting a case destroys client paperwork and the audit-relevant activity
  // trail, so this is tighter than document deletion (which allows OPS too).
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id;

  const existing = await prisma.rolloverCase.findFirst({
    where: { id, firmId, ...caseVisibilityFilter(session.user.role, userId) },
    include: { documents: { select: { id: true, storagePath: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Best-effort S3 cleanup. A failure here must not block the delete — an
  // orphaned object costs pennies, a case that won't delete costs the user.
  let orphanedObjects = 0;
  for (const doc of existing.documents) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.storagePath }));
    } catch (err) {
      orphanedObjects += 1;
      console.error("[cases.delete] S3 delete failed", doc.storagePath, err);
    }
  }

  // Tombstone the linked opportunity before dropping the row. Without this the
  // next inbound poll sees an unlinked opportunity sitting in the mapped
  // Proposal Accepted stage and re-creates the case within seconds.
  if (existing.wealthboxOpportunityId) {
    await prisma.deletedCrmOpportunity.upsert({
      where: {
        firmId_opportunityId: { firmId, opportunityId: existing.wealthboxOpportunityId },
      },
      create: { firmId, opportunityId: existing.wealthboxOpportunityId, deletedById: userId },
      update: { deletedAt: new Date(), deletedById: userId },
    });
  }

  await prisma.rolloverCase.delete({ where: { id } });

  // The case's own ActivityEvent rows are gone with it — the audit log is the
  // only surviving record that this case ever existed.
  const meta = extractRequestMeta(request);
  await recordAudit({
    firmId,
    actorUserId: userId,
    action: "case.deleted",
    resource: "RolloverCase",
    resourceId: id,
    metadata: {
      clientName: `${existing.clientFirstName} ${existing.clientLastName}`,
      clientEmail: existing.clientEmail,
      status: existing.status,
      sourceProvider: existing.sourceProvider,
      destinationCustodian: existing.destinationCustodian,
      documentCount: existing.documents.length,
      wealthboxOpportunityId: existing.wealthboxOpportunityId,
      orphanedObjects,
    },
    ...meta,
  });

  return new NextResponse(null, { status: 204 });
}
