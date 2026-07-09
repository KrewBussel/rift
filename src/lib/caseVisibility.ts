import { prisma } from "./prisma";

/**
 * Intra-firm case visibility.
 *
 * ADMIN sees every case in the firm; ADVISOR and OPS see only the cases they
 * are assigned to (assignedAdvisorId / assignedOpsId). Returns a Prisma `where`
 * fragment to merge into any RolloverCase query — or into the parent-case lookup
 * of a case-scoped sub-resource. The dashboard/cases server components and the
 * global search already apply this exact rule; using this helper in the API
 * routes closes the object-level-authorization gap where a non-admin could
 * read/mutate an unassigned same-firm case by hitting the API directly.
 *
 * Always combine with `firmId` scoping — this is the intra-firm layer, not the
 * cross-firm one.
 */
export function caseVisibilityFilter(
  role: string,
  userId: string,
): { assignedAdvisorId: string } | { assignedOpsId: string } | Record<string, never> {
  if (role === "ADVISOR") return { assignedAdvisorId: userId };
  if (role === "OPS") return { assignedOpsId: userId };
  return {};
}

/**
 * True when `userId` is null/undefined/empty (i.e. clearing an assignment) or
 * references a user in `firmId`. Guards the assignment fields (case advisor/ops,
 * task assignee) so a caller can't point them at a cross-firm or nonexistent
 * user id — which would leak that user's name via the assignment `include` and
 * corrupt assignment integrity.
 */
export async function isSameFirmUser(
  userId: string | null | undefined,
  firmId: string,
): Promise<boolean> {
  if (!userId) return true;
  const user = await prisma.user.findFirst({ where: { id: userId, firmId }, select: { id: true } });
  return !!user;
}
