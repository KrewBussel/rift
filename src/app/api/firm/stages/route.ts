import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { ALWAYS_ENABLED_STATUSES, STATUSES } from "@/components/casesDesignTokens";
import { ensureFirmStageConfig } from "@/lib/stageConfig";

const ALL_STATUSES = STATUSES.map((s) => s.value) as [string, ...string[]];

const StageRowSchema = z.object({
  status: z.enum(ALL_STATUSES),
  customLabel: z.string().trim().max(60).nullable(),
  isEnabled: z.boolean(),
});

const PutSchema = z
  .object({
    stages: z.array(StageRowSchema).length(STATUSES.length),
  })
  .strict();

/** Read the firm's stage configuration (auto-seeds defaults on first read). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = session.user.firmId;
  await ensureFirmStageConfig(firmId);

  const rows = await prisma.caseStageConfig.findMany({
    where: { firmId },
    orderBy: { sortOrder: "asc" },
    select: { status: true, customLabel: true, isEnabled: true, sortOrder: true },
  });
  return NextResponse.json({ stages: rows });
}

/** Replace the firm's stage configuration. Bookends are forced to isEnabled=true. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, PutSchema);
  if (parsed instanceof NextResponse) return parsed;

  const seen = new Set(parsed.data.stages.map((s) => s.status));
  if (seen.size !== STATUSES.length) {
    return NextResponse.json(
      { error: "stages must include each canonical status exactly once" },
      { status: 400 },
    );
  }

  const firmId = session.user.firmId;
  await prisma.$transaction(
    parsed.data.stages.map((s) => {
      const sortOrder = STATUSES.findIndex((c) => c.value === s.status);
      const isEnabled = ALWAYS_ENABLED_STATUSES.has(s.status as "PROPOSAL_ACCEPTED" | "WON")
        ? true
        : s.isEnabled;
      const customLabel = s.customLabel?.trim() ? s.customLabel.trim() : null;
      return prisma.caseStageConfig.upsert({
        where: { firmId_status: { firmId, status: s.status as never } },
        create: { firmId, status: s.status as never, customLabel, isEnabled, sortOrder },
        update: { customLabel, isEnabled, sortOrder },
      });
    }),
  );

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.stages_updated",
    resource: "CaseStageConfig",
    metadata: { stages: parsed.data.stages.length },
    ...meta,
  });

  const rows = await prisma.caseStageConfig.findMany({
    where: { firmId },
    orderBy: { sortOrder: "asc" },
    select: { status: true, customLabel: true, isEnabled: true, sortOrder: true },
  });
  return NextResponse.json({ stages: rows });
}
