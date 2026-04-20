import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const sentryIngest = "https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io";
  const vercelAnalytics = "https://va.vercel-scripts.com https://vitals.vercel-insights.com";
  const supabase = "https://*.supabase.co https://*.supabase.com";
  const awsS3 = "https://*.amazonaws.com";

  const directives: string[] = [
    `default-src 'self'`,
    // Scripts: nonce + strict-dynamic means only scripts carrying the nonce run,
    // and any scripts they load inherit trust. No attacker-injected <script> can run.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles: inline needed for React style={} attributes and some Tailwind output.
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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
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
