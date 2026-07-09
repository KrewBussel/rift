import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { caseVisibilityFilter } from "@/lib/caseVisibility";
import { issueClientAccessToken, LINK_TOKEN_TTL_DAYS } from "@/lib/client-auth";
import { buildClientPortalInviteEmail, sendEmail } from "@/lib/email";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/ratelimit";
import { buildFirmUrl } from "@/lib/firmDomain";

/**
 * Issue a client-portal magic link for this case. Firm-side; requires
 * ADMIN or OPS (not ADVISOR — client-facing invites are operational).
 * Issuing a new link revokes any prior unused links for the case.
 */

const IssueSchema = z
  .object({
    scope: z.enum(["VIEW", "UPLOAD", "FULL"]).optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: caseId } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id as string;

  const rlBlocked = await enforceRateLimit("sensitive", `client_link:${userId}:${caseId}`);
  if (rlBlocked) return rlBlocked;

  const parsed = await parseBody(request, IssueSchema);
  if (parsed instanceof NextResponse) return parsed;

  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id: caseId, firmId, ...caseVisibilityFilter(session.user.role, userId) },
    include: {
      assignedAdvisor: { select: { firstName: true, lastName: true } },
      // slug needed to build the firm-branded portal URL (<slug>.riftira.com).
      firm: { select: { name: true, slug: true } },
    },
  });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { plaintext, tokenId, expiresAt } = await issueClientAccessToken({
    caseId,
    firmId,
    issuedByUserId: userId,
    scope: parsed.data.scope ?? "FULL",
  });

  // Magic-link destination is the firm's tenant subdomain so the client sees a
  // branded URL (e.g. acme.riftira.com/client/enter?token=...). The proxy
  // serves /client/** on tenant subdomains; client-auth is independent of the
  // firm-user session, so the cookie scope works on either origin.
  const portalUrl = buildFirmUrl(
    rolloverCase.firm.slug,
    `/client/enter?token=${encodeURIComponent(plaintext)}`,
  );

  const advisorName = rolloverCase.assignedAdvisor
    ? `${rolloverCase.assignedAdvisor.firstName} ${rolloverCase.assignedAdvisor.lastName}`
    : null;

  const { subject, html } = buildClientPortalInviteEmail({
    portalUrl,
    clientFirstName: rolloverCase.clientFirstName,
    firmName: rolloverCase.firm.name,
    advisorName,
    expiresInDays: LINK_TOKEN_TTL_DAYS,
  });

  const sent = await sendEmail(rolloverCase.clientEmail, subject, html).catch((err) => {
    console.error("[client-link] email send failed", err);
    return { ok: false, reason: err instanceof Error ? err.message : "email send threw" };
  });

  const meta = extractRequestMeta(request);
  await recordAudit({
    firmId,
    actorUserId: userId,
    action: "client_portal.link_issued",
    resource: "RolloverCase",
    resourceId: caseId,
    metadata: { tokenId, emailSent: sent.ok, recipient: rolloverCase.clientEmail, emailError: sent.reason ?? null },
    ...meta,
  });

  return NextResponse.json({
    ok: true,
    tokenId,
    expiresAt: expiresAt.toISOString(),
    emailSent: sent.ok,
    emailError: sent.reason ?? null,
    portalUrl,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: caseId } = await params;
  const firmId = session.user.firmId;
  const userId = session.user.id as string;

  // Verify case ownership first — don't 404/200-leak across firms.
  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id: caseId, firmId, ...caseVisibilityFilter(session.user.role, userId) },
    select: { id: true },
  });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Revoke all active tokens + all active sessions derived from them.
  const now = new Date();
  await prisma.$transaction([
    prisma.clientAccessToken.updateMany({
      where: { caseId, firmId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.clientSession.updateMany({
      where: { caseId, firmId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  const meta = extractRequestMeta(request);
  await recordAudit({
    firmId,
    actorUserId: userId,
    action: "client_portal.access_revoked",
    resource: "RolloverCase",
    resourceId: caseId,
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
