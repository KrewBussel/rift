import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const BillingUpdateSchema = z
  .object({
    billingEmail: z
      .string()
      .trim()
      .email()
      .max(200)
      .or(z.literal("").transform(() => null))
      .nullable()
      .optional(),
  })
  .strict();

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;
  const [firm, activeUsers] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: firmId },
      select: {
        planTier: true,
        seatsLimit: true,
        billingEmail: true,
        renewalDate: true,
        aiPlanName: true,
      },
    }),
    prisma.user.count({ where: { firmId, deactivatedAt: null } }),
  ]);

  if (!firm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    planTier: firm.planTier,
    seatsLimit: firm.seatsLimit,
    seatsUsed: activeUsers,
    billingEmail: firm.billingEmail,
    renewalDate: firm.renewalDate,
    aiPlanName: firm.aiPlanName,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, BillingUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const data = parsed.data;

  const firmId = session.user.firmId;

  const updated = await prisma.firm.update({
    where: { id: firmId },
    data,
    select: {
      planTier: true,
      seatsLimit: true,
      billingEmail: true,
      renewalDate: true,
      aiPlanName: true,
    },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.billing.updated",
    resource: "Firm",
    resourceId: firmId,
    metadata: { fields: Object.keys(data) },
    ...meta,
  });

  return NextResponse.json(updated);
}
