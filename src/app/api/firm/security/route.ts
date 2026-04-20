import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const SecurityUpdateSchema = z
  .object({
    require2FA: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getOrCreateFirmSettings(session.user.firmId);
  return NextResponse.json({ require2FA: settings.require2FA });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, SecurityUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const data = parsed.data;

  const firmId = session.user.firmId;
  const updated = await prisma.firmSettings.upsert({
    where: { firmId },
    create: { firmId, ...data },
    update: data,
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "firm.security.updated",
    resource: "FirmSettings",
    resourceId: updated.id,
    metadata: { fields: Object.keys(data) },
    ...meta,
  });

  return NextResponse.json({ require2FA: updated.require2FA });
}
