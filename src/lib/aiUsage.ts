import { prisma } from "./prisma";

export function currentBillingPeriod(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function getFirmUsageSummary(firmId: string): Promise<{
  planName: string;
  monthlyTokenLimit: number;
  tokensUsed: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
  overLimit: boolean;
}> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { aiMonthlyTokenLimit: true, aiPlanName: true },
  });
  const monthlyTokenLimit = firm?.aiMonthlyTokenLimit ?? 500000;
  const planName = firm?.aiPlanName ?? "Starter";
  const { start, end } = currentBillingPeriod();

  const agg = await prisma.aIUsageLog.aggregate({
    where: { firmId, createdAt: { gte: start, lt: end } },
    _sum: { inputTokens: true, outputTokens: true },
  });

  const tokensUsed = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  const percentUsed =
    monthlyTokenLimit > 0 ? Math.min(100, Math.round((tokensUsed / monthlyTokenLimit) * 100)) : 0;

  return {
    planName,
    monthlyTokenLimit,
    tokensUsed,
    percentUsed,
    periodStart: start,
    periodEnd: end,
    overLimit: tokensUsed >= monthlyTokenLimit,
  };
}

export async function logAIUsage(params: {
  firmId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): Promise<void> {
  await prisma.aIUsageLog.create({
    data: {
      firmId: params.firmId,
      userId: params.userId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cacheReadTokens: params.cacheReadTokens ?? 0,
      cacheWriteTokens: params.cacheWriteTokens ?? 0,
    },
  });
}
