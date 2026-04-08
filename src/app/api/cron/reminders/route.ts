import { NextRequest, NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

// Called by Vercel Cron (daily at 8am UTC) or manually by admins.
// Protected by CRON_SECRET header.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";

  try {
    const results = await runReminders(dryRun);
    const totalEmails = results.reduce(
      (sum, r) => sum + r.overdueTaskEmails + r.stalledCaseEmails + r.missingDocEmails,
      0
    );

    return NextResponse.json({
      ok: true,
      dryRun,
      totalEmails,
      firms: results,
    });
  } catch (err) {
    console.error("[cron/reminders]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Vercel Cron also calls via GET
export async function GET(req: NextRequest) {
  return POST(req);
}
