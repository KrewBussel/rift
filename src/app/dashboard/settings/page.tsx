import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import { getFirmUsageSummary } from "@/lib/aiUsage";
import Settings, {
  type SettingsV2User,
  type SettingsV2Firm,
  type SettingsV2FirmSettings,
} from "@/components/Settings";

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
        twoFactorEnabled: true,
      },
    }),
    isAdmin ? getOrCreateFirmSettings(firmId) : null,
    isAdmin
      ? prisma.firm.findUnique({
          where: { id: firmId },
          select: {
            id: true,
            name: true,
            slug: true,
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

  const userPrefs: Record<string, unknown> =
    user.preferences !== null && typeof user.preferences === "object" && !Array.isArray(user.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};

  const v2User: SettingsV2User = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role as "ADMIN" | "ADVISOR" | "OPS",
    bio: user.bio,
    emailSignature: user.emailSignature,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString(),
    preferences: userPrefs,
  };

  const v2Firm: SettingsV2Firm | null = firm
    ? {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        legalName: firm.legalName,
        taxId: firm.taxId,
        businessAddress: firm.businessAddress,
        supportEmail: firm.supportEmail,
        supportPhone: firm.supportPhone,
        websiteUrl: firm.websiteUrl,
        logoUrl: firm.logoUrl,
        planTier: firm.planTier,
        seatsLimit: firm.seatsLimit,
        billingEmail: firm.billingEmail,
        renewalDate: firm.renewalDate?.toISOString() ?? null,
      }
    : null;

  const v2FirmSettings: SettingsV2FirmSettings | null = firmSettings
    ? {
        remindersEnabled: firmSettings.remindersEnabled,
        stalledCaseDays: firmSettings.stalledCaseDays,
        overdueTaskReminders: firmSettings.overdueTaskReminders,
        stalledCaseReminders: firmSettings.stalledCaseReminders,
        missingDocsReminders: firmSettings.missingDocsReminders,
        require2FA: firmSettings.require2FA,
        operatingStates: firmSettings.operatingStates,
      }
    : null;

  return (
    <Settings
      user={v2User}
      firm={v2Firm}
      firmSettings={v2FirmSettings}
      seatsUsed={seatsUsed}
      aiUsage={{
        planName: aiUsage.planName,
        percentUsed: aiUsage.percentUsed,
        periodResetsAt: aiUsage.periodEnd.toISOString(),
      }}
    />
  );
}
