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
});
