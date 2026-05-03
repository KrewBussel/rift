import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureFirmStageConfig } from "@/lib/stageConfig";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Mark the firm's onboarding wizard as complete. Idempotent — re-posting after
 * the flag is set is a no-op. Requires ADMIN since onboarding gates the whole
 * dashboard for the firm.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const firmId = session.user.firmId;

  // Safety net: ensure the canonical stage rows exist before we let the firm
  // exit onboarding. Should already be true if the wizard was used.
  await ensureFirmStageConfig(firmId);

  // Sanity gate: don't let a firm finish onboarding without a CRM connection
  // and both bookend mappings. The wizard enforces this client-side, so a 400
  // here means someone is calling the API directly.
  const [connection, mappings] = await Promise.all([
    prisma.crmConnection.findUnique({ where: { firmId } }),
    prisma.crmStageMapping.findMany({
      where: { firmId, riftStatus: { in: ["PROPOSAL_ACCEPTED", "WON"] } },
      select: { riftStatus: true },
    }),
  ]);
  if (!connection) {
    return NextResponse.json({ error: "Connect a CRM before completing onboarding" }, { status: 400 });
  }
  const have = new Set(mappings.map((m) => m.riftStatus));
  if (!have.has("PROPOSAL_ACCEPTED") || !have.has("WON")) {
    return NextResponse.json(
      { error: "Both bookend stages (Proposal Accepted, Won) must be mapped" },
      { status: 400 },
    );
  }

  const updated = await prisma.firm.update({
    where: { id: firmId },
    data: { onboardedAt: new Date() },
    select: { onboardedAt: true },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.onboarding_completed",
    resource: "Firm",
    resourceId: firmId,
    ...meta,
  });

  return NextResponse.json({ onboardedAt: updated.onboardedAt });
}

/** Inspect onboarding status — used by the wizard to know which step to land on. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = session.user.firmId;
  const [firm, connection, mappings, stageCount] = await Promise.all([
    prisma.firm.findUnique({ where: { id: firmId }, select: { onboardedAt: true } }),
    prisma.crmConnection.findUnique({
      where: { firmId },
      select: { provider: true, connectedUserEmail: true },
    }),
    prisma.crmStageMapping.findMany({
      where: { firmId, riftStatus: { in: ["PROPOSAL_ACCEPTED", "WON"] } },
      select: { riftStatus: true, crmStageId: true, crmStageName: true },
    }),
    prisma.caseStageConfig.count({ where: { firmId } }),
  ]);

  return NextResponse.json({
    onboardedAt: firm?.onboardedAt ?? null,
    crm: connection,
    mappings,
    stageConfigSeeded: stageCount > 0,
  });
}
