import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

// Only the bookend stages map to CRM. Intermediate Rift-only stages
// (AWAITING_CLIENT_ACTION, READY_TO_SUBMIT, SUBMITTED, PROCESSING, IN_TRANSIT)
// are not synced — PROPOSAL_ACCEPTED is the inbound entry point and WON is the
// outbound close trigger.
const MAPPABLE_STATUSES = ["PROPOSAL_ACCEPTED", "WON"] as const;

const MappingSchema = z.object({
  mappings: z.array(z.object({
    riftStatus: z.enum(MAPPABLE_STATUSES),
    crmStageId: z.string().trim().min(1).max(200),
    crmStageName: z.string().trim().min(1).max(200),
  })).max(2),
}).strict();

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, MappingSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { mappings } = parsed.data;

  const firmId = session.user.firmId;
  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  await prisma.$transaction([
    prisma.crmStageMapping.deleteMany({ where: { firmId } }),
    ...mappings.map((m) =>
      prisma.crmStageMapping.create({
        data: { firmId, riftStatus: m.riftStatus, crmStageId: m.crmStageId, crmStageName: m.crmStageName },
      })
    ),
  ]);

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: `crm.${connection.provider.toLowerCase()}.mapping_updated`,
    resource: "CrmStageMapping",
    metadata: { count: mappings.length },
    ...meta,
  });

  const saved = await prisma.crmStageMapping.findMany({ where: { firmId }, orderBy: { riftStatus: "asc" } });
  return NextResponse.json({ mappings: saved });
}
