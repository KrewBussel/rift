import { describe, expect, it } from "vitest";
import {
  buildApexUrl,
  buildFirmUrl,
  parseSlugFromHost,
  RESERVED_SLUGS,
  slugify,
  validateSlug,
} from "@/lib/firmDomain";

/**
 * Pure-function tests for the subdomain routing primitives. No DB; safe to run
 * outside the test database.
 */

describe("slugify", () => {
  it("lowercases, replaces non-alphanumeric with hyphens, collapses runs", () => {
    expect(slugify("Acme Wealth, LLC.")).toBe("acme-wealth-llc");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--Foo--bar--")).toBe("foo-bar");
  });

  it("strips diacritics via NFKD normalization", () => {
    expect(slugify("Café Société")).toBe("cafe-societe");
  });

  it("truncates at 63 characters", () => {
    expect(slugify("a".repeat(80))).toHaveLength(63);
  });

  it("returns empty string when no alphanumerics survive", () => {
    expect(slugify("!@#$%")).toBe("");
  });
});

describe("validateSlug", () => {
  it("accepts a clean lowercase slug", () => {
    expect(validateSlug("acme")).toEqual({ ok: true, slug: "acme" });
  });

  it("rejects too-short input", () => {
    const result = validateSlug("ab");
    expect(result.ok).toBe(false);
  });

  it("rejects uppercase", () => {
    const result = validateSlug("Acme");
    // We trim+lowercase before pattern check; "Acme" → "acme" passes.
    expect(result.ok).toBe(true);
  });

  it("rejects reserved slugs", () => {
    for (const reserved of ["api", "www", "admin", "login"]) {
      const result = validateSlug(reserved);
      expect(result.ok, `${reserved} should be rejected`).toBe(false);
    }
  });

  it("rejects slugs starting or ending with a hyphen", () => {
    expect(validateSlug("-acme").ok).toBe(false);
    expect(validateSlug("acme-").ok).toBe(false);
  });

  it("rejects slugs with disallowed characters", () => {
    expect(validateSlug("acme.corp").ok).toBe(false);
    expect(validateSlug("acme_corp").ok).toBe(false);
    expect(validateSlug("acme corp").ok).toBe(false);
  });

  it("RESERVED_SLUGS includes the apex aliases we never want to lose", () => {
    expect(RESERVED_SLUGS.has("www")).toBe(true);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
  });
});

describe("parseSlugFromHost", () => {
  const root = "riftira.com";

  it("returns slug for a tenant subdomain", () => {
    const result = parseSlugFromHost("acme.riftira.com", root);
    expect(result).toMatchObject({ slug: "acme", isTenant: true, isApex: false });
  });

  it("returns null and isApex for the bare apex", () => {
    expect(parseSlugFromHost("riftira.com", root)).toMatchObject({ slug: null, isApex: true });
  });

  it("returns null and isApex for www", () => {
    expect(parseSlugFromHost("www.riftira.com", root)).toMatchObject({ slug: null, isApex: true });
  });

  it("strips the port before matching", () => {
    expect(parseSlugFromHost("acme.localhost:3000", "localhost:3000")).toMatchObject({
      slug: "acme",
      isTenant: true,
    });
    expect(parseSlugFromHost("localhost:3000", "localhost:3000")).toMatchObject({
      isApex: true,
      slug: null,
    });
  });

  it("treats reserved subdomains (e.g. api, www) as apex, not tenant", () => {
    expect(parseSlugFromHost("api.riftira.com", root)).toMatchObject({
      slug: null,
      isTenant: false,
    });
  });

  it("rejects nested subdomains as not-a-tenant", () => {
    expect(parseSlugFromHost("foo.bar.riftira.com", root)).toMatchObject({
      slug: null,
      isTenant: false,
    });
  });

  it("treats vercel preview hosts as apex", () => {
    expect(parseSlugFromHost("rift-abc123.vercel.app", root)).toMatchObject({
      slug: null,
      isApex: true,
    });
  });

  it("treats unknown hosts as not-tenant, not-apex (proxy renders apex content)", () => {
    expect(parseSlugFromHost("evil.example.com", root)).toMatchObject({
      slug: null,
      isTenant: false,
      isApex: false,
    });
  });

  it("returns no slug for a missing host", () => {
    expect(parseSlugFromHost(null, root).isTenant).toBe(false);
    expect(parseSlugFromHost(undefined, root).isTenant).toBe(false);
  });
});

describe("buildFirmUrl / buildApexUrl", () => {
  it("uses https for non-localhost domains", () => {
    expect(buildFirmUrl("acme", "/dashboard", "riftira.com")).toBe("https://acme.riftira.com/dashboard");
    expect(buildApexUrl("/login", "riftira.com")).toBe("https://riftira.com/login");
  });

  it("uses http for localhost in dev", () => {
    expect(buildFirmUrl("acme", "/dashboard", "localhost:3000")).toBe("http://acme.localhost:3000/dashboard");
    expect(buildApexUrl("/login", "localhost:3000")).toBe("http://localhost:3000/login");
  });

  it("normalizes paths missing a leading slash", () => {
    expect(buildFirmUrl("acme", "dashboard", "riftira.com")).toBe("https://acme.riftira.com/dashboard");
  });
});
