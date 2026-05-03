import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureFirmStageConfig } from "@/lib/stageConfig";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only the admin can drive onboarding. Other roles just see the dashboard
  // gate screen if their firm isn't onboarded yet.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const firmId = session.user.firmId;
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { name: true, onboardedAt: true },
  });
  if (!firm) redirect("/login");

  // Already onboarded — Settings → Integrations is the right place to make
  // changes after setup.
  if (firm.onboardedAt) redirect("/dashboard/settings?tab=integrations");

  // Make sure the canonical stage rows exist before the wizard reads them.
  await ensureFirmStageConfig(firmId);

  return <OnboardingWizard firmName={firm.name} adminName={session.user.name ?? null} />;
}
