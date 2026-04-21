import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CasesView, { type CasesViewCase, type CasesViewUser } from "@/components/CasesView";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  // Role visibility: advisors and ops only see cases they are assigned.
  // Admins see everything for the firm.
  const roleVisibilityFilter =
    role === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : role === "OPS"
      ? { assignedOpsId: userId }
      : {};

  const [cases, users] = await Promise.all([
    prisma.rolloverCase.findMany({
      where: { firmId, ...roleVisibilityFilter },
      include: {
        assignedAdvisor: { select: { id: true, firstName: true, lastName: true } },
        assignedOps: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // Only admins need the user list (for the Owner filter dropdown)
    role === "ADMIN"
      ? prisma.user.findMany({
          where: { firmId, deactivatedAt: null, role: { in: ["ADVISOR", "OPS", "ADMIN"] } },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: [{ role: "asc" }, { firstName: "asc" }],
        })
      : Promise.resolve([] as CasesViewUser[]),
  ]);

  const serialized: CasesViewCase[] = cases.map((c) => ({
    id: c.id,
    clientFirstName: c.clientFirstName,
    clientLastName: c.clientLastName,
    clientEmail: c.clientEmail,
    sourceProvider: c.sourceProvider,
    destinationCustodian: c.destinationCustodian,
    accountType: c.accountType,
    status: c.status,
    highPriority: c.highPriority,
    statusUpdatedAt: c.statusUpdatedAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    assignedAdvisor: c.assignedAdvisor,
    assignedOps: c.assignedOps,
  }));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
          {role === "ADMIN" ? "All cases" : "Your cases"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
          {role === "ADMIN"
            ? "Every rollover case across your firm."
            : "Rollover cases assigned to you."}
        </p>
      </div>
      <CasesView
        cases={serialized}
        users={users}
        userRole={role}
        initialStatus={params.status ?? ""}
      />
    </>
  );
}
