import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { Role } from "@prisma/client";
import { parseBody, roleSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const InviteSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(200),
    role: roleSchema.default("OPS"),
  })
  .strict();

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { firmId: session.user.firmId },
    orderBy: [{ deactivatedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      deactivatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rateLimited = await enforceRateLimit("sensitive", `invite:firm:${session.user.firmId}`);
  if (rateLimited) return rateLimited;

  const parsed = await parseBody(req, InviteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { firstName, lastName, email, role } = parsed.data;

  const firmId = session.user.firmId;

  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { seatsLimit: true },
  });
  const activeCount = await prisma.user.count({ where: { firmId, deactivatedAt: null } });
  if (firm && activeCount >= firm.seatsLimit) {
    return NextResponse.json({ error: "Seat limit reached. Upgrade plan or deactivate a user." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with that email already exists" }, { status: 400 });

  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const hashed = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashed,
      role: role as Role,
      firmId,
      passwordUpdatedAt: new Date(),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.user.invited",
    resource: "User",
    resourceId: user.id,
    metadata: { email, role },
    ...meta,
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}
