import crypto from "crypto";

/**
 * Password reset tokens: opaque 32-byte random values passed in the reset URL,
 * stored only as a SHA-256 hash in the DB. That way a read-only DB leak
 * doesn't expose usable tokens.
 */
export const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken(): { plaintext: string; hash: string; expiresAt: Date } {
  const plaintext = crypto.randomBytes(32).toString("base64url");
  const hash = hashResetToken(plaintext);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return { plaintext, hash, expiresAt };
}

export function hashResetToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}
