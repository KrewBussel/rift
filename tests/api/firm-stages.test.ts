/**
 * /api/firm/stages — per-firm overlay on the canonical CaseStatus enum.
 * Covers tenant isolation, bookend enforcement, and label/enabled overrides.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sessionFor, mockSession, buildRequest } from "../helpers/route";

let world: SeededWorld;

beforeEach(async () => {
  vi.resetModules();
  await truncateAll();
  world = await seedTwoFirms();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/firm/stages", () => {
  it("auto-seeds default rows on first read", async () => {
    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/firm/stages/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stages: Array<{ status: string; isEnabled: boolean; sortOrder: number }> };
    expect(body.stages).toHaveLength(7);
    // Returned in canonical sort order
    expect(body.stages[0].status).toBe("PROPOSAL_ACCEPTED");
    expect(body.stages[6].status).toBe("WON");
    // All enabled by default
    expect(body.stages.every((s) => s.isEnabled)).toBe(true);
  });

  it("returns the firm's own rows, not another firm's", async () => {
    // Customize firm A
    await prisma.caseStageConfig.createMany({
      data: [
        { firmId: world.a.firmId, status: "PROPOSAL_ACCEPTED", customLabel: "Firm A trigger", isEnabled: true, sortOrder: 0 },
        { firmId: world.a.firmId, status: "AWAITING_CLIENT_ACTION", customLabel: null, isEnabled: false, sortOrder: 1 },
      ],
    });

    mockSession(sessionFor(world.b.admin));
    const { GET } = await import("@/app/api/firm/stages/route");
    const res = await GET();
    const body = (await res.json()) as { stages: Array<{ status: string; customLabel: string | null }> };
    expect(body.stages.find((s) => s.status === "PROPOSAL_ACCEPTED")?.customLabel).toBe(null);
  });
});

describe("PUT /api/firm/stages", () => {
  function fullPayload(overrides: Record<string, { customLabel?: string | null; isEnabled?: boolean }> = {}) {
    return {
      stages: [
        "PROPOSAL_ACCEPTED",
        "AWAITING_CLIENT_ACTION",
        "READY_TO_SUBMIT",
        "SUBMITTED",
        "PROCESSING",
        "IN_TRANSIT",
        "WON",
      ].map((status) => ({
        status,
        customLabel: overrides[status]?.customLabel ?? null,
        isEnabled: overrides[status]?.isEnabled ?? true,
      })),
    };
  }

  it("rejects ADVISOR with 403", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { PUT } = await import("@/app/api/firm/stages/route");
    const res = await PUT(buildRequest("http://t/x", { method: "PUT", body: fullPayload() }) as never);
    expect(res.status).toBe(403);
  });

  it("forces bookends to isEnabled=true even if the client tries to disable them", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/firm/stages/route");
    const res = await PUT(
      buildRequest("http://t/x", {
        method: "PUT",
        body: fullPayload({
          PROPOSAL_ACCEPTED: { isEnabled: false },
          WON: { isEnabled: false },
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const rows = await prisma.caseStageConfig.findMany({ where: { firmId: world.a.firmId } });
    const bookendsEnabled = rows
      .filter((r) => r.status === "PROPOSAL_ACCEPTED" || r.status === "WON")
      .every((r) => r.isEnabled);
    expect(bookendsEnabled).toBe(true);
  });

  it("disables an intermediate stage and stores a custom label", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/firm/stages/route");
    const res = await PUT(
      buildRequest("http://t/x", {
        method: "PUT",
        body: fullPayload({
          AWAITING_CLIENT_ACTION: { customLabel: "Waiting on client", isEnabled: false },
          SUBMITTED: { customLabel: "Sent to custodian" },
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const rows = await prisma.caseStageConfig.findMany({ where: { firmId: world.a.firmId } });
    const awaiting = rows.find((r) => r.status === "AWAITING_CLIENT_ACTION");
    const submitted = rows.find((r) => r.status === "SUBMITTED");
    expect(awaiting?.customLabel).toBe("Waiting on client");
    expect(awaiting?.isEnabled).toBe(false);
    expect(submitted?.customLabel).toBe("Sent to custodian");
  });

  it("never writes to firm B when firm A's admin saves", async () => {
    // Snapshot firm B's defaults
    const beforeB = await prisma.caseStageConfig.findMany({
      where: { firmId: world.b.firmId },
      orderBy: { sortOrder: "asc" },
    });

    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/firm/stages/route");
    await PUT(
      buildRequest("http://t/x", {
        method: "PUT",
        body: fullPayload({ PROCESSING: { customLabel: "A only" } }),
      }) as never,
    );

    const afterB = await prisma.caseStageConfig.findMany({
      where: { firmId: world.b.firmId },
      orderBy: { sortOrder: "asc" },
    });
    expect(afterB).toEqual(beforeB);
  });

  it("validates payload length (must include all 7 stages)", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/firm/stages/route");
    const res = await PUT(
      buildRequest("http://t/x", {
        method: "PUT",
        body: { stages: fullPayload().stages.slice(0, 5) },
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});
