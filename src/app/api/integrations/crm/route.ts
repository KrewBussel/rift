import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Provider-agnostic CRM connection endpoints.
 * GET returns the firm's connection and stage mappings (if any).
 * DELETE disconnects (any provider) and clears all linked cases.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await prisma.crmConnection.findUnique({
    where: { firmId: session.user.firmId },
    select: {
      id: true,
      provider: true,
      instanceUrl: true,
      connectedUserId: true,
      connectedUserName: true,
      connectedUserEmail: true,
      connectedAt: true,
      lastHealthCheckAt: true,
      lastHealthOk: true,
      lastHealthError: true,
    },
  });

  const mappings = await prisma.crmStageMapping.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { riftStatus: "asc" },
  });

  return NextResponse.json({ connection, mappings });
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
    action: `crm.${connection.provider.toLowerCase()}.disconnected`,
    resource: "CrmConnection",
    resourceId: connection.id,
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
