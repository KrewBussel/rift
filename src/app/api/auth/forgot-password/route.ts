import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { enforceRateLimit, extractClientIp } from "@/lib/ratelimit";
import { generateResetToken } from "@/lib/passwordReset";
import { buildPasswordResetEmail, sendEmail } from "@/lib/email";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

const Schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
}).strict();

const GENERIC_OK = { ok: true, message: "If that email is registered, a reset link has been sent." };

export async function POST(req: Request) {
  const parsed = await parseBody(req, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { email } = parsed.data;

  const ip = extractClientIp(req);
  // Rate limit by IP AND by email target. Either exhausting blocks the attempt.
  const [ipLimit, emailLimit] = await Promise.all([
    enforceRateLimit("sensitive", `pwd_reset:ip:${ip}`),
    enforceRateLimit("sensitive", `pwd_reset:email:${email}`),
  ]);
  if (ipLimit) return ipLimit;
  if (emailLimit) return emailLimit;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way — never reveal whether the email exists.
  if (!user || user.deactivatedAt) {
    return NextResponse.json(GENERIC_OK);
  }

  const { plaintext, hash, expiresAt } = generateResetToken();

  // Invalidate any prior unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      ipAddress: ip,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(plaintext)}`;

  const { subject, html } = buildPasswordResetEmail(resetUrl, user.firstName);
  await sendEmail(user.email, subject, html).catch((err) =>
    console.error("[forgot-password] email send failed", err),
  );

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId: user.firmId,
    actorUserId: user.id,
    action: "auth.password_reset.requested",
    resource: "User",
    resourceId: user.id,
    metadata: { email },
    ...meta,
  });

  return NextResponse.json(GENERIC_OK);
}
