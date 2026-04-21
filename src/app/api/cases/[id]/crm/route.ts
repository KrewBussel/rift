import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { getProviderClient } from "@/lib/crmClient";
import { syncOpportunityStage } from "@/lib/crmSync";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

const LinkSchema = z.union([
  z.object({ mode: z.literal("link"), opportunityId: z.string().trim().min(1).max(200) }),
  z.object({ mode: z.literal("create") }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: caseId } = await params;
  const firmId = session.user.firmId;

  const parsed = await parseBody(req, LinkSchema);
  if (parsed instanceof NextResponse) return parsed;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id: caseId, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) return NextResponse.json({ error: "CRM not connected" }, { status: 400 });

  let opportunityId: string;
  let opportunityName: string;

  try {
    const client = await getProviderClient(connection);
    if (parsed.data.mode === "create") {
      const mapping = await prisma.crmStageMapping.findUnique({
        where: { firmId_riftStatus: { firmId, riftStatus: rolloverCase.status } },
      });
      const created = await client.createOpportunity({
        name: `${rolloverCase.clientFirstName} ${rolloverCase.clientLastName} — Rollover`,
        stageId: mapping?.crmStageId,
        stageName: mapping?.crmStageName,
      });
      opportunityId = created.id;
      opportunityName = created.name;
    } else {
      const existing = await client.getOpportunity(parsed.data.opportunityId);
      opportunityId = existing.id;
      opportunityName = existing.name;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "CRM error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await prisma.rolloverCase.update({
    where: { id: caseId },
    data: {
      wealthboxOpportunityId: opportunityId,
      wealthboxLinkedAt: new Date(),
      wealthboxLastSyncError: null,
    },
  });

  const syncResult = await syncOpportunityStage(caseId);

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: parsed.data.mode === "create"
      ? `crm.${connection.provider.toLowerCase()}.opportunity_created`
      : `crm.${connection.provider.toLowerCase()}.opportunity_linked`,
    resource: "RolloverCase",
    resourceId: caseId,
    metadata: { opportunityId, opportunityName, provider: connection.provider },
    ...meta,
  });

  return NextResponse.json({
    opportunityId,
    opportunityName,
    provider: connection.provider,
    syncResult,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: caseId } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id: caseId, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevOpportunityId = rolloverCase.wealthboxOpportunityId;
  const connection = await prisma.crmConnection.findUnique({ where: { firmId }, select: { provider: true } });

  await prisma.rolloverCase.update({
    where: { id: caseId },
    data: {
      wealthboxOpportunityId: null,
      wealthboxLinkedAt: null,
      wealthboxLastSyncedAt: null,
      wealthboxLastSyncError: null,
    },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: `crm.${connection?.provider.toLowerCase() ?? "unknown"}.opportunity_unlinked`,
    resource: "RolloverCase",
    resourceId: caseId,
    metadata: { opportunityId: prevOpportunityId },
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
