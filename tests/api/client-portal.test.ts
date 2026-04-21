import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { mockSession, sessionFor, buildRequest } from "../helpers/route";
import { seedClientSession, seedLinkToken, mockClientCookie } from "../helpers/client-portal";

/**
 * Client portal — cross-firm isolation, token lifecycle, scope gates, and
 * the firm/client mutual-exclusion invariant.
 */
describe("Client portal — token + session + isolation", () => {
  let world: SeededWorld;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
    vi.doUnmock("next/headers");
    await truncateAll();
    world = await seedTwoFirms();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ─── Link issuance + revocation ─────────────────────────────────────────

  describe("POST /api/cases/[id]/client-link", () => {
    it("ADVISOR is rejected (403) — operational action", async () => {
      mockSession(sessionFor(world.a.advisor));
      const { POST } = await import("@/app/api/cases/[id]/client-link/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.a.caseId}/client-link`, {
          method: "POST",
          body: {},
        }) as never,
        { params: Promise.resolve({ id: world.a.caseId }) },
      );
      expect(res.status).toBe(403);
    });

    it("Firm A OPS cannot issue a link for a firm B case (404)", async () => {
      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/client-link/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/client-link`, {
          method: "POST",
          body: {},
        }) as never,
        { params: Promise.resolve({ id: world.b.caseId }) },
      );
      expect(res.status).toBe(404);
    });

    it("Issuing a new link revokes prior unused links on the same case", async () => {
      await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });

      mockSession(sessionFor(world.a.ops));
      const { POST } = await import("@/app/api/cases/[id]/client-link/route");
      const res = await POST(
        buildRequest(`http://localhost/api/cases/${world.a.caseId}/client-link`, {
          method: "POST",
          body: {},
        }) as never,
        { params: Promise.resolve({ id: world.a.caseId }) },
      );
      expect(res.status).toBe(200);

      const tokens = await prisma.clientAccessToken.findMany({
        where: { caseId: world.a.caseId },
        orderBy: { createdAt: "asc" },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens[0].revokedAt).not.toBeNull(); // prior revoked
      expect(tokens[1].revokedAt).toBeNull(); // new one active
    });
  });

  // ─── Session exchange ───────────────────────────────────────────────────

  describe("POST /api/client/session", () => {
    it("exchanges a valid link for a session and rejects reuse", async () => {
      const { plaintext } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });

      mockSession(null);
      mockClientCookie(null);
      const { POST } = await import("@/app/api/client/session/route");

      const res1 = await POST(
        buildRequest("http://localhost/api/client/session", {
          method: "POST",
          body: { token: plaintext },
        }) as never,
      );
      expect(res1.status).toBe(200);

      const res2 = await POST(
        buildRequest("http://localhost/api/client/session", {
          method: "POST",
          body: { token: plaintext },
        }) as never,
      );
      expect(res2.status).toBe(401);
      expect((await res2.json()).reason).toBe("consumed");
    });

    it("rejects expired tokens", async () => {
      const { plaintext } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
        expiresInMs: -1000,
      });

      mockSession(null);
      mockClientCookie(null);
      const { POST } = await import("@/app/api/client/session/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/session", {
          method: "POST",
          body: { token: plaintext },
        }) as never,
      );
      expect(res.status).toBe(401);
      expect((await res.json()).reason).toBe("expired");
    });

    it("rejects revoked tokens", async () => {
      const { plaintext } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
        revoked: true,
      });

      mockSession(null);
      mockClientCookie(null);
      const { POST } = await import("@/app/api/client/session/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/session", {
          method: "POST",
          body: { token: plaintext },
        }) as never,
      );
      expect(res.status).toBe(401);
      expect((await res.json()).reason).toBe("revoked");
    });

    it("rejects if the caller has an active firm NextAuth session (409)", async () => {
      const { plaintext } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });

      mockSession(sessionFor(world.a.ops));
      mockClientCookie(null);
      const { POST } = await import("@/app/api/client/session/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/session", {
          method: "POST",
          body: { token: plaintext },
        }) as never,
      );
      expect(res.status).toBe(409);
    });
  });

  // ─── Read endpoints — isolation ─────────────────────────────────────────

  describe("Client reads — tenant scoping", () => {
    it("GET /api/client/case returns only the session's case", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { GET } = await import("@/app/api/client/case/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(world.a.caseId);
    });

    it("GET /api/client/checklist never returns firm B's checklist items", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      // Seed a firm B checklist item with the SAME name to prove id filtering.
      await prisma.checklistItem.create({
        data: { caseId: world.b.caseId, name: "b-secret-item", required: true },
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { GET } = await import("@/app/api/client/checklist/route");
      const res = await GET();
      const items = (await res.json()) as Array<{ name: string }>;
      expect(items.some((i) => i.name === "b-secret-item")).toBe(false);
    });

    it("no cookie → 401", async () => {
      mockSession(null);
      mockClientCookie(null);
      const { GET } = await import("@/app/api/client/case/route");
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("expired session cookie → 401", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
        expiresInMs: -1000,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { GET } = await import("@/app/api/client/case/route");
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  // ─── Write endpoints — scope gates + isolation ──────────────────────────

  describe("Client writes — scope and cross-case guards", () => {
    it("VIEW-scope session cannot upload (403)", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
        scope: "VIEW",
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
        scope: "VIEW",
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { GET } = await import("@/app/api/client/documents/presign/route");
      const res = await GET(
        buildRequest(
          `http://localhost/api/client/documents/presign?filename=a.pdf&fileType=application/pdf&fileSize=100&checklistItemId=${world.a.checklistItemId}`,
        ) as never,
      );
      expect(res.status).toBe(403);
    });

    it("confirm rejects a key not scoped to session's firm+case", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { POST } = await import("@/app/api/client/documents/confirm/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/documents/confirm", {
          method: "POST",
          body: {
            key: `${world.b.firmId}/${world.b.caseId}/client/sneaky.pdf`,
            name: "sneaky.pdf",
            fileType: "application/pdf",
            fileSize: 100,
            checklistItemId: world.a.checklistItemId,
          },
        }) as never,
      );
      expect(res.status).toBe(400);
    });

    it("confirm rejects a checklistItemId that belongs to a different case", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { POST } = await import("@/app/api/client/documents/confirm/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/documents/confirm", {
          method: "POST",
          body: {
            key: `${world.a.firmId}/${world.a.caseId}/client/file.pdf`,
            name: "file.pdf",
            fileType: "application/pdf",
            fileSize: 100,
            checklistItemId: world.b.checklistItemId, // firm B's!
          },
        }) as never,
      );
      expect(res.status).toBe(404);
    });

    it("message POST stores a Note with fromClient=true and authorUserId=null", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { POST } = await import("@/app/api/client/messages/route");
      const res = await POST(
        buildRequest("http://localhost/api/client/messages", {
          method: "POST",
          body: { body: "Thanks for the update" },
        }) as never,
      );
      expect(res.status).toBe(201);

      const clientNotes = await prisma.note.findMany({
        where: { caseId: world.a.caseId, fromClient: true },
      });
      expect(clientNotes).toHaveLength(1);
      expect(clientNotes[0].authorUserId).toBeNull();
      expect(clientNotes[0].body).toBe("Thanks for the update");
    });

    it("acknowledge moves REQUESTED → RECEIVED and records activity", async () => {
      // Put the item into REQUESTED first.
      await prisma.checklistItem.update({
        where: { id: world.a.checklistItemId },
        data: { status: "REQUESTED" },
      });

      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(null);
      mockClientCookie(plaintext);
      const { POST } = await import("@/app/api/client/checklist/[id]/acknowledge/route");
      const res = await POST(
        buildRequest(
          `http://localhost/api/client/checklist/${world.a.checklistItemId}/acknowledge`,
          { method: "POST" },
        ) as never,
        { params: Promise.resolve({ id: world.a.checklistItemId }) },
      );
      expect(res.status).toBe(200);

      const item = await prisma.checklistItem.findUnique({ where: { id: world.a.checklistItemId } });
      expect(item?.status).toBe("RECEIVED");

      const events = await prisma.activityEvent.findMany({
        where: { caseId: world.a.caseId, eventType: "CHECKLIST_ITEM_UPDATED" },
      });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].actorUserId).toBeNull();
      expect(events[0].clientSessionId).not.toBeNull();
    });
  });

  // ─── Firm/client mutual exclusion ───────────────────────────────────────

  describe("Firm-session guard on /api/client/**", () => {
    it("GET /api/client/case returns 409 if a firm NextAuth session is active", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      const { plaintext } = await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      // Firm session present + client cookie present — firm wins, client is blocked.
      mockSession(sessionFor(world.a.ops));
      mockClientCookie(plaintext);
      const { GET } = await import("@/app/api/client/case/route");
      const res = await GET();
      expect(res.status).toBe(409);
    });
  });

  // ─── Firm-side revocation ───────────────────────────────────────────────

  describe("DELETE /api/cases/[id]/client-link", () => {
    it("revokes all active tokens and sessions for the case", async () => {
      const { row: token } = await seedLinkToken({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        issuedByUserId: world.a.ops.id,
      });
      await seedClientSession({
        caseId: world.a.caseId,
        firmId: world.a.firmId,
        tokenId: token.id,
      });

      mockSession(sessionFor(world.a.ops));
      const { DELETE } = await import("@/app/api/cases/[id]/client-link/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/cases/${world.a.caseId}/client-link`, {
          method: "DELETE",
        }) as never,
        { params: Promise.resolve({ id: world.a.caseId }) },
      );
      expect(res.status).toBe(200);

      const [toks, sess] = await Promise.all([
        prisma.clientAccessToken.findMany({ where: { caseId: world.a.caseId, revokedAt: null } }),
        prisma.clientSession.findMany({ where: { caseId: world.a.caseId, revokedAt: null } }),
      ]);
      expect(toks).toHaveLength(0);
      expect(sess).toHaveLength(0);
    });

    it("firm A cannot revoke for a firm B case (404)", async () => {
      mockSession(sessionFor(world.a.ops));
      const { DELETE } = await import("@/app/api/cases/[id]/client-link/route");
      const res = await DELETE(
        buildRequest(`http://localhost/api/cases/${world.b.caseId}/client-link`, {
          method: "DELETE",
        }) as never,
        { params: Promise.resolve({ id: world.b.caseId }) },
      );
      expect(res.status).toBe(404);
    });
  });
});
