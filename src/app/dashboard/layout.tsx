import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import SidebarV2 from "@/components/v2/SidebarV2";
import { T } from "@/components/v2/tokens";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, firm] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    }),
    prisma.firm.findUnique({
      where: { id: session.user.firmId },
      select: { name: true, logoUrl: true, updatedAt: true, onboardedAt: true, planTier: true },
    }),
  ]);

  // Firm hasn't completed the onboarding wizard yet. ADMIN gets redirected to
  // the wizard; non-admins see a locked-out screen since only the admin can
  // finish setup.
  if (firm && !firm.onboardedAt) {
    if (session.user.role === "ADMIN") redirect("/onboarding");
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#0a0d12" }}>
        <div className="max-w-md text-center px-6">
          <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>Setup in progress</h1>
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            Your firm&rsquo;s admin needs to finish onboarding before Rift is available. Reach out to them and check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN";

  /* ── Admin V2 layout (Claude paper palette) ─────────────────────────── */
  if (isAdmin && user && firm) {
    const firmId = session.user.firmId;
    const [activeCases, recent] = await Promise.all([
      prisma.rolloverCase.count({ where: { firmId, status: { not: "WON" } } }),
      prisma.rolloverCase.findMany({
        where: { firmId },
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
        <SidebarV2
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

  /* ── Legacy dark layout (non-admins) ────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0d12" }}>
      <Sidebar user={{ ...session.user!, id: session.user!.id }} />
      <div className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        {user && <DashboardHeader user={user} firm={firm} />}
        <main className="flex-1 min-h-0 flex flex-col max-w-7xl mx-auto w-full px-6 lg:px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
