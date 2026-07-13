import { prisma } from "./prisma";

/**
 * Default document checklist seeded onto a case the first time its checklist
 * is needed. Shared by the firm-side checklist API and the client portal so
 * a case always has actionable items regardless of which side loads first.
 */
export const DEFAULT_CHECKLIST = [
  { name: "Distribution form",                  required: true,  sortOrder: 0 },
  { name: "Letter of authorization",            required: true,  sortOrder: 1 },
  { name: "ID verification",                    required: true,  sortOrder: 2 },
  { name: "Provider-specific form",             required: true,  sortOrder: 3 },
  { name: "Notarization / medallion signature", required: false, sortOrder: 4 },
  { name: "Internal review complete",           required: true,  sortOrder: 5 },
] as const;

/** Seed the default checklist if the case has no items yet. Idempotent. */
export async function ensureCaseChecklist(caseId: string): Promise<void> {
  const existing = await prisma.checklistItem.count({ where: { caseId } });
  if (existing > 0) return;
  await prisma.checklistItem.createMany({
    data: DEFAULT_CHECKLIST.map((item) => ({ ...item, caseId })),
  });
}
