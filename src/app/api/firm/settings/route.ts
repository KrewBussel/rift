import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = (session.user as any).firmId as string;
  const settings = await getOrCreateFirmSettings(firmId);
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = (session.user as any).firmId as string;
  const body = await req.json();

  const allowed = [
    "remindersEnabled",
    "stalledCaseDays",
    "overdueTaskReminders",
    "stalledCaseReminders",
    "missingDocsReminders",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.firmSettings.upsert({
    where: { firmId },
    create: { firmId, ...data },
    update: data,
  });

  return NextResponse.json(updated);
}
