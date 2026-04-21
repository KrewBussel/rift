import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCsp(): string {
  const isDev = process.env.NODE_ENV === "development";

  const sentryIngest = "https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io";
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

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  const isAuth = !!session?.user;
  const isLoginPage = pathname === "/login";
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (!isAuth && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // CSP is only enforced in production. In dev, Next.js HMR + React tooling
  // need eval + websockets + inline stuff that fights a strict policy.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const csp = buildCsp();
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
