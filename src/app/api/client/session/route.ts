import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  clientSessionCookieName,
  clientSessionCookieOptions,
  exchangeLinkForSession,
  getClientSessionFromCookie,
  revokeClientSession,
} from "@/lib/client-auth";
import { parseBody } from "@/lib/validation";
import { enforceRateLimit, extractClientIp } from "@/lib/ratelimit";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { auth } from "@/lib/auth";

const ExchangeSchema = z.object({ token: z.string().min(1).max(256) }).strict();

/**
 * POST — exchange a magic-link token for a cookie-bound session.
 * Rejects if the caller already has a firm NextAuth session (roles must
 * be strictly separate).
 */
export async function POST(request: NextRequest) {
  // Block firm sessions from entering the client context.
  const firm = await auth();
  if (firm?.user) {
    return NextResponse.json(
      { error: "Sign out of your firm account before opening a client portal link." },
      { status: 409 },
    );
  }

  const ip = extractClientIp(request);
  const rl = await enforceRateLimit("auth", `client_session:ip:${ip}`);
  if (rl) return rl;

  const parsed = await parseBody(request, ExchangeSchema);
  if (parsed instanceof NextResponse) return parsed;

  const meta = extractRequestMeta(request);
  const result = await exchangeLinkForSession({
    linkPlaintext: parsed.data.token,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Link is invalid or expired.", reason: result.reason },
      { status: 401 },
    );
  }

  await recordAudit({
    firmId: result.session.firmId,
    actorUserId: null,
    action: "client_portal.session_started",
    resource: "ClientSession",
    resourceId: result.session.id,
    metadata: { caseId: result.session.caseId },
    ...meta,
  });

  const cookie = clientSessionCookieOptions(result.session.expiresAt);
  const res = NextResponse.json({
    ok: true,
    caseId: result.session.caseId,
    scope: result.session.scope,
    expiresAt: result.session.expiresAt.toISOString(),
  });
  res.cookies.set({
    name: cookie.name,
    value: result.sessionPlaintext,
    ...cookie.options,
  });
  return res;
}

/**
 * DELETE — client logout. Revokes the session and clears the cookie.
 */
export async function DELETE(request: NextRequest) {
  const session = await getClientSessionFromCookie();
  if (session) {
    await revokeClientSession(session.sessionId);
    const meta = extractRequestMeta(request);
    await recordAudit({
      firmId: session.firmId,
      actorUserId: null,
      action: "client_portal.session_ended",
      resource: "ClientSession",
      resourceId: session.sessionId,
      ...meta,
    });
  }

  const jar = await cookies();
  const name = clientSessionCookieName();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name, value: "", httpOnly: true, path: "/", expires: new Date(0), sameSite: "lax" });
  jar.delete(name);
  return res;
}

/**
 * GET — lightweight session probe. Used by portal pages to decide routing.
 */
export async function GET() {
  const session = await getClientSessionFromCookie();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    caseId: session.caseId,
    scope: session.scope,
    expiresAt: session.expiresAt.toISOString(),
  });
}
