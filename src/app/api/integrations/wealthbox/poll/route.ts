import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pollFirmForNewOpportunities, type PollResult } from "@/lib/crmSync";

/**
 * Inbound CRM poller. Provider-agnostic — scans every connected firm
 * (Wealthbox or Salesforce) at their "Proposal Accepted" mapped stage and
 * creates Rift cases for any new opportunities. Also scans the Won-mapped
 * stage and auto-closes linked cases. Idempotent — opportunities already
 * linked are skipped.
 *
 * Two auth modes:
 *  1. External cron — `Authorization: Bearer <CRON_SECRET>` polls all firms.
 *  2. Manual sync from the UI — an ADMIN session polls only their own firm.
 *
 * Neither Wealthbox (no webhooks) nor Salesforce (we'd need a paid Streaming
 * API license + named credentials) push events, so a Hobby-tier deployment
 * uses an external pinger (cron-job.org, GitHub Actions) hitting this
 * endpoint every 1–5 minutes with the cron secret.
 *
 * Path note: this lives at /integrations/wealthbox/poll for back-compat with
 * existing cron configurations. The behavior is provider-neutral.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCron) {
    const firms = await prisma.crmConnection.findMany({
      // Both providers are polled. Provider-specific quirks live behind
      // getProviderClient, not at this layer.
      select: { firmId: true },
    });
    const results: PollResult[] = [];
    for (const f of firms) {
      results.push(await pollFirmForNewOpportunities(f.firmId));
    }
    return NextResponse.json({
      mode: "cron",
      firms: results.length,
      totalCreated: results.reduce((s, r) => s + r.created, 0),
      results,
    });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await pollFirmForNewOpportunities(session.user.firmId);
  return NextResponse.json({ mode: "manual", result });
}
