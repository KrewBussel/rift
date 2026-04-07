import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewCaseForm from "@/components/NewCaseForm";

export default async function NewCasePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const firmId = (session.user as any).firmId as string;

  const users = await prisma.user.findMany({
    where: { firmId },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">New Rollover Case</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in the details to create a new case.</p>
      </div>
      <NewCaseForm users={users} />
    </div>
  );
}
