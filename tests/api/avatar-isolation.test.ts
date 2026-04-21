import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { mockSession, params, sessionFor } from "../helpers/route";

describe("users/[id]/avatar — tenant isolation", () => {
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

  it("GET — firm A user cannot fetch a firm B user's avatar", async () => {
    // Give firm B's ops user an avatar key — shouldn't matter, caller is firm A.
    await prisma.user.update({
      where: { id: world.b.ops.id },
      data: { preferences: { avatarKey: `avatars/${world.b.ops.id}.jpg` } },
    });

    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/users/[id]/avatar/route");

    const res = await GET(
      new Request(`http://localhost/api/users/${world.b.ops.id}/avatar`),
      params({ id: world.b.ops.id }),
    );
    expect(res.status).toBe(404);
  });

  it("GET — same-firm teammate with no avatar returns 404 (sanity)", async () => {
    // Advisor in firm A has no preferences — route should 404 on the missing key.
    mockSession(sessionFor(world.a.ops));
    const { GET } = await import("@/app/api/users/[id]/avatar/route");

    const res = await GET(
      new Request(`http://localhost/api/users/${world.a.advisor.id}/avatar`),
      params({ id: world.a.advisor.id }),
    );
    expect(res.status).toBe(404);
  });
});
