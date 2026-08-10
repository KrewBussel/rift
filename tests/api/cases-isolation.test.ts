import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededFirm } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

describe("Cases — tenant isolation", () => {
  let a: SeededFirm;
  let b: SeededFirm;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    await truncateAll();
    ({ a, b } = await seedTwoFirms());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/cases/[id] — user from firm A cannot read a case owned by firm B", async () => {
    mockSession(sessionFor(a.ops));
    const { GET } = await import("@/app/api/cases/[id]/route");

    const res = await GET(
      buildRequest(`http://localhost/api/cases/${b.caseId}`),
      params({ id: b.caseId }),
    );

    expect(res.status).toBe(404);
  });

  it("GET /api/cases/[id] — user from firm A CAN read their own case (sanity)", async () => {
    mockSession(sessionFor(a.ops));
    const { GET } = await import("@/app/api/cases/[id]/route");

    const res = await GET(
      buildRequest(`http://localhost/api/cases/${a.caseId}`),
      params({ id: a.caseId }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; firmId: string };
    expect(body.id).toBe(a.caseId);
    expect(body.firmId).toBe(a.firmId);
  });

  it("PATCH /api/cases/[id] — user from firm A cannot mutate firm B's case", async () => {
    mockSession(sessionFor(a.ops));
    const { PATCH } = await import("@/app/api/cases/[id]/route");

    const res = await PATCH(
      buildRequest(`http://localhost/api/cases/${b.caseId}`, {
        method: "PATCH",
        body: { internalNotes: "pwned" },
      }),
      params({ id: b.caseId }),
    );

    expect(res.status).toBe(404);

    // And the target row is unchanged.
    const untouched = await prisma.rolloverCase.findUnique({ where: { id: b.caseId } });
    expect(untouched?.internalNotes).toBeNull();
  });

  it("DELETE /api/cases/[id] — admin from firm A cannot delete firm B's case", async () => {
    mockSession(sessionFor(a.admin));
    const { DELETE } = await import("@/app/api/cases/[id]/route");

    const res = await DELETE(
      buildRequest(`http://localhost/api/cases/${b.caseId}`, { method: "DELETE" }),
      params({ id: b.caseId }),
    );

    expect(res.status).toBe(404);

    // And the target row still exists.
    const survivor = await prisma.rolloverCase.findUnique({ where: { id: b.caseId } });
    expect(survivor).not.toBeNull();
  });

  it("DELETE /api/cases/[id] — non-admin roles are forbidden, even on their own case", async () => {
    for (const user of [a.ops, a.advisor]) {
      mockSession(sessionFor(user));
      const { DELETE } = await import("@/app/api/cases/[id]/route");

      const res = await DELETE(
        buildRequest(`http://localhost/api/cases/${a.caseId}`, { method: "DELETE" }),
        params({ id: a.caseId }),
      );

      expect(res.status).toBe(403);
    }

    const survivor = await prisma.rolloverCase.findUnique({ where: { id: a.caseId } });
    expect(survivor).not.toBeNull();
  });

  it("DELETE /api/cases/[id] — admin CAN delete their own case, and children cascade", async () => {
    await prisma.note.create({
      data: { caseId: a.caseId, authorUserId: a.admin.id, body: "internal note" },
    });
    await prisma.activityEvent.create({
      data: { caseId: a.caseId, eventType: "CASE_CREATED", eventDetails: "seeded" },
    });

    mockSession(sessionFor(a.admin));
    const { DELETE } = await import("@/app/api/cases/[id]/route");

    const res = await DELETE(
      buildRequest(`http://localhost/api/cases/${a.caseId}`, { method: "DELETE" }),
      params({ id: a.caseId }),
    );

    expect(res.status).toBe(204);
    expect(await prisma.rolloverCase.findUnique({ where: { id: a.caseId } })).toBeNull();
    expect(await prisma.note.count({ where: { caseId: a.caseId } })).toBe(0);
    expect(await prisma.activityEvent.count({ where: { caseId: a.caseId } })).toBe(0);

    // Firm B's case is untouched.
    expect(await prisma.rolloverCase.findUnique({ where: { id: b.caseId } })).not.toBeNull();
  });

  it("DELETE /api/cases/[id] — a CRM-linked case leaves a tombstone so the poller can't resurrect it", async () => {
    await prisma.rolloverCase.update({
      where: { id: a.caseId },
      data: { wealthboxOpportunityId: "opp-123", wealthboxLinkedAt: new Date() },
    });

    mockSession(sessionFor(a.admin));
    const { DELETE } = await import("@/app/api/cases/[id]/route");

    const res = await DELETE(
      buildRequest(`http://localhost/api/cases/${a.caseId}`, { method: "DELETE" }),
      params({ id: a.caseId }),
    );

    expect(res.status).toBe(204);

    const tombstone = await prisma.deletedCrmOpportunity.findUnique({
      where: { firmId_opportunityId: { firmId: a.firmId, opportunityId: "opp-123" } },
    });
    expect(tombstone).not.toBeNull();
    expect(tombstone?.deletedById).toBe(a.admin.id);

    // The tombstone is firm-scoped — firm B is unaffected by firm A's deletion.
    expect(
      await prisma.deletedCrmOpportunity.findUnique({
        where: { firmId_opportunityId: { firmId: b.firmId, opportunityId: "opp-123" } },
      }),
    ).toBeNull();
  });
});
