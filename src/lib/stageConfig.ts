import { prisma } from "./prisma";
import type { CaseStatus } from "@prisma/client";
import {
  ALWAYS_ENABLED_STATUSES,
  STATUSES,
  type StageConfigRow,
} from "@/components/casesDesignTokens";

const CANONICAL_ORDER: CaseStatus[] = STATUSES.map((s) => s.value as CaseStatus);

/**
 * Read the firm's CaseStageConfig overlay rows for use in any server-side
 * render. If a firm hasn't been backfilled yet (shouldn't happen post-migration)
 * the function returns an empty array and the UI falls back to canonical
 * defaults — every label/visibility helper is null-safe.
 */
export async function getFirmStageConfig(firmId: string): Promise<StageConfigRow[]> {
  const rows = await prisma.caseStageConfig.findMany({
    where: { firmId },
    orderBy: { sortOrder: "asc" },
    select: { status: true, customLabel: true, isEnabled: true, sortOrder: true },
  });
  return rows.map((r) => ({
    status: r.status,
    customLabel: r.customLabel,
    isEnabled: ALWAYS_ENABLED_STATUSES.has(r.status as "PROPOSAL_ACCEPTED" | "WON")
      ? true
      : r.isEnabled,
    sortOrder: r.sortOrder,
  }));
}

/**
 * Idempotently seed the seven canonical stages for a firm with default labels
 * and isEnabled=true. Called from the migration backfill and from the firm
 * onboarding endpoint as a safety net.
 */
export async function ensureFirmStageConfig(firmId: string): Promise<void> {
  const existing = await prisma.caseStageConfig.findMany({
    where: { firmId },
    select: { status: true },
  });
  const have = new Set(existing.map((r) => r.status));
  const missing = CANONICAL_ORDER.filter((s) => !have.has(s));
  if (missing.length === 0) return;
  await prisma.caseStageConfig.createMany({
    data: missing.map((status) => ({
      firmId,
      status,
      customLabel: null,
      isEnabled: true,
      sortOrder: CANONICAL_ORDER.indexOf(status),
    })),
    skipDuplicates: true,
  });
}
