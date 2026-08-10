import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * CRM connection endpoints.
 * GET returns the firm's connection and stage mappings (if any).
 * PATCH updates connection-level sync settings (source pipeline, inbound filter).
 * DELETE disconnects and clears all linked cases.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await prisma.crmConnection.findUnique({
    where: { firmId: session.user.firmId },
    select: {
      id: true,
      provider: true,
      connectedUserId: true,
      connectedUserName: true,
      connectedUserEmail: true,
      connectedAt: true,
      lastHealthCheckAt: true,
      lastHealthOk: true,
      lastHealthError: true,
      pipelineId: true,
      pipelineName: true,
      requireRolloverFields: true,
    },
  });

  const mappings = await prisma.crmStageMapping.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { riftStatus: "asc" },
  });

  return NextResponse.json({ connection, mappings });
}

const SettingsSchema = z
  .object({
    // null clears the selection and returns auto-detection to name-matching.
    pipelineId: z.string().trim().min(1).max(200).nullable().optional(),
    pipelineName: z.string().trim().min(1).max(200).nullable().optional(),
    requireRolloverFields: z.boolean().optional(),
  })
  .strict();

/**
 * Update how this firm's CRM feeds Rift: which opportunity pipeline is the
 * source, and whether inbound case creation is filtered to opportunities that
 * actually carry Rift's custom fields.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, SettingsSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const firmId = session.user.firmId;
  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  const updated = await prisma.crmConnection.update({
    where: { firmId },
    data: {
      ...(body.pipelineId !== undefined && { pipelineId: body.pipelineId }),
      ...(body.pipelineName !== undefined && { pipelineName: body.pipelineName }),
      ...(body.requireRolloverFields !== undefined && {
        requireRolloverFields: body.requireRolloverFields,
      }),
    },
    select: { pipelineId: true, pipelineName: true, requireRolloverFields: true },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "crm.wealthbox.sync_settings_updated",
    resource: "CrmConnection",
    resourceId: connection.id,
    metadata: { ...updated },
    ...meta,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;
  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) return NextResponse.json({ ok: true });

  await prisma.$transaction([
    prisma.crmStageMapping.deleteMany({ where: { firmId } }),
    prisma.crmConnection.delete({ where: { firmId } }),
    prisma.rolloverCase.updateMany({
      where: { firmId, wealthboxOpportunityId: { not: null } },
      data: {
        wealthboxOpportunityId: null,
        wealthboxLinkedAt: null,
        wealthboxLastSyncedAt: null,
        wealthboxLastSyncError: null,
      },
    }),
  ]);

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "crm.wealthbox.disconnected",
    resource: "CrmConnection",
    resourceId: connection.id,
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
