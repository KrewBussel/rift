import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { sealSecret } from "@/lib/crypto";
import { getMe, WealthboxError } from "@/lib/wealthbox";
import { getCrmClient, type Stage } from "@/lib/crmClient";
import { suggestBookendStages, upsertBookendMappings } from "@/lib/crmSync";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Wealthbox connect endpoint: validates the pasted personal access token
 * against Wealthbox's /me and persists the encrypted connection. Then it pulls
 * the firm's opportunity stages, auto-detects the two bookend stages by name
 * (Proposal Accepted → trigger, Won → close), and — if the firm has no bookend
 * mappings yet — saves them automatically so onboarding is a single paste +
 * confirm. Re-pasting a token later (rotation) never clobbers existing mappings.
 *
 * GET/DELETE (view/disconnect) live under /api/integrations/crm.
 */

const ConnectSchema = z.object({
  token: z.string().trim().min(10).max(500),
}).strict();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, ConnectSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { token } = parsed.data;

  let me;
  try {
    me = await getMe(token);
  } catch (err) {
    const status = err instanceof WealthboxError ? err.status : 500;
    const message = status === 401 ? "Invalid or revoked Wealthbox token" : "Unable to reach Wealthbox";
    return NextResponse.json({ error: message }, { status: status === 401 ? 400 : 502 });
  }

  const sealed = sealSecret(token);
  const firmId = session.user.firmId;

  const connection = await prisma.crmConnection.upsert({
    where: { firmId },
    update: {
      provider: "WEALTHBOX",
      encryptedToken: sealed.ciphertext,
      tokenIv: sealed.iv,
      tokenTag: sealed.tag,
      connectedUserId: String(me.id),
      connectedUserName: me.name,
      connectedUserEmail: me.email,
      connectedAt: new Date(),
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
      lastHealthError: null,
    },
    create: {
      firmId,
      provider: "WEALTHBOX",
      encryptedToken: sealed.ciphertext,
      tokenIv: sealed.iv,
      tokenTag: sealed.tag,
      connectedUserId: String(me.id),
      connectedUserName: me.name,
      connectedUserEmail: me.email,
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
    },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "crm.wealthbox.connected",
    resource: "CrmConnection",
    resourceId: connection.id,
    metadata: { connectedUserEmail: me.email },
    ...meta,
  });

  // Pull stages and auto-detect the bookends. A stage-fetch failure must not
  // fail the connect — the token is valid and saved; the wizard falls back to
  // the manual picker with an empty list.
  let stages: Stage[] = [];
  let suggested: { triggerStageId: string | null; wonStageId: string | null } = {
    triggerStageId: null,
    wonStageId: null,
  };
  let autoMapped = false;
  let pipelineId: string | null = null;

  try {
    const client = getCrmClient(connection);
    stages = await client.getStages();

    // Auto-select the source pipeline when there's only one to choose from —
    // the common case on Wealthbox plans that cap pipelines at "Default". With
    // several, the admin picks in Settings → Integrations and we leave it null
    // so name-based detection still gets its shot below. A rotation never
    // overwrites an existing choice.
    pipelineId = connection.pipelineId;
    if (!pipelineId) {
      const distinct = new Map<string, string>();
      for (const s of stages) {
        if (s.pipelineId) distinct.set(s.pipelineId, s.pipelineName ?? "Unnamed pipeline");
      }
      if (distinct.size === 1) {
        const [[onlyId, onlyName]] = [...distinct];
        await prisma.crmConnection.update({
          where: { firmId },
          data: { pipelineId: onlyId, pipelineName: onlyName },
        });
        pipelineId = onlyId;
      }
    }

    const { trigger, won } = suggestBookendStages(stages, pipelineId);
    suggested = { triggerStageId: trigger?.id ?? null, wonStageId: won?.id ?? null };

    // Only auto-save when both bookends are confidently detected AND the firm
    // has no mappings yet — so a token rotation never overwrites a firm's
    // hand-tuned mappings.
    if (trigger && won) {
      const existing = await prisma.crmStageMapping.count({
        where: { firmId, riftStatus: { in: ["PROPOSAL_ACCEPTED", "WON"] } },
      });
      if (existing === 0) {
        await upsertBookendMappings(firmId, trigger, won);
        autoMapped = true;
      }
    }
  } catch {
    // Best-effort — leave stages empty and let the admin pick manually.
  }

  return NextResponse.json({
    connection: {
      id: connection.id,
      provider: connection.provider,
      connectedUserId: connection.connectedUserId,
      connectedUserName: connection.connectedUserName,
      connectedUserEmail: connection.connectedUserEmail,
      connectedAt: connection.connectedAt,
    },
    stages,
    suggested,
    autoMapped,
    selectedPipelineId: pipelineId,
  });
}
