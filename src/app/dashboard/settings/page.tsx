import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;
  const firmId = (session.user as any).firmId as string;

  const [user, firmSettings] = await Promise.all([
    prisma.user.findUnique({
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
    }),
    role === "ADMIN" ? getOrCreateFirmSettings(firmId) : null,
  ]);

  if (!user) redirect("/login");

  return (
    <SettingsForm
      user={{
        ...user,
        preferences: (user.preferences as Record<string, any>) ?? {},
        createdAt: user.createdAt.toISOString(),
      }}
      firmSettings={firmSettings}
      cronSecret={role === "ADMIN" ? process.env.CRON_SECRET ?? "" : ""}
    />
  );
}
