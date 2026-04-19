import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const firmId = session.user.firmId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyCount, monthlyAgg, firmSettings] = await Promise.all([
    // Total questions this month
    prisma.aiUsage.count({
      where: { firmId, createdAt: { gte: monthStart } },
    }),
    // Token totals this month
    prisma.aiUsage.aggregate({
      where: { firmId, createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, cacheHitTokens: true },
    }),
    prisma.firmSettings.findUnique({
      where: { firmId },
      select: { aiMonthlyLimit: true },
    }),
  ]);

  const limit = firmSettings?.aiMonthlyLimit ?? 500;
  const inputTokens = monthlyAgg._sum.inputTokens ?? 0;
  const outputTokens = monthlyAgg._sum.outputTokens ?? 0;
  const cacheHitTokens = monthlyAgg._sum.cacheHitTokens ?? 0;

  // Rough cost in cents: input at $5/1M, output at $25/1M
  // Cache hits cost $0.50/1M instead of $5/1M — so we discount those
  const billableInputTokens = inputTokens - cacheHitTokens;
  const costCents = Math.round(
    (billableInputTokens / 1_000_000) * 500 +
    (cacheHitTokens / 1_000_000) * 50 +
    (outputTokens / 1_000_000) * 2500,
  );

  return NextResponse.json({
    used: monthlyCount,
    limit,
    inputTokens,
    outputTokens,
    cacheHitTokens,
    estimatedCostCents: costCents,
    month: monthStart.toISOString(),
  });
}
