/**
 * Wealthbox integration — connect/disconnect, mapping, case link/unlink, sync.
 * External Wealthbox HTTP calls are stubbed via global fetch.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sessionFor, mockSession, buildRequest, params } from "../helpers/route";
import { sealSecret, openSecret } from "@/lib/crypto";

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let world: SeededWorld;
let fetchMock: ReturnType<typeof vi.fn>;

function stubFetch(impl: FetchImpl) {
  fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  await truncateAll();
  world = await seedTwoFirms();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("crypto seal/open", () => {
  it("roundtrips a token", () => {
    const sealed = sealSecret("wb-secret-123");
    expect(openSecret(sealed)).toBe("wb-secret-123");
  });

  it("fails authentication when tag is tampered", () => {
    const sealed = sealSecret("wb-secret-123");
    expect(() =>
      openSecret({ ...sealed, tag: Buffer.from("x".repeat(16)).toString("base64") }),
    ).toThrow();
  });
});

describe("POST /api/integrations/wealthbox (connect)", () => {
  it("rejects ADVISOR (non-admin)", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { POST } = await import("@/app/api/integrations/wealthbox/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST", body: { token: "wb_xxx" } }) as never);
    expect(res.status).toBe(403);
  });

  it("rejects invalid tokens (401 from Wealthbox → 400 to caller)", async () => {
    stubFetch(async () => new Response("{}", { status: 401 }));
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/integrations/wealthbox/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST", body: { token: "wb_bad" } }) as never);
    expect(res.status).toBe(400);
  });

  it("stores an encrypted connection on success", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ id: 99, name: "Jane Advisor", email: "jane@wb.test", account: 1 }),
        { status: 200, headers: { "content-type": "application/json" } }),
    );
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/integrations/wealthbox/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST", body: { token: "wb_goodtoken_1234" } }) as never);
    expect(res.status).toBe(200);

    const saved = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    expect(saved).not.toBeNull();
    expect(saved!.connectedUserEmail).toBe("jane@wb.test");
    expect(saved!.connectedUserId).toBe("99");
    // Token must never be stored as plaintext
    expect(saved!.encryptedToken).not.toContain("wb_goodtoken_1234");
    const roundtrip = openSecret({
      ciphertext: saved!.encryptedToken,
      iv: saved!.tokenIv,
      tag: saved!.tokenTag,
    });
    expect(roundtrip).toBe("wb_goodtoken_1234");
  });
});

describe("GET /api/integrations/wealthbox", () => {
  it("is firm-scoped (firm B cannot see firm A's connection)", async () => {
    await prisma.crmConnection.create({
      data: {
        firmId: world.a.firmId,
        provider: "WEALTHBOX",
        encryptedToken: "x", tokenIv: "x", tokenTag: "x",
        connectedUserEmail: "jane@wb.test",
      },
    });
    mockSession(sessionFor(world.b.admin));
    const { GET } = await import("@/app/api/integrations/crm/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connection).toBeNull();
  });
});

describe("DELETE /api/integrations/wealthbox (disconnect)", () => {
  it("clears mappings, connection, and case links in one pass", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX",
        encryptedToken: "x", tokenIv: "x", tokenTag: "x" },
    });
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "1", crmStageName: "New" },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "777", wealthboxLinkedAt: new Date() },
    });

    mockSession(sessionFor(world.a.admin));
    const { DELETE } = await import("@/app/api/integrations/crm/route");
    const res = await DELETE(buildRequest("http://t/x", { method: "DELETE" }) as never);
    expect(res.status).toBe(200);

    expect(await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } })).toBeNull();
    expect(await prisma.crmStageMapping.findMany({ where: { firmId: world.a.firmId } })).toHaveLength(0);
    const caseRow = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(caseRow!.wealthboxOpportunityId).toBeNull();
    expect(caseRow!.wealthboxLinkedAt).toBeNull();
  });
});

describe("PUT /api/integrations/wealthbox/mapping", () => {
  it("replaces all mappings for the firm", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX",
        encryptedToken: "x", tokenIv: "x", tokenTag: "x" },
    });
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "1", crmStageName: "Old" },
    });
    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/integrations/crm/mapping/route");
    const res = await PUT(buildRequest("http://t/x", {
      method: "PUT",
      body: {
        mappings: [
          { riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "2", crmStageName: "Proposal Accepted" },
          { riftStatus: "WON", crmStageId: "9", crmStageName: "Won" },
        ],
      },
    }) as never);
    expect(res.status).toBe(200);

    const rows = await prisma.crmStageMapping.findMany({ where: { firmId: world.a.firmId }, orderBy: { riftStatus: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.crmStageId).sort()).toEqual(["2", "9"]);
  });

  it("requires a connection to exist", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PUT } = await import("@/app/api/integrations/crm/mapping/route");
    const res = await PUT(buildRequest("http://t/x", {
      method: "PUT",
      body: { mappings: [{ riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "1", crmStageName: "Discovery" }] },
    }) as never);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/cases/[id]/wealthbox (link)", () => {
  beforeEach(async () => {
    await prisma.crmConnection.create({
      data: {
        firmId: world.a.firmId,
        provider: "WEALTHBOX",
        ...sealedTokenFields("wb_firma_token"),
      },
    });
  });

  it("rejects cross-firm case id with 404", async () => {
    stubFetch(async () => new Response(JSON.stringify({ id: 1, name: "X" }), { status: 200 }));
    mockSession(sessionFor(world.a.ops));
    const { POST } = await import("@/app/api/cases/[id]/crm/route");
    const res = await POST(
      buildRequest("http://t/x", { method: "POST", body: { mode: "link", opportunityId: "1" } }) as never,
      params({ id: world.b.caseId }),
    );
    expect(res.status).toBe(404);
  });

  it("rejects ADVISOR with 403", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { POST } = await import("@/app/api/cases/[id]/crm/route");
    const res = await POST(
      buildRequest("http://t/x", { method: "POST", body: { mode: "link", opportunityId: "1" } }) as never,
      params({ id: world.a.caseId }),
    );
    expect(res.status).toBe(403);
  });

  it("links to an existing opportunity and stores the id", async () => {
    stubFetch(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/opportunities/42"))
        return new Response(JSON.stringify({ id: 42, name: "Rollover opp" }), { status: 200 });
      // Any sync PUT
      return new Response(JSON.stringify({ id: 42 }), { status: 200 });
    });

    mockSession(sessionFor(world.a.ops));
    const { POST } = await import("@/app/api/cases/[id]/crm/route");
    const res = await POST(
      buildRequest("http://t/x", { method: "POST", body: { mode: "link", opportunityId: "42" } }) as never,
      params({ id: world.a.caseId }),
    );
    expect(res.status).toBe(200);
    const caseRow = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(caseRow!.wealthboxOpportunityId).toBe("42");
  });
});

describe("DELETE /api/cases/[id]/wealthbox (unlink)", () => {
  it("clears the link on a linked case", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("t") },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "42", wealthboxLinkedAt: new Date() },
    });
    mockSession(sessionFor(world.a.ops));
    const { DELETE } = await import("@/app/api/cases/[id]/crm/route");
    const res = await DELETE(
      buildRequest("http://t/x", { method: "DELETE" }) as never,
      params({ id: world.a.caseId }),
    );
    expect(res.status).toBe(200);
    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.wealthboxOpportunityId).toBeNull();
  });
});

describe("syncOpportunityStage", () => {
  it("returns not_linked when the case has no opportunity", async () => {
    const { syncOpportunityStage } = await import("@/lib/crmSync");
    const result = await syncOpportunityStage(world.a.caseId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_linked");
  });

  it("returns no_mapping when there's no stage mapping for the current status", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("t") },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "42" },
    });
    const { syncOpportunityStage } = await import("@/lib/crmSync");
    const result = await syncOpportunityStage(world.a.caseId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_mapping");
    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.wealthboxLastSyncError).toMatch(/No stage mapping/);
  });

  it("succeeds and records lastSyncedAt on API 200", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("t") },
    });
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "5", crmStageName: "Discovery" },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "42" },
    });
    stubFetch(async () => new Response(JSON.stringify({ id: 42, stage_id: 5 }), { status: 200 }));
    const { syncOpportunityStage } = await import("@/lib/crmSync");
    const result = await syncOpportunityStage(world.a.caseId);
    expect(result.ok).toBe(true);
    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.wealthboxLastSyncedAt).not.toBeNull();
    expect(row!.wealthboxLastSyncError).toBeNull();
  });

  it("records api_error without throwing on Wealthbox 500", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("t") },
    });
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "5", crmStageName: "Discovery" },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "42" },
    });
    stubFetch(async () => new Response("boom", { status: 500 }));
    const { syncOpportunityStage } = await import("@/lib/crmSync");
    const result = await syncOpportunityStage(world.a.caseId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("api_error");
    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.wealthboxLastSyncError).toMatch(/Wealthbox 500/);
    const conn = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    expect(conn!.lastHealthOk).toBe(false);
  });
});

function sealedTokenFields(plaintext: string) {
  const s = sealSecret(plaintext);
  return { encryptedToken: s.ciphertext, tokenIv: s.iv, tokenTag: s.tag };
}
