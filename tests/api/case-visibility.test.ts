import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededFirm } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

/**
 * Intra-firm object-level authorization. The fixture assigns each firm's case to
 * BOTH that firm's advisor and ops, so to exercise the gate we create a second
 * firm-A case assigned to NOBODY and assert a non-admin can't reach it via the
 * API even though it's in their own firm. ADMIN still sees everything.
 */
describe("Cases — intra-firm assignment visibility", () => {
  let a: SeededFirm;
  let b: SeededFirm;
  let unassignedId: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    await truncateAll();
    ({ a, b } = await seedTwoFirms());

    const unassigned = await prisma.rolloverCase.create({
      data: {
        firmId: a.firmId,
        clientFirstName: "Unassigned",
        clientLastName: "Case",
        clientEmail: "unassigned.a@test.local",
        sourceProvider: "Fidelity",
        destinationCustodian: "Schwab",
        accountType: "TRADITIONAL_IRA_401K",
        // assignedAdvisorId / assignedOpsId intentionally left null
      },
    });
    unassignedId = unassigned.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ADVISOR cannot GET a same-firm case they are not assigned to", async () => {
    mockSession(sessionFor(a.advisor));
    const { GET } = await import("@/app/api/cases/[id]/route");
    const res = await GET(buildRequest(`http://localhost/api/cases/${unassignedId}`), params({ id: unassignedId }));
    expect(res.status).toBe(404);
  });

  it("OPS cannot GET a same-firm case they are not assigned to", async () => {
    mockSession(sessionFor(a.ops));
    const { GET } = await import("@/app/api/cases/[id]/route");
    const res = await GET(buildRequest(`http://localhost/api/cases/${unassignedId}`), params({ id: unassignedId }));
    expect(res.status).toBe(404);
  });

  it("ADMIN CAN GET any same-firm case (no assignment gate)", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/cases/[id]/route");
    const res = await GET(buildRequest(`http://localhost/api/cases/${unassignedId}`), params({ id: unassignedId }));
    expect(res.status).toBe(200);
  });

  it("ADVISOR CAN GET a case assigned to them (sanity)", async () => {
    mockSession(sessionFor(a.advisor));
    const { GET } = await import("@/app/api/cases/[id]/route");
    const res = await GET(buildRequest(`http://localhost/api/cases/${a.caseId}`), params({ id: a.caseId }));
    expect(res.status).toBe(200);
  });

  it("ADVISOR cannot PATCH a same-firm case they are not assigned to", async () => {
    mockSession(sessionFor(a.advisor));
    const { PATCH } = await import("@/app/api/cases/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/cases/${unassignedId}`, { method: "PATCH", body: { internalNotes: "pwned" } }),
      params({ id: unassignedId }),
    );
    expect(res.status).toBe(404);
    const untouched = await prisma.rolloverCase.findUnique({ where: { id: unassignedId } });
    expect(untouched?.internalNotes).toBeNull();
  });

  it("GET /api/cases list — ADVISOR sees only their assigned cases, not the unassigned one", async () => {
    mockSession(sessionFor(a.advisor));
    const { GET } = await import("@/app/api/cases/route");
    const res = await GET(buildRequest("http://localhost/api/cases"));
    expect(res.status).toBe(200);
    const rows = (await res.json()) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.caseId);
    expect(ids).not.toContain(unassignedId);
  });

  it("GET /api/cases/[id]/tasks — ADVISOR gets 404 on an unassigned same-firm case", async () => {
    mockSession(sessionFor(a.advisor));
    const { GET } = await import("@/app/api/cases/[id]/tasks/route");
    const res = await GET(buildRequest(`http://localhost/api/cases/${unassignedId}/tasks`), params({ id: unassignedId }));
    expect(res.status).toBe(404);
  });

  it("POST /api/cases — rejects an assignedAdvisorId from another firm", async () => {
    mockSession(sessionFor(a.admin));
    const { POST } = await import("@/app/api/cases/route");
    const res = await POST(
      buildRequest("http://localhost/api/cases", {
        method: "POST",
        body: {
          clientFirstName: "New",
          clientLastName: "Client",
          clientEmail: "new.client@test.local",
          sourceProvider: "Fidelity",
          destinationCustodian: "Schwab",
          accountType: "TRADITIONAL_IRA_401K",
          assignedAdvisorId: b.advisor.id, // cross-firm user id
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PATCH /api/cases/[id] — rejects reassigning to a cross-firm user", async () => {
    mockSession(sessionFor(a.admin));
    const { PATCH } = await import("@/app/api/cases/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/cases/${a.caseId}`, {
        method: "PATCH",
        body: { assignedOpsId: b.ops.id },
      }),
      params({ id: a.caseId }),
    );
    expect(res.status).toBe(400);
  });
});
