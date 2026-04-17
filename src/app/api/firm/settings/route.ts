import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

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

  const role = session.user.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;
  const body = await req.json();

  const data: {
    remindersEnabled?: boolean;
    stalledCaseDays?: number;
    overdueTaskReminders?: boolean;
    stalledCaseReminders?: boolean;
    missingDocsReminders?: boolean;
  } = {};
  if (body.remindersEnabled !== undefined) data.remindersEnabled = Boolean(body.remindersEnabled);
  if (body.stalledCaseDays !== undefined) data.stalledCaseDays = Number(body.stalledCaseDays);
  if (body.overdueTaskReminders !== undefined) data.overdueTaskReminders = Boolean(body.overdueTaskReminders);
  if (body.stalledCaseReminders !== undefined) data.stalledCaseReminders = Boolean(body.stalledCaseReminders);
  if (body.missingDocsReminders !== undefined) data.missingDocsReminders = Boolean(body.missingDocsReminders);

  const updated = await prisma.firmSettings.upsert({
    where: { firmId },
    create: { firmId, ...data },
    update: data,
  });

  return NextResponse.json(updated);
}
