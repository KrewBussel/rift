import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { checkRateLimit } from "./ratelimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const normalizedEmail = email.trim().toLowerCase();

        // Rate-limit by email AND by IP. Either exhausting its bucket blocks.
        const h = await headers();
        const ip =
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          h.get("x-real-ip") ||
          "unknown";

        const [emailLimit, ipLimit] = await Promise.all([
          checkRateLimit("auth", `signin:email:${normalizedEmail}`),
          checkRateLimit("auth", `signin:ip:${ip}`),
        ]);

        if (!emailLimit.ok || !ipLimit.ok) {
          // Returning null surfaces as "invalid credentials" to the caller,
          // which is the safer UX for an enumeration-shielded login form.
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { firm: { select: { slug: true } } },
        });
        if (!user) return null;

        if (user.deactivatedAt) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          await recordAudit({
            firmId: user.firmId,
            actorUserId: user.id,
            action: "auth.sign_in.failed",
            resource: "User",
            resourceId: user.id,
            metadata: { email: normalizedEmail, ip },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await recordAudit({
          firmId: user.firmId,
          actorUserId: user.id,
          action: "auth.sign_in.succeeded",
          resource: "User",
          resourceId: user.id,
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          firmId: user.firmId,
          firmSlug: user.firm.slug,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.firmId = user.firmId;
        token.firmSlug = user.firmSlug;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firmId = token.firmId as string;
        session.user.firmSlug = token.firmSlug as string;
        session.user.role = token.role as string;
        // Tag Sentry events with user identity (no PII beyond the internal id)
        Sentry.setUser({ id: session.user.id });
        Sentry.setTag("firmId", session.user.firmId);
        Sentry.setTag("role", session.user.role);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  // Subdomain-per-tenant: cookies must be valid on every <slug>.<root>.
  // Setting `domain: .<root>` lets the same session carry across the apex
  // (where login lives) and any tenant subdomain.
  //
  // Browsers reject `domain=.localhost` per RFC 6265 — for local dev set
  // NEXT_PUBLIC_ROOT_DOMAIN to a wildcard-friendly host like `lvh.me:3000`
  // (every subdomain resolves to 127.0.0.1) so the dot-rule is satisfied.
  // The port is stripped before becoming a cookie domain (cookie domain
  // attribute is host-only, no port).
  cookies: (() => {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    if (!root) return undefined;
    const hostOnly = root.replace(/:\d+$/, "").toLowerCase();
    if (!hostOnly.includes(".")) return undefined;
    // On Vercel deployments whose URL doesn't fall under the configured root
    // (e.g. `rift-sepia.vercel.app` with NEXT_PUBLIC_ROOT_DOMAIN=`riftira.com`),
    // setting `domain=.<root>` would make the browser drop the session cookie
    // — Set-Cookie's domain attribute must match the request origin or a parent
    // of it. Fall back to a host-only cookie so login works on whichever URL
    // is actually serving the app.
    const vercelHost = (
      process.env.VERCEL_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      ""
    ).toLowerCase();
    if (vercelHost && !vercelHost.endsWith(hostOnly) && vercelHost !== hostOnly) {
      return undefined;
    }
    const isProd = process.env.NODE_ENV === "production";
    return {
      sessionToken: {
        name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          secure: isProd,
          domain: `.${hostOnly}`,
        },
      },
    };
  })(),
  // We serve the same NextAuth handlers from multiple hostnames (apex +
  // every tenant subdomain), so a fixed NEXTAUTH_URL would lie. trustHost
  // tells next-auth to derive the canonical URL from the request instead.
  trustHost: true,
});
