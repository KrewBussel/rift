import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

describe("cases/[id]/* subresources — tenant isolation", () => {
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

  describe("/tasks", () => {
    it("GET — firm A cannot list tasks on firm B's case", async () => {
      mockSession(sessionFor(world.a.ops));
      const { GET } = await import("@/app/api/cases/[id]/tasks/route");
      const res = await GET(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/tasks`),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);
    });

    it("POST — firm A cannot create a task on firm B's case", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/tasks/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/tasks`, {
          method: "POST",
          body: { title: "injected task" },
        }),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);

      const tasks = await prisma.task.findMany({ where: { caseId: world.b.caseId } });
      expect(tasks).toHaveLength(1); // only the seeded one
    });
  });

  describe("/notes", () => {
    it("POST — firm A cannot add a note to firm B's case", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/notes/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/notes`, {
          method: "POST",
          body: { body: "pwned note" },
        }),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);

      const notes = await prisma.note.findMany({ where: { caseId: world.b.caseId } });
      expect(notes).toHaveLength(1);
    });
  });

  describe("/checklist", () => {
    it("GET — firm A cannot read firm B's checklist", async () => {
      mockSession(sessionFor(world.a.ops));
      const { GET } = await import("@/app/api/cases/[id]/checklist/route");
      const res = await GET(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/checklist`),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);
    });

    it("POST — firm A cannot add a checklist item to firm B's case", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/checklist/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/checklist`, {
          method: "POST",
          body: { name: "injected" },
        }),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("/documents", () => {
    it("GET — firm A cannot list firm B's documents", async () => {
      mockSession(sessionFor(world.a.ops));
      const { GET } = await import("@/app/api/cases/[id]/documents/route");
      const res = await GET(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/documents`),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);
    });

    it("POST — firm A cannot confirm an upload on firm B's case", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/documents/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/documents`, {
          method: "POST",
          body: {
            key: `${world.a.firmId}/${world.b.caseId}/malicious.pdf`,
            name: "malicious.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          },
        }),
        params({ id: world.b.caseId }),
      );
      expect(res.status).toBe(404);
    });

    it("POST — storage key with a firm prefix other than the caller's is rejected", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/documents/route");
      // Same-firm case but key belongs to another firm — should 400
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.a.caseId}/documents`, {
          method: "POST",
          body: {
            key: `${world.b.firmId}/${world.a.caseId}/malicious.pdf`,
            name: "malicious.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          },
        }),
        params({ id: world.a.caseId }),
      );
      expect(res.status).toBe(400);
    });
  });
});
