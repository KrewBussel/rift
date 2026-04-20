import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting via Upstash Redis (or Vercel KV, which is Upstash under the hood).
 *
 * Required env (either set works — checked in order):
 *   KV_REST_API_URL + KV_REST_API_TOKEN        (Vercel KV)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * If neither is set, rate limiting is a safe no-op (logs a warning once per cold start).
 * This keeps local development frictionless.
 */

let warned = false;
function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn("[ratelimit] Redis env not configured — rate limiting disabled.");
      warned = true;
    }
    return null;
  }
  return new Redis({ url, token });
}

function make(prefix: string, limiter: ReturnType<typeof Ratelimit.slidingWindow>): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter,
    analytics: false,
    prefix: `rift:ratelimit:${prefix}`,
  });
}

let authLimiter: Ratelimit | null | undefined;
let chatLimiter: Ratelimit | null | undefined;
let mutationLimiter: Ratelimit | null | undefined;
let sensitiveLimiter: Ratelimit | null | undefined;

function getLimiters() {
  // Lazy-initialize on first use. Cached for the lifetime of the process.
  if (authLimiter === undefined) authLimiter = make("auth", Ratelimit.slidingWindow(5, "15 m"));
  if (chatLimiter === undefined) chatLimiter = make("chat", Ratelimit.slidingWindow(30, "1 m"));
  if (mutationLimiter === undefined) mutationLimiter = make("mut", Ratelimit.slidingWindow(60, "1 m"));
  if (sensitiveLimiter === undefined) sensitiveLimiter = make("sens", Ratelimit.slidingWindow(5, "15 m"));
  return { authLimiter, chatLimiter, mutationLimiter, sensitiveLimiter };
}

export type LimiterKind = "auth" | "chat" | "mutation" | "sensitive";

export interface RateLimitOk {
  ok: true;
  remaining: number;
  reset: number;
}
export interface RateLimitBlocked {
  ok: false;
  retryAfter: number;
  reset: number;
}

/**
 * Check a rate limit. Returns { ok: true } if allowed, { ok: false } if blocked.
 * When rate limiting is disabled (no Redis configured), always returns ok.
 *
 * `identifier` should be specific to the request:
 *   - auth failures:  `signin:<email>` or `signin:ip:<ip>`
 *   - chat:           `chat:user:<userId>`
 *   - password change:`pwd:user:<userId>`
 */
export async function checkRateLimit(
  kind: LimiterKind,
  identifier: string,
): Promise<RateLimitOk | RateLimitBlocked> {
  const { authLimiter, chatLimiter, mutationLimiter, sensitiveLimiter } = getLimiters();
  const limiter =
    kind === "auth"
      ? authLimiter
      : kind === "chat"
        ? chatLimiter
        : kind === "mutation"
          ? mutationLimiter
          : sensitiveLimiter;

  if (!limiter) return { ok: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };

  const result = await limiter.limit(identifier);
  if (result.success) return { ok: true, remaining: result.remaining, reset: result.reset };

  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { ok: false, retryAfter: retryAfterSeconds, reset: result.reset };
}

/**
 * Convenience: enforce a rate limit on an HTTP handler. Returns a 429 NextResponse
 * if over the limit, or null if the request should proceed.
 */
export async function enforceRateLimit(
  kind: LimiterKind,
  identifier: string,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(kind, identifier);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again.", retryAfter: result.retryAfter },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

export function extractClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
