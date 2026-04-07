"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface UserPreferences {
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

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow";

type Tab = "profile" | "password" | "preferences";

export default function SettingsForm({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["profile", "password", "preferences"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileSection user={user} />}
      {activeTab === "password" && <PasswordSection />}
      {activeTab === "preferences" && <PreferencesSection user={user} />}
    </div>
  );
}

/* ─── Profile ─────────────────────────────────────────────────────────────── */

function ProfileSection({ user }: { user: User }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    if (res.ok) {
      setMessage({ type: "success", text: "Profile updated successfully." });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Avatar + info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg font-semibold">
            {user.firstName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="inline-flex items-center mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact your admin.</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">Member since {formatDate(user.createdAt)}</p>
          <div className="flex items-center gap-3">
            {message && (
              <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </span>
            )}
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
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
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to change password." });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Current Password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">New Password</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={`${inputCls} ${next && next.length < 8 ? "border-red-300 focus:ring-red-400" : ""}`}
          />
          {next && next.length < 8 && (
            <p className="text-xs text-red-500 mt-1">Must be at least 8 characters.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${inputCls} ${confirm && !passwordsMatch ? "border-red-300 focus:ring-red-400" : ""}`}
          />
          {confirm && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {message && (
            <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </span>
          )}
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Changing…" : "Change Password"}
          </button>
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
    if (res.ok) {
      setMessage({ type: "success", text: "Preferences saved." });
    } else {
      setMessage({ type: "error", text: "Failed to save preferences." });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Case List Defaults */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Case List Defaults
          </legend>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Default status filter</label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Default case view</label>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value)}
                className={inputCls}
              >
                <option value="all">All cases</option>
                <option value="mine">My cases only</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div className="border-t border-gray-100" />

        {/* Display */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Display
          </legend>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputCls}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Used for displaying dates and times.</p>
            </div>

            <Toggle
              label="Show dashboard widgets"
              description="Display the task and stale-case summary widgets on the dashboard."
              checked={showWidgets}
              onChange={setShowWidgets}
            />
            <Toggle
              label="Compact case list"
              description="Reduce row padding in the case list for a denser view."
              checked={compactList}
              onChange={setCompactList}
            />
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3 pt-2">
          {message && (
            <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-9 h-5 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-200"}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </label>
  );
}
