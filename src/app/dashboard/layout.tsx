import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <TopNav user={session.user!} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
