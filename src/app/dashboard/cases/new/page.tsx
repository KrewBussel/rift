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

  return <NewCaseForm users={users} />;
}
