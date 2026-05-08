/**
 * Salesforce inbound poller — case creation + reverse Won bookend.
 *
 * Mirrors tests/api/wealthbox-poll-isolation.test.ts but with Salesforce SOQL
 * fixtures. All Salesforce HTTP calls are stubbed via global fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sealSecret } from "@/lib/crypto";

let world: SeededWorld;

const PROPOSAL_STAGE = "Negotiation/Review"; // Salesforce StageName mapped to PROPOSAL_ACCEPTED
const WON_STAGE = "Closed Won";              // Salesforce StageName mapped to WON
const INSTANCE_URL = "https://rift-test.my.salesforce.com";

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  process.env.SALESFORCE_CLIENT_ID = "test_client_id";
  process.env.SALESFORCE_CLIENT_SECRET = "test_client_secret";
  process.env.SALESFORCE_LOGIN_URL = "https://login.salesforce.test";
  await truncateAll();
  world = await seedTwoFirms();

  await prisma.crmConnection.create({
    data: {
      firmId: world.a.firmId,
      provider: "SALESFORCE",
      ...sealedTokenFields("sf_access_a"),
      refreshTokenCiphertext: sealSecret("sf_refresh_a").ciphertext,
      refreshTokenIv: sealSecret("sf_refresh_a").iv,
      refreshTokenTag: sealSecret("sf_refresh_a").tag,
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      instanceUrl: INSTANCE_URL,
    },
  });
  // Map both bookends.
  await prisma.crmStageMapping.create({
    data: {
      firmId: world.a.firmId,
      riftStatus: "PROPOSAL_ACCEPTED",
      crmStageId: PROPOSAL_STAGE,
      crmStageName: PROPOSAL_STAGE,
    },
  });
  await prisma.crmStageMapping.create({
    data: {
      firmId: world.a.firmId,
      riftStatus: "WON",
      crmStageId: WON_STAGE,
      crmStageName: WON_STAGE,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("Salesforce poll — inbound case creation at the Proposal Accepted stage", () => {
  it("creates a Rift case from a Salesforce opp at the mapped stage", async () => {
    stubSalesforceFetch({
      proposalOpps: [{ Id: "006A0", Name: "Smith rollover" }],
      wonOpps: [],
      hydrate: {
        Id: "006A0",
        Name: "Smith rollover",
        StageName: PROPOSAL_STAGE,
        Amount: 350000,
        CloseDate: "2026-09-15",
        Probability: 80,
        CreatedDate: "2026-04-01T12:00:00.000+0000",
        Source_Provider__c: "Vanguard",
        Destination_Custodian__c: "Schwab",
        Account_Type__c: "Traditional IRA",
        contact: {
          Id: "003C0",
          FirstName: "Jordan",
          LastName: "Smith",
          Email: "jordan@example.com",
          Phone: "555-0199",
          MobilePhone: null,
        },
      },
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);

    expect(result.errors).toEqual([]);
    expect(result.created).toBe(1);

    const created = await prisma.rolloverCase.findFirst({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "006A0" },
    });
    expect(created).not.toBeNull();
    expect(created!.clientFirstName).toBe("Jordan");
    expect(created!.clientLastName).toBe("Smith");
    expect(created!.clientEmail).toBe("jordan@example.com");
    expect(created!.clientPhone).toBe("555-0199");
    expect(created!.sourceProvider).toBe("Vanguard");
    expect(created!.destinationCustodian).toBe("Schwab");
    expect(created!.accountType).toBe("TRADITIONAL_IRA_401K");
    expect(created!.status).toBe("PROPOSAL_ACCEPTED");
    expect(created!.wealthboxAmount).toBe(350000);
    expect(created!.wealthboxAmountCurrency).toBe("USD");
    expect(created!.wealthboxProbability).toBe(80);
    expect(created!.needsReview).toBe(false);
  });

  it("flags needsReview when SF custom fields are missing", async () => {
    stubSalesforceFetch({
      proposalOpps: [{ Id: "006B0", Name: "Bare opp" }],
      wonOpps: [],
      hydrate: {
        Id: "006B0",
        Name: "Bare opp",
        StageName: PROPOSAL_STAGE,
        Amount: null,
        CloseDate: null,
        Probability: null,
        CreatedDate: "2026-04-01T12:00:00.000+0000",
        // No custom fields, no contact.
        Source_Provider__c: null,
        Destination_Custodian__c: null,
        Account_Type__c: null,
        contact: null,
      },
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    await pollFirmForNewOpportunities(world.a.firmId);

    const created = await prisma.rolloverCase.findFirst({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "006B0" },
    });
    expect(created).not.toBeNull();
    expect(created!.needsReview).toBe(true);
    expect(created!.reviewReason).toMatch(/Source_Provider__c|Source Provider/i);
  });

  it("is idempotent — re-polling the same opp doesn't duplicate the case", async () => {
    stubSalesforceFetch({
      proposalOpps: [{ Id: "006C0", Name: "Idempotent opp" }],
      wonOpps: [],
      hydrate: {
        Id: "006C0",
        Name: "Idempotent opp",
        StageName: PROPOSAL_STAGE,
        Amount: 100000,
        CloseDate: "2026-09-15",
        Probability: 50,
        CreatedDate: "2026-04-01T12:00:00.000+0000",
        Source_Provider__c: "Fidelity",
        Destination_Custodian__c: "Schwab",
        Account_Type__c: "Roth IRA",
        contact: {
          Id: "003D0",
          FirstName: "Casey",
          LastName: "Doe",
          Email: "casey@example.com",
          Phone: null,
          MobilePhone: "555-1234",
        },
      },
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const first = await pollFirmForNewOpportunities(world.a.firmId);
    const second = await pollFirmForNewOpportunities(world.a.firmId);

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);

    const rows = await prisma.rolloverCase.findMany({
      where: { firmId: world.a.firmId, wealthboxOpportunityId: "006C0" },
    });
    expect(rows).toHaveLength(1);
    // Mobile fallback for Phone
    expect(rows[0].clientPhone).toBe("555-1234");
  });
});

describe("Salesforce poll — reverse Won bookend", () => {
  it("auto-closes a linked Rift case when the SF opp reaches Closed Won", async () => {
    // Link an existing case to the opp that the mock will report at Closed Won.
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "006WON0", status: "SUBMITTED" },
    });

    stubSalesforceFetch({
      proposalOpps: [],
      wonOpps: [{ Id: "006WON0", Name: "Already won opp" }],
      hydrate: null,
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);

    expect(result.errors).toEqual([]);
    expect(result.closed).toBe(1);
    expect(result.created).toBe(0);

    const row = await prisma.rolloverCase.findUnique({ where: { id: world.a.caseId } });
    expect(row!.status).toBe("WON");

    const event = await prisma.activityEvent.findFirst({
      where: { caseId: world.a.caseId, eventType: "STATUS_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(event?.eventDetails).toMatch(/pulled from Salesforce/);
  });

  it("does nothing when the linked case is already on WON (idempotent)", async () => {
    await prisma.rolloverCase.update({
      where: { id: world.a.caseId },
      data: { wealthboxOpportunityId: "006WON1", status: "WON" },
    });

    stubSalesforceFetch({
      proposalOpps: [],
      wonOpps: [{ Id: "006WON1", Name: "Already won" }],
      hydrate: null,
    });

    const { pollFirmForNewOpportunities } = await import("@/lib/crmSync");
    const result = await pollFirmForNewOpportunities(world.a.firmId);
    expect(result.closed).toBe(0);
  });
});

describe("maybePollOnPageLoad — Salesforce path", () => {
  it("invokes the poll for a Salesforce-connected firm (no longer Wealthbox-only)", async () => {
    await prisma.crmConnection.update({
      where: { firmId: world.a.firmId },
      data: { lastHealthCheckAt: new Date(Date.now() - 60_000) },
    });
    let stageQueried = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/services/data/") && url.includes("query")) {
          stageQueried = true;
          return jsonResponse({ totalSize: 0, done: true, records: [] });
        }
        return new Response("not stubbed: " + url, { status: 404 });
      }),
    );

    const { maybePollOnPageLoad } = await import("@/lib/crmSync");
    await maybePollOnPageLoad(world.a.firmId);
    expect(stageQueried).toBe(true);
  });
});

/* ─── Test helpers ─────────────────────────────────────────────────────── */

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

interface SalesforceMockOpts {
  proposalOpps: Array<{ Id: string; Name: string }>;
  wonOpps: Array<{ Id: string; Name: string }>;
  /**
   * Hydrated opportunity payload returned by the WHERE Id = '...' SOQL query
   * during inbound case creation. Set null for tests that only exercise the
   * reverse Won path (no inbound creation = no hydrate fetch).
   */
  hydrate:
    | null
    | {
        Id: string;
        Name: string;
        StageName: string;
        Amount: number | null;
        CloseDate: string | null;
        Probability: number | null;
        CreatedDate: string;
        Source_Provider__c: string | null;
        Destination_Custodian__c: string | null;
        Account_Type__c: string | null;
        contact: {
          Id: string;
          FirstName: string | null;
          LastName: string | null;
          Email: string | null;
          Phone: string | null;
          MobilePhone: string | null;
        } | null;
      };
}

function stubSalesforceFetch(opts: SalesforceMockOpts) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (!url.includes("/services/data/") || !url.includes("query")) {
        return new Response("not stubbed: " + url, { status: 404 });
      }
      // Decode the SOQL query out of the URL.
      const m = url.match(/[?&]q=([^&]+)/);
      const soql = m ? decodeURIComponent(m[1]) : "";

      // Hydrated opp lookup: SELECT ... FROM Opportunity WHERE Id = '...'
      const idMatch = soql.match(/WHERE\s+Id\s*=\s*'([^']+)'/i);
      if (idMatch) {
        if (!opts.hydrate || opts.hydrate.Id !== idMatch[1]) {
          return jsonResponse({ totalSize: 0, done: true, records: [] });
        }
        const h = opts.hydrate;
        return jsonResponse({
          totalSize: 1,
          done: true,
          records: [
            {
              Id: h.Id,
              Name: h.Name,
              StageName: h.StageName,
              Amount: h.Amount,
              CloseDate: h.CloseDate,
              Probability: h.Probability,
              CreatedDate: h.CreatedDate,
              Source_Provider__c: h.Source_Provider__c,
              Destination_Custodian__c: h.Destination_Custodian__c,
              Account_Type__c: h.Account_Type__c,
              OpportunityContactRoles: h.contact
                ? {
                    done: true,
                    totalSize: 1,
                    records: [
                      { ContactId: h.contact.Id, IsPrimary: true, Contact: h.contact },
                    ],
                  }
                : null,
            },
          ],
        });
      }

      // Stage scan: SELECT ... FROM Opportunity WHERE StageName = '...'
      const stageMatch = soql.match(/StageName\s*=\s*'([^']+)'/i);
      if (stageMatch) {
        const stage = stageMatch[1];
        const list =
          stage === PROPOSAL_STAGE
            ? opts.proposalOpps
            : stage === WON_STAGE
            ? opts.wonOpps
            : [];
        return jsonResponse({
          totalSize: list.length,
          done: true,
          records: list.map((o) => ({
            Id: o.Id,
            Name: o.Name,
            StageName: stage,
            CloseDate: null,
          })),
        });
      }

      // Anything else (e.g. unrelated SOQL): empty.
      return jsonResponse({ totalSize: 0, done: true, records: [] });
    }),
  );
}
