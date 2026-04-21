import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ClientScope, ClientSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Client portal auth — two-layer tokens:
 *
 *   ClientAccessToken  (magic link, 7-day TTL, single-use)
 *     → emailed to the case's client by a firm user
 *     → first visit consumes it and mints a...
 *   ClientSession      (cookie-bound, 24h TTL)
 *     → __Host-rift_client cookie, HttpOnly, Secure, SameSite=Lax
 *     → scoped to /api/client and /client pages
 *
 * Both are stored only as sha256 hashes. Raw tokens never persist anywhere
 * but the email body and the browser cookie.
 */

export const LINK_TOKEN_TTL_DAYS = 7;
export const SESSION_TTL_HOURS = 24;
export const CLIENT_SESSION_COOKIE = "__Host-rift_client";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

// Production requires __Host- prefix (HTTPS + no Domain). Dev http://localhost
// can't set __Host- cookies, so fall back to a plain name there.
export function clientSessionCookieName(): string {
  return isProd() ? CLIENT_SESSION_COOKIE : "rift_client";
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// ─── Link tokens ───────────────────────────────────────────────────────────

export interface IssuedLink {
  plaintext: string;
  tokenId: string;
  expiresAt: Date;
}

export async function issueClientAccessToken(opts: {
  caseId: string;
  firmId: string;
  issuedByUserId: string;
  scope?: ClientScope;
}): Promise<IssuedLink> {
  const plaintext = randomToken();
  const tokenHash = sha256(plaintext);
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Revoke any prior unused links for this case — one active link at a time.
  await prisma.clientAccessToken.updateMany({
    where: {
      caseId: opts.caseId,
      consumedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });

  const token = await prisma.clientAccessToken.create({
    data: {
      caseId: opts.caseId,
      firmId: opts.firmId,
      tokenHash,
      scope: opts.scope ?? "FULL",
      expiresAt,
      issuedByUserId: opts.issuedByUserId,
    },
  });

  return { plaintext, tokenId: token.id, expiresAt };
}

/**
 * Consume a link token and mint a client session. Single-use: the token's
 * consumedAt is stamped atomically so a second exchange fails. Returns the
 * raw session token to set as a cookie.
 */
export async function exchangeLinkForSession(opts: {
  linkPlaintext: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<
  | { ok: true; sessionPlaintext: string; session: ClientSession }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "consumed" }
> {
  const linkHash = sha256(opts.linkPlaintext);
  const link = await prisma.clientAccessToken.findUnique({
    where: { tokenHash: linkHash },
  });
  if (!link) return { ok: false, reason: "invalid" };
  if (link.revokedAt) return { ok: false, reason: "revoked" };
  if (link.consumedAt) return { ok: false, reason: "consumed" };
  if (link.expiresAt <= new Date()) return { ok: false, reason: "expired" };

  // Atomic claim: fail if another request got here first.
  const claim = await prisma.clientAccessToken.updateMany({
    where: { id: link.id, consumedAt: null, revokedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, reason: "consumed" };

  const sessionPlaintext = randomToken();
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const session = await prisma.clientSession.create({
    data: {
      caseId: link.caseId,
      firmId: link.firmId,
      tokenId: link.id,
      tokenHash: sha256(sessionPlaintext),
      scope: link.scope,
      expiresAt: sessionExpiresAt,
      userAgent: opts.userAgent ?? null,
      ipAddress: opts.ipAddress ?? null,
    },
  });

  return { ok: true, sessionPlaintext, session };
}

// ─── Session resolution ────────────────────────────────────────────────────

export interface ResolvedClientSession {
  sessionId: string;
  caseId: string;
  firmId: string;
  scope: ClientScope;
  expiresAt: Date;
}

/**
 * Look up the session by cookie, validate expiry/revocation, and bump
 * lastSeenAt. Returns null on any failure — callers should 401.
 */
export async function getClientSessionFromCookie(): Promise<ResolvedClientSession | null> {
  const jar = await cookies();
  const raw = jar.get(clientSessionCookieName())?.value;
  if (!raw) return null;

  const session = await prisma.clientSession.findUnique({
    where: { tokenHash: sha256(raw) },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= new Date()) return null;

  // Fire-and-forget lastSeen bump — don't block on it, don't fail on errors.
  prisma.clientSession
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return {
    sessionId: session.id,
    caseId: session.caseId,
    firmId: session.firmId,
    scope: session.scope,
    expiresAt: session.expiresAt,
  };
}

/**
 * Guard helper for /api/client/** routes. Returns either a resolved session
 * or an error response to return immediately. Also rejects callers who have
 * an active firm NextAuth session — firm and client contexts are mutually
 * exclusive.
 */
export async function requireClientSession(): Promise<
  { ok: true; session: ResolvedClientSession } | { ok: false; res: NextResponse }
> {
  const firm = await auth();
  if (firm?.user) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Firm session active — client portal not accessible." },
        { status: 409 },
      ),
    };
  }
  const session = await getClientSessionFromCookie();
  if (!session) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export function requireScope(
  session: ResolvedClientSession,
  needed: ClientScope,
): NextResponse | null {
  if (session.scope === "FULL") return null;
  if (session.scope === needed) return null;
  if (needed === "VIEW" && session.scope === "UPLOAD") return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function revokeClientSession(sessionId: string): Promise<void> {
  await prisma.clientSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeClientAccessToken(tokenId: string): Promise<void> {
  await prisma.$transaction([
    prisma.clientAccessToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    }),
    prisma.clientSession.updateMany({
      where: { tokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// ─── Cookie shape ──────────────────────────────────────────────────────────

export interface SessionCookieOptions {
  maxAgeSeconds: number;
  expires?: Date;
}

export function clientSessionCookieOptions(expiresAt: Date): {
  name: string;
  value?: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    expires: Date;
  };
} {
  return {
    name: clientSessionCookieName(),
    options: {
      httpOnly: true,
      secure: isProd(),
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    },
  };
}
