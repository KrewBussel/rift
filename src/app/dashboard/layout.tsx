import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/tokens";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const firmId = session.user.firmId;
  const userId = session.user.id;
  const role = session.user.role as "ADMIN" | "ADVISOR" | "OPS";

  const roleVisibility =
    role === "ADVISOR"
      ? { assignedAdvisorId: userId }
      : role === "OPS"
      ? { assignedOpsId: userId }
      : {};

  const [user, firm, activeCases, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    }),
    prisma.firm.findUnique({
      where: { id: firmId },
      select: { name: true, logoUrl: true, updatedAt: true, onboardedAt: true, planTier: true },
    }),
    prisma.rolloverCase.count({
      where: { firmId, ...roleVisibility, status: { not: "WON" } },
    }),
    prisma.rolloverCase.findMany({
      where: { firmId, ...roleVisibility },
      select: {
        id: true,
        clientFirstName: true,
        clientLastName: true,
        sourceProvider: true,
        destinationCustodian: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
  ]);

  // Firm hasn't completed the onboarding wizard yet. ADMIN gets redirected to
  // the wizard; non-admins see a locked-out screen since only the admin can
  // finish setup.
  if (firm && !firm.onboardedAt) {
    if (role === "ADMIN") redirect("/onboarding");
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: T.page }}>
        <div className="max-w-md text-center px-6">
          <h1 className="text-lg font-semibold mb-2" style={{ color: T.text }}>Setup in progress</h1>
          <p className="text-sm" style={{ color: T.textSecondary }}>
            Your firm&rsquo;s admin needs to finish onboarding before Rift is available. Reach out to them and check back shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!user || !firm) redirect("/login");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: T.page,
        color: T.text,
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Sidebar
        user={{
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          email: user.email,
          role: user.role,
        }}
        firm={{ name: firm.name, plan: firm.planTier }}
        caseCount={activeCases}
        recentCases={recent.map((c) => ({
          id: c.id,
          name: `${c.clientFirstName} ${c.clientLastName}`.trim(),
          sub: `${c.sourceProvider} → ${c.destinationCustodian}`,
        }))}
      />
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
