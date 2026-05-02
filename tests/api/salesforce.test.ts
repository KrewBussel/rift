/**
 * Salesforce integration — OAuth authorize/callback, token refresh, sync path.
 * All Salesforce HTTP calls are stubbed via global fetch.
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

function sealedFields(plaintext: string) {
  const s = sealSecret(plaintext);
  return { ciphertext: s.ciphertext, iv: s.iv, tag: s.tag };
}

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  process.env.SALESFORCE_CLIENT_ID = "test_client_id";
  process.env.SALESFORCE_CLIENT_SECRET = "test_client_secret";
  process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  await truncateAll();
  world = await seedTwoFirms();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("GET /api/integrations/salesforce/authorize", () => {
  it("rejects non-admin", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { GET } = await import("@/app/api/integrations/salesforce/authorize/route");
    const res = await GET(buildRequest("http://t/x") as never);
    expect(res.status).toBe(403);
  });

  it("redirects admin to Salesforce and sets OAuth state cookies", async () => {
    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/integrations/salesforce/authorize/route");
    const res = await GET(buildRequest("http://t/x") as never);
    expect(res.status).toBe(302);
    const location = res.headers.get("location")!;
    expect(location).toContain("https://login.salesforce.test/services/oauth2/authorize");
    expect(location).toContain("client_id=test_client_id");
    expect(location).toContain("response_type=code");
    expect(location).toContain("scope=api+refresh_token+offline_access");
    // Three scratch cookies set
    const setCookie = res.headers.getSetCookie();
    expect(setCookie.some((c) => c.startsWith("sf_oauth_state="))).toBe(true);
    expect(setCookie.some((c) => c.startsWith(`sf_oauth_firm=${world.a.firmId}`))).toBe(true);
    expect(setCookie.some((c) => c.startsWith(`sf_oauth_user=${world.a.admin.id}`))).toBe(true);
  });
});

describe("GET /api/integrations/salesforce/callback", () => {
  it("redirects with state_mismatch when cookie state differs", async () => {
    const { GET } = await import("@/app/api/integrations/salesforce/callback/route");
    const req = new Request("http://localhost:3000/api/integrations/salesforce/callback?code=abc&state=nope", {
      headers: { cookie: `sf_oauth_state=expected; sf_oauth_firm=${world.a.firmId}; sf_oauth_user=${world.a.admin.id}` },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("error=state_mismatch");
    expect(await prisma.crmConnection.count()).toBe(0);
  });

  it("redirects with missing_params when code is absent", async () => {
    const { GET } = await import("@/app/api/integrations/salesforce/callback/route");
    const req = new Request("http://localhost:3000/api/integrations/salesforce/callback?state=ok", {
      headers: { cookie: `sf_oauth_state=ok; sf_oauth_firm=${world.a.firmId}; sf_oauth_user=${world.a.admin.id}` },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("error=missing_params");
  });

  it("exchanges the code, stores an encrypted connection, and redirects to settings", async () => {
    stubFetch(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/services/oauth2/token")) {
        return new Response(JSON.stringify({
          access_token: "sf_access_xyz",
          refresh_token: "sf_refresh_xyz",
          instance_url: "https://rift-test.my.salesforce.com",
          id: "https://login.salesforce.test/id/00D000000000000EAA/005000000000000AAA",
          token_type: "Bearer",
          issued_at: String(Date.now()),
          signature: "sig",
        }), { status: 200 });
      }
      if (url.includes("/id/00D")) {
        return new Response(JSON.stringify({
          user_id: "005000000000000AAA",
          organization_id: "00D000000000000EAA",
          username: "admin@rift-test.com",
          display_name: "Rift Admin",
          email: "admin@rift-test.com",
        }), { status: 200 });
      }
      return new Response("unexpected", { status: 500 });
    });

    const { GET } = await import("@/app/api/integrations/salesforce/callback/route");
    const req = new Request(
      "http://localhost:3000/api/integrations/salesforce/callback?code=THE_CODE&state=STATE_OK",
      { headers: { cookie: `sf_oauth_state=STATE_OK; sf_oauth_firm=${world.a.firmId}; sf_oauth_user=${world.a.admin.id}` } },
    );
    const res = await GET(req as never);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("status=connected");

    const saved = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    expect(saved).not.toBeNull();
    expect(saved!.provider).toBe("SALESFORCE");
    expect(saved!.instanceUrl).toBe("https://rift-test.my.salesforce.com");
    expect(saved!.connectedUserEmail).toBe("admin@rift-test.com");
    // Tokens are stored encrypted, never as plaintext
    expect(saved!.encryptedToken).not.toContain("sf_access_xyz");
    expect(openSecret({ ciphertext: saved!.encryptedToken, iv: saved!.tokenIv, tag: saved!.tokenTag }))
      .toBe("sf_access_xyz");
    expect(openSecret({
      ciphertext: saved!.refreshTokenCiphertext!, iv: saved!.refreshTokenIv!, tag: saved!.refreshTokenTag!,
    })).toBe("sf_refresh_xyz");
    expect(saved!.tokenExpiresAt).not.toBeNull();
  });
});

describe("crmClient (Salesforce path)", () => {
  it("refreshes the access token and retries once on 401", async () => {
    const access = sealedFields("old_access");
    const refresh = sealedFields("sf_refresh_xyz");
    await prisma.crmConnection.create({
      data: {
        firmId: world.a.firmId,
        provider: "SALESFORCE",
        encryptedToken: access.ciphertext,
        tokenIv: access.iv,
        tokenTag: access.tag,
        refreshTokenCiphertext: refresh.ciphertext,
        refreshTokenIv: refresh.iv,
        refreshTokenTag: refresh.tag,
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h out
        instanceUrl: "https://rift-test.my.salesforce.com",
      },
    });

    let attemptedStages = 0;
    let refreshed = false;
    stubFetch(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/services/oauth2/token")) {
        refreshed = true;
        return new Response(JSON.stringify({ access_token: "new_access_token" }), { status: 200 });
      }
      if (url.includes("/services/data/") && url.includes("query")) {
        attemptedStages++;
        if (attemptedStages === 1) return new Response("unauth", { status: 401 });
        return new Response(JSON.stringify({
          totalSize: 2, done: true,
          records: [
            { Id: "s1", MasterLabel: "Prospecting", ApiName: "Prospecting", IsActive: true, SortOrder: 1 },
            { Id: "s2", MasterLabel: "Closed Won", ApiName: "Closed Won", IsActive: true, SortOrder: 99 },
          ],
        }), { status: 200 });
      }
      return new Response("unexpected", { status: 500 });
    });

    const connection = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    const { getProviderClient } = await import("@/lib/crmClient");
    const client = await getProviderClient(connection!);
    const stages = await client.getStages();
    expect(stages).toHaveLength(2);
    expect(refreshed).toBe(true);
    expect(attemptedStages).toBe(2);

    const after = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    expect(openSecret({ ciphertext: after!.encryptedToken, iv: after!.tokenIv, tag: after!.tokenTag }))
      .toBe("new_access_token");
  });

  it("pre-refreshes when tokenExpiresAt is in the past", async () => {
    const access = sealedFields("stale_access");
    const refresh = sealedFields("sf_refresh_xyz");
    await prisma.crmConnection.create({
      data: {
        firmId: world.a.firmId,
        provider: "SALESFORCE",
        encryptedToken: access.ciphertext,
        tokenIv: access.iv,
        tokenTag: access.tag,
        refreshTokenCiphertext: refresh.ciphertext,
        refreshTokenIv: refresh.iv,
        refreshTokenTag: refresh.tag,
        tokenExpiresAt: new Date(Date.now() - 1000),
        instanceUrl: "https://rift-test.my.salesforce.com",
      },
    });

    const calls: string[] = [];
    stubFetch(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push(url);
      if (url.endsWith("/services/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "fresh" }), { status: 200 });
      }
      return new Response(JSON.stringify({ Id: "o1", Name: "Test Opp", StageName: "Prospecting" }), { status: 200 });
    });

    const connection = await prisma.crmConnection.findUnique({ where: { firmId: world.a.firmId } });
    const { getProviderClient } = await import("@/lib/crmClient");
    const client = await getProviderClient(connection!);
    const opp = await client.getOpportunity("o1");
    expect(opp.name).toBe("Test Opp");
    // Token call should have happened before the opportunity call
    expect(calls[0]).toContain("/services/oauth2/token");
  });
});

describe("syncOpportunityStage via Salesforce provider", () => {
  it("PATCHes StageName on the opportunity when a mapping exists", async () => {
    const access = sealedFields("access_ok");
    const refresh = sealedFields("refresh_ok");
    await prisma.crmConnection.create({
      data: {
        firmId: world.a.firmId,
        provider: "SALESFORCE",
        encryptedToken: access.ciphertext, tokenIv: access.iv, tokenTag: access.tag,
        refreshTokenCiphertext: refresh.ciphertext, refreshTokenIv: refresh.iv, refreshTokenTag: refresh.tag,
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        instanceUrl: "https://rift-test.my.salesforce.com",
      },
    });
    await prisma.crmStageMapping.create({
      data: {
        firmId: world.a.firmId,
        riftStatus: "PROPOSAL_ACCEPTED",
        crmStageId: "Prospecting",
        crmStageName: "Prospecting",
      },
    });
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "006000000000000AAA" },
    });

    let patched: { body?: string; method?: string } = {};
    stubFetch(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/sobjects/Opportunity/006")) {
        patched = { body: init?.body as string, method: init?.method };
        return new Response(null, { status: 204 });
      }
      return new Response("unexpected", { status: 500 });
    });

    const { syncOpportunityStage } = await import("@/lib/crmSync");
    const result = await syncOpportunityStage(world.a.caseId);
    expect(result.ok).toBe(true);
    expect(patched.method).toBe("PATCH");
    expect(JSON.parse(patched.body!)).toEqual({ StageName: "Prospecting" });

    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.wealthboxLastSyncedAt).not.toBeNull();
    expect(row!.wealthboxLastSyncError).toBeNull();
  });
});
