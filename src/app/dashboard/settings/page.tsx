import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      preferences: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsForm
      user={{
        ...user,
        preferences: (user.preferences as Record<string, any>) ?? {},
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
