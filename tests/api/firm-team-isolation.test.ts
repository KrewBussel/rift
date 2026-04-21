import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

describe("firm/team/[id] PATCH — tenant isolation + role gate", () => {
  let world: SeededWorld;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    await truncateAll();
    world = await seedTwoFirms();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("firm A admin cannot modify a user in firm B", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PATCH } = await import("@/app/api/firm/team/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/firm/team/${world.b.advisor.id}`, {
        method: "PATCH",
        body: { role: "ADMIN" },
      }),
      params({ id: world.b.advisor.id }),
    );
    expect(res.status).toBe(404);

    const target = await prisma.user.findUnique({ where: { id: world.b.advisor.id } });
    expect(target?.role).toBe("ADVISOR");
  });

  it("non-admin (OPS) in same firm cannot modify any teammate", async () => {
    mockSession(sessionFor(world.a.ops));
    const { PATCH } = await import("@/app/api/firm/team/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/firm/team/${world.a.advisor.id}`, {
        method: "PATCH",
        body: { role: "ADMIN" },
      }),
      params({ id: world.a.advisor.id }),
    );
    expect(res.status).toBe(403);

    const target = await prisma.user.findUnique({ where: { id: world.a.advisor.id } });
    expect(target?.role).toBe("ADVISOR");
  });

  it("non-admin (ADVISOR) in same firm cannot modify any teammate", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { PATCH } = await import("@/app/api/firm/team/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/firm/team/${world.a.ops.id}`, {
        method: "PATCH",
        body: { deactivated: true },
      }),
      params({ id: world.a.ops.id }),
    );
    expect(res.status).toBe(403);
  });

  it("firm A admin can modify a user in firm A (sanity)", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PATCH } = await import("@/app/api/firm/team/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/firm/team/${world.a.advisor.id}`, {
        method: "PATCH",
        body: { role: "OPS" },
      }),
      params({ id: world.a.advisor.id }),
    );
    expect(res.status).toBe(200);

    const target = await prisma.user.findUnique({ where: { id: world.a.advisor.id } });
    expect(target?.role).toBe("OPS");
  });

  it("admin cannot deactivate themselves (400)", async () => {
    mockSession(sessionFor(world.a.admin));
    const { PATCH } = await import("@/app/api/firm/team/[id]/route");
    const res = await PATCH(
      buildRequest(`http://localhost/api/firm/team/${world.a.admin.id}`, {
        method: "PATCH",
        body: { deactivated: true },
      }),
      params({ id: world.a.admin.id }),
    );
    expect(res.status).toBe(400);
  });
});
