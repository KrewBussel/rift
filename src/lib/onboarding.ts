import type { Role } from "@prisma/client";

export type OnboardingItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

export type OnboardingChecklistData = {
  items: OnboardingItem[];
  completedCount: number;
  totalCount: number;
};

export type OnboardingFirmInfo = {
  logoUrl: string | null;
  supportEmail: string | null;
  businessAddress: string | null;
};

export interface OnboardingInputs {
  role: Role;
  user: {
    bio: string | null;
    emailSignature: string | null;
  };
  prefs: Record<string, unknown>;
  hasAnyCase: boolean;
  firm?: OnboardingFirmInfo;
  crmConnected?: boolean;
  teamMemberCount?: number;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

export function computeOnboardingChecklist({
  role,
  user,
  prefs,
  hasAnyCase,
  firm,
  crmConnected,
  teamMemberCount,
}: OnboardingInputs): OnboardingChecklistData {
  const exploredCustodians =
    isNonEmptyArray(prefs.intelligenceSearches) || isNonEmptyArray(prefs.pinnedCustodians);

  const items: OnboardingItem[] = [
    {
      id: "profile-picture",
      title: "Upload a profile picture",
      description: "Help your team and clients recognize you across Rift.",
      href: "/dashboard/settings?tab=profile",
      done: isNonEmptyString(prefs.avatarKey),
    },
    {
      id: "bio",
      title: "Add a personal bio",
      description: "Shown to clients on the portal when you're their assigned advisor.",
      href: "/dashboard/settings?tab=profile",
      done: !!user.bio?.trim(),
    },
    {
      id: "email-signature",
      title: "Set your email signature",
      description: "Used on outbound emails to clients and custodians.",
      href: "/dashboard/settings?tab=profile",
      done: !!user.emailSignature?.trim(),
    },
    {
      id: "timezone",
      title: "Set your timezone",
      description: "So due dates and reminders match your working day.",
      href: "/dashboard/settings?tab=preferences",
      done: isNonEmptyString(prefs.timezone),
    },
    {
      id: "first-case",
      title: role === "ADMIN" ? "Open the first case" : "Open one of your cases",
      description: "Walk through a rollover end-to-end so the workflow feels familiar.",
      href: "/dashboard/cases",
      done: hasAnyCase,
    },
    {
      id: "explore-custodians",
      title: "Explore the Custodian Hub",
      description: "Search a custodian or pin one to your shortcuts.",
      href: "/dashboard/intelligence",
      done: exploredCustodians,
    },
  ];

  if (role === "ADMIN") {
    items.push(
      {
        id: "connect-crm",
        title: "Connect your CRM",
        description: "Sync rollover stages with Wealthbox or Salesforce.",
        href: "/dashboard/settings?tab=integrations",
        done: !!crmConnected,
      },
      {
        id: "invite-team",
        title: "Invite your team",
        description: "Add advisors and operations users to share work.",
        href: "/dashboard/settings?tab=team",
        done: (teamMemberCount ?? 0) > 0,
      },
      {
        id: "firm-profile",
        title: "Complete your firm profile",
        description: "Add a logo and support email so clients see a polished brand.",
        href: "/dashboard/settings?tab=organization",
        done: !!(firm?.logoUrl && firm.supportEmail),
      },
    );
  }

  return {
    items,
    completedCount: items.filter((i) => i.done).length,
    totalCount: items.length,
  };
}
