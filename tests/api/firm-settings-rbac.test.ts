import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, sessionFor } from "../helpers/route";

/**
 * firm/* settings routes have no :id param — they always target the caller's
 * own firm via session.user.firmId. So "cross-firm" isn't structurally
 * reachable here; the concern is the ADMIN gate. These tests:
 *   1. non-admin PATCH → 403
 *   2. admin PATCH → 200 AND only their own firm's row is mutated
 */
describe("firm/* settings routes — RBAC + own-firm scoping", () => {
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

  describe("firm/settings", () => {
    it("PATCH — non-admin (OPS) is rejected", async () => {
      mockSession(sessionFor(world.a.ops));
      const { PATCH } = await import("@/app/api/firm/settings/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/settings", {
          method: "PATCH",
          body: { stalledCaseDays: 14 },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("PATCH — admin only mutates their own firm", async () => {
      mockSession(sessionFor(world.a.admin));
      const { PATCH } = await import("@/app/api/firm/settings/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/settings", {
          method: "PATCH",
          body: { stalledCaseDays: 14 },
        }),
      );
      expect(res.status).toBe(200);

      const [a, b] = await Promise.all([
        prisma.firmSettings.findUnique({ where: { firmId: world.a.firmId } }),
        prisma.firmSettings.findUnique({ where: { firmId: world.b.firmId } }),
      ]);
      expect(a?.stalledCaseDays).toBe(14);
      expect(b?.stalledCaseDays).toBe(7); // default, unchanged
    });
  });

  describe("firm/organization", () => {
    it("GET — non-admin is rejected", async () => {
      mockSession(sessionFor(world.a.ops));
      const { GET } = await import("@/app/api/firm/organization/route");
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("PATCH — admin only renames their own firm", async () => {
      mockSession(sessionFor(world.a.admin));
      const { PATCH } = await import("@/app/api/firm/organization/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/organization", {
          method: "PATCH",
          body: { name: "Firm A Renamed" },
        }),
      );
      expect(res.status).toBe(200);

      const [a, b] = await Promise.all([
        prisma.firm.findUnique({ where: { id: world.a.firmId } }),
        prisma.firm.findUnique({ where: { id: world.b.firmId } }),
      ]);
      expect(a?.name).toBe("Firm A Renamed");
      expect(b?.name).toBe("Firm B");
    });
  });

  describe("firm/security", () => {
    it("PATCH — non-admin is rejected", async () => {
      mockSession(sessionFor(world.a.advisor));
      const { PATCH } = await import("@/app/api/firm/security/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/security", {
          method: "PATCH",
          body: { require2FA: true },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("PATCH — admin toggle only affects own firm", async () => {
      mockSession(sessionFor(world.a.admin));
      const { PATCH } = await import("@/app/api/firm/security/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/security", {
          method: "PATCH",
          body: { require2FA: true },
        }),
      );
      expect(res.status).toBe(200);

      const [a, b] = await Promise.all([
        prisma.firmSettings.findUnique({ where: { firmId: world.a.firmId } }),
        prisma.firmSettings.findUnique({ where: { firmId: world.b.firmId } }),
      ]);
      expect(a?.require2FA).toBe(true);
      expect(b?.require2FA).toBe(false);
    });
  });

  describe("firm/compliance", () => {
    it("PATCH — non-admin is rejected", async () => {
      mockSession(sessionFor(world.a.ops));
      const { PATCH } = await import("@/app/api/firm/compliance/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/compliance", {
          method: "PATCH",
          body: { allowDataExport: false },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("PATCH — admin change only affects own firm", async () => {
      mockSession(sessionFor(world.a.admin));
      const { PATCH } = await import("@/app/api/firm/compliance/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/compliance", {
          method: "PATCH",
          body: { allowDataExport: false },
        }),
      );
      expect(res.status).toBe(200);

      const [a, b] = await Promise.all([
        prisma.firmSettings.findUnique({ where: { firmId: world.a.firmId } }),
        prisma.firmSettings.findUnique({ where: { firmId: world.b.firmId } }),
      ]);
      expect(a?.allowDataExport).toBe(false);
      expect(b?.allowDataExport).toBe(true); // default, unchanged
    });
  });

  describe("firm/billing", () => {
    it("PATCH — non-admin is rejected", async () => {
      mockSession(sessionFor(world.a.ops));
      const { PATCH } = await import("@/app/api/firm/billing/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/billing", {
          method: "PATCH",
          body: { billingEmail: "new@example.com" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("PATCH — admin change only affects own firm", async () => {
      mockSession(sessionFor(world.a.admin));
      const { PATCH } = await import("@/app/api/firm/billing/route");
      const res = await PATCH(
        buildRequest("http://localhost/api/firm/billing", {
          method: "PATCH",
          body: { billingEmail: "billing.a@example.com" },
        }),
      );
      expect(res.status).toBe(200);

      const [a, b] = await Promise.all([
        prisma.firm.findUnique({ where: { id: world.a.firmId } }),
        prisma.firm.findUnique({ where: { id: world.b.firmId } }),
      ]);
      expect(a?.billingEmail).toBe("billing.a@example.com");
      expect(b?.billingEmail).toBeNull();
    });
  });
});
