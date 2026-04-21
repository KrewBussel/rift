import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { sealSecret } from "@/lib/crypto";
import { getMe, WealthboxError } from "@/lib/wealthbox";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Wealthbox-specific connect endpoint: validates the pasted personal access
 * token against Wealthbox's /me and persists the encrypted connection.
 * Salesforce uses the OAuth flow under /api/integrations/salesforce/*.
 * Generic GET/DELETE (view/disconnect any provider) live under /api/integrations/crm.
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
      refreshTokenCiphertext: null,
      refreshTokenIv: null,
      refreshTokenTag: null,
      tokenExpiresAt: null,
      instanceUrl: null,
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

  return NextResponse.json({
    connection: {
      id: connection.id,
      provider: connection.provider,
      connectedUserId: connection.connectedUserId,
      connectedUserName: connection.connectedUserName,
      connectedUserEmail: connection.connectedUserEmail,
      connectedAt: connection.connectedAt,
    },
  });
}
