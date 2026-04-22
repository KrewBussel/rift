import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LIMIT_PER_CATEGORY = 5;
const MIN_QUERY_LENGTH = 2;

/**
 * Global search across cases, people, and tasks, scoped to the current firm
 * and respecting role visibility. Static routes (pages + settings tabs) are
 * matched client-side in GlobalSearch.
 *
 *   GET /api/search?q=<query>
 *   →  { cases: [...], people: [...], tasks: [...] }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ cases: [], people: [], tasks: [] });
  }

  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Non-admins only see cases/tasks they're assigned to
  const caseVisibility =
    role === "ADVISOR" ? { assignedAdvisorId: userId }
    : role === "OPS"    ? { assignedOpsId: userId }
    : {};
  const taskVisibility =
    role === "ADVISOR"
      ? { OR: [{ assigneeId: userId }, { case: { assignedAdvisorId: userId } }] }
    : role === "OPS"
      ? { OR: [{ assigneeId: userId }, { case: { assignedOpsId: userId } }] }
    : {};

  const ci = { contains: q, mode: "insensitive" as const };

  const [cases, people, tasks] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: {
        firmId,
        ...caseVisibility,
        OR: [
          { clientFirstName: ci },
          { clientLastName: ci },
          { clientEmail: ci },
          { sourceProvider: ci },
          { destinationCustodian: ci },
        ],
      },
      select: {
        id: true,
        clientFirstName: true,
        clientLastName: true,
        status: true,
        sourceProvider: true,
        destinationCustodian: true,
      },
      orderBy: { updatedAt: "desc" },
      take: LIMIT_PER_CATEGORY,
    }),
    prisma.user.findMany({
      where: {
        firmId,
        deactivatedAt: null,
        OR: [
          { firstName: ci },
          { lastName: ci },
          { email: ci },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      take: LIMIT_PER_CATEGORY,
    }),
    prisma.task.findMany({
      where: {
        case: { firmId },
        ...taskVisibility,
        OR: [
          { title: ci },
          { description: ci },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        case: {
          select: {
            id: true,
            clientFirstName: true,
            clientLastName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: LIMIT_PER_CATEGORY,
    }),
  ]);

  return NextResponse.json({
    cases: cases.map((c) => ({
      id: c.id,
      name: `${c.clientFirstName} ${c.clientLastName}`,
      status: c.status,
      subtitle: `${c.sourceProvider} → ${c.destinationCustodian}`,
    })),
    people: people.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      caseId: t.case.id,
      caseName: `${t.case.clientFirstName} ${t.case.clientLastName}`,
    })),
  });
}
