import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamPageV2, { type V2TeamMemberFull } from "@/components/v2/TeamPageV2";

export default async function TeamPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const firmId = session.user.firmId;

  const [firm, users] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: firmId },
      select: { name: true, seatsLimit: true },
    }),
    prisma.user.findMany({
      where: { firmId, deactivatedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        deactivatedAt: true,
        _count: {
          select: {
            assignedCases: { where: { status: { not: "WON" } } },
            ownedCases: { where: { status: { not: "WON" } } },
          },
        },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!firm) redirect("/dashboard");

  const wonCounts = await prisma.rolloverCase.groupBy({
    by: ["assignedAdvisorId"],
    where: { firmId, status: "WON" },
    _count: true,
  });
  const wonByUser: Record<string, number> = {};
  for (const w of wonCounts) {
    if (w.assignedAdvisorId) wonByUser[w.assignedAdvisorId] = w._count;
  }

  const members: V2TeamMemberFull[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role as "ADMIN" | "ADVISOR" | "OPS",
    twoFactorEnabled: u.twoFactorEnabled,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
    activeCases:
      u.role === "ADVISOR" || u.role === "ADMIN"
        ? u._count.assignedCases
        : u._count.ownedCases,
    completedCases: wonByUser[u.id] ?? 0,
  }));

  return (
    <TeamPageV2
      members={members}
      firmName={firm.name}
      seatsLimit={firm.seatsLimit}
      seatsUsed={users.length}
    />
  );
}
