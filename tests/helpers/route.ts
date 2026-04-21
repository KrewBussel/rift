import { vi } from "vitest";
import type { SeededUser } from "./fixtures";

/**
 * Build the session object that NextAuth's `auth()` returns. Shape mirrors
 * the callbacks in src/lib/auth.ts.
 */
export function sessionFor(user: SeededUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      firmId: user.firmId,
      role: user.role,
      name: `${user.role} User`,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock `@/lib/auth` so `auth()` returns the given session for the duration of
 * one test. Call this inside the test (or in beforeEach) before importing the
 * route handler.
 *
 * Usage:
 *   mockSession(sessionFor(a.ops));
 *   const { GET } = await import("@/app/api/cases/[id]/route");
 *   const res = await GET(req, { params: Promise.resolve({ id: b.caseId }) });
 */
export function mockSession(session: ReturnType<typeof sessionFor> | null) {
  vi.doMock("@/lib/auth", () => ({
    auth: vi.fn().mockResolvedValue(session),
  }));
}

/** Build a minimal Request. Route handlers only ever read `.url`, `.json()`, and headers. */
export function buildRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Request {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(url, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** Wraps a param object in a Promise, matching the App Router's param shape. */
export function params<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}
