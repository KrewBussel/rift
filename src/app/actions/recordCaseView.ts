"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function recordCaseView(caseId: string) {
  const session = await auth();
  if (!session) return;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs: Record<string, unknown> =
    user?.preferences !== null && typeof user?.preferences === "object" && !Array.isArray(user?.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};
  const recent: string[] = Array.isArray(prefs.recentlyViewedCaseIds)
    ? prefs.recentlyViewedCaseIds
    : [];

  const updated = [caseId, ...recent.filter((id) => id !== caseId)].slice(0, 6);

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: { ...prefs, recentlyViewedCaseIds: updated } },
  });
}
