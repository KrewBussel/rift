import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { platformConfig } from "@/lib/platformConfig";
import { parseBody } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const PreferencesSchema = z
  .object({
    defaultStatusFilter: z.string().optional(),
    defaultViewFilter: z.string().optional(),
    timezone: z.string().optional(),
    showDashboardWidgets: z.boolean().optional(),
    compactCaseList: z.boolean().optional(),
    dashboardWidgets: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    intelligenceSearches: z
      .array(
        z.object({
          query: z.string().trim().min(1).max(500),
          ts: z.string().max(64),
        }),
      )
      .max(20)
      .optional(),
    pinnedCustodians: z.array(z.string().trim().min(1).max(50)).max(3).optional(),
  })
  .strict();

const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    bio: z.string().max(500).nullable().optional(),
    emailSignature: z.string().max(2000).nullable().optional(),
    preferences: PreferencesSchema.optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(1).max(512).optional(),
  })
  .strict()
  .refine(
    (v) => (v.currentPassword ? !!v.newPassword : true) && (v.newPassword ? !!v.currentPassword : true),
    { message: "Both currentPassword and newPassword are required to change password" },
  );

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      preferences: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, UpdateProfileSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const userId = session.user.id;

  const updateData: {
    firstName?: string;
    lastName?: string;
    bio?: string | null;
    emailSignature?: string | null;
    preferences?: Prisma.InputJsonValue;
    password?: string;
    passwordUpdatedAt?: Date;
  } = {};

  if (body.firstName !== undefined) updateData.firstName = body.firstName;
  if (body.lastName !== undefined) updateData.lastName = body.lastName;
  if (body.bio !== undefined) updateData.bio = body.bio;
  if (body.emailSignature !== undefined) updateData.emailSignature = body.emailSignature;

  if (body.preferences !== undefined) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const existingPrefs: Record<string, unknown> =
      existing?.preferences !== null && typeof existing?.preferences === "object" && !Array.isArray(existing?.preferences)
        ? (existing.preferences as Record<string, unknown>)
        : {};
    updateData.preferences = { ...existingPrefs, ...body.preferences };
  }

  if (body.currentPassword && body.newPassword) {
    const rateLimited = await enforceRateLimit("sensitive", `pwd:user:${userId}`);
    if (rateLimited) return rateLimited;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(body.currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const { minLength, requireNumber, requireSymbol } = platformConfig.password;

    if (body.newPassword.length < minLength) {
      return NextResponse.json({ error: `New password must be at least ${minLength} characters` }, { status: 400 });
    }
    if (requireNumber && !/\d/.test(body.newPassword)) {
      return NextResponse.json({ error: "New password must contain at least one number" }, { status: 400 });
    }
    if (requireSymbol && !/[^A-Za-z0-9]/.test(body.newPassword)) {
      return NextResponse.json({ error: "New password must contain at least one symbol" }, { status: 400 });
    }

    updateData.password = await bcrypt.hash(body.newPassword, 12);
    updateData.passwordUpdatedAt = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      preferences: true,
    },
  });

  return NextResponse.json(updated);
}
