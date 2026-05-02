"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";

/* ─── Shared types & styles ──────────────────────────────────────────────── */

interface UserPreferences extends Record<string, unknown> {
  defaultStatusFilter?: string;
  defaultViewFilter?: string;
  timezone?: string;
  showDashboardWidgets?: boolean;
  compactCaseList?: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  preferences: UserPreferences;
  bio: string | null;
  emailSignature: string | null;
  createdAt: string;
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

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

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
  aiUsage: AIUsage;
  platform: PlatformBaselineProps;
  cronSecret: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ADVISOR: "Advisor",
  OPS: "Operations",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PROPOSAL_ACCEPTED", label: "Proposal Accepted" },
  { value: "AWAITING_CLIENT_ACTION", label: "Awaiting Client Action" },
  { value: "READY_TO_SUBMIT", label: "Ready to Submit" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "WON", label: "Won" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

const INPUT_STYLE: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid #30363d",
  color: "#c9d1d9",
  borderRadius: "8px",
  fontSize: "14px",
  caretColor: "#58a6ff",
};

const LOCKED_INPUT_STYLE: React.CSSProperties = {
  background: "#0a0d12",
  border: "1px solid #252b38",
  color: "#c9d1d9",
  borderRadius: "8px",
  fontSize: "14px",
  cursor: "default",
};

const inputCls = "w-full px-3 py-2 text-sm focus:outline-none focus:ring-0 transition-colors";

const CARD_STYLE: React.CSSProperties = {
  background: "#161b22",
  border: "1px solid #21262d",
  borderRadius: "12px",
};

const DIVIDER_STYLE: React.CSSProperties = {
  borderTop: "1px solid #21262d",
};

type Tab =
  | "profile"
  | "password"
  | "preferences"
  | "organization"
  | "security"
  | "team"
  | "ai-usage"
  | "billing"
  | "compliance"
  | "notifications"
  | "integrations"
  | "audit-log";

const ADMIN_TABS: Tab[] = [
  "profile",
  "password",
  "preferences",
  "organization",
  "security",
  "team",
  "ai-usage",
  "billing",
  "compliance",
  "notifications",
  "integrations",
  "audit-log",
];

const USER_TABS: Tab[] = ["profile", "password", "preferences", "ai-usage"];

const TAB_LABELS: Record<Tab, string> = {
  profile: "Profile",
  password: "Password",
  preferences: "Preferences",
  organization: "Organization",
  security: "Security",
  team: "Team",
  "ai-usage": "AI Usage",
  billing: "Billing",
  compliance: "Compliance",
  notifications: "Notifications",
  integrations: "Integrations",
  "audit-log": "Audit Log",
};

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  profile: "Your name, avatar, and contact information.",
  password: "Update your password. We recommend changing it every 90 days.",
  preferences: "Default filters, timezone, and dashboard behavior.",
  organization: "Firm name, contact info, and branding.",
  security: "Password policy, session duration, and 2FA enforcement.",
  team: "Invite, manage, and deactivate firm members.",
  "ai-usage": "Tokens consumed this billing period and plan limits.",
  billing: "Plan, seats, and renewal details.",
  compliance: "Data retention, export, and compliance contacts.",
  notifications: "Email digests, reminders, and cron configuration.",
  integrations: "Connect Wealthbox or Salesforce and map case stages.",
  "audit-log": "Every action logged for compliance review.",
};

type NavGroup = { id: string; label: string; tabs: Tab[] };

const USER_NAV: NavGroup[] = [
  { id: "account", label: "Account", tabs: ["profile", "password", "preferences"] },
  { id: "usage",   label: "Usage",   tabs: ["ai-usage"] },
];

const ADMIN_NAV: NavGroup[] = [
  { id: "account",       label: "Account",       tabs: ["profile", "password", "preferences"] },
  { id: "workspace",     label: "Workspace",     tabs: ["organization", "team", "billing"] },
  { id: "security",      label: "Security & compliance", tabs: ["security", "compliance", "audit-log"] },
  { id: "integrations",  label: "Integrations",  tabs: ["integrations", "notifications"] },
  { id: "usage",         label: "Usage",         tabs: ["ai-usage"] },
];

function groupForTab(tab: Tab, nav: NavGroup[]): NavGroup | null {
  return nav.find((g) => g.tabs.includes(tab)) ?? null;
}

/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function SettingsForm({ user, firmSettings, firm, seatsUsed, aiUsage, platform, cronSecret }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user.role === "ADMIN";
  const nav = isAdmin ? ADMIN_NAV : USER_NAV;
  const validTabs = isAdmin ? ADMIN_TABS : USER_TABS;

  // URL-routed active tab (?tab=...). Falls back to profile and silently
  // ignores tabs the current role can't access.
  const paramTab = (searchParams.get("tab") ?? "profile") as Tab;
  const activeTab: Tab = validTabs.includes(paramTab) ? paramTab : "profile";
  const activeGroup = groupForTab(activeTab, nav);

  const setActiveTab = (t: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col md:flex-row md:gap-10 md:items-start">
      {/* Sidebar navigation */}
      <aside className="md:w-[220px] flex-shrink-0 md:sticky md:top-20">
        <div className="mb-5 md:mb-6">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
            Settings
          </h1>
          <p className="text-xs mt-1" style={{ color: "#7d8590" }}>
            {isAdmin ? "Your profile, firm, and integrations" : "Your profile and preferences"}
          </p>
        </div>

        <nav className="space-y-5">
          {nav.map((group) => (
            <div key={group.id}>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-2"
                style={{ color: "#7d8590" }}
              >
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.tabs.map((t) => {
                  const active = activeTab === t;
                  return (
                    <li key={t}>
                      <button
                        onClick={() => setActiveTab(t)}
                        className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md text-sm transition-colors"
                        style={{
                          background: active ? "#141a24" : "transparent",
                          color: active ? "#e4e6ea" : "#9ca3af",
                          border: `1px solid ${active ? "#252b38" : "transparent"}`,
                        }}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="w-0.5 h-4 rounded-full flex-shrink-0"
                            style={{ background: "#60a5fa" }}
                          />
                        )}
                        <span className={active ? "" : "pl-[10px]"}>{TAB_LABELS[t]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 max-w-3xl">
        {/* Per-page header with breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "#7d8590" }}>
            <span>Settings</span>
            <span style={{ color: "#3d4450" }}>/</span>
            {activeGroup && (
              <>
                <span>{activeGroup.label}</span>
                <span style={{ color: "#3d4450" }}>/</span>
              </>
            )}
            <span style={{ color: "#c9d1d9" }}>{TAB_LABELS[activeTab]}</span>
          </div>
          <h2
            className="text-2xl font-semibold tracking-tight font-[family-name:var(--font-inter-tight)]"
            style={{ color: "#e4e6ea", letterSpacing: "-0.015em" }}
          >
            {TAB_LABELS[activeTab]}
          </h2>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            {TAB_DESCRIPTIONS[activeTab]}
          </p>
        </div>

        {activeTab === "profile" && <ProfileSection user={user} />}
        {activeTab === "password" && <PasswordSection />}
        {activeTab === "preferences" && <PreferencesSection user={user} />}
        {activeTab === "ai-usage" && <AIUsageSection initial={aiUsage} />}

        {isAdmin && activeTab === "organization" && firm && (
          <div className="space-y-4">
            <OrganizationSection initial={firm} />
            {firmSettings && <OperatingStatesSection initial={firmSettings} />}
          </div>
        )}
        {isAdmin && activeTab === "security" && firmSettings && (
          <SecuritySection
            initial={firmSettings}
            baseline={{
              passwordMinLength: platform.passwordMinLength,
              passwordRequireNumber: platform.passwordRequireNumber,
              passwordRequireSymbol: platform.passwordRequireSymbol,
              sessionTimeoutMinutes: platform.sessionTimeoutMinutes,
            }}
          />
        )}
        {isAdmin && activeTab === "team" && <TeamSection currentUserId={user.id} />}
        {isAdmin && activeTab === "billing" && firm && <BillingSection firm={firm} seatsUsed={seatsUsed} />}
        {isAdmin && activeTab === "compliance" && firmSettings && (
          <ComplianceSection
            initial={firmSettings}
            retention={{ caseDataDays: platform.retentionCaseDataDays, auditLogDays: platform.retentionAuditLogDays }}
          />
        )}
        {isAdmin && activeTab === "notifications" && firmSettings && (
          <NotificationsSection firmSettings={firmSettings} cronSecret={cronSecret} />
        )}
        {isAdmin && activeTab === "integrations" && <IntegrationsSection />}
        {isAdmin && activeTab === "audit-log" && <AuditLogSection />}
      </div>
    </div>
  );
}

/* ─── Profile ─────────────────────────────────────────────────────────────── */

function ProfileSection({ user }: { user: User }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [emailSignature, setEmailSignature] = useState(user.emailSignature ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    bio !== (user.bio ?? "") ||
    emailSignature !== (user.emailSignature ?? "");

  function handleCancel() {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setBio(user.bio ?? "");
    setEmailSignature(user.emailSignature ?? "");
    setMessage(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        bio: bio.trim() || null,
        emailSignature: emailSignature.trim() || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Profile updated successfully." });
      setEditing(false);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  const textStyle = editing ? INPUT_STYLE : LOCKED_INPUT_STYLE;
  const textareaCls = editing
    ? "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0 transition-colors resize-none"
    : "w-full rounded-lg px-3 py-2 text-sm resize-none cursor-not-allowed";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
    setAvatarUploading(false);
    if (res.ok) {
      setAvatarError(false);
      setAvatarVersion(Date.now());
      setAvatarMessage({ type: "success", text: "Photo updated." });
    } else {
      const data = await res.json();
      setAvatarMessage({ type: "error", text: data.error ?? "Upload failed." });
    }
    e.target.value = "";
  }

  return (
    <form onSubmit={handleSave}>
      <div style={CARD_STYLE} className="overflow-hidden">
        {/* Identity header: avatar + name + role chip + member-since */}
        <div className="p-6 flex items-start gap-5" style={{ borderBottom: "1px solid #252b38" }}>
          <label className="relative flex-shrink-0 cursor-pointer group" title="Change photo">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} disabled={avatarUploading} />
            {!avatarError ? (
              <img
                key={avatarVersion}
                src={`/api/users/me/avatar?v=${avatarVersion}`}
                alt="Profile photo"
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: "1px solid #252b38" }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold"
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 55%, #0891b2 100%)",
                  color: "#fff",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
              {avatarUploading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12V5.5A1.5 1.5 0 0 1 3.5 4H5l1-1.5h4L11 4h1.5A1.5 1.5 0 0 1 14 5.5V12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12Z" stroke="white" strokeWidth="1.3" />
                  <circle cx="8" cy="8.5" r="2" stroke="white" strokeWidth="1.3" />
                </svg>
              )}
            </div>
          </label>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="text-base font-semibold" style={{ color: "#e4e6ea" }}>
                {user.firstName} {user.lastName}
              </p>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold" style={{ background: "#0d1f38", color: "#79c0ff", border: "1px solid #1e3a8a" }}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "#7d8590" }}>{user.email}</p>
            <p className="text-xs mt-2" style={{ color: "#484f58" }}>
              Member since {formatDate(user.createdAt)}
              {avatarMessage
                ? <span className="ml-2" style={{ color: avatarMessage.type === "success" ? "#6ee7b7" : "#f87171" }}>· {avatarMessage.text}</span>
                : <span className="ml-2" style={{ color: "#484f58" }}>· Click photo to change (JPEG/PNG/WebP, max 2 MB)</span>}
            </p>
          </div>

          <EditControls
            editing={editing}
            isDirty={isDirty}
            saving={saving}
            message={message}
            onEdit={() => { setEditing(true); setMessage(null); }}
            onCancel={handleCancel}
            saveLabel="Save changes"
          />
        </div>

        {/* Basic info */}
        <div className="p-6 space-y-5" style={{ borderBottom: "1px solid #252b38" }}>
          <SubSectionHeading title="Basic info" description="Your display name and contact. Email is managed by your firm admin." />
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} readOnly={!editing} required className={inputCls} style={textStyle} />
            </Field>
            <Field label="Last name">
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} readOnly={!editing} required className={inputCls} style={textStyle} />
            </Field>
          </div>
          <Field label="Email address">
            <input type="email" value={user.email} readOnly className="w-full rounded-lg px-3 py-2 text-sm cursor-not-allowed" style={{ background: "#0a0d12", border: "1px solid #252b38", color: "#484f58" }} />
          </Field>
        </div>

        {/* Bio */}
        <div className="p-6 space-y-3" style={{ borderBottom: "1px solid #252b38" }}>
          <SubSectionHeading
            title="About you"
            description="A short bio. Shown to clients on the portal when you're their assigned advisor."
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            readOnly={!editing}
            placeholder="e.g. CFP® with 10 years helping retirees navigate rollovers. Based in Chicago."
            rows={3}
            className={textareaCls}
            style={textStyle}
          />
          <p className="text-[11px] text-right" style={{ color: "#484f58" }}>
            {bio.length}/500
          </p>
        </div>

        {/* Email signature */}
        <div className="p-6 space-y-3">
          <SubSectionHeading
            title="Email signature"
            description="Appended automatically when you send client portal invites and reminders from Rift."
          />
          <textarea
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value.slice(0, 2000))}
            readOnly={!editing}
            placeholder={`Sarah Mitchell\nSummit Wealth Partners\n(555) 123-4567`}
            rows={5}
            className={`${textareaCls} font-mono`}
            style={textStyle}
          />
          <p className="text-[11px] text-right" style={{ color: "#484f58" }}>
            {emailSignature.length}/2000
          </p>
        </div>

      </div>
    </form>
  );
}

function SubSectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>{title}</h3>
      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#7d8590" }}>{description}</p>
    </div>
  );
}

/* ─── Password ────────────────────────────────────────────────────────────── */

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const passwordsMatch = next === confirm;
  const canSubmit = current && next.length >= 8 && passwordsMatch;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Password changed successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to change password." });
    }
  }

  return (
    <div style={CARD_STYLE} className="p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Current password">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" placeholder="••••••••" className={inputCls} style={INPUT_STYLE} />
        </Field>
        <Field label="New password">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" className={inputCls} style={{ ...INPUT_STYLE, border: next && next.length < 8 ? "1px solid #5c2626" : INPUT_STYLE.border }} />
          {next && next.length < 8 && <p className="text-xs mt-1" style={{ color: "#f87171" }}>Must be at least 8 characters.</p>}
        </Field>
        <Field label="Confirm new password">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••" className={inputCls} style={{ ...INPUT_STYLE, border: confirm && !passwordsMatch ? "1px solid #5c2626" : INPUT_STYLE.border }} />
          {confirm && !passwordsMatch && <p className="text-xs mt-1" style={{ color: "#f87171" }}>Passwords do not match.</p>}
        </Field>
        <div className="flex items-center justify-end pt-2">
          <SaveBar saving={saving} disabled={!canSubmit} message={message} label="Change password" savingLabel="Changing…" />
        </div>
      </form>
    </div>
  );
}

/* ─── Preferences ─────────────────────────────────────────────────────────── */

function PreferencesSection({ user }: { user: User }) {
  const prefs = user.preferences;
  const [defaultStatus, setDefaultStatus] = useState(prefs.defaultStatusFilter ?? "");
  const [defaultView, setDefaultView] = useState(prefs.defaultViewFilter ?? "all");
  const [timezone, setTimezone] = useState(prefs.timezone ?? "America/New_York");
  const [showWidgets, setShowWidgets] = useState(prefs.showDashboardWidgets ?? true);
  const [compactList, setCompactList] = useState(prefs.compactCaseList ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: {
          defaultStatusFilter: defaultStatus,
          defaultViewFilter: defaultView,
          timezone,
          showDashboardWidgets: showWidgets,
          compactCaseList: compactList,
        },
      }),
    });
    setSaving(false);
    setMessage(res.ok ? { type: "success", text: "Preferences saved." } : { type: "error", text: "Failed to save." });
  }

  return (
    <div style={CARD_STYLE} className="p-6">
      <form onSubmit={handleSave} className="space-y-6">
        <fieldset>
          <Legend>Case list defaults</Legend>
          <div className="space-y-3">
            <Field label="Default status filter">
              <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} className={inputCls} style={INPUT_STYLE}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Default case view">
              <select value={defaultView} onChange={(e) => setDefaultView(e.target.value)} className={inputCls} style={INPUT_STYLE}>
                <option value="all">All cases</option>
                <option value="mine">My cases only</option>
              </select>
            </Field>
          </div>
        </fieldset>
        <div style={DIVIDER_STYLE} />
        <fieldset>
          <Legend>Display</Legend>
          <div className="space-y-3">
            <Field label="Timezone">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} style={INPUT_STYLE}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
              </select>
              <p className="text-xs mt-1" style={{ color: "#484f58" }}>Used for displaying dates and times.</p>
            </Field>
            <Toggle label="Show dashboard widgets" description="Display the task and stale-case summary widgets on the dashboard." checked={showWidgets} onChange={setShowWidgets} />
            <Toggle label="Compact case list" description="Reduce row padding in the case list for a denser view." checked={compactList} onChange={setCompactList} />
          </div>
        </fieldset>
        <div className="flex items-center justify-end pt-2">
          <SaveBar saving={saving} message={message} label="Save preferences" />
        </div>
      </form>
    </div>
  );
}

/* ─── AI Usage ────────────────────────────────────────────────────────────── */

function AIUsageSection({ initial }: { initial: AIUsage }) {
  const [usage, setUsage] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/firm/ai-usage");
    if (res.ok) setUsage(await res.json());
    setLoading(false);
  }

  const pct = usage.percentUsed;
  const barColor = pct >= 90 ? "#f87171" : pct >= 75 ? "#fb923c" : "#388bfd";
  const reset = new Date(usage.periodResetsAt);
  const resetLabel = reset.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={CARD_STYLE} className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>AI assistant usage</h3>
          <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
            {usage.planName} plan · Resets on {resetLabel}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-[#21262d] disabled:opacity-50"
          style={{ border: "1px solid #30363d", color: "#c9d1d9", background: "transparent" }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "#7d8590" }}>Current period</span>
          <span className="text-3xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
            {pct}<span className="text-lg font-medium" style={{ color: "#7d8590" }}>%</span>
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
          <div className="h-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
        </div>
        <p className="text-xs mt-2" style={{ color: "#7d8590" }}>
          {pct >= 100
            ? "You've reached your plan limit. The AI assistant is paused until the period resets."
            : pct >= 90
              ? "You're nearing your plan limit."
              : "You have plenty of headroom remaining."}
        </p>
      </div>

      <div style={DIVIDER_STYLE} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>Need more capacity?</p>
          <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Upgrade your plan to expand your monthly AI allowance.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors opacity-60 cursor-not-allowed"
          style={{ background: "#2563eb" }}
          title="Coming soon"
        >
          Upgrade plan
        </button>
      </div>
    </div>
  );
}

/* ─── Organization (Admin) ───────────────────────────────────────────────── */

function OrganizationSection({ initial }: { initial: Firm }) {
  const initialForm = {
    name: initial.name,
    legalName: initial.legalName ?? "",
    taxId: initial.taxId ?? "",
    businessAddress: initial.businessAddress ?? "",
    supportEmail: initial.supportEmail ?? "",
    supportPhone: initial.supportPhone ?? "",
    websiteUrl: initial.websiteUrl ?? "",
  };
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== initialForm[k]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleCancel() {
    setForm(initialForm);
    setMessage(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Organization profile saved." });
      setEditing(false);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  const textStyle = editing ? INPUT_STYLE : LOCKED_INPUT_STYLE;

  return (
    <div style={CARD_STYLE} className="overflow-hidden">
      <form onSubmit={handleSave}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid #252b38" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Organization profile</h3>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Firm identity and contact information.</p>
          </div>
          <EditControls
            editing={editing}
            isDirty={isDirty}
            saving={saving}
            message={message}
            onEdit={() => { setEditing(true); setMessage(null); }}
            onCancel={handleCancel}
            saveLabel="Save organization"
          />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Firm display name">
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} readOnly={!editing} required className={inputCls} style={textStyle} />
            </Field>
            <Field label="Legal business name">
              <input type="text" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} readOnly={!editing} className={inputCls} style={textStyle} />
            </Field>
            <Field label="Tax ID (EIN)">
              <input type="text" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} readOnly={!editing} placeholder="12-3456789" className={inputCls} style={textStyle} />
            </Field>
            <Field label="Website">
              <input type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} readOnly={!editing} placeholder="https://example.com" className={inputCls} style={textStyle} />
            </Field>
            <Field label="Support email">
              <input type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} readOnly={!editing} className={inputCls} style={textStyle} />
            </Field>
            <Field label="Support phone">
              <input type="tel" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} readOnly={!editing} className={inputCls} style={textStyle} />
            </Field>
          </div>
          <Field label="Business address">
            <textarea value={form.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} readOnly={!editing} rows={3} className={inputCls} style={textStyle} />
          </Field>
        </div>
      </form>
    </div>
  );
}

/* ─── Operating States (Admin) ───────────────────────────────────────────── */

function OperatingStatesSection({ initial }: { initial: FirmSettings }) {
  const [states, setStates] = useState<string[]>(initial.operatingStates ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggle(code: string) {
    setStates((prev) => (prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code].sort()));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatingStates: states }),
    });
    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Operating states saved." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  return (
    <div style={CARD_STYLE} className="p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Legend>Operating states</Legend>
          <p className="text-xs mt-1 mb-3" style={{ color: "#7d8590" }}>
            Select the U.S. states your firm operates in. Mailing routes will automatically use the correct custodian address for your region.
          </p>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {US_STATES.map((code) => {
            const on = states.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                className="px-2 py-1.5 text-xs font-mono rounded transition-colors"
                style={{
                  background: on ? "#1f6feb" : "#0d1117",
                  border: `1px solid ${on ? "#1f6feb" : "#30363d"}`,
                  color: on ? "#ffffff" : "#c9d1d9",
                }}
              >
                {code}
              </button>
            );
          })}
        </div>
        <div className="text-xs" style={{ color: "#7d8590" }}>
          {states.length === 0 ? "No states selected." : `${states.length} state${states.length === 1 ? "" : "s"} selected.`}
        </div>
        <div className="flex items-center justify-end pt-2">
          <SaveBar saving={saving} message={message} label="Save states" />
        </div>
      </form>
    </div>
  );
}

/* ─── Security (Admin) ───────────────────────────────────────────────────── */

interface PlatformBaseline {
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  sessionTimeoutMinutes: number;
}

function SecuritySection({ initial, baseline }: { initial: FirmSettings; baseline: PlatformBaseline }) {
  const [require2FA, setRequire2FA] = useState(initial.require2FA);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ require2FA }),
    });
    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Security settings saved." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  return (
    <div className="space-y-4">
      <div style={CARD_STYLE} className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Legend>Authentication</Legend>
          <Toggle
            label="Require two-factor authentication"
            description="All users at your firm must set up 2FA before accessing the dashboard."
            checked={require2FA}
            onChange={setRequire2FA}
          />
          <div className="flex items-center justify-end pt-2">
            <SaveBar saving={saving} message={message} label="Save security" />
          </div>
        </form>
      </div>

      <div style={CARD_STYLE} className="p-6">
        <Legend>Rift platform security baseline</Legend>
        <p className="text-xs mb-4" style={{ color: "#7d8590" }}>
          Enforced across all firms to meet fintech compliance standards. Contact Rift support to discuss exceptions.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Password minimum" value={`${baseline.passwordMinLength} chars`} />
          <Stat label="Session timeout" value={`${baseline.sessionTimeoutMinutes} min`} />
          <Stat label="Requires number" value={baseline.passwordRequireNumber ? "Yes" : "No"} />
          <Stat label="Requires symbol" value={baseline.passwordRequireSymbol ? "Yes" : "No"} />
        </div>
      </div>
    </div>
  );
}

/* ─── Team (Admin) ───────────────────────────────────────────────────────── */

interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "ADVISOR" | "OPS";
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
}

function TeamSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<TeamUser[] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/firm/team");
    if (res.ok) setUsers(await res.json());
  }
  useEffect(() => { refresh(); }, []);

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setErr(null);
    const res = await fetch(`/api/firm/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error ?? "Failed to update user.");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div style={CARD_STYLE} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Team members</h3>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Invite, deactivate, and manage roles.</p>
          </div>
          <button onClick={() => setInviteOpen((o) => !o)} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors" style={{ background: "#2563eb" }}>
            {inviteOpen ? "Cancel" : "Invite user"}
          </button>
        </div>

        {inviteOpen && (
          <div className="mb-4">
            <InviteForm
              onDone={async (result) => {
                setInviteOpen(false);
                setTempCredential(result);
                await refresh();
              }}
              onError={(e) => setErr(e)}
            />
          </div>
        )}

        {tempCredential && (
          <div className="mb-4 rounded-lg p-4" style={{ background: "#0d1f38", border: "1px solid #1d3a5e" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#79c0ff" }}>User invited — temporary password</p>
            <p className="text-xs mb-2" style={{ color: "#79c0ff" }}>
              Share with {tempCredential.email}. They should change it on first sign-in. This is shown only once.
            </p>
            <code className="block font-mono text-sm rounded px-3 py-2" style={{ background: "#0a1628", color: "#a5d6ff" }}>
              {tempCredential.password}
            </code>
            <button onClick={() => setTempCredential(null)} className="mt-3 text-xs font-medium" style={{ color: "#79c0ff" }}>Dismiss</button>
          </div>
        )}

        {err && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{err}</p>}

        {!users ? (
          <p className="text-xs" style={{ color: "#7d8590" }}>Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-xs" style={{ color: "#7d8590" }}>No team members yet.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isActive = !u.deactivatedAt;
              return (
                <div key={u.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium truncate" style={{ color: "#e4e6ea" }}>
                        {u.firstName} {u.lastName} {isSelf && <span className="text-xs" style={{ color: "#7d8590" }}>(you)</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#7d8590" }}>{u.email}</p>
                    </div>
                    {!isActive && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "#3a1d1d", color: "#f87171" }}>Deactivated</span>
                    )}
                    {u.twoFactorEnabled && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "#0d2818", color: "#3fb950" }}>2FA</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      disabled={isSelf}
                      className="text-xs rounded-md px-2 py-1"
                      style={INPUT_STYLE}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="ADVISOR">Advisor</option>
                      <option value="OPS">Operations</option>
                    </select>
                    <button
                      onClick={() => updateUser(u.id, { deactivated: isActive })}
                      disabled={isSelf}
                      className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        border: "1px solid #30363d",
                        color: isActive ? "#f87171" : "#3fb950",
                        background: "transparent",
                      }}
                    >
                      {isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteForm({ onDone, onError }: { onDone: (r: { email: string; password: string }) => void; onError: (err: string) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ADVISOR" | "OPS">("OPS");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/firm/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      onError(data.error ?? "Failed to invite user.");
      return;
    }
    const data = await res.json();
    onDone({ email: data.user.email, password: data.tempPassword });
  }

  return (
    <form onSubmit={submit} className="rounded-lg p-4 space-y-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} style={INPUT_STYLE} />
        <input type="text" placeholder="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} style={INPUT_STYLE} />
      </div>
      <input type="email" placeholder="Work email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={INPUT_STYLE} />
      <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "ADVISOR" | "OPS")} className={inputCls} style={INPUT_STYLE}>
        <option value="ADMIN">Admin</option>
        <option value="ADVISOR">Advisor</option>
        <option value="OPS">Operations</option>
      </select>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: "#2563eb" }}>
          {saving ? "Inviting…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}

/* ─── Billing (Admin) ────────────────────────────────────────────────────── */

function BillingSection({ firm, seatsUsed }: { firm: Firm; seatsUsed: number }) {
  const [billingEmail, setBillingEmail] = useState(firm.billingEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingEmail }),
    });
    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Billing details saved." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  const renewalLabel = firm.renewalDate
    ? new Date(firm.renewalDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="space-y-4">
      <div style={CARD_STYLE} className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Plan" value={firm.planTier} />
          <Stat label="Seats" value={`${seatsUsed} / ${firm.seatsLimit}`} />
          <Stat label="Renews" value={renewalLabel} />
        </div>
      </div>

      <div style={CARD_STYLE} className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Billing email">
            <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@yourfirm.com" className={inputCls} style={INPUT_STYLE} />
            <p className="text-xs mt-1" style={{ color: "#484f58" }}>Invoices and receipts are sent to this address.</p>
          </Field>
          <div className="flex items-center justify-end pt-2">
            <SaveBar saving={saving} message={message} label="Save billing" />
          </div>
        </form>
      </div>

      <div className="rounded-lg px-4 py-3" style={{ background: "#0d1f38", border: "1px solid #1d3a5e" }}>
        <p className="text-xs" style={{ color: "#79c0ff" }}>
          To change your plan tier or seat count, contact your account manager.
        </p>
      </div>
    </div>
  );
}

/* ─── Compliance (Admin) ─────────────────────────────────────────────────── */

interface RetentionBaseline {
  caseDataDays: number;
  auditLogDays: number;
}

function ComplianceSection({ initial, retention }: { initial: FirmSettings; retention: RetentionBaseline }) {
  const [form, setForm] = useState({
    complianceContactEmail: initial.complianceContactEmail ?? "",
    allowDataExport: initial.allowDataExport,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Compliance settings saved." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  async function exportAuditLog() {
    setExporting(true);
    const res = await fetch("/api/firm/audit-log?limit=200");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setExporting(false);
  }

  const years = (days: number) => (days / 365).toFixed(1).replace(/\.0$/, "");

  return (
    <div className="space-y-4">
      <div style={CARD_STYLE} className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Legend>Contacts & controls</Legend>
          <Field label="Compliance contact email">
            <input type="email" value={form.complianceContactEmail} onChange={(e) => setForm((f) => ({ ...f, complianceContactEmail: e.target.value }))} placeholder="compliance@yourfirm.com" className={inputCls} style={INPUT_STYLE} />
            <p className="text-xs mt-1" style={{ color: "#484f58" }}>Receives breach notifications and regulatory inquiries.</p>
          </Field>
          <Toggle label="Allow data export" description="Admins can export case data and audit logs in JSON or CSV." checked={form.allowDataExport} onChange={(v) => setForm((f) => ({ ...f, allowDataExport: v }))} />
          <div className="flex items-center justify-end pt-2">
            <SaveBar saving={saving} message={message} label="Save compliance" />
          </div>
        </form>
      </div>

      <div style={CARD_STYLE} className="p-6">
        <Legend>Rift retention policy</Legend>
        <p className="text-xs mb-4" style={{ color: "#7d8590" }}>
          Set by Rift to meet FINRA and SEC recordkeeping requirements. Firms cannot modify retention windows.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Case data" value={`${retention.caseDataDays} days (${years(retention.caseDataDays)} yr)`} />
          <Stat label="Audit log" value={`${retention.auditLogDays} days (${years(retention.auditLogDays)} yr)`} />
        </div>
      </div>

      {form.allowDataExport && (
        <div style={CARD_STYLE} className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>Export recent audit log</p>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Download the last 200 events as JSON.</p>
          </div>
          <button onClick={exportAuditLog} disabled={exporting} className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[#21262d] disabled:opacity-50" style={{ border: "1px solid #30363d", color: "#c9d1d9", background: "transparent" }}>
            {exporting ? "Preparing…" : "Export"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Audit Log (Admin) ──────────────────────────────────────────────────── */

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(next?: string) {
    const url = new URL("/api/firm/audit-log", window.location.origin);
    url.searchParams.set("limit", "50");
    if (next) url.searchParams.set("cursor", next);
    const res = await fetch(url.toString());
    if (!res.ok) return;
    const data = await res.json();
    setEntries((prev) => (next && prev ? [...prev, ...data.items] : data.items));
    setCursor(data.nextCursor);
  }
  useEffect(() => { load(); }, []);

  return (
    <div style={CARD_STYLE} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Audit log</h3>
          <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Immutable record of admin and security events.</p>
        </div>
      </div>
      {!entries ? (
        <p className="text-xs" style={{ color: "#7d8590" }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs" style={{ color: "#7d8590" }}>No audit entries yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="rounded-lg px-4 py-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs" style={{ color: "#a5d6ff" }}>{e.action}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: "#7d8590" }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#7d8590" }}>
                  {e.actor ? `${e.actor.firstName} ${e.actor.lastName} · ${e.actor.email}` : "System"}
                  {e.ipAddress && ` · ${e.ipAddress}`}
                </p>
              </div>
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center mt-4">
              <button
                onClick={async () => { setLoadingMore(true); await load(cursor); setLoadingMore(false); }}
                disabled={loadingMore}
                className="text-xs font-medium px-3 py-1.5 rounded-md"
                style={{ border: "1px solid #30363d", color: "#c9d1d9", background: "transparent" }}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Notifications (Admin) ──────────────────────────────────────────────── */

interface DryRunFirmResult {
  firmId: string;
  overdueTaskEmails: number;
  stalledCaseEmails: number;
  missingDocEmails: number;
  skipped: string[];
}

interface DryRunResult {
  totalEmails: number;
  firms: DryRunFirmResult[];
}

function NotificationsSection({ firmSettings: initial, cronSecret }: { firmSettings: FirmSettings; cronSecret: string }) {
  const [enabled, setEnabled] = useState(initial.remindersEnabled);
  const [stalledDays, setStalledDays] = useState(initial.stalledCaseDays);
  const [overdueTask, setOverdueTask] = useState(initial.overdueTaskReminders);
  const [stalledCase, setStalledCase] = useState(initial.stalledCaseReminders);
  const [missingDocs, setMissingDocs] = useState(initial.missingDocsReminders);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<DryRunResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remindersEnabled: enabled,
        stalledCaseDays: stalledDays,
        overdueTaskReminders: overdueTask,
        stalledCaseReminders: stalledCase,
        missingDocsReminders: missingDocs,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? { type: "success", text: "Notification settings saved." } : { type: "error", text: "Failed to save." });
  }

  async function handleDryRun() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch(`/api/cron/reminders?dry_run=true&secret=${encodeURIComponent(cronSecret)}`, { method: "POST" });
    const data = await res.json() as DryRunResult;
    setTestResult(data);
    setTesting(false);
  }

  return (
    <div className="space-y-4">
      <div style={CARD_STYLE} className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Email reminders</h3>
              <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Sent daily at 8am UTC to relevant team members.</p>
            </div>
            <Toggle label="" description="" checked={enabled} onChange={setEnabled} />
          </div>
          <div className={`space-y-4 ${!enabled ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="pt-4 space-y-3" style={DIVIDER_STYLE}>
              <Toggle label="Overdue task reminders" description="Email each team member a digest of their tasks that are past due." checked={overdueTask} onChange={setOverdueTask} />
              <Toggle label="Stalled case reminders" description="Notify ops and admins about cases with no activity." checked={stalledCase} onChange={setStalledCase} />
              {stalledCase && (
                <div className="pl-12">
                  <Field label="Stalled threshold">
                    <select value={stalledDays} onChange={(e) => setStalledDays(Number(e.target.value))} className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0" style={INPUT_STYLE}>
                      <option value={3}>3 days</option>
                      <option value={5}>5 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                    </select>
                  </Field>
                </div>
              )}
              <Toggle label="Missing documents reminders" description="Notify assigned ops when cases have outstanding required checklist items." checked={missingDocs} onChange={setMissingDocs} />
            </div>
          </div>
          <div className="flex items-center justify-end pt-4" style={DIVIDER_STYLE}>
            <SaveBar saving={saving} message={message} label="Save settings" />
          </div>
        </form>
      </div>

      <div style={CARD_STYLE} className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Test reminders</h3>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Run a dry-run to see what emails would be sent without actually sending them.</p>
          </div>
          <button onClick={handleDryRun} disabled={testing} className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0 hover:bg-[#21262d]" style={{ border: "1px solid #30363d", color: "#c9d1d9", background: "transparent" }}>
            {testing ? "Running…" : "Run dry-run"}
          </button>
        </div>
        {testResult && (
          <div className="mt-2 rounded-lg p-4" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "#c9d1d9" }}>
              Dry-run results — {testResult.totalEmails} email{testResult.totalEmails !== 1 ? "s" : ""} would be sent
            </p>
            {testResult.firms?.map((firm: DryRunFirmResult) => (
              <div key={firm.firmId} className="space-y-2">
                {firm.overdueTaskEmails === 0 && firm.stalledCaseEmails === 0 && firm.missingDocEmails === 0 ? (
                  <p className="text-xs" style={{ color: "#7d8590" }}>
                    {firm.skipped.length > 0 ? `Nothing to send. (${firm.skipped.join(", ")})` : "No overdue tasks, stalled cases, or missing documents found."}
                  </p>
                ) : (
                  <>
                    {firm.overdueTaskEmails > 0 && <Bullet color="#f87171">{firm.overdueTaskEmails} overdue task digest{firm.overdueTaskEmails !== 1 ? "s" : ""} would be sent</Bullet>}
                    {firm.stalledCaseEmails > 0 && <Bullet color="#fb923c">{firm.stalledCaseEmails} stalled case digest{firm.stalledCaseEmails !== 1 ? "s" : ""} would be sent</Bullet>}
                    {firm.missingDocEmails > 0 && <Bullet color="#a78bfa">{firm.missingDocEmails} missing documents digest{firm.missingDocEmails !== 1 ? "s" : ""} would be sent</Bullet>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared primitives ──────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#7d8590" }}>{label}</label>
      {children}
    </div>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8b949e" }}>
      {children}
    </legend>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#8b949e" }}>{label}</p>
      <p className="text-lg font-semibold mt-1" style={{ color: "#e4e6ea" }}>{value}</p>
    </div>
  );
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs" style={{ color: "#c9d1d9" }}>{children}</span>
    </div>
  );
}

function SaveBar({
  saving,
  disabled,
  message,
  label,
  savingLabel,
}: {
  saving: boolean;
  disabled?: boolean;
  message: { type: "success" | "error"; text: string } | null;
  label: string;
  savingLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs" style={{ color: message.type === "success" ? "#3fb950" : "#f87171" }}>{message.text}</span>}
      <button
        type="submit"
        disabled={saving || disabled}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#2563eb" }}
      >
        {saving ? (savingLabel ?? "Saving…") : label}
      </button>
    </div>
  );
}

function EditControls({
  editing,
  isDirty,
  saving,
  message,
  onEdit,
  onCancel,
  saveLabel,
  savingLabel,
}: {
  editing: boolean;
  isDirty: boolean;
  saving: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onEdit: () => void;
  onCancel: () => void;
  saveLabel: string;
  savingLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {message && (
        <span className="text-xs" style={{ color: message.type === "success" ? "#3fb950" : "#f87171" }}>
          {message.text}
        </span>
      )}
      {editing && isDirty && !message && (
        <span className="text-xs" style={{ color: "#7d8590" }}>Unsaved changes</span>
      )}
      {!editing ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d" }}
        >
          Edit
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "transparent", color: "#c9d1d9", border: "1px solid #30363d" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#2563eb" }}
          >
            {saving ? (savingLabel ?? "Saving…") : saveLabel}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Integrations ────────────────────────────────────────────────────────── */

// Only the bookend stages are mappable to CRM. Intermediate Rift-only stages
// are not synced — Proposal Accepted is the inbound entry point and Won is the
// outbound close trigger.
const RIFT_STATUSES = [
  { value: "PROPOSAL_ACCEPTED", label: "Proposal Accepted" },
  { value: "WON",               label: "Won" },
] as const;

type CrmProvider = "WEALTHBOX" | "SALESFORCE";
interface CrmConnection {
  id: string;
  provider: CrmProvider;
  instanceUrl: string | null;
  connectedUserId: string | null;
  connectedUserName: string | null;
  connectedUserEmail: string | null;
  connectedAt: string;
  lastHealthCheckAt: string | null;
  lastHealthOk: boolean;
  lastHealthError: string | null;
}
interface CrmMapping { riftStatus: string; crmStageId: string; crmStageName: string }
interface CrmStage { id: string; name: string }

const PROVIDER_LABEL: Record<CrmProvider, string> = {
  WEALTHBOX: "Wealthbox",
  SALESFORCE: "Salesforce",
};

function IntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<CrmConnection | null>(null);
  const [mappings, setMappings] = useState<CrmMapping[]>([]);
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingMap, setSavingMap] = useState(false);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; scanned: number; skipped: number; errors: Array<{ opportunityId: string; message: string }> } | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);

  async function loadState() {
    setLoading(true);
    const res = await fetch("/api/integrations/crm");
    if (res.ok) {
      const body = await res.json();
      setConnection(body.connection);
      setMappings(body.mappings ?? []);
      const next: Record<string, string> = {};
      for (const m of body.mappings ?? []) next[m.riftStatus] = m.crmStageId;
      setDraft(next);
    }
    setLoading(false);
  }

  const [stagesLoaded, setStagesLoaded] = useState(false);

  async function loadStages() {
    setStagesError(null);
    setStagesLoaded(false);
    const res = await fetch("/api/integrations/crm/stages");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStagesError(body.error ?? `Couldn't load stages (HTTP ${res.status}).`);
      setStagesLoaded(true);
      return;
    }
    const body = await res.json();
    setStages(body.stages ?? []);
    setStagesLoaded(true);
  }

  useEffect(() => { loadState(); }, []);
  useEffect(() => { if (connection) loadStages(); }, [connection?.id]);

  async function handleConnectWealthbox(e: React.FormEvent) {
    e.preventDefault();
    setConnectErr(null);
    setConnecting(true);
    const res = await fetch("/api/integrations/wealthbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
    setConnecting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setConnectErr(body.error ?? "Failed to connect");
      return;
    }
    setTokenInput("");
    await loadState();
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect CRM? All case links and stage mappings will be cleared.")) return;
    const res = await fetch("/api/integrations/crm", { method: "DELETE" });
    if (res.ok) {
      setConnection(null);
      setMappings([]);
      setStages([]);
      setDraft({});
    }
  }

  async function saveMappings() {
    setSavingMap(true);
    setMapMsg(null);
    const payload = RIFT_STATUSES
      .filter((s) => draft[s.value])
      .map((s) => {
        const stage = stages.find((st) => st.id === draft[s.value]);
        return {
          riftStatus: s.value,
          crmStageId: draft[s.value],
          crmStageName: stage?.name ?? draft[s.value],
        };
      });
    const res = await fetch("/api/integrations/crm/mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings: payload }),
    });
    setSavingMap(false);
    if (res.ok) {
      const body = await res.json();
      setMappings(body.mappings ?? []);
      setMapMsg("Mappings saved.");
    } else {
      setMapMsg("Failed to save mappings.");
    }
  }

  async function syncFromCrm() {
    setSyncing(true);
    setSyncErr(null);
    setSyncResult(null);
    const res = await fetch("/api/integrations/wealthbox/poll", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSyncErr(body.error ?? `Sync failed (HTTP ${res.status})`);
      return;
    }
    const body = await res.json();
    setSyncResult(body.result ?? null);
  }

  if (loading) {
    return <p className="text-sm" style={{ color: "#7d8590" }}>Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {!connection ? (
        <>
          <div style={CARD_STYLE} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>Wealthbox</h2>
                <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                  Connect with a personal access token — no OAuth app setup required.
                </p>
              </div>
            </div>
            <form onSubmit={handleConnectWealthbox} className="mt-4 space-y-3">
              <p className="text-xs" style={{ color: "#7d8590" }}>
                In Wealthbox, open <span style={{ color: "#c9d1d9" }}>Settings → API Access → Create Access Token</span>, then paste the token here.
              </p>
              <input
                type="password"
                placeholder="Wealthbox access token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
              />
              {connectErr && <p className="text-xs" style={{ color: "#f87171" }}>{connectErr}</p>}
              <button
                type="submit"
                disabled={connecting || !tokenInput.trim()}
                className="text-sm px-4 py-2 rounded-md disabled:opacity-50"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                {connecting ? "Verifying…" : "Connect Wealthbox"}
              </button>
            </form>
          </div>

          <div style={CARD_STYLE} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>Salesforce</h2>
                <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                  Connect via OAuth. You&rsquo;ll be redirected to Salesforce to approve access.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="/api/integrations/salesforce/authorize"
                className="inline-block text-sm px-4 py-2 rounded-md"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                Connect Salesforce
              </a>
              <p className="text-xs mt-3" style={{ color: "#7d8590" }}>
                Requires Rift to be registered as a Connected App in your Salesforce org. Your admin should configure <code style={{ color: "#c9d1d9" }}>SALESFORCE_CLIENT_ID</code> / <code style={{ color: "#c9d1d9" }}>SALESFORCE_CLIENT_SECRET</code> in the Rift environment.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div style={CARD_STYLE} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>{PROVIDER_LABEL[connection.provider]}</h2>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                Auto-update {PROVIDER_LABEL[connection.provider]} opportunity stages as Rift case statuses change.
              </p>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{
                background: connection.lastHealthOk ? "#0d2318" : "#2d1515",
                color: connection.lastHealthOk ? "#6ee7b7" : "#f87171",
              }}
            >
              {connection.lastHealthOk ? "Connected" : "Error"}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm" style={{ color: "#c9d1d9" }}>
              Connected as <span style={{ fontWeight: 500 }}>{connection.connectedUserName ?? connection.connectedUserEmail ?? `${PROVIDER_LABEL[connection.provider]} user`}</span>
              {connection.connectedUserEmail && <span style={{ color: "#7d8590" }}> · {connection.connectedUserEmail}</span>}
            </p>
            {connection.instanceUrl && (
              <p className="text-xs" style={{ color: "#7d8590" }}>Org: {connection.instanceUrl}</p>
            )}
            <p className="text-xs" style={{ color: "#7d8590" }}>
              Connected {formatDate(connection.connectedAt)}
              {connection.lastHealthCheckAt && ` · Last checked ${formatDate(connection.lastHealthCheckAt)}`}
            </p>
            {!connection.lastHealthOk && connection.lastHealthError && (
              <p className="text-xs" style={{ color: "#f87171" }}>{connection.lastHealthError}</p>
            )}
            <button
              onClick={handleDisconnect}
              className="text-xs px-3 py-1.5 rounded-md mt-1"
              style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {connection && (
        <div style={CARD_STYLE} className="p-5">
          <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Stage mapping</h3>
          <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
            Pick the {PROVIDER_LABEL[connection.provider]} opportunity stage that should be set when a Rift case enters each status.
          </p>
          {stagesError && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{stagesError}</p>}
          {!stagesLoaded && !stagesError ? (
            <p className="text-xs mt-3" style={{ color: "#7d8590" }}>Loading stages…</p>
          ) : stagesLoaded && stages.length === 0 && !stagesError ? (
            <p className="text-xs mt-3" style={{ color: "#f59e0b" }}>
              No stages found in {PROVIDER_LABEL[connection.provider]}. {connection.provider === "WEALTHBOX"
                ? "Open Wealthbox → Settings → Categories → Opportunity Stages and add at least one stage."
                : "Add opportunity stages in your CRM first."}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {RIFT_STATUSES.map((s) => (
                <div key={s.value} className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-sm" style={{ color: "#c9d1d9" }}>{s.label}</label>
                  <select
                    value={draft[s.value] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [s.value]: e.target.value })}
                    className="rounded-lg px-3 py-1.5 text-sm"
                    style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
                  >
                    <option value="">— none —</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={saveMappings}
                  disabled={savingMap}
                  className="text-sm px-4 py-2 rounded-md disabled:opacity-50"
                  style={{ background: "#2563eb", color: "#fff" }}
                >
                  {savingMap ? "Saving…" : "Save mapping"}
                </button>
                {mapMsg && <span className="text-xs" style={{ color: "#7d8590" }}>{mapMsg}</span>}
                {mappings.length > 0 && (
                  <span className="text-xs" style={{ color: "#7d8590" }}>
                    {mappings.length} mapping{mappings.length === 1 ? "" : "s"} saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {connection && connection.provider === "WEALTHBOX" && (
        <div style={CARD_STYLE} className="p-5">
          <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Sync from Wealthbox</h3>
          <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
            Pulls every Wealthbox opportunity at the stage you mapped to <em>Proposal Accepted</em> and creates a Rift case for any not yet linked. Cases with missing custom fields (<code>Source Provider</code>, <code>Destination Custodian</code>, <code>Account Type</code>) are flagged for review.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={syncFromCrm}
              disabled={syncing}
              className="text-sm px-4 py-2 rounded-md disabled:opacity-50"
              style={{ background: "#2563eb", color: "#fff" }}
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            {syncResult && (
              <span className="text-xs" style={{ color: "#7d8590" }}>
                Scanned {syncResult.scanned} · Created {syncResult.created} · Skipped {syncResult.skipped}
                {syncResult.errors.length > 0 ? ` · ${syncResult.errors.length} error${syncResult.errors.length === 1 ? "" : "s"}` : ""}
              </span>
            )}
            {syncErr && <span className="text-xs" style={{ color: "#f87171" }}>{syncErr}</span>}
          </div>
          {syncResult && syncResult.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs" style={{ color: "#f87171" }}>
              {syncResult.errors.slice(0, 5).map((e, i) => (
                <li key={i}>Opportunity {e.opportunityId}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div className="w-9 h-5 rounded-full transition-colors" style={{ background: checked ? "#2563eb" : "#2d333b" }} />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }} />
      </div>
      {label && (
        <div>
          <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>{label}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>{description}</p>}
        </div>
      )}
    </label>
  );
}
