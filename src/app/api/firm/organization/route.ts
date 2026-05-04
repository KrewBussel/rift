import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const toNullIfBlank = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const OrgUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    legalName: toNullIfBlank(200),
    taxId: toNullIfBlank(50),
    businessAddress: toNullIfBlank(500),
    supportEmail: z
      .string()
      .trim()
      .email()
      .max(200)
      .nullable()
      .or(z.literal("").transform(() => null))
      .optional(),
    supportPhone: toNullIfBlank(50),
    websiteUrl: z
      .string()
      .trim()
      .url()
      .max(500)
      .nullable()
      .or(z.literal("").transform(() => null))
      .optional(),
  })
  .strict();

const SELECT = {
  id: true,
  name: true,
  legalName: true,
  taxId: true,
  businessAddress: true,
  supportEmail: true,
  supportPhone: true,
  websiteUrl: true,
  logoUrl: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firm = await prisma.firm.findUnique({
    where: { id: session.user.firmId },
    select: SELECT,
  });
  if (!firm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(firm);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, OrgUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const firmId = session.user.firmId;
  const updated = await prisma.firm.update({
    where: { id: firmId },
    data,
    select: SELECT,
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.organization.updated",
    resource: "Firm",
    resourceId: firmId,
    metadata: { fields: Object.keys(data) },
    ...meta,
  });

  return NextResponse.json(updated);
}
