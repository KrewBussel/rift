/**
 * /api/firm/onboarding — completion endpoint guarded by CRM connection +
 * bookend mappings. Without those preconditions the firm cannot exit setup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sessionFor, mockSession, buildRequest } from "../helpers/route";
import { sealSecret } from "@/lib/crypto";

let world: SeededWorld;

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  await truncateAll();
  world = await seedTwoFirms();
  // seedTwoFirms creates a Firm row without onboardedAt — exactly what we want
  // for the gate tests.
  await prisma.firm.update({
    where: { id: world.a.firmId },
    data: { onboardedAt: null },
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

function sealedTokenFields(plaintext: string) {
  const s = sealSecret(plaintext);
  return { encryptedToken: s.ciphertext, tokenIv: s.iv, tokenTag: s.tag };
}

async function setupCrmAndMappings(firmId: string) {
  await prisma.crmConnection.create({
    data: { firmId, provider: "WEALTHBOX", ...sealedTokenFields("wb_test") },
  });
  await prisma.crmStageMapping.createMany({
    data: [
      { firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "10", crmStageName: "Proposal Accepted" },
      { firmId, riftStatus: "WON", crmStageId: "99", crmStageName: "Won" },
    ],
  });
}

describe("POST /api/firm/onboarding", () => {
  it("rejects ADVISOR with 403", async () => {
    await setupCrmAndMappings(world.a.firmId);
    mockSession(sessionFor(world.a.advisor));
    const { POST } = await import("@/app/api/firm/onboarding/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST" }) as never);
    expect(res.status).toBe(403);
  });

  it("rejects when no CRM is connected (400)", async () => {
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/firm/onboarding/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST" }) as never);
    expect(res.status).toBe(400);
    const firm = await prisma.firm.findUnique({ where: { id: world.a.firmId }, select: { onboardedAt: true } });
    expect(firm?.onboardedAt).toBeNull();
  });

  it("rejects when only one bookend is mapped (400)", async () => {
    await prisma.crmConnection.create({
      data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("wb_test") },
    });
    await prisma.crmStageMapping.create({
      data: { firmId: world.a.firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: "10", crmStageName: "Proposal Accepted" },
    });
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/firm/onboarding/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST" }) as never);
    expect(res.status).toBe(400);
  });

  it("succeeds when CRM + both bookends are present", async () => {
    await setupCrmAndMappings(world.a.firmId);
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/firm/onboarding/route");
    const res = await POST(buildRequest("http://t/x", { method: "POST" }) as never);
    expect(res.status).toBe(200);
    const firm = await prisma.firm.findUnique({ where: { id: world.a.firmId }, select: { onboardedAt: true } });
    expect(firm?.onboardedAt).not.toBeNull();
    // Stage config is auto-seeded as a side-effect of the completion call.
    const cfgCount = await prisma.caseStageConfig.count({ where: { firmId: world.a.firmId } });
    expect(cfgCount).toBe(7);
  });

  it("never modifies firm B when firm A finishes onboarding", async () => {
    await setupCrmAndMappings(world.a.firmId);
    // Snapshot firm B
    const beforeB = await prisma.firm.findUnique({
      where: { id: world.b.firmId },
      select: { onboardedAt: true },
    });

    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/firm/onboarding/route");
    await POST(buildRequest("http://t/x", { method: "POST" }) as never);

    const afterB = await prisma.firm.findUnique({
      where: { id: world.b.firmId },
      select: { onboardedAt: true },
    });
    expect(afterB?.onboardedAt).toEqual(beforeB?.onboardedAt);
    const bMappings = await prisma.crmStageMapping.count({ where: { firmId: world.b.firmId } });
    expect(bMappings).toBe(0);
  });
});

describe("GET /api/firm/onboarding", () => {
  it("returns the current state for the wizard to land on", async () => {
    await setupCrmAndMappings(world.a.firmId);
    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/firm/onboarding/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      onboardedAt: string | null;
      crm: { provider: string } | null;
      mappings: Array<{ riftStatus: string }>;
    };
    expect(body.onboardedAt).toBeNull();
    expect(body.crm?.provider).toBe("WEALTHBOX");
    expect(body.mappings.map((m) => m.riftStatus).sort()).toEqual(["PROPOSAL_ACCEPTED", "WON"]);
  });
});
