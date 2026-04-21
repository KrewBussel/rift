import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { buildRequest } from "../helpers/route";
import { NextRequest } from "next/server";

/**
 * cron/reminders is not session-auth'd — it's called by Vercel Cron with a
 * shared secret (x-cron-secret header or ?secret=). These tests verify the
 * secret is actually enforced, not just optional.
 */
describe("cron/reminders — shared-secret enforcement", () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;
  const TEST_SECRET = "test-cron-secret-" + Math.random().toString(36).slice(2);

  beforeEach(async () => {
    vi.resetModules();
    process.env.CRON_SECRET = TEST_SECRET;
    await truncateAll();
  });

  afterAll(async () => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
    await prisma.$disconnect();
  });

  it("POST without a secret returns 401", async () => {
    const { POST } = await import("@/app/api/cron/reminders/route");
    const req = new NextRequest(
      new Request("http://localhost/api/cron/reminders", { method: "POST" }),
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST with a wrong secret returns 401", async () => {
    const { POST } = await import("@/app/api/cron/reminders/route");
    const req = new NextRequest(
      new Request("http://localhost/api/cron/reminders", {
        method: "POST",
        headers: { "x-cron-secret": "definitely-not-right" },
      }),
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET without a secret returns 401 (Vercel Cron GET variant)", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    const req = new NextRequest(
      new Request("http://localhost/api/cron/reminders", { method: "GET" }),
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("POST with the correct secret in header proceeds past auth", async () => {
    const { POST } = await import("@/app/api/cron/reminders/route");
    // dry_run=true prevents real emails; we only need to prove auth let us through.
    const req = new NextRequest(
      new Request("http://localhost/api/cron/reminders?dry_run=true", {
        method: "POST",
        headers: { "x-cron-secret": TEST_SECRET },
      }),
    );
    const res = await POST(req);
    expect(res.status).not.toBe(401);
  });

  it("POST with the correct secret in ?secret= query param also passes", async () => {
    const { POST } = await import("@/app/api/cron/reminders/route");
    const req = new NextRequest(
      new Request(
        `http://localhost/api/cron/reminders?dry_run=true&secret=${TEST_SECRET}`,
        { method: "POST" },
      ),
    );
    const res = await POST(req);
    expect(res.status).not.toBe(401);
  });

  it("request without a secret, helper builder", async () => {
    // Sanity: proves our buildRequest helper also produces a 401-returning call.
    const { POST } = await import("@/app/api/cron/reminders/route");
    const res = await POST(
      new NextRequest(buildRequest("http://localhost/api/cron/reminders", { method: "POST" })),
    );
    expect(res.status).toBe(401);
  });
});
