import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

// The concern: a list endpoint filter clause that forgets to include firmId
// would silently return another firm's rows. These tests hit each list route
// as a firm-A user and assert NO firm-B ids appear in the response.

describe("List endpoints — firmId filter enforcement", () => {
  let world: SeededWorld;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    await truncateAll();
    world = await seedTwoFirms();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/cases — returns only the caller's firm's cases", async () => {
    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/cases/route");
    const res = await GET(buildRequest("http://localhost/api/cases"));
    expect(res.status).toBe(200);

    const cases = (await res.json()) as Array<{ id: string; firmId: string }>;
    expect(cases.map((c) => c.id)).toContain(world.a.caseId);
    expect(cases.map((c) => c.id)).not.toContain(world.b.caseId);
    expect(cases.every((c) => c.firmId === world.a.firmId)).toBe(true);
  });

  it("GET /api/tasks — returns only tasks on the caller's firm's cases assigned to them", async () => {
    // Additionally seed: a task assigned to firm A's ops but on firm B's case
    // (shouldn't happen in practice, but tests the `case: { firmId }` filter).
    await prisma.task.create({
      data: {
        caseId: world.b.caseId,
        title: "sneaky",
        createdById: world.b.ops.id,
        assigneeId: world.a.ops.id,
      },
    });

    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/tasks/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const tasks = (await res.json()) as Array<{ id: string; case: { id: string } }>;
    expect(tasks.every((t) => t.case.id === world.a.caseId)).toBe(true);
    expect(tasks.map((t) => t.case.id)).not.toContain(world.b.caseId);
  });

  it("GET /api/firm/team — admin from firm A sees only firm A users", async () => {
    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/firm/team/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const users = (await res.json()) as Array<{ id: string; email: string }>;
    const firmBIds = [world.b.admin.id, world.b.ops.id, world.b.advisor.id];
    expect(users.some((u) => firmBIds.includes(u.id))).toBe(false);
    expect(users).toHaveLength(3); // A's admin/ops/advisor
  });

  it("GET /api/firm/team — non-admin is rejected (403)", async () => {
    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/firm/team/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("GET /api/firm/audit-log — admin sees only their firm's logs", async () => {
    await Promise.all([
      prisma.auditLog.create({
        data: {
          firmId: world.a.firmId,
          actorUserId: world.a.admin.id,
          action: "test.a",
          resource: "Test",
        },
      }),
      prisma.auditLog.create({
        data: {
          firmId: world.b.firmId,
          actorUserId: world.b.admin.id,
          action: "test.b",
          resource: "Test",
        },
      }),
    ]);

    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/firm/audit-log/route");
    const res = await GET(buildRequest("http://localhost/api/firm/audit-log"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: Array<{ action: string }> };
    expect(body.items.some((l) => l.action === "test.a")).toBe(true);
    expect(body.items.some((l) => l.action === "test.b")).toBe(false);
  });

  it("GET /api/firm/audit-log — non-admin is rejected (403)", async () => {
    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/firm/audit-log/route");
    const res = await GET(buildRequest("http://localhost/api/firm/audit-log"));
    expect(res.status).toBe(403);
  });

  it("GET /api/firm/ai-usage — each firm's user sees only their firm's percentage", async () => {
    // Firm A: 10 tokens used out of default 500000 limit.
    // Firm B: 250000 tokens used (~50%).
    await Promise.all([
      prisma.aIUsageLog.create({
        data: {
          firmId: world.a.firmId,
          userId: world.a.ops.id,
          model: "claude-test",
          inputTokens: 5,
          outputTokens: 5,
        },
      }),
      prisma.aIUsageLog.create({
        data: {
          firmId: world.b.firmId,
          userId: world.b.ops.id,
          model: "claude-test",
          inputTokens: 125_000,
          outputTokens: 125_000,
        },
      }),
    ]);

    // Firm A's user
    mockSession(sessionFor(world.a.ops));
    const { GET: aGet } = await import("@/app/api/firm/ai-usage/route");
    const aRes = await aGet();
    const aBody = (await aRes.json()) as { percentUsed: number };
    expect(aBody.percentUsed).toBe(0);

    // Reset and call as firm B
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    mockSession(sessionFor(world.b.ops));
    const { GET: bGet } = await import("@/app/api/firm/ai-usage/route");
    const bRes = await bGet();
    const bBody = (await bRes.json()) as { percentUsed: number };
    expect(bBody.percentUsed).toBe(50);
  });
});
