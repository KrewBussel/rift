import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

describe("custodians/[id]/notes/[noteId] — tenant isolation", () => {
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

  it("DELETE — firm A cannot delete firm B's custodian note (403)", async () => {
    mockSession(sessionFor(world.a.admin));
    const { DELETE } = await import("@/app/api/custodians/[id]/notes/[noteId]/route");
    const res = await DELETE(
      buildRequest(
        `http://localhost/api/custodians/${world.custodianId}/notes/${world.b.custodianNoteId}`,
        { method: "DELETE" },
      ),
      params({ id: world.custodianId, noteId: world.b.custodianNoteId }),
    );
    expect(res.status).toBe(403);

    const note = await prisma.custodianNote.findUnique({ where: { id: world.b.custodianNoteId } });
    expect(note).not.toBeNull();
  });

  it("DELETE — same-firm non-author non-admin (advisor) is rejected (403)", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { DELETE } = await import("@/app/api/custodians/[id]/notes/[noteId]/route");
    const res = await DELETE(
      buildRequest(
        `http://localhost/api/custodians/${world.custodianId}/notes/${world.a.custodianNoteId}`,
        { method: "DELETE" },
      ),
      params({ id: world.custodianId, noteId: world.a.custodianNoteId }),
    );
    expect(res.status).toBe(403);

    const note = await prisma.custodianNote.findUnique({ where: { id: world.a.custodianNoteId } });
    expect(note).not.toBeNull();
  });

  it("DELETE — author can delete their own firm's note", async () => {
    // ops is the seeded author
    mockSession(sessionFor(world.a.ops));
    const { DELETE } = await import("@/app/api/custodians/[id]/notes/[noteId]/route");
    const res = await DELETE(
      buildRequest(
        `http://localhost/api/custodians/${world.custodianId}/notes/${world.a.custodianNoteId}`,
        { method: "DELETE" },
      ),
      params({ id: world.custodianId, noteId: world.a.custodianNoteId }),
    );
    expect(res.status).toBe(200);

    const note = await prisma.custodianNote.findUnique({ where: { id: world.a.custodianNoteId } });
    expect(note).toBeNull();
  });

  it("DELETE — same-firm admin can delete a non-authored note", async () => {
    mockSession(sessionFor(world.a.admin));
    const { DELETE } = await import("@/app/api/custodians/[id]/notes/[noteId]/route");
    const res = await DELETE(
      buildRequest(
        `http://localhost/api/custodians/${world.custodianId}/notes/${world.a.custodianNoteId}`,
        { method: "DELETE" },
      ),
      params({ id: world.custodianId, noteId: world.a.custodianNoteId }),
    );
    expect(res.status).toBe(200);
  });

  it("DELETE — note id that doesn't exist under the given custodianId returns 404", async () => {
    mockSession(sessionFor(world.a.admin));
    const { DELETE } = await import("@/app/api/custodians/[id]/notes/[noteId]/route");
    const res = await DELETE(
      buildRequest(
        `http://localhost/api/custodians/not-a-real-custodian/notes/${world.a.custodianNoteId}`,
        { method: "DELETE" },
      ),
      params({ id: "not-a-real-custodian", noteId: world.a.custodianNoteId }),
    );
    expect(res.status).toBe(404);
  });
});
