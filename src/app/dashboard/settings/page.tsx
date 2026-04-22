import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { getFirmUsageSummary } from "@/lib/aiUsage";
import { platformConfig } from "@/lib/platformConfig";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;
  const firmId = session.user.firmId;
  const isAdmin = role === "ADMIN";

  const [user, firmSettings, firm, aiUsage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        preferences: true,
        bio: true,
        emailSignature: true,
        createdAt: true,
      },
    }),
    isAdmin ? getOrCreateFirmSettings(firmId) : null,
    isAdmin
      ? prisma.firm.findUnique({
          where: { id: firmId },
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
            businessAddress: true,
            supportEmail: true,
            supportPhone: true,
            websiteUrl: true,
            logoUrl: true,
            planTier: true,
            seatsLimit: true,
            billingEmail: true,
            renewalDate: true,
            aiPlanName: true,
          },
        })
      : null,
    getFirmUsageSummary(firmId),
  ]);

  if (!user) redirect("/login");

  const seatsUsed = isAdmin
    ? await prisma.user.count({ where: { firmId, deactivatedAt: null } })
    : 0;

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
      firm={
        firm
          ? {
              ...firm,
              renewalDate: firm.renewalDate?.toISOString() ?? null,
            }
          : null
      }
      seatsUsed={seatsUsed}
      aiUsage={{
        planName: aiUsage.planName,
        percentUsed: aiUsage.percentUsed,
        periodResetsAt: aiUsage.periodEnd.toISOString(),
      }}
      platform={{
        passwordMinLength: platformConfig.password.minLength,
        passwordRequireNumber: platformConfig.password.requireNumber,
        passwordRequireSymbol: platformConfig.password.requireSymbol,
        sessionTimeoutMinutes: platformConfig.session.timeoutMinutes,
        retentionCaseDataDays: platformConfig.retention.caseDataDays,
        retentionAuditLogDays: platformConfig.retention.auditLogDays,
      }}
      cronSecret={isAdmin ? process.env.CRON_SECRET ?? "" : ""}
    />
  );
}
