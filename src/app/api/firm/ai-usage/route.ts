import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getFirmUsageSummary } from "@/lib/aiUsage";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Any authenticated user can see the percentage for their firm, but only a
  // bounded, privacy-respecting view — no token counts, costs, or request counts.
  const { percentUsed, planName, periodEnd } = await getFirmUsageSummary(session.user.firmId);

  return NextResponse.json({
    planName,
    percentUsed,
    periodResetsAt: periodEnd,
  });
}
