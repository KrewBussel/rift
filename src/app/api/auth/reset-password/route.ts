import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { enforceRateLimit, extractClientIp } from "@/lib/ratelimit";
import { hashResetToken } from "@/lib/passwordReset";
import { platformConfig } from "@/lib/platformConfig";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

const Schema = z.object({
  token: z.string().min(16).max(200),
  newPassword: z.string().min(1).max(512),
}).strict();

export async function POST(req: Request) {
  const parsed = await parseBody(req, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { token, newPassword } = parsed.data;

  const ip = extractClientIp(req);
  const rateLimited = await enforceRateLimit("sensitive", `pwd_reset_submit:ip:${ip}`);
  if (rateLimited) return rateLimited;

  const { minLength, requireNumber, requireSymbol } = platformConfig.password;
  if (newPassword.length < minLength) {
    return NextResponse.json({ error: `New password must be at least ${minLength} characters` }, { status: 400 });
  }
  if (requireNumber && !/\d/.test(newPassword)) {
    return NextResponse.json({ error: "New password must contain at least one number" }, { status: 400 });
  }
  if (requireSymbol && !/[^A-Za-z0-9]/.test(newPassword)) {
    return NextResponse.json({ error: "New password must contain at least one symbol" }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, firmId: true, deactivatedAt: true } } },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date() || resetRecord.user.deactivatedAt) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword, passwordUpdatedAt: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate other live tokens so one reset link isn't reusable via siblings
    prisma.passwordResetToken.updateMany({
      where: {
        userId: resetRecord.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
        id: { not: resetRecord.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId: resetRecord.user.firmId,
    actorUserId: resetRecord.userId,
    action: "auth.password_reset.completed",
    resource: "User",
    resourceId: resetRecord.userId,
    ...meta,
  });

  return NextResponse.json({ ok: true });
}
