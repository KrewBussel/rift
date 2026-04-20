import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { Role } from "@prisma/client";
import { parseBody, roleSchema } from "@/lib/validation";
import { z } from "zod";

const UpdateUserSchema = z
  .object({
    role: roleSchema.optional(),
    deactivated: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.role !== undefined || v.deactivated !== undefined, {
    message: "Provide role or deactivated",
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, UpdateUserSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { firmId: true, role: true, deactivatedAt: true },
  });
  if (!target || target.firmId !== firmId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { role?: Role; deactivatedAt?: Date | null } = {};
  if (body.role !== undefined) data.role = body.role as Role;
  if (body.deactivated !== undefined) {
    if (body.deactivated === true) {
      if (id === session.user.id) {
        return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
      }
      if (target.role === "ADMIN") {
        const otherAdmins = await prisma.user.count({
          where: { firmId, role: "ADMIN", deactivatedAt: null, id: { not: id } },
        });
        if (otherAdmins === 0) {
          return NextResponse.json({ error: "At least one active admin is required." }, { status: 400 });
        }
      }
      data.deactivatedAt = new Date();
    } else {
      data.deactivatedAt = null;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, firstName: true, lastName: true, email: true, role: true, deactivatedAt: true },
  });

  const meta = extractRequestMeta(req);
  const action =
    data.deactivatedAt === null
      ? "firm.user.reactivated"
      : data.deactivatedAt
        ? "firm.user.deactivated"
        : "firm.user.role_changed";
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action,
    resource: "User",
    resourceId: id,
    metadata: data.role ? { role: data.role } : {},
    ...meta,
  });

  return NextResponse.json(updated);
}
