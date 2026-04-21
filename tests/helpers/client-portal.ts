import crypto from "node:crypto";
import { vi } from "vitest";
import { prisma } from "./db";

/**
 * Create a fresh ClientAccessToken for a case and return both the DB row
 * and the raw plaintext (for exchange-flow tests).
 */
export async function seedLinkToken(opts: {
  caseId: string;
  firmId: string;
  issuedByUserId: string;
  scope?: "VIEW" | "UPLOAD" | "FULL";
  expiresInMs?: number;
  consumed?: boolean;
  revoked?: boolean;
}) {
  const plaintext = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 7 * 24 * 60 * 60 * 1000));
  const row = await prisma.clientAccessToken.create({
    data: {
      caseId: opts.caseId,
      firmId: opts.firmId,
      tokenHash,
      scope: opts.scope ?? "FULL",
      expiresAt,
      issuedByUserId: opts.issuedByUserId,
      consumedAt: opts.consumed ? new Date() : null,
      revokedAt: opts.revoked ? new Date() : null,
    },
  });
  return { plaintext, row };
}

/**
 * Create an active ClientSession row and return the raw session plaintext
 * that should be placed in the cookie.
 */
export async function seedClientSession(opts: {
  caseId: string;
  firmId: string;
  tokenId: string;
  scope?: "VIEW" | "UPLOAD" | "FULL";
  expiresInMs?: number;
  revoked?: boolean;
}) {
  const plaintext = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 24 * 60 * 60 * 1000));
  const row = await prisma.clientSession.create({
    data: {
      caseId: opts.caseId,
      firmId: opts.firmId,
      tokenId: opts.tokenId,
      tokenHash,
      scope: opts.scope ?? "FULL",
      expiresAt,
      revokedAt: opts.revoked ? new Date() : null,
    },
  });
  return { plaintext, row };
}

/**
 * Mock `next/headers` cookies() so getClientSessionFromCookie reads our value.
 * The portal code picks the cookie name by NODE_ENV; in tests that's not
 * "production", so the name is "rift_client".
 */
export function mockClientCookie(sessionPlaintext: string | null) {
  const store = {
    get: vi.fn((name: string) => {
      if (sessionPlaintext && (name === "rift_client" || name === "__Host-rift_client")) {
        return { name, value: sessionPlaintext };
      }
      return undefined;
    }),
    delete: vi.fn(),
    set: vi.fn(),
  };
  vi.doMock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue(store),
    headers: vi.fn().mockResolvedValue(new Headers()),
  }));
}
