/**
 * /api/integrations/crm/users — pulls Wealthbox account members and annotates
 * each row with whether the email is already in Rift (and whose firm).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, truncateAll } from "../helpers/db";
import { seedTwoFirms, type SeededWorld } from "../helpers/fixtures";
import { sessionFor, mockSession } from "../helpers/route";
import { sealSecret } from "@/lib/crypto";

let world: SeededWorld;

function sealedTokenFields(plaintext: string) {
  const s = sealSecret(plaintext);
  return { encryptedToken: s.ciphertext, tokenIv: s.iv, tokenTag: s.tag };
}

beforeEach(async () => {
  vi.resetModules();
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-please-change-me-xx";
  await truncateAll();
  world = await seedTwoFirms();

  await prisma.crmConnection.create({
    data: { firmId: world.a.firmId, provider: "WEALTHBOX", ...sealedTokenFields("wb_test") },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("GET /api/integrations/crm/users", () => {
  it("rejects ADVISOR with 403", async () => {
    mockSession(sessionFor(world.a.advisor));
    const { GET } = await import("@/app/api/integrations/crm/users/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 400 when no CRM is connected", async () => {
    await prisma.crmConnection.delete({ where: { firmId: world.a.firmId } });
    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/integrations/crm/users/route");
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it("annotates each Wealthbox user with their Rift status", async () => {
    // Mock /users endpoint
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.endsWith("/users")) {
          return new Response(
            JSON.stringify({
              users: [
                // This email is already on firm A → in_firm
                { id: 1, name: "Existing Admin", email: world.a.admin.email },
                // This email is on firm B → other_firm
                { id: 2, first_name: "Cross", last_name: "Firm", email: world.b.advisor.email },
                // Brand new candidate
                { id: 3, first_name: "Brand", last_name: "New", email: "newhire@example.com" },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("not stubbed", { status: 404 });
      }),
    );

    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/integrations/crm/users/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      users: Array<{ email: string; riftStatus: string; existingRole: string | null }>;
    };

    const byEmail = Object.fromEntries(body.users.map((u) => [u.email, u]));
    expect(byEmail[world.a.admin.email].riftStatus).toBe("in_firm");
    expect(byEmail[world.a.admin.email].existingRole).toBe("ADMIN");
    expect(byEmail[world.b.advisor.email].riftStatus).toBe("other_firm");
    expect(byEmail[world.b.advisor.email].existingRole).toBe(null);
    expect(byEmail["newhire@example.com"].riftStatus).toBe("available");
  });

  it("splits a combined Wealthbox `name` into first/last when no separate fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ users: [{ id: 9, name: "Jane Q Public", email: "jane@example.com" }] }),
          { status: 200 },
        ),
      ),
    );

    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/integrations/crm/users/route");
    const res = await GET();
    const body = (await res.json()) as { users: Array<{ firstName: string; lastName: string }> };
    expect(body.users[0].firstName).toBe("Jane");
    expect(body.users[0].lastName).toBe("Q Public");
  });

  it("returns 502 when the Wealthbox API errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server explosion", { status: 500 })));

    mockSession(sessionFor(world.a.admin));
    const { GET } = await import("@/app/api/integrations/crm/users/route");
    const res = await GET();
    expect(res.status).toBe(502);
  });
});
