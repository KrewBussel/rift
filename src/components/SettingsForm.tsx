"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SettingsSidebar,
  SectionTransition,
  SaveBar,
  visibleSections,
  type SettingsSectionId,
  type SettingsRole,
} from "./settings/SettingsShell";
import { SETTINGS_TOKENS } from "./settings/primitives";

import ProfileSection from "./settings/ProfileSection";
import NotificationsSection from "./settings/NotificationsSection";
import SecuritySection from "./settings/SecuritySection";
import WorkspaceSection from "./settings/WorkspaceSection";
import TeamSection from "./settings/TeamSection";
import BillingSection from "./settings/BillingSection";
import IntegrationsSection from "./settings/IntegrationsSection";

const T = SETTINGS_TOKENS;

/* ─── Types (mirrors page.tsx server props) ────────────────────────────── */

interface UserPreferences extends Record<string, unknown> {
  timezone?: string;
  notificationDigest?: string;
  notificationPrefs?: Record<string, { email: boolean; inApp: boolean; slack: boolean }>;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: SettingsRole;
  preferences: UserPreferences;
  bio: string | null;
  emailSignature: string | null;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

interface Firm {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  businessAddress: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  planTier: "STARTER" | "PRO" | "ENTERPRISE";
  seatsLimit: number;
  billingEmail: string | null;
  renewalDate: string | null;
  aiPlanName: string;
}

interface FirmSettings {
  remindersEnabled: boolean;
  stalledCaseDays: number;
  overdueTaskReminders: boolean;
  stalledCaseReminders: boolean;
  missingDocsReminders: boolean;
  require2FA: boolean;
  complianceContactEmail: string | null;
  allowDataExport: boolean;
  operatingStates: string[];
}

interface AIUsage {
  planName: string;
  percentUsed: number;
  periodResetsAt: string;
}

interface PlatformBaselineProps {
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  sessionTimeoutMinutes: number;
  retentionCaseDataDays: number;
  retentionAuditLogDays: number;
}

interface Props {
  user: User;
  firmSettings: FirmSettings | null;
  firm: Firm | null;
  seatsUsed: number;
  pendingSeats?: number;
  aiUsage: AIUsage;
  platform: PlatformBaselineProps;
  /** @deprecated kept for backwards compatibility with the old call site. */
  cronSecret?: string;
}

/* ─── Save registry ────────────────────────────────────────────────────── */

type SaveEntry = {
  dirty: boolean;
  save: () => Promise<void> | void;
  reset: () => void;
};

/* ─── Root ─────────────────────────────────────────────────────────────── */

export default function SettingsForm({
  user,
  firmSettings,
  firm,
  seatsUsed,
  pendingSeats = 0,
  aiUsage,
  platform,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = user.role;
  const visible = visibleSections(role);

  const paramSection = (searchParams.get("section") ?? "profile") as SettingsSectionId;
  const validIds = visible.map((s) => s.id);
  const active: SettingsSectionId = validIds.includes(paramSection) ? paramSection : "profile";

  // Each section calls registerSave(id, dirty, save, reset) during render. We
  // store the latest entry in a ref so the save bar reads it without re-renders
  // triggering loops.
  const registry = useRef<Map<SettingsSectionId, SaveEntry>>(new Map());
  const [registryVersion, setRegistryVersion] = useState(0);
  // Tracks whether the component is currently mounted. Children call
  // registerSave during their initial render (before mount), so a microtask
  // scheduled then would fire after a strict-mode discarded render and try to
  // setState on an unmounted component. Gating the bump on this ref avoids
  // the warning.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function registerSave(
    id: string,
    dirty: boolean,
    save: () => Promise<void> | void,
    reset: () => void
  ) {
    const prev = registry.current.get(id as SettingsSectionId);
    if (!prev || prev.dirty !== dirty) {
      registry.current.set(id as SettingsSectionId, { dirty, save, reset });
      // Trigger a save-bar refresh on the next tick to avoid mid-render setState.
      // Only do this after mount — pre-mount registrations are already
      // reflected in the ref and will be picked up on the natural first render.
      if (mountedRef.current) {
        queueMicrotask(() => {
          if (mountedRef.current) setRegistryVersion((v) => v + 1);
        });
      }
    } else {
      // Keep callbacks fresh without re-rendering.
      registry.current.set(id as SettingsSectionId, { dirty, save, reset });
    }
  }

  function setActive(id: SettingsSectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const activeEntry = registry.current.get(active);
  const dirty = !!activeEntry?.dirty;

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clear the success/error message when the user switches sections.
  useEffect(() => {
    setMessage(null);
  }, [active]);

  async function handleSave() {
    const entry = registry.current.get(active);
    if (!entry) return;
    setSaving(true);
    setMessage(null);
    try {
      await entry.save();
      setMessage({ type: "success", text: "Saved." });
      // Clear the success badge after a moment so the bar can recede.
      window.setTimeout(() => setMessage(null), 1600);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    const entry = registry.current.get(active);
    if (!entry) return;
    entry.reset();
    setMessage(null);
  }

  // Keep linter happy — the registry version drives re-render; reading prevents tree-shake.
  void registryVersion;

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 56px)",
        background: T.page,
        margin: "-24px -24px -32px",
        position: "relative",
      }}
    >
      <SettingsSidebar active={active} onSelect={setActive} role={role} />

      <SectionTransition activeId={active}>
        {(displayId) => {
          if (displayId === "profile") {
            return <ProfileSection user={user} registerSave={registerSave} />;
          }
          if (displayId === "notifications") {
            return (
              <NotificationsSection
                firmSettings={firmSettings}
                isAdmin={role === "ADMIN"}
                initialDigest={(user.preferences.notificationDigest as string) ?? "daily"}
                initialPrefs={user.preferences.notificationPrefs ?? null}
                registerSave={registerSave}
              />
            );
          }
          if (displayId === "security") {
            return (
              <SecuritySection
                twoFactorEnabled={user.twoFactorEnabled ?? false}
                isAdmin={role === "ADMIN"}
                firmSettings={firmSettings}
                baseline={{
                  passwordMinLength: platform.passwordMinLength,
                  passwordRequireNumber: platform.passwordRequireNumber,
                  passwordRequireSymbol: platform.passwordRequireSymbol,
                  sessionTimeoutMinutes: platform.sessionTimeoutMinutes,
                }}
                registerSave={registerSave}
              />
            );
          }
          if (displayId === "workspace" && firm && firmSettings) {
            return (
              <WorkspaceSection
                firm={firm}
                firmSettings={firmSettings}
                retentionCaseDataDays={platform.retentionCaseDataDays}
                retentionAuditLogDays={platform.retentionAuditLogDays}
                registerSave={registerSave}
              />
            );
          }
          if (displayId === "team" && firm) {
            return (
              <TeamSection
                currentUserId={user.id}
                seatsLimit={firm.seatsLimit}
                seatsUsed={seatsUsed}
              />
            );
          }
          if (displayId === "billing" && firm) {
            return (
              <BillingSection
                firm={firm}
                seatsUsed={seatsUsed}
                pendingSeats={pendingSeats}
                aiUsage={aiUsage}
                registerSave={registerSave}
              />
            );
          }
          if (displayId === "integrations") {
            return <IntegrationsSection />;
          }
          return null;
        }}
      </SectionTransition>

      <SaveBar
        visible={dirty || !!message}
        saving={saving}
        message={message}
        onSave={handleSave}
        onCancel={handleDiscard}
      />
    </div>
  );
}
