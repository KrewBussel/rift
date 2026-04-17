import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;
  const firmId = session.user.firmId;

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
        preferences:
          user.preferences !== null && typeof user.preferences === "object" && !Array.isArray(user.preferences)
            ? (user.preferences as Record<string, unknown>)
            : {},
        createdAt: user.createdAt.toISOString(),
      }}
      firmSettings={firmSettings}
      cronSecret={role === "ADMIN" ? process.env.CRON_SECRET ?? "" : ""}
    />
  );
}
