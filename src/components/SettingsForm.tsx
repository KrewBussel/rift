"use client";

import { useEffect, useState } from "react";
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
  { value: "INTAKE", label: "Intake" },
  { value: "AWAITING_CLIENT_ACTION", label: "Awaiting Client Action" },
  { value: "READY_TO_SUBMIT", label: "Ready to Submit" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
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

const inputCls = "w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

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
  "audit-log": "Audit Log",
};

/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function SettingsForm({ user, firmSettings, firm, seatsUsed, aiUsage, platform, cronSecret }: Props) {
  const isAdmin = user.role === "ADMIN";
  const tabs = isAdmin ? ADMIN_TABS : USER_TABS;
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
          {isAdmin ? "Manage your firm, security, and compliance" : "Manage your profile and preferences"}
        </p>
      </div>

      <div
        className="flex flex-wrap gap-0.5 mb-6"
        style={{ borderBottom: "1px solid #21262d" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors -mb-px"
            style={{
              color: activeTab === tab ? "#e4e6ea" : "#7d8590",
              borderBottom: activeTab === tab ? "2px solid #388bfd" : "2px solid transparent",
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileSection user={user} />}
      {activeTab === "password" && <PasswordSection />}
      {activeTab === "preferences" && <PreferencesSection user={user} />}
      {activeTab === "ai-usage" && <AIUsageSection initial={aiUsage} />}

      {isAdmin && activeTab === "organization" && firm && <OrganizationSection initial={firm} />}
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
      {isAdmin && activeTab === "audit-log" && <AuditLogSection />}
    </div>
  );
}

/* ─── Profile ─────────────────────────────────────────────────────────────── */

function ProfileSection({ user }: { user: User }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty = firstName !== user.firstName || lastName !== user.lastName;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });

    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Profile updated successfully." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

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
    <div style={CARD_STYLE} className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <label className="relative flex-shrink-0 cursor-pointer group" title="Change photo">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} disabled={avatarUploading} />
          {!avatarError ? (
            <img key={avatarVersion} src={`/api/users/me/avatar?v=${avatarVersion}`} alt="Profile photo" className="w-14 h-14 rounded-full object-cover" onError={() => setAvatarError(true)} />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold" style={{ background: "#1f3a5f", color: "#79c0ff" }}>
              {user.firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
            {avatarUploading ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12V5.5A1.5 1.5 0 0 1 3.5 4H5l1-1.5h4L11 4h1.5A1.5 1.5 0 0 1 14 5.5V12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12Z" stroke="white" strokeWidth="1.3" />
                <circle cx="8" cy="8.5" r="2" stroke="white" strokeWidth="1.3" />
              </svg>
            )}
          </div>
        </label>

        <div>
          <p className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm" style={{ color: "#7d8590" }}>{user.email}</p>
          <span className="inline-flex items-center mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "#162032", color: "#79c0ff" }}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          {avatarMessage && (
            <p className="text-xs mt-1" style={{ color: avatarMessage.type === "success" ? "#3fb950" : "#f87171" }}>
              {avatarMessage.text}
            </p>
          )}
          {!avatarMessage && (
            <p className="text-xs mt-1" style={{ color: "#484f58" }}>
              Click photo to change · JPEG, PNG, WebP · max 2 MB
            </p>
          )}
        </div>
      </div>

      <div style={DIVIDER_STYLE} />

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Last name">
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} style={INPUT_STYLE} />
          </Field>
        </div>

        <Field label="Email address">
          <input type="email" value={user.email} readOnly className="w-full rounded-lg px-3 py-2 text-sm cursor-not-allowed" style={{ background: "#161b22", border: "1px solid #21262d", color: "#484f58" }} />
          <p className="text-xs mt-1" style={{ color: "#484f58" }}>Email cannot be changed. Contact your admin.</p>
        </Field>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs" style={{ color: "#484f58" }}>Member since {formatDate(user.createdAt)}</p>
          <SaveBar saving={saving} disabled={!isDirty} message={message} label="Save changes" />
        </div>
      </form>
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
  const [form, setForm] = useState({
    name: initial.name,
    legalName: initial.legalName ?? "",
    taxId: initial.taxId ?? "",
    businessAddress: initial.businessAddress ?? "",
    supportEmail: initial.supportEmail ?? "",
    supportPhone: initial.supportPhone ?? "",
    websiteUrl: initial.websiteUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/firm/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setMessage({ type: "success", text: "Organization profile saved." });
    else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  return (
    <div style={CARD_STYLE} className="p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Firm display name">
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Legal business name">
            <input type="text" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Tax ID (EIN)">
            <input type="text" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="12-3456789" className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Website">
            <input type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://example.com" className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Support email">
            <input type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} className={inputCls} style={INPUT_STYLE} />
          </Field>
          <Field label="Support phone">
            <input type="tel" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} className={inputCls} style={INPUT_STYLE} />
          </Field>
        </div>
        <Field label="Business address">
          <textarea value={form.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} rows={3} className={inputCls} style={INPUT_STYLE} />
        </Field>
        <div className="flex items-center justify-end pt-2">
          <SaveBar saving={saving} message={message} label="Save organization" />
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
                    <select value={stalledDays} onChange={(e) => setStalledDays(Number(e.target.value))} className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={INPUT_STYLE}>
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
