import crypto from "node:crypto";

/**
 * AES-256-GCM helpers for at-rest secrets (CRM tokens, etc).
 * The key is derived from AUTH_SECRET so a single env var covers both
 * NextAuth and secret encryption; rotating AUTH_SECRET invalidates
 * existing ciphertexts, which is the correct behavior.
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(secret).digest();
}

export interface SealedSecret {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
}

export function sealSecret(plaintext: string): SealedSecret {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function openSecret(sealed: SealedSecret): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
