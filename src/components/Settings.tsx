"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { T, HEADLINE_STACK, ROLE_HUE } from "./tokens";
import { STATUSES, type StageConfigRow } from "./casesDesignTokens";
import {
  Card,
  CardSection,
  FieldRow,
  Pill,
  Btn,
  Icon,
  Avatar,
  TextInput,
  SelectInput,
  Toggle,
  SectionHeader,
} from "./primitives";

type Role = "ADMIN" | "ADVISOR" | "OPS";

export type SettingsV2User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  bio: string | null;
  emailSignature: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  preferences: Record<string, unknown>;
};

export type SettingsV2Firm = {
  id: string;
  name: string;
  slug: string;
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
};

export type SettingsV2FirmSettings = {
  remindersEnabled: boolean;
  stalledCaseDays: number;
  overdueTaskReminders: boolean;
  stalledCaseReminders: boolean;
  missingDocsReminders: boolean;
  require2FA: boolean;
  operatingStates: string[];
};

export type SettingsV2AiUsage = {
  planName: string;
  percentUsed: number;
  periodResetsAt: string;
};

type TabId =
  | "profile"
  | "notifications"
  | "security"
  | "workspace"
  | "team"
  | "billing"
  | "integrations";

const TABS: Array<{ id: TabId; label: string; icon: string; group: "Personal" | "Workspace" }> = [
  { id: "profile",       label: "Profile",       icon: "user",     group: "Personal" },
  { id: "notifications", label: "Notifications", icon: "bell",     group: "Personal" },
  { id: "security",      label: "Security",      icon: "shield",   group: "Personal" },
  { id: "workspace",     label: "Workspace",     icon: "building", group: "Workspace" },
  { id: "team",          label: "Team & roles",  icon: "users",    group: "Workspace" },
  { id: "billing",       label: "Billing",       icon: "card",     group: "Workspace" },
  { id: "integrations",  label: "Integrations",  icon: "plug",     group: "Workspace" },
];

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

// Resolve a `?tab=` deep-link (from onboarding redirect + the setup checklist)
// to a real tab id, aliasing the legacy names the checklist still uses.
function resolveInitialTab(tab: string | undefined): TabId {
  if (!tab) return "profile";
  const alias: Record<string, TabId> = { organization: "workspace", preferences: "profile" };
  if (alias[tab]) return alias[tab];
  return TAB_IDS.has(tab) ? (tab as TabId) : "profile";
}

export default function SettingsV2({
  user,
  firm,
  firmSettings,
  seatsUsed,
  aiUsage,
  initialTab,
}: {
  user: SettingsV2User;
  firm: SettingsV2Firm | null;
  firmSettings: SettingsV2FirmSettings | null;
  seatsUsed: number;
  aiUsage: SettingsV2AiUsage;
  initialTab?: string;
}) {
  const [active, setActive] = useState<TabId>(resolveInitialTab(initialTab));
  const isAdmin = user.role === "ADMIN";

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, background: T.page }}>
      <SettingsSidebar active={active} onSelect={setActive} isAdmin={isAdmin} />
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {active === "profile" && <ProfileSec user={user} />}
        {active === "notifications" && <NotificationsSec user={user} firmSettings={firmSettings} />}
        {active === "security" && <SecuritySec user={user} firmSettings={firmSettings} />}
        {active === "workspace" && firm && <WorkspaceSec firm={firm} firmSettings={firmSettings} />}
        {active === "team" && <TeamRedirect />}
        {active === "billing" && firm && <BillingSec firm={firm} seatsUsed={seatsUsed} aiUsage={aiUsage} />}
        {active === "integrations" && <IntegrationsSec />}
      </div>
    </div>
  );
}

function SettingsSidebar({
  active,
  onSelect,
  isAdmin,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  isAdmin: boolean;
}) {
  const visible = TABS.filter((t) => (isAdmin ? true : t.group === "Personal"));
  const groups = Array.from(new Set(visible.map((t) => t.group)));
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${T.border}`,
        padding: "26px 12px",
        background: T.page,
      }}
    >
      <div
        style={{
          padding: "0 10px 14px",
          fontSize: 11,
          color: T.textTertiary,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        Settings
      </div>
      {groups.map((g) => (
        <div key={g} style={{ marginBottom: 14 }}>
          <div
            style={{
              padding: "0 10px 4px",
              fontSize: 10,
              fontWeight: 500,
              color: T.textDisabled,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {g}
          </div>
          {visible
            .filter((s) => s.group === g)
            .map((s) => {
              const isActive = active === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = T.surface3;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    margin: "1px 0",
                    borderRadius: 7,
                    cursor: "pointer",
                    color: isActive ? T.text : T.textSecondary,
                    background: isActive ? T.surface1 : "transparent",
                    border: `1px solid ${isActive ? T.border : "transparent"}`,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: -1,
                        top: 7,
                        bottom: 7,
                        width: 2,
                        background: T.accent,
                        borderRadius: 2,
                      }}
                    />
                  )}
                  <Icon name={s.icon} size={15} />
                  <span>{s.label}</span>
                </div>
              );
            })}
        </div>
      ))}
    </aside>
  );
}

function PageBody({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "0 36px 80px", maxWidth: 920 }}>{children}</div>;
}

/* ───────────── Profile ───────────── */

function ProfileSec({ user }: { user: SettingsV2User }) {
  const [first, setFirst] = useState(user.firstName);
  const [last, setLast] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [signature, setSignature] = useState(user.emailSignature ?? "");
  const [tz, setTz] = useState((user.preferences.timezone as string) ?? "America/New_York");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: first,
          lastName: last,
          bio,
          emailSignature: signature,
          preferences: { ...user.preferences, timezone: tz },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Profile"
        description="Your name, contact info, and how you appear to clients and teammates."
        right={
          <Btn primary onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </Btn>
        }
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <CardSection title="Photo" description="Shown in case avatars, mentions, and the team list.">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                size={68}
                image={`/api/users/${user.id}/avatar`}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <label
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 7,
                    border: `1px solid ${T.border}`,
                    background: T.surface1,
                    color: T.text,
                    fontSize: 12.5,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Icon name="upload" size={13} /> Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.append("file", f);
                      await fetch("/api/settings/avatar", { method: "POST", body: fd });
                      window.location.reload();
                    }}
                  />
                </label>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: T.textTertiary }}>JPG or PNG, up to 2 MB.</span>
            </div>
          </CardSection>

          <CardSection title="Personal info">
            <FieldRow label="Legal name" hint="Used on signed paperwork.">
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <TextInput value={first} onChange={setFirst} placeholder="First" />
                <TextInput value={last} onChange={setLast} placeholder="Last" />
              </div>
            </FieldRow>
            <FieldRow label="Email" hint="Managed by your workspace admin.">
              <TextInput value={user.email} readOnly type="email" />
            </FieldRow>
            <FieldRow label="Bio" hint="Shown to clients on the portal.">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  background: T.input,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  padding: "8px 10px",
                  color: T.text,
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
            </FieldRow>
            <FieldRow label="Email signature" hint="Appended to client portal invites." isLast>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  background: T.input,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  padding: "8px 10px",
                  color: T.text,
                  fontSize: 12.5,
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </FieldRow>
          </CardSection>

          <CardSection title="Preferences" description="How Rift is tailored to you.">
            <FieldRow label="Timezone" hint="Affects timestamps and digest delivery." isLast>
              <SelectInput
                value={tz}
                onChange={setTz}
                options={[
                  { value: "America/Los_Angeles", label: "Los Angeles · UTC−8" },
                  { value: "America/Denver", label: "Denver · UTC−7" },
                  { value: "America/Chicago", label: "Chicago · UTC−6" },
                  { value: "America/New_York", label: "New York · UTC−5" },
                ]}
                style={{ maxWidth: 280 }}
              />
            </FieldRow>
          </CardSection>

          <CardSection title="Account" description="Read-only. Contact your account manager to change.">
            <FieldRow label="Joined">
              <span style={{ fontSize: 13, color: T.textSecondary }}>
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </FieldRow>
            <FieldRow label="Role" isLast>
              <Pill hue={ROLE_HUE[user.role]} dot>
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
              </Pill>
            </FieldRow>
          </CardSection>
        </PageBody>
      </div>
    </div>
  );
}

/* ───────────── Notifications ───────────── */

function NotificationsSec({
  user,
  firmSettings,
}: {
  user: SettingsV2User;
  firmSettings: SettingsV2FirmSettings | null;
}) {
  const [digest, setDigest] = useState(
    (user.preferences.notificationDigest as string) ?? "daily"
  );
  const [remindersEnabled, setRemindersEnabled] = useState(firmSettings?.remindersEnabled ?? true);
  const [stalledDays, setStalledDays] = useState(firmSettings?.stalledCaseDays ?? 7);
  const [stalledReminders, setStalledReminders] = useState(firmSettings?.stalledCaseReminders ?? true);
  const [overdueReminders, setOverdueReminders] = useState(firmSettings?.overdueTaskReminders ?? true);
  const [missingDocs, setMissingDocs] = useState(firmSettings?.missingDocsReminders ?? false);

  async function saveFirm(partial: Record<string, unknown>) {
    await fetch("/api/firm/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(partial),
    });
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Notifications"
        description="Choose which events ping you, and through which channels."
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <CardSection title="Delivery">
            <FieldRow label="Email digest" hint="Bundles low-priority notifications." isLast>
              <SelectInput
                value={digest}
                onChange={async (v) => {
                  setDigest(v);
                  await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      preferences: { ...user.preferences, notificationDigest: v },
                    }),
                  });
                }}
                options={[
                  { value: "off", label: "Off — send each one" },
                  { value: "hourly", label: "Hourly digest" },
                  { value: "daily", label: "Daily digest (8:00 AM)" },
                  { value: "weekly", label: "Weekly digest (Mondays)" },
                ]}
                style={{ maxWidth: 280 }}
              />
            </FieldRow>
          </CardSection>

          {user.role === "ADMIN" && firmSettings && (
            <CardSection
              title="Firm reminders"
              description="Automated email reminders sent to advisors and ops about cases that need attention."
            >
              <FieldRow
                label="Reminders enabled"
                hint="Master switch — turning off pauses all reminder emails."
              >
                <Toggle
                  value={remindersEnabled}
                  onChange={async (v) => {
                    setRemindersEnabled(v);
                    await saveFirm({ remindersEnabled: v });
                  }}
                />
              </FieldRow>
              <FieldRow label="Stalled cases" hint="Email when a case sits too long.">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Toggle
                    value={stalledReminders}
                    onChange={async (v) => {
                      setStalledReminders(v);
                      await saveFirm({ stalledCaseReminders: v });
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: T.textSecondary }}>
                    After{" "}
                    <input
                      type="number"
                      value={stalledDays}
                      onChange={async (e) => {
                        const v = parseInt(e.target.value) || 7;
                        setStalledDays(v);
                        await saveFirm({ stalledCaseDays: v });
                      }}
                      style={{
                        width: 56,
                        margin: "0 6px",
                        background: T.input,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontFamily: "inherit",
                      }}
                    />{" "}
                    days
                  </span>
                </div>
              </FieldRow>
              <FieldRow label="Overdue tasks" hint="Email when a task passes its due date.">
                <Toggle
                  value={overdueReminders}
                  onChange={async (v) => {
                    setOverdueReminders(v);
                    await saveFirm({ overdueTaskReminders: v });
                  }}
                />
              </FieldRow>
              <FieldRow
                label="Missing documents"
                hint="Email when a required checklist item is unfulfilled."
                isLast
              >
                <Toggle
                  value={missingDocs}
                  onChange={async (v) => {
                    setMissingDocs(v);
                    await saveFirm({ missingDocsReminders: v });
                  }}
                />
              </FieldRow>
            </CardSection>
          )}
        </PageBody>
      </div>
    </div>
  );
}

/* ───────────── Security ───────────── */

function SecuritySec({
  user,
  firmSettings,
}: {
  user: SettingsV2User;
  firmSettings: SettingsV2FirmSettings | null;
}) {
  const [require2FA, setRequire2FA] = useState(firmSettings?.require2FA ?? false);

  return (
    <div>
      <SectionHeader eyebrow="Settings" title="Security" description="Password, two-factor, and audit trail." />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <CardSection title="Password & 2FA">
            <FieldRow label="Password" hint="At least 10 characters, with a number and a symbol.">
              <Link href="/dashboard/settings/password" style={{ textDecoration: "none" }}>
                <Btn>
                  <Icon name="key" size={13} /> Change password
                </Btn>
              </Link>
            </FieldRow>
            <FieldRow label="Two-factor auth" hint="Required by your firm." isLast>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {user.twoFactorEnabled ? (
                  <Pill hue="green" dot>
                    Enabled · Authenticator app
                  </Pill>
                ) : (
                  <Pill hue="amber" dot>
                    Not configured
                  </Pill>
                )}
              </div>
            </FieldRow>
          </CardSection>

          {user.role === "ADMIN" && firmSettings && (
            <CardSection
              title="Firm policy"
              description="Security requirements for everyone in the workspace."
            >
              <FieldRow
                label="Require 2FA"
                hint="Members must set up an authenticator before accessing the dashboard."
                isLast
              >
                <Toggle
                  value={require2FA}
                  onChange={async (v) => {
                    setRequire2FA(v);
                    await fetch("/api/firm/settings", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ require2FA: v }),
                    });
                  }}
                />
              </FieldRow>
            </CardSection>
          )}
        </PageBody>
      </div>
    </div>
  );
}

/* ───────────── Workspace ───────────── */

const US_STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ");

function WorkspaceSec({
  firm,
  firmSettings,
}: {
  firm: SettingsV2Firm;
  firmSettings: SettingsV2FirmSettings | null;
}) {
  const [name, setName] = useState(firm.name);
  const [legalName, setLegalName] = useState(firm.legalName ?? "");
  const [website, setWebsite] = useState(firm.websiteUrl ?? "");
  const [supportEmail, setSupportEmail] = useState(firm.supportEmail ?? "");
  const [supportPhone, setSupportPhone] = useState(firm.supportPhone ?? "");
  const [address, setAddress] = useState(firm.businessAddress ?? "");
  const [states, setStates] = useState(firmSettings?.operatingStates ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleState(c: string) {
    const next = states.includes(c) ? states.filter((s) => s !== c) : [...states, c];
    setStates(next);
    fetch("/api/firm/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatingStates: next }),
    });
  }

  async function saveOrg() {
    setSaving(true);
    try {
      await fetch("/api/firm/organization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          legalName,
          websiteUrl: website,
          supportEmail,
          supportPhone,
          businessAddress: address,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Workspace"
        description="Branding, defaults, and configuration that apply to your whole team."
        right={
          <Btn primary onClick={saveOrg} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </Btn>
        }
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <CardSection title="Branding" description="Your firm name and logo appear on the dashboard and on client-facing emails.">
            <FieldRow label="Firm display name">
              <TextInput value={name} onChange={setName} />
            </FieldRow>
            <FieldRow label="Legal business name">
              <TextInput value={legalName} onChange={setLegalName} />
            </FieldRow>
            <FieldRow label="Firm logo" hint="Square SVG, PNG, JPEG, or WebP — max 2 MB.">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {firm.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firm.logoUrl}
                    alt={firm.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 9,
                      objectFit: "cover",
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 9,
                      background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentHover} 100%)`,
                      display: "grid",
                      placeItems: "center",
                      color: T.surface1,
                      fontFamily: HEADLINE_STACK,
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: -0.5,
                    }}
                  >
                    {firm.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <label
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 7,
                    border: `1px solid ${T.border}`,
                    background: T.surface1,
                    color: T.text,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Replace logo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.append("file", f);
                      await fetch("/api/firm/logo", { method: "POST", body: fd });
                      window.location.reload();
                    }}
                  />
                </label>
              </div>
            </FieldRow>
            <FieldRow label="Website" isLast>
              <TextInput value={website} onChange={setWebsite} type="url" />
            </FieldRow>
          </CardSection>

          <CardSection title="Contact" description="How clients and the platform reach your firm.">
            <FieldRow label="Support email">
              <TextInput value={supportEmail} onChange={setSupportEmail} />
            </FieldRow>
            <FieldRow label="Support phone">
              <TextInput value={supportPhone} onChange={setSupportPhone} />
            </FieldRow>
            <FieldRow
              label="Business address"
              hint="Used on signed forms and as return address for custodian mailings."
              isLast
            >
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  background: T.input,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  padding: "8px 10px",
                  color: T.text,
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
            </FieldRow>
          </CardSection>

          <CardSection
            title="Operating states"
            description="Mailing routes will use the correct custodian address for clients in these states."
          >
            <FieldRow label="Active states" hint={`${states.length} of 51 selected`} isLast>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(13, 1fr)",
                  gap: 5,
                  width: "100%",
                }}
              >
                {US_STATES.map((c) => {
                  const on = states.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleState(c)}
                      style={{
                        padding: "6px 0",
                        fontSize: 11,
                        fontFamily: "ui-monospace, monospace",
                        fontWeight: 600,
                        borderRadius: 5,
                        background: on ? T.accentSoft : T.surface1,
                        border: `1px solid ${on ? T.accentBorder : T.border}`,
                        color: on ? T.accent : T.textTertiary,
                        cursor: "pointer",
                        letterSpacing: 0.3,
                        transition: "all 100ms",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
          </CardSection>
        </PageBody>
      </div>
    </div>
  );
}

/* ───────────── Team redirect ───────────── */

function TeamRedirect() {
  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Team & roles"
        description="Team management has its own dedicated page."
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <Card padded>
            <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 14 }}>
              Manage members, roles, and invites on the Team page.
            </div>
            <Link href="/dashboard/team" style={{ textDecoration: "none" }}>
              <Btn primary>
                <Icon name="users" size={14} /> Open Team page
              </Btn>
            </Link>
          </Card>
        </PageBody>
      </div>
    </div>
  );
}

/* ───────────── Billing ───────────── */

function BillingSec({
  firm,
  seatsUsed,
  aiUsage,
}: {
  firm: SettingsV2Firm;
  seatsUsed: number;
  aiUsage: SettingsV2AiUsage;
}) {
  const renewal = firm.renewalDate ? new Date(firm.renewalDate) : null;
  const planLabel = firm.planTier.charAt(0) + firm.planTier.slice(1).toLowerCase();
  const [billingEmail, setBillingEmail] = useState(firm.billingEmail ?? "");
  const [taxId, setTaxId] = useState(firm.taxId ?? "");

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Billing"
        description="Seats and invoice details. Pricing is set per firm in your contract — contact your account manager to adjust."
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          <Card style={{ marginBottom: 18, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div style={{ padding: 22, borderRight: `1px solid ${T.border}` }}>
                <div
                  style={{
                    fontSize: 11,
                    color: T.textTertiary,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  Current plan
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 600,
                      color: T.text,
                      fontFamily: HEADLINE_STACK,
                      letterSpacing: -0.6,
                    }}
                  >
                    {planLabel}
                  </h2>
                  <Pill hue="coral" dot>
                    Active
                  </Pill>
                </div>
                {renewal && (
                  <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6 }}>
                    Renews {renewal.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
              <BillStat
                label="Seats"
                value={`${seatsUsed} / ${firm.seatsLimit}`}
                hint={`${Math.max(0, firm.seatsLimit - seatsUsed)} remaining`}
              />
              <BillStat label="AI usage" value={`${aiUsage.percentUsed}%`} hint="of monthly limit" />
              <BillStat label="Plan" value={aiUsage.planName} hint="AI tier" last />
            </div>
            <div
              style={{
                padding: "12px 22px",
                background: T.striped,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Btn>Contact account manager</Btn>
            </div>
          </Card>

          <CardSection title="Invoice details">
            <FieldRow
              label="Billing email"
              hint="Receives invoices and payment confirmations."
            >
              <TextInput value={billingEmail} onChange={setBillingEmail} />
            </FieldRow>
            <FieldRow label="Tax ID" isLast>
              <TextInput value={taxId} onChange={setTaxId} />
            </FieldRow>
          </CardSection>
        </PageBody>
      </div>
    </div>
  );
}

function BillStat({ label, value, hint, last }: { label: string; value: string; hint?: string; last?: boolean }) {
  return (
    <div style={{ padding: 22, borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <div
        style={{
          fontSize: 11,
          color: T.textTertiary,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: T.text,
          fontFamily: HEADLINE_STACK,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ───────────── Integrations ───────────── */

type CrmMapping = { riftStatus: string; crmStageId: string; crmStageName: string };
type CrmConnectionInfo = {
  id: string;
  provider: string;
  connectedUserName: string | null;
  connectedUserEmail: string | null;
  connectedAt: string | null;
  lastHealthOk: boolean;
  lastHealthError: string | null;
  lastHealthCheckAt: string | null;
};
type CrmState = { connection: CrmConnectionInfo | null; mappings: CrmMapping[] };

function IntegrationsSec() {
  const [state, setState] = useState<CrmState | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/integrations/crm");
      if (res.ok) setState(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Integrations"
        description="Connect Rift to Wealthbox and control how your cases sync."
      />
      <div style={{ padding: "24px 0 0" }}>
        <PageBody>
          {loading ? (
            <div style={{ fontSize: 13, color: T.textSecondary, padding: "8px 0" }}>Loading…</div>
          ) : state?.connection ? (
            <>
              <ConnectionCard connection={state.connection} onChanged={load} />
              <BookendCard mappings={state.mappings} onSaved={load} />
              <RiftStagesCard />
              <CustomFieldsCard />
            </>
          ) : (
            <ConnectCard onConnected={load} />
          )}
        </PageBody>
      </div>
    </div>
  );
}

/** Reusable Wealthbox token paste → POST /api/integrations/wealthbox. */
function TokenForm({ ctaLabel, onDone }: { ctaLabel: string; onDone: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/wealthbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "We couldn't verify that token. Check it in Wealthbox and try again.");
        return;
      }
      setToken("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 }}>
      <input
        type="password"
        autoComplete="off"
        placeholder="Paste your Wealthbox access token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{
          width: "100%",
          height: 32,
          background: T.input,
          border: `1px solid ${T.border}`,
          borderRadius: 7,
          padding: "0 10px",
          color: T.text,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {error && <div style={{ fontSize: 12, color: T.danger }}>{error}</div>}
      <div>
        <Btn primary onClick={submit} disabled={busy || !token.trim()}>
          {busy ? "Verifying…" : ctaLabel}
        </Btn>
      </div>
      <div style={{ fontSize: 11.5, color: T.textTertiary }}>
        In Wealthbox: your name → My Settings → API Access → Create Access Token.
      </div>
    </div>
  );
}

function ConnectCard({ onConnected }: { onConnected: () => void }) {
  return (
    <CardSection
      title="Wealthbox"
      description="Connect your Wealthbox account so opportunities flow in and won cases flow back out."
    >
      <FieldRow label="Access token" hint="Personal access token from Wealthbox. Revocable any time." isLast>
        <TokenForm ctaLabel="Connect Wealthbox" onDone={onConnected} />
      </FieldRow>
    </CardSection>
  );
}

function ConnectionCard({ connection, onChanged }: { connection: CrmConnectionInfo; onChanged: () => void }) {
  const [reconnecting, setReconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const who = connection.connectedUserName ?? connection.connectedUserEmail ?? "Wealthbox user";
  const connectedAt = connection.connectedAt
    ? new Date(connection.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/integrations/crm/poll", { method: "POST" });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { result?: { created: number; closed: number } };
        const created = body.result?.created ?? 0;
        const closed = body.result?.closed ?? 0;
        setSyncMsg(`Synced — ${created} new, ${closed} closed.`);
        onChanged();
      } else {
        setSyncMsg("Sync failed. Check the connection health below.");
        onChanged();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Wealthbox? This clears the stored token, stage mappings, and unlinks cases from their opportunities. Case data stays.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/crm", { method: "DELETE" });
      onChanged();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <CardSection title="Wealthbox" description="Your connected CRM.">
      <FieldRow label="Status">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {connection.lastHealthOk ? (
            <Pill hue="green" dot>Healthy</Pill>
          ) : (
            <Pill hue="red" dot>Sync error</Pill>
          )}
          <span style={{ fontSize: 13, color: T.text }}>{who}</span>
          {connectedAt && <span style={{ fontSize: 12, color: T.textTertiary }}>· connected {connectedAt}</span>}
        </div>
      </FieldRow>

      {!connection.lastHealthOk && connection.lastHealthError && (
        <FieldRow label="Last error">
          <span style={{ fontSize: 12.5, color: T.danger }}>{connection.lastHealthError}</span>
        </FieldRow>
      )}

      <FieldRow label="Actions" isLast={!reconnecting}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn onClick={syncNow} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</Btn>
            <Btn onClick={() => setReconnecting((v) => !v)}>{reconnecting ? "Cancel" : "Rotate token"}</Btn>
            <Btn danger onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Btn>
            {syncMsg && <span style={{ fontSize: 12, color: T.textSecondary }}>{syncMsg}</span>}
          </div>
          {reconnecting && (
            <div style={{ paddingTop: 6 }}>
              <TokenForm
                ctaLabel="Save new token"
                onDone={() => {
                  setReconnecting(false);
                  onChanged();
                }}
              />
              <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 6 }}>
                Rotating the token won&rsquo;t change your stage mappings.
              </div>
            </div>
          )}
        </div>
      </FieldRow>
    </CardSection>
  );
}

function BookendCard({ mappings, onSaved }: { mappings: CrmMapping[]; onSaved: () => void }) {
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [stagesErr, setStagesErr] = useState<string | null>(null);
  const [triggerId, setTriggerId] = useState(mappings.find((m) => m.riftStatus === "PROPOSAL_ACCEPTED")?.crmStageId ?? "");
  const [wonId, setWonId] = useState(mappings.find((m) => m.riftStatus === "WON")?.crmStageId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/integrations/crm/stages");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStagesErr(body.error ?? "Couldn't load Wealthbox stages.");
        return;
      }
      const body = (await res.json()) as { stages: Array<{ id: string; name: string }> };
      setStages(body.stages ?? []);
    })();
  }, []);

  const options = [{ value: "", label: "Select a stage…" }, ...stages.map((s) => ({ value: s.id, label: s.name }))];

  async function save() {
    setError(null);
    const trigger = stages.find((s) => s.id === triggerId);
    const won = stages.find((s) => s.id === wonId);
    if (!trigger || !won) return setError("Pick a stage for both bookends.");
    if (trigger.id === won.id) return setError("The trigger and Won stages must be different.");
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/crm/mapping", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mappings: [
            { riftStatus: "PROPOSAL_ACCEPTED", crmStageId: trigger.id, crmStageName: trigger.name },
            { riftStatus: "WON", crmStageId: won.id, crmStageName: won.name },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection
      title="Stage sync"
      description="The two stages Rift syncs with Wealthbox. Everything in between stays inside Rift."
    >
      {stagesErr ? (
        <FieldRow label="Stages" isLast>
          <span style={{ fontSize: 12.5, color: T.danger }}>{stagesErr}</span>
        </FieldRow>
      ) : (
        <>
          <FieldRow label="Trigger stage" hint="An opportunity here creates a Rift case.">
            <SelectInput value={triggerId} onChange={setTriggerId} options={options} />
          </FieldRow>
          <FieldRow label="Won stage" hint="Marking a case Won moves the opportunity here.">
            <SelectInput value={wonId} onChange={setWonId} options={options} />
          </FieldRow>
          <FieldRow label="" isLast>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn primary onClick={save} disabled={saving}>
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save mapping"}
              </Btn>
              {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
            </div>
          </FieldRow>
        </>
      )}
    </CardSection>
  );
}

function RiftStagesCard() {
  const [rows, setRows] = useState<StageConfigRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/firm/stages");
      if (res.ok) {
        const body = (await res.json()) as { stages: StageConfigRow[] };
        setRows(body.stages ?? null);
      }
    })();
  }, []);

  function update(status: string, patch: Partial<StageConfigRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.status === status ? { ...r, ...patch } : r)) : prev));
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    try {
      const res = await fetch("/api/firm/stages", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stages: rows.map((r) => ({
            status: r.status,
            customLabel: r.customLabel?.trim() ? r.customLabel.trim() : null,
            isEnabled: r.isEnabled,
          })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection
      title="Rift stages"
      description="Rename the internal stages to match your team, or turn off ones you don't use. The two bookends stay on."
    >
      {!rows ? (
        <FieldRow label="Stages" isLast>
          <span style={{ fontSize: 13, color: T.textSecondary }}>Loading…</span>
        </FieldRow>
      ) : (
        <>
          {rows.map((row) => {
            const def = STATUSES.find((s) => s.value === row.status);
            const isBookend = row.status === "PROPOSAL_ACCEPTED" || row.status === "WON";
            return (
              <FieldRow
                key={row.status}
                label={def?.label ?? row.status}
                hint={isBookend ? "Bookend — always on (Wealthbox sync)." : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <TextInput
                    value={row.customLabel ?? ""}
                    onChange={(v) => update(row.status, { customLabel: v })}
                    placeholder={def?.label ?? row.status}
                  />
                  <Toggle
                    value={row.isEnabled}
                    disabled={isBookend}
                    onChange={(v) => update(row.status, { isEnabled: v })}
                  />
                </div>
              </FieldRow>
            );
          })}
          <FieldRow label="" isLast>
            <Btn primary onClick={save} disabled={saving}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save stages"}
            </Btn>
          </FieldRow>
        </>
      )}
    </CardSection>
  );
}

function CustomFieldsCard() {
  return (
    <CardSection
      title="Required Wealthbox fields"
      description="For cases to auto-create with full detail, add these custom fields to your Wealthbox opportunities (Settings → Custom Fields → Opportunities)."
    >
      <FieldRow label="Source Provider" hint="Text field.">
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>Where the funds come from.</span>
      </FieldRow>
      <FieldRow label="Destination Custodian" hint="Text field.">
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>Where the funds are going.</span>
      </FieldRow>
      <FieldRow label="Account Type" hint="Single-select dropdown." isLast>
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>
          Values containing “traditional”, “roth”, or “403” map automatically; others flag for review.
        </span>
      </FieldRow>
    </CardSection>
  );
}
