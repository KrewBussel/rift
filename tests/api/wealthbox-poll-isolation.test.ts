/**
 * Inbound poller — tenant isolation.
 *
 * Pattern: seed two firms with Wealthbox connections + Proposal Accepted
 * mappings, mock the Wealthbox API so the same opportunity payload could
 * land in either firm, poll firm A, assert nothing landed in firm B.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sealSecret } from "@/lib/crypto";

let world: SeededWorld;

const FIRM_A_TOKEN = "wb_token_firm_a";
const FIRM_B_TOKEN = "wb_token_firm_b";
const STAGE_ID = "55";

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  await truncateAll();
  world = await seedTwoFirms();

  // Both firms connected to Wealthbox, both mapped to the same stage id.
  // Without isolation enforcement, a leaky poll could create the firm-A opp
  // in firm B's table.
  await prisma.crmConnection.create({
    data: {
      firmId: world.a.firmId,
      provider: "WEALTHBOX",
      ...sealedTokenFields(FIRM_A_TOKEN),
    },
  });
  await prisma.crmConnection.create({
    data: {
      firmId: world.b.firmId,
      provider: "WEALTHBOX",
      ...sealedTokenFields(FIRM_B_TOKEN),
    },
  });
  await prisma.crmStageMapping.create({
    data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: STAGE_ID, crmStageName: "Proposal Accepted" },
  });
  await prisma.crmStageMapping.create({
    data: { firmId: world.b.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: STAGE_ID, crmStageName: "Proposal Accepted" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("pollFirmForNewOpportunities — tenant isolation", () => {
  it("polling firm A creates a case in firm A only, never in firm B", async () => {
    // Mock returns one opportunity at the mapped stage, regardless of which
    // firm's token was used.
    stubWealthboxFetch({
      opportunityId: 9001,
      contactId: 4242,
      stageId: Number(STAGE_ID),
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);

    expect(result.created).toBe(1);
    expect(result.errors).toEqual([]);

    const inA = await prisma.rolloverCase.findFirst({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "9001" },
    });
    const inB = await prisma.rolloverCase.findFirst({
      where: { firmId: world.b.firmId, wealthboxOpportunityId: "9001" },
    });

    expect(inA).not.toBeNull();
    expect(inA!.firmId).toBe(world.a.firmId);
    expect(inB).toBeNull();
  });

  it("populates opportunity metadata + client phone on case creation", async () => {
    stubWealthboxFetch({
      opportunityId: 9300,
      contactId: 4400,
      stageId: Number(STAGE_ID),
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    await pollFirmForNewOpportunities(world.a.firmId);

    const created = await prisma.rolloverCase.findFirst({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "9300" },
    });
    expect(created).not.toBeNull();
    expect(created!.wealthboxOpportunityName).toBe("Test rollover opp");
    expect(created!.wealthboxAmount).toBe(250000);
    expect(created!.wealthboxAmountCurrency).toBe("USD");
    expect(created!.wealthboxProbability).toBe(75);
    expect(created!.wealthboxTargetClose).not.toBeNull();
    expect(created!.clientPhone).toBe("555-0123");
  });

  it("uses the polled firm's token, never the other firm's", async () => {
    const seenTokens = new Set<string>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        const token = headers.get("ACCESS_TOKEN");
        if (token) seenTokens.add(token);
        return mockWealthboxResponse(input, { opportunityId: 7001, contactId: 7042, stageId: Number(STAGE_ID) });
      }),
    );

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    await pollFirmForNewOpportunities(world.a.firmId);

    expect(seenTokens.has(FIRM_A_TOKEN)).toBe(true);
    expect(seenTokens.has(FIRM_B_TOKEN)).toBe(false);
  });

  it("a second run for the same firm is idempotent (no duplicate case)", async () => {
    stubWealthboxFetch({ opportunityId: 9100, contactId: 5151, stageId: Number(STAGE_ID) });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const first = await pollFirmForNewOpportunities(world.a.firmId);
    const second = await pollFirmForNewOpportunities(world.a.firmId);

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);

    const rows = await prisma.rolloverCase.findMany({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "9100" },
    });
    expect(rows).toHaveLength(1);
  });

  it("flags a case needsReview when custom fields are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.endsWith("/opportunities/8200")) {
          // No custom_fields, no linked Contact.
          return jsonResponse({
            id: 8200,
            name: "Bare opp",
            stage: { id: Number(STAGE_ID), name: "Proposal Accepted" },
            stage_id: Number(STAGE_ID),
            stage_name: "Proposal Accepted",
            linked_to: [],
            custom_fields: [],
          });
        }
        if (url.includes("/opportunities") && !url.includes("/opportunities/")) {
          return jsonResponse({
            opportunities: [
              {
                id: 8200,
                name: "Bare opp",
                stage: { id: Number(STAGE_ID), name: "Proposal Accepted" },
                stage_id: Number(STAGE_ID),
                stage_name: "Proposal Accepted",
              },
            ],
          });
        }
        return new Response("not stubbed", { status: 404 });
      }),
    );

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);
    expect(result.created).toBe(1);

    const row = await prisma.rolloverCase.findFirst({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "8200" },
    });
    expect(row).not.toBeNull();
    expect(row!.needsReview).toBe(true);
    expect(row!.reviewReason).toMatch(/Missing custom field/);
  });

  it("returns an empty result and writes nothing if the firm has no Proposal Accepted mapping", async () => {
    await prisma.crmStageMapping.deleteMany({
      where: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED" },
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);

    expect(result).toEqual({ firmId: world.a.firmId, scanned: 0, created: 0, skipped: 0, closed: 0, errors: [] });
    const cases = await prisma.rolloverCase.count({ where: { firmId: world.a.firmId } });
    // Only the seeded one — nothing new created.
    expect(cases).toBe(1);
  });
});

describe("pollFirmForNewOpportunities — reverse Won bookend", () => {
  const WON_STAGE_ID = "99";
  const OPP_ID = 8800;

  beforeEach(async () => {
    // Add a Won mapping for firm A so the reverse path activates.
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "WON", crmStageId: WON_STAGE_ID, crmStageName: "Won" },
    });
    // Link an existing case to the opp the mock will return at the Won stage.
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: {
        wealthboxOpportunityId: String(OPP_ID),
        wealthboxLinkedAt: new Date(),
        status: "SUBMITTED",
      },
    });
  });

  it("auto-closes a linked case when its opportunity reaches the Won stage in Wealthbox", async () => {
    // Mock: trigger stage returns nothing, Won stage returns the linked opp.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        // The poll fetches `/opportunities?per_page=100&page=N` with no stage
        // filter (Wealthbox API doesn't expose one), then filters client-side.
        // Return one opp at the Won stage so only the Won-stage scan matches.
        if (url.includes("/opportunities") && !url.match(/\/opportunities\/\d+/)) {
          return jsonResponse({
            opportunities: [
              {
                id: OPP_ID,
                name: "Won opp",
                stage: { id: Number(WON_STAGE_ID), name: "Won" },
                stage_id: Number(WON_STAGE_ID),
                stage_name: "Won",
              },
            ],
          });
        }
        return new Response("not stubbed: " + url, { status: 404 });
      }),
    );

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);

    expect(result.closed).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toEqual([]);

    const caseRow = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(caseRow!.status).toBe("WON");

    // Activity event captures the source of the change.
    const event = await prisma.activityEvent.findFirst({
      where: { caseId: world.a.caseId, eventType: "STATUS_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(event?.eventDetails).toMatch(/pulled from Wealthbox/);
  });

  it("doesn't re-close a case that's already WON (idempotent)", async () => {
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { status: "WON" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/opportunities") && !url.match(/\/opportunities\/\d+/)) {
          return jsonResponse({
            opportunities: [
              {
                id: OPP_ID,
                name: "Won opp",
                stage: { id: Number(WON_STAGE_ID), name: "Won" },
                stage_id: Number(WON_STAGE_ID),
                stage_name: "Won",
              },
            ],
          });
        }
        return new Response("not stubbed: " + url, { status: 404 });
      }),
    );

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);
    expect(result.closed).toBe(0);
  });

  it("never closes a case in firm B when polling firm A", async () => {
    // Link firm B's case to a different opp; ensure firm B's mapping doesn't
    // exist for Won so its case stays untouched even if firm A's poll ran first.
    await prisma.rolloverCase.update({
      where: { id: world.b.caseId },
      data: {
        wealthboxOpportunityId: String(OPP_ID + 1),
        wealthboxLinkedAt: new Date(),
        status: "SUBMITTED",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/opportunities") && !url.match(/\/opportunities\/\d+/)) {
          return jsonResponse({
            opportunities: [
              {
                id: OPP_ID,
                name: "Won opp",
                stage: { id: Number(WON_STAGE_ID), name: "Won" },
                stage_id: Number(WON_STAGE_ID),
                stage_name: "Won",
              },
            ],
          });
        }
        return new Response("not stubbed: " + url, { status: 404 });
      }),
    );

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    await pollFirmForNewOpportunities(world.a.firmId);

    const bCase = await prisma.rolloverCase.findUnique({ where: { id: world.b.caseId } });
    expect(bCase!.status).toBe("SUBMITTED");
  });
});

function sealedTokenFields(plaintext: string) {
  const s = sealSecret(plaintext);
  return { encryptedToken: s.ciphertext, tokenIv: s.iv, tokenTag: s.tag };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface MockOpts {
  opportunityId: number;
  contactId: number;
  stageId: number;
}

function mockWealthboxResponse(input: RequestInfo | URL, opts: MockOpts): Response {
  const url = typeof input === "string" ? input : input.toString();
  const oppId = String(opts.opportunityId);

  if (url.includes(`/opportunities/${oppId}`)) {
    return jsonResponse({
      id: opts.opportunityId,
      name: "Test rollover opp",
      stage: { id: opts.stageId, name: "Proposal Accepted" },
      stage_id: opts.stageId,
      stage_name: "Proposal Accepted",
      probability: 75,
      target_close: "2026-08-01 00:00:00 +0000",
      amounts: [{ amount: 250000, currency: "USD", kind: "Fee" }],
      created_at: "2026-01-15T10:30:00Z",
      linked_to: [{ id: opts.contactId, type: "Contact", name: "Test Client" }],
      custom_fields: [
        { id: 1, name: "Source Provider", value: "Fidelity" },
        { id: 2, name: "Destination Custodian", value: "Schwab" },
        { id: 3, name: "Account Type", value: "401(k) → Traditional IRA" },
      ],
    });
  }

  if (url.includes(`/contacts/${opts.contactId}`)) {
    return jsonResponse({
      id: opts.contactId,
      first_name: "Polled",
      last_name: "Client",
      email_addresses: [{ address: "polled.client@test.local", principal: true }],
      phone_numbers: [{ address: "555-0123", kind: "Mobile", principal: true }],
    });
  }

  if (url.includes("/opportunities")) {
    return jsonResponse({
      opportunities: [
        {
          id: opts.opportunityId,
          name: "Test rollover opp",
          stage: { id: opts.stageId, name: "Proposal Accepted" },
          stage_id: opts.stageId,
          stage_name: "Proposal Accepted",
        },
      ],
    });
  }

  return new Response("not stubbed: " + url, { status: 404 });
}

function stubWealthboxFetch(opts: MockOpts) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => mockWealthboxResponse(input, opts)),
  );
}
