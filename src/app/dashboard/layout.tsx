import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

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
      select: { name: true, onboardedAt: true },
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
