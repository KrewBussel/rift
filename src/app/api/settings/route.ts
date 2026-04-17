import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

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

  const userId = session.user.id;
  const body = await req.json();

  const updateData: {
    firstName?: string;
    lastName?: string;
    preferences?: Prisma.InputJsonValue;
    password?: string;
  } = {};

  // Profile fields
  if (body.firstName !== undefined) updateData.firstName = body.firstName.trim();
  if (body.lastName !== undefined) updateData.lastName = body.lastName.trim();

  // Preferences (merge with existing)
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

  // Password change
  if (body.currentPassword && body.newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(body.currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    updateData.password = await bcrypt.hash(body.newPassword, 12);
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
