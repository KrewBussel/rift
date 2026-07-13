import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { buildRequest, mockSession, params, sessionFor } from "../helpers/route";

/**
 * QA-scan endpoint (/api/documents/[id]/review) — tenant isolation + RBAC.
 * The unsupported-type path is used for same-firm tests so no Bedrock call
 * is ever attempted (docx is not reviewable).
 */
describe("documents/[id]/review — tenant isolation", () => {
  let world: SeededWorld;
  let docA: { id: string };
  let docB: { id: string };

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    await truncateAll();
    world = await seedTwoFirms();

    docA = await prisma.document.create({
      data: {
        caseId: world.a.caseId,
        name: "form-a.docx",
        storagePath: `${world.a.firmId}/${world.a.caseId}/form-a.docx`,
        fileType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 1234,
        uploadedById: world.a.admin.id,
      },
      select: { id: true },
    });
    docB = await prisma.document.create({
      data: {
        caseId: world.b.caseId,
        name: "form-b.pdf",
        storagePath: `${world.b.firmId}/${world.b.caseId}/form-b.pdf`,
        fileType: "application/pdf",
        fileSize: 1234,
        uploadedById: world.b.admin.id,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST — firm A admin cannot scan firm B's document", async () => {
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/documents/[id]/review/route");
    const res = await POST(
      buildRequest(`http://localhost/api/documents/${docB.id}/review`, { method: "POST" }),
      params({ id: docB.id }),
    );
    expect(res.status).toBe(404);
    // And no review row was created for firm B's document.
    const review = await prisma.documentReview.findUnique({
      where: { documentId: docB.id },
    });
    expect(review).toBeNull();
  });

  it("POST — advisor role is forbidden even on own firm's document", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { POST } = await import("@/app/api/documents/[id]/review/route");
    const res = await POST(
      buildRequest(`http://localhost/api/documents/${docA.id}/review`, { method: "POST" }),
      params({ id: docA.id }),
    );
    expect(res.status).toBe(403);
  });

  it("POST — own-firm admin gets a clean 400 for unscannable file types", async () => {
    mockSession(sessionFor(world.a.admin));
    const { POST } = await import("@/app/api/documents/[id]/review/route");
    const res = await POST(
      buildRequest(`http://localhost/api/documents/${docA.id}/review`, { method: "POST" }),
      params({ id: docA.id }),
    );
    expect(res.status).toBe(400);
  });

  it("POST — unauthenticated is rejected", async () => {
    mockSession(null);
    const { POST } = await import("@/app/api/documents/[id]/review/route");
    const res = await POST(
      buildRequest(`http://localhost/api/documents/${docA.id}/review`, { method: "POST" }),
      params({ id: docA.id }),
    );
    expect(res.status).toBe(401);
  });
});
