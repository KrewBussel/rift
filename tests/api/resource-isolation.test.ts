import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

describe("Flat resource routes — tenant isolation", () => {
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

  describe("tasks/[id]", () => {
    it("PATCH — firm A cannot modify firm B's task", async () => {
      mockSession(sessionFor(world.a.ops));
      const { PATCH } = await import("@/app/api/tasks/[id]/route");
      const res = await PATCH(
        buildRequest(`http://localhost/api/tasks/${world.b.taskId}`, {
          method: "PATCH",
          body: { status: "COMPLETED" },
        }),
        params({ id: world.b.taskId }),
      );
      expect(res.status).toBe(404);

      const task = await prisma.task.findUnique({ where: { id: world.b.taskId } });
      expect(task?.status).toBe("OPEN");
    });

    it("DELETE — firm A cannot delete firm B's task", async () => {
      mockSession(sessionFor(world.a.ops));
      const { DELETE } = await import("@/app/api/tasks/[id]/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/tasks/${world.b.taskId}`, { method: "DELETE" }),
        params({ id: world.b.taskId }),
      );
      expect(res.status).toBe(404);

      const task = await prisma.task.findUnique({ where: { id: world.b.taskId } });
      expect(task).not.toBeNull();
    });
  });

  describe("checklist/[id]", () => {
    it("PATCH — firm A cannot modify firm B's checklist item", async () => {
      mockSession(sessionFor(world.a.ops));
      const { PATCH } = await import("@/app/api/checklist/[id]/route");
      const res = await PATCH(
        buildRequest(`http://localhost/api/checklist/${world.b.checklistItemId}`, {
          method: "PATCH",
          body: { status: "COMPLETE" },
        }),
        params({ id: world.b.checklistItemId }),
      );
      expect(res.status).toBe(404);

      const item = await prisma.checklistItem.findUnique({ where: { id: world.b.checklistItemId } });
      expect(item?.status).toBe("NOT_STARTED");
    });

    it("DELETE — firm A cannot delete firm B's checklist item", async () => {
      mockSession(sessionFor(world.a.ops));
      const { DELETE } = await import("@/app/api/checklist/[id]/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/checklist/${world.b.checklistItemId}`, { method: "DELETE" }),
        params({ id: world.b.checklistItemId }),
      );
      expect(res.status).toBe(404);

      const item = await prisma.checklistItem.findUnique({ where: { id: world.b.checklistItemId } });
      expect(item).not.toBeNull();
    });
  });

  describe("documents/[id]", () => {
    // GET signs the response via AWS SDK — we only verify cross-firm returns 404
    // BEFORE reaching the signing code, which is what matters for isolation.
    it("GET — firm A cannot fetch a download URL for firm B's document", async () => {
      mockSession(sessionFor(world.a.ops));
      const { GET } = await import("@/app/api/documents/[id]/route");
      const res = await GET(
        buildRequest(`http://localhost/api/documents/${world.b.documentId}`),
        params({ id: world.b.documentId }),
      );
      expect(res.status).toBe(404);
    });

    it("DELETE — firm A (admin) cannot delete firm B's document", async () => {
      mockSession(sessionFor(world.a.admin));
      const { DELETE } = await import("@/app/api/documents/[id]/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/documents/${world.b.documentId}`, { method: "DELETE" }),
        params({ id: world.b.documentId }),
      );
      expect(res.status).toBe(404);

      const doc = await prisma.document.findUnique({ where: { id: world.b.documentId } });
      expect(doc).not.toBeNull();
    });

    it("DELETE — same-firm ADVISOR (not admin/ops) is rejected with 403", async () => {
      mockSession(sessionFor(world.a.advisor));
      const { DELETE } = await import("@/app/api/documents/[id]/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/documents/${world.a.documentId}`, { method: "DELETE" }),
        params({ id: world.a.documentId }),
      );
      expect(res.status).toBe(403);

      const doc = await prisma.document.findUnique({ where: { id: world.a.documentId } });
      expect(doc).not.toBeNull();
    });
  });
});
