import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const STATE_CODE = z.string().trim().regex(/^[A-Z]{2}$/);

const NotificationUpdateSchema = z
  .object({
    remindersEnabled: z.boolean().optional(),
    stalledCaseDays: z.number().int().min(1).max(365).optional(),
    overdueTaskReminders: z.boolean().optional(),
    stalledCaseReminders: z.boolean().optional(),
    missingDocsReminders: z.boolean().optional(),
    operatingStates: z.array(STATE_CODE).max(51).optional(),
  })
  .strict();

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = session.user.firmId;
  const settings = await getOrCreateFirmSettings(firmId);
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseBody(req, NotificationUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const data = parsed.data;

  const firmId = session.user.firmId;
  const updated = await prisma.firmSettings.upsert({
    where: { firmId },
    create: { firmId, ...data },
    update: data,
  });

  return NextResponse.json(updated);
}
