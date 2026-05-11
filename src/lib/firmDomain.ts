/**
 * Firm subdomain routing primitives.
 *
 * Tenant model: every firm has a unique `slug`, served at `<slug>.riftira.com`
 * in production and `<slug>.localhost:3000` in dev. The apex (`riftira.com` or
 * `localhost:3000`) is the marketing/login surface; once a user authenticates
 * we redirect them to their firm's subdomain.
 *
 * The proxy (`src/proxy.ts`) parses the Host header with `parseSlugFromHost`,
 * resolves the slug to a firm, and injects `x-firm-slug` / `x-firm-id` headers
 * for downstream server components.
 */

// Source of truth for the public root domain. NEXT_PUBLIC_ROOT_DOMAIN is set
// per-environment (e.g. "riftira.com" in prod, "localhost:3000" locally).
// Falls back to localhost:3000 so a fresh checkout boots without env config.
export function getRootDomain(): string {
  // Treat empty string the same as unset — local dev sometimes ships
  // NEXT_PUBLIC_ROOT_DOMAIN="" to disable the subdomain redirect, and `??`
  // alone wouldn't catch that.
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}

/**
 * Slugs we never let a firm claim — either they collide with the apex/login
 * surface, or they look like infrastructure subdomains and would confuse users.
 * Compared lowercased.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "app",
  "www",
  "api",
  "admin",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "onboarding",
  "dashboard",
  "settings",
  "support",
  "help",
  "docs",
  "status",
  "blog",
  "mail",
  "email",
  "static",
  "assets",
  "cdn",
  "media",
  "files",
  "uploads",
  "public",
  "private",
  "internal",
  "test",
  "staging",
  "dev",
  "preview",
  "vercel",
  "rift",
  "riftira",
]);

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 63;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Convert a freeform string (typically a firm name) into a candidate slug.
 * Does NOT guarantee uniqueness or reserved-list compliance — call
 * `validateSlug` after, and check uniqueness against the DB.
 */
export function slugify(input: string): string {
  const lowered = input.toLowerCase().normalize("NFKD");
  // Strip combining marks left over from NFKD (so "café" → "cafe").
  const stripped = lowered.replace(/[̀-ͯ]/g, "");
  const collapsed = stripped
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return collapsed.slice(0, SLUG_MAX_LENGTH);
}

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; reason: string };

/**
 * Validate a slug for shape and reserved-name conflicts. Does not check the
 * database for uniqueness — that's the API route's responsibility.
 */
export function validateSlug(input: string): SlugValidation {
  const slug = input.trim().toLowerCase();
  if (slug.length < SLUG_MIN_LENGTH) {
    return { ok: false, reason: `Slug must be at least ${SLUG_MIN_LENGTH} characters.` };
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { ok: false, reason: `Slug must be at most ${SLUG_MAX_LENGTH} characters.` };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      reason: "Use only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: "That slug is reserved." };
  }
  return { ok: true, slug };
}

export interface ParsedHost {
  /** The slug if this is a tenant subdomain; null on apex/www. */
  slug: string | null;
  /** True when host looks like a tenant request (slug is set + valid). */
  isTenant: boolean;
  /** True when host is the apex (riftira.com or www.riftira.com). */
  isApex: boolean;
  /** Raw host with port stripped, for diagnostics. */
  hostname: string;
}

/**
 * Parse a Host header into a slug. Handles:
 * - Production: `acme.riftira.com` → "acme"; `riftira.com` / `www.riftira.com` → null
 * - Local dev:  `acme.localhost:3000` → "acme"; `localhost:3000` → null
 * - Vercel previews on the project's *.vercel.app domain are treated as apex
 *   (they don't carry tenant slugs — previews are admin/test surfaces only).
 *
 * Reserved slugs are normalized to null (treated as apex). Invalid characters
 * yield null too — the proxy then renders the 404 / not-a-tenant surface.
 */
export function parseSlugFromHost(host: string | null | undefined, rootDomain = getRootDomain()): ParsedHost {
  if (!host) return { slug: null, isTenant: false, isApex: false, hostname: "" };

  // Strip port, lowercase. The root domain comparison is also case-insensitive
  // and port-aware (localhost:3000 includes the port).
  const hostname = host.toLowerCase().trim();
  const root = rootDomain.toLowerCase().trim();

  // Vercel preview deployments — let the proxy treat them as apex/test surfaces.
  if (hostname.endsWith(".vercel.app")) {
    return { slug: null, isTenant: false, isApex: true, hostname };
  }

  // Apex match (with or without trailing port). Strip ports for the comparison.
  const hostNoPort = hostname.replace(/:\d+$/, "");
  const rootNoPort = root.replace(/:\d+$/, "");

  if (hostNoPort === rootNoPort || hostNoPort === `www.${rootNoPort}`) {
    return { slug: null, isTenant: false, isApex: true, hostname };
  }

  // Tenant subdomain: must end with `.<rootNoPort>` and have exactly one extra label.
  if (!hostNoPort.endsWith(`.${rootNoPort}`)) {
    // Unknown host — neither apex nor a *.riftira.com subdomain. Treat as apex
    // so the proxy can serve the marketing/login page rather than a hard 404.
    return { slug: null, isTenant: false, isApex: false, hostname };
  }

  const labelPart = hostNoPort.slice(0, -1 - rootNoPort.length); // drop ".<root>"
  // Disallow nested subdomains for now: foo.bar.riftira.com → not a tenant.
  if (labelPart.includes(".")) {
    return { slug: null, isTenant: false, isApex: false, hostname };
  }

  const validation = validateSlug(labelPart);
  if (!validation.ok) {
    return { slug: null, isTenant: false, isApex: false, hostname };
  }

  return { slug: validation.slug, isTenant: true, isApex: false, hostname };
}

/**
 * Build an absolute URL on a firm's subdomain. Used after login to redirect a
 * user to `<their-slug>.riftira.com<path>`.
 *
 * Picks https in production, http for localhost. Path should start with `/`.
 */
export function buildFirmUrl(slug: string, path = "/", rootDomain = getRootDomain()): string {
  const root = rootDomain.toLowerCase();
  // Dev hosts always carry an explicit port (`localhost:3000`, `lvh.me:3000`).
  // Production domains don't — `riftira.com` is the wire-level host. Use port
  // presence as the http/https discriminator so we don't have to maintain a
  // hard-coded list of known dev TLDs.
  const protocol = /:\d+$/.test(root) ? "http" : "https";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${slug}.${root}${cleanPath}`;
}

/**
 * Build an absolute URL on the apex (login / marketing). Used by signOut and
 * by the proxy when an authenticated user lands on a wrong-tenant subdomain.
 */
export function buildApexUrl(path = "/", rootDomain = getRootDomain()): string {
  const root = rootDomain.toLowerCase();
  // Dev hosts always carry an explicit port (`localhost:3000`, `lvh.me:3000`).
  // Production domains don't — `riftira.com` is the wire-level host. Use port
  // presence as the http/https discriminator so we don't have to maintain a
  // hard-coded list of known dev TLDs.
  const protocol = /:\d+$/.test(root) ? "http" : "https";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${root}${cleanPath}`;
}
