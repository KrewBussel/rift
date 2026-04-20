import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
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

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firmId = token.firmId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
