import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededFirm } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

void params; // helper imported for parity with sibling tests; not used here

/**
 * Slug API tests. Covers:
 *   - Read returns the caller's own slug (not someone else's)
 *   - Availability check honors reserved slugs and own-slug
 *   - PUT requires ADMIN
 *   - Renames update only the caller's firm
 *   - Conflict on a slug another firm already holds
 */
describe("/api/firm/slug — slug API", () => {
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

  it("GET returns the caller's own firm slug", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/firm/slug/route");

    const res = await GET(buildRequest("http://localhost/api/firm/slug"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("firm-a");
  });

  it("GET ?check= reports an unrelated slug as available", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/firm/slug/route");

    const res = await GET(buildRequest("http://localhost/api/firm/slug?check=brand-new"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
  });

  it("GET ?check= reports another firm's slug as taken", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/firm/slug/route");

    // firm-b is the slug seeded for firm B in fixtures.ts
    void b;
    const res = await GET(buildRequest(`http://localhost/api/firm/slug?check=firm-b`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/taken/i);
  });

  it("GET ?check= reports the caller's CURRENT slug as available (no flicker)", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/firm/slug/route");

    const res = await GET(buildRequest("http://localhost/api/firm/slug?check=firm-a"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
  });

  it("GET ?check= rejects reserved slugs", async () => {
    mockSession(sessionFor(a.admin));
    const { GET } = await import("@/app/api/firm/slug/route");

    const res = await GET(buildRequest("http://localhost/api/firm/slug?check=api"));
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/reserved/i);
  });

  it("PUT requires ADMIN — OPS gets 403", async () => {
    mockSession(sessionFor(a.ops));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "newone" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("PUT renames the caller's firm only", async () => {
    mockSession(sessionFor(a.admin));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "renamed-a" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("renamed-a");

    // Firm A renamed; firm B untouched.
    const after = await prisma.firm.findMany({
      where: { id: { in: [a.firmId, b.firmId] } },
      select: { id: true, slug: true },
    });
    const aSlug = after.find((f) => f.id === a.firmId)?.slug;
    const bSlug = after.find((f) => f.id === b.firmId)?.slug;
    expect(aSlug).toBe("renamed-a");
    expect(bSlug).toBe("firm-b");
  });

  it("PUT to a slug already owned by another firm returns 409", async () => {
    mockSession(sessionFor(a.admin));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "firm-b" },
      }),
    );
    expect(res.status).toBe(409);

    // Firm A's slug should NOT have changed.
    const stillA = await prisma.firm.findUnique({
      where: { id: a.firmId },
      select: { slug: true },
    });
    expect(stillA?.slug).toBe("firm-a");
  });

  it("PUT rejects reserved slugs with 400", async () => {
    mockSession(sessionFor(a.admin));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "api" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT rejects shape violations with 400", async () => {
    mockSession(sessionFor(a.admin));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "ab" }, // too short
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT to the same slug is a no-op (200, no audit churn)", async () => {
    mockSession(sessionFor(a.admin));
    const { PUT } = await import("@/app/api/firm/slug/route");

    const auditBefore = await prisma.auditLog.count({
      where: { firmId: a.firmId, action: "firm.slug_changed" },
    });

    const res = await PUT(
      buildRequest("http://localhost/api/firm/slug", {
        method: "PUT",
        body: { slug: "firm-a" },
      }),
    );
    expect(res.status).toBe(200);

    const auditAfter = await prisma.auditLog.count({
      where: { firmId: a.firmId, action: "firm.slug_changed" },
    });
    expect(auditAfter).toBe(auditBefore);
  });
});
