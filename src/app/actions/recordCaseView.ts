"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function recordCaseView(caseId: string) {
  const session = await auth();
  if (!session) return;
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs = (user?.preferences as Record<string, any>) ?? {};
  const recent: string[] = Array.isArray(prefs.recentlyViewedCaseIds)
    ? prefs.recentlyViewedCaseIds
    : [];

  const updated = [caseId, ...recent.filter((id) => id !== caseId)].slice(0, 6);

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: { ...prefs, recentlyViewedCaseIds: updated } },
  });
}
