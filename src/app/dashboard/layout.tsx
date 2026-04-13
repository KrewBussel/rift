import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d1117" }}>
      <Sidebar user={session.user!} />
      <div className="flex-1 overflow-y-auto min-w-0">
        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
