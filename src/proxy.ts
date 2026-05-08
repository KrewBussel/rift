import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildApexUrl, buildFirmUrl, parseSlugFromHost } from "@/lib/firmDomain";

/**
 * Per-tenant subdomain router.
 *
 * Every firm has a unique `slug`; the firm's app lives at `<slug>.riftira.com`
 * (or `<slug>.localhost:3000` in dev). The apex (`riftira.com`) hosts the
 * marketing page, the centralized login, and the unauthenticated password-
 * reset flows. Client-portal pages (`/client/**`) are tenant-scoped — links
 * are emailed pointing at the firm's subdomain.
 *
 * This proxy routes requests by host: tenant subdomains get the app with
 * `x-firm-slug` / `x-firm-id` injected for downstream server components, while
 * apex requests get the public surface (or are redirected to the user's firm
 * subdomain when they're already logged in).
 *
 * The proxy never relaxes data-isolation guarantees — those still come from
 * the `firmId`-scoped queries throughout the codebase. Sending firm A's user
 * to firm B's URL is a UX redirect, not a security boundary.
 */

// Slug → firm cache. Page loads on a tenant subdomain otherwise add a DB
// roundtrip per request; a 60s TTL is short enough that an admin renaming the
// slug is reflected on the next request after their cache window expires, and
// long enough to absorb a burst of HTML + asset requests for one page load.
type CachedFirm = { firmId: string; slug: string; name: string } | null;
const slugCache = new Map<string, { value: CachedFirm; expiresAt: number }>();
const SLUG_CACHE_TTL_MS = 60_000;

async function resolveSlug(slug: string): Promise<CachedFirm> {
  const now = Date.now();
  const cached = slugCache.get(slug);
  if (cached && cached.expiresAt > now) return cached.value;

  const firm = await prisma.firm.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  const value: CachedFirm = firm
    ? { firmId: firm.id, slug: firm.slug, name: firm.name }
    : null;

  slugCache.set(slug, { value, expiresAt: now + SLUG_CACHE_TTL_MS });
  return value;
}

/**
 * Paths served only on the apex. A request to one of these on a tenant
 * subdomain gets bounced to the apex equivalent. Login is centralized — the
 * tenant subdomain doesn't host its own login page.
 */
function isApexOnlyPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

/**
 * Pages that work on either origin without redirect. Client-portal pages live
 * here because magic links carry their own auth and the path needs to render
 * regardless of which origin the email pointed at.
 */
function isOriginAgnosticPath(pathname: string): boolean {
  return pathname.startsWith("/client");
}

function buildCsp(): string {
  const isDev = process.env.NODE_ENV === "development";

  const sentryIngest =
    "https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io";
  const vercelAnalytics = "https://va.vercel-scripts.com https://vitals.vercel-insights.com";
  const supabase = "https://*.supabase.co https://*.supabase.com";
  const awsS3 = "https://*.amazonaws.com";

  const directives: string[] = [
    `default-src 'self'`,
    // Scripts: 'self' covers Next.js bundles from /_next/*, 'unsafe-inline' covers
    // the hydration scripts Next.js injects. Tightening this to nonce + strict-dynamic
    // requires threading the nonce through Next.js's SSR pipeline in a way that works
    // with Vercel's edge caching; see the follow-up note in AGENTS.md.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${awsS3}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${sentryIngest} ${vercelAnalytics} ${supabase}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join("; ").replace(/\s{2,}/g, " ").trim();
}

function applyCsp(response: NextResponse): NextResponse {
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", buildCsp());
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const parsed = parseSlugFromHost(host);
  const { pathname, search } = request.nextUrl;
  const session = await auth();
  const isAuth = !!session?.user;

  // ──────────────────────────────────────────────────────────────────────
  // Branch 1: Tenant subdomain (<slug>.riftira.com)
  // ──────────────────────────────────────────────────────────────────────
  if (parsed.isTenant && parsed.slug) {
    const firm = await resolveSlug(parsed.slug);
    if (!firm) {
      // Subdomain doesn't map to a real firm. Could be a typo or a removed
      // firm; fall through to a 404 rather than leaking apex content.
      return new NextResponse("Workspace not found", { status: 404 });
    }

    // Apex-only path requested on a tenant — redirect, preserving query string.
    if (isApexOnlyPath(pathname)) {
      return NextResponse.redirect(buildApexUrl(`${pathname}${search}`));
    }

    // Origin-agnostic (currently /client/**) — render with firm context, no auth gate.
    if (isOriginAgnosticPath(pathname)) {
      const headers = new Headers(request.headers);
      headers.set("x-firm-slug", firm.slug);
      headers.set("x-firm-id", firm.firmId);
      return applyCsp(NextResponse.next({ request: { headers } }));
    }

    // Authenticated user but on the wrong firm's subdomain — redirect to their own.
    // The where-clause-level `firmId` scoping is the actual isolation guarantee;
    // this redirect is just so the URL bar matches the data the user can see.
    if (isAuth && session!.user.firmId !== firm.firmId) {
      const correctSlug = session!.user.firmSlug;
      if (correctSlug) {
        return NextResponse.redirect(buildFirmUrl(correctSlug, `${pathname}${search}`));
      }
      // No slug on the session (e.g. an old token issued before this rollout) —
      // safest to force re-auth so the new JWT picks up the slug claim.
      return NextResponse.redirect(buildApexUrl("/login"));
    }

    // Unauthenticated — push to centralized apex login.
    if (!isAuth) {
      return NextResponse.redirect(buildApexUrl("/login"));
    }

    // Authenticated, on the right firm. Inject identity for server components
    // that want to know which tenant URL they're being rendered for.
    const headers = new Headers(request.headers);
    headers.set("x-firm-slug", firm.slug);
    headers.set("x-firm-id", firm.firmId);
    return applyCsp(NextResponse.next({ request: { headers } }));
  }

  // ──────────────────────────────────────────────────────────────────────
  // Branch 2: Apex (riftira.com / localhost:3000 / *.vercel.app preview)
  // ──────────────────────────────────────────────────────────────────────

  // Origin-agnostic paths render on the apex too. They're rare entry points
  // here (client links should land on the tenant subdomain) but tolerated.
  if (isOriginAgnosticPath(pathname)) {
    return applyCsp(NextResponse.next());
  }

  if (isApexOnlyPath(pathname)) {
    // An already-authenticated user who lands on /login goes straight to their firm.
    if (isAuth && pathname === "/login") {
      const slug = session!.user.firmSlug;
      if (slug) {
        return NextResponse.redirect(buildFirmUrl(slug, "/dashboard"));
      }
    }
    return applyCsp(NextResponse.next());
  }

  // Apex got a tenant-scoped path (e.g. someone bookmarked riftira.com/dashboard).
  // Bounce to the user's firm subdomain if logged in; otherwise, login.
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const slug = session!.user.firmSlug;
  if (slug) {
    return NextResponse.redirect(buildFirmUrl(slug, `${pathname}${search}`));
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
