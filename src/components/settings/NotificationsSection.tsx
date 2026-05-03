"use client";

import { useState } from "react";
import {
  Card,
  CardSection,
  FieldRow,
  TextInput,
  SelectInput,
  Toggle,
  Icon,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

export type FirmNotificationsSettings = {
  remindersEnabled: boolean;
  stalledCaseDays: number;
  overdueTaskReminders: boolean;
  stalledCaseReminders: boolean;
  missingDocsReminders: boolean;
};

type Channels = { email: boolean; inApp: boolean; slack: boolean };
type Prefs = Record<string, Channels>;

const NOTIFICATION_GROUPS: Array<{
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  items: Array<{ id: string; label: string; desc: string }>;
}> = [
  {
    id: "cases",
    label: "Cases",
    icon: "cases",
    items: [
      { id: "case_assigned",  label: "Case assigned to me",         desc: "When you become the advisor or ops on a case." },
      { id: "case_status",    label: "Status changes",              desc: "When a case you own moves to a new stage." },
      { id: "case_blocked",   label: "Case needs review",           desc: "When something requires your attention." },
      { id: "case_completed", label: "Case won",                    desc: "When a transfer reaches Won." },
    ],
  },
  {
    id: "client",
    label: "Client activity",
    icon: "client",
    items: [
      { id: "client_signed",  label: "Document signed",             desc: "Client e-signs a transfer form." },
      { id: "client_message", label: "Client message",              desc: "Inbound email or message from a client." },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: "users",
    items: [
      { id: "team_mention",   label: "@mentions",                   desc: "When someone @mentions you in a note." },
      { id: "team_member",    label: "New team member",             desc: "When someone is added to the workspace." },
    ],
  },
];

const DEFAULT_PREFS: Prefs = {
  case_assigned:   { email: true,  inApp: true,  slack: false },
  case_status:     { email: false, inApp: true,  slack: false },
  case_blocked:    { email: true,  inApp: true,  slack: false },
  case_completed:  { email: false, inApp: true,  slack: false },
  client_signed:   { email: true,  inApp: true,  slack: false },
  client_message:  { email: true,  inApp: true,  slack: false },
  team_mention:    { email: true,  inApp: true,  slack: false },
  team_member:     { email: false, inApp: true,  slack: false },
};

export default function NotificationsSection({
  firmSettings,
  isAdmin,
  initialDigest,
  initialPrefs,
  registerSave,
}: {
  firmSettings: FirmNotificationsSettings | null;
  isAdmin: boolean;
  initialDigest: string;
  initialPrefs: Prefs | null;
  registerSave: (id: string, dirty: boolean, save: () => Promise<void> | void, reset: () => void) => void;
}) {
  const [digest, setDigest] = useState<string>(initialDigest || "daily");
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, ...(initialPrefs ?? {}) });
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  // Firm-level reminder toggles (admins only)
  const [remindersEnabled, setRemindersEnabled] = useState(firmSettings?.remindersEnabled ?? true);
  const [stalledCaseReminders, setStalledCaseReminders] = useState(firmSettings?.stalledCaseReminders ?? true);
  const [overdueTaskReminders, setOverdueTaskReminders] = useState(firmSettings?.overdueTaskReminders ?? true);
  const [missingDocsReminders, setMissingDocsReminders] = useState(firmSettings?.missingDocsReminders ?? false);
  const [stalledCaseDays, setStalledCaseDays] = useState<number>(firmSettings?.stalledCaseDays ?? 7);

  const isDirty =
    digest !== (initialDigest || "daily") ||
    JSON.stringify(prefs) !== JSON.stringify({ ...DEFAULT_PREFS, ...(initialPrefs ?? {}) }) ||
    (firmSettings &&
      (remindersEnabled !== firmSettings.remindersEnabled ||
        stalledCaseReminders !== firmSettings.stalledCaseReminders ||
        overdueTaskReminders !== firmSettings.overdueTaskReminders ||
        missingDocsReminders !== firmSettings.missingDocsReminders ||
        stalledCaseDays !== firmSettings.stalledCaseDays));

  registerSave(
    "notifications",
    !!isDirty,
    async () => {
      // Persist user-level prefs (digest + per-event channel matrix) into User.preferences JSON.
      const userPatch = {
        preferences: {
          notificationDigest: digest,
          notificationPrefs: prefs,
          quietHours: { start: quietStart, end: quietEnd },
        },
      };
      const r1 = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPatch),
      });
      if (!r1.ok) {
        const data = await r1.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save notification preferences.");
      }

      // Firm reminders (admins only)
      if (isAdmin && firmSettings) {
        const r2 = await fetch("/api/firm/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remindersEnabled,
            stalledCaseReminders,
            overdueTaskReminders,
            missingDocsReminders,
            stalledCaseDays,
          }),
        });
        if (!r2.ok) {
          const data = await r2.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save firm reminders.");
        }
      }
    },
    () => {
      setDigest(initialDigest || "daily");
      setPrefs({ ...DEFAULT_PREFS, ...(initialPrefs ?? {}) });
      if (firmSettings) {
        setRemindersEnabled(firmSettings.remindersEnabled);
        setStalledCaseReminders(firmSettings.stalledCaseReminders);
        setOverdueTaskReminders(firmSettings.overdueTaskReminders);
        setMissingDocsReminders(firmSettings.missingDocsReminders);
        setStalledCaseDays(firmSettings.stalledCaseDays);
      }
    }
  );

  function togglePref(eventId: string, channel: keyof Channels) {
    setPrefs((p) => ({
      ...p,
      [eventId]: { ...(p[eventId] ?? { email: false, inApp: false, slack: false }), [channel]: !p[eventId]?.[channel] },
    }));
  }

  return (
    <div>
      <SectionHeader
        title="Notifications"
        description="Choose which events ping you, and through which channels."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 980 }}>
        <CardSection title="Delivery">
          <FieldRow label="Email digest" hint="Bundles low-priority notifications.">
            <SelectInput
              value={digest}
              onChange={setDigest}
              options={[
                { value: "off",    label: "Off — send each one" },
                { value: "hourly", label: "Hourly digest" },
                { value: "daily",  label: "Daily digest (8:00 AM)" },
                { value: "weekly", label: "Weekly digest (Mondays)" },
              ]}
              style={{ maxWidth: 280 }}
            />
          </FieldRow>
          <FieldRow label="Quiet hours" hint="No push or in-app notifications between these times." isLast>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <TextInput value={quietStart} onChange={setQuietStart} type="time" style={{ width: 110 }} />
              <span style={{ fontSize: 12, color: T.textTertiary }}>to</span>
              <TextInput value={quietEnd} onChange={setQuietEnd} type="time" style={{ width: 110 }} />
            </div>
          </FieldRow>
        </CardSection>

        {NOTIFICATION_GROUPS.map((g) => (
          <Card key={g.id} style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: T.input,
                  border: `1px solid ${T.border}`,
                  display: "grid",
                  placeItems: "center",
                  color: T.accent,
                }}
              >
                <Icon name={g.icon} size={14} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{g.label}</div>
            </div>
            {g.items.map((it, idx) => {
              const p = prefs[it.id] ?? { email: false, inApp: false, slack: false };
              const onCount = (p.email ? 1 : 0) + (p.inApp ? 1 : 0) + (p.slack ? 1 : 0);
              const isLast = idx === g.items.length - 1;
              return (
                <div
                  key={it.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 24,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 13.5, color: T.text, fontWeight: 500 }}>{it.label}</div>
                      {onCount === 0 && (
                        <span
                          style={{
                            fontSize: 10.5,
                            color: T.textTertiary,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            fontWeight: 500,
                          }}
                        >
                          · Off
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 3, lineHeight: 1.5 }}>
                      {it.desc}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["email", "inApp", "slack"] as const).map((ch) => {
                      const on = p[ch];
                      return (
                        <button
                          type="button"
                          key={ch}
                          onClick={() => togglePref(it.id, ch)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 11px",
                            borderRadius: 999,
                            border: `1px solid ${on ? "#1f2e4d" : T.border}`,
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            background: on ? "#0f1a2e" : T.input,
                            color: on ? T.accent : T.textTertiary,
                            transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: on ? T.accent : "#3a4050",
                              transition: "background 120ms ease",
                            }}
                          />
                          {ch === "email" ? "Email" : ch === "inApp" ? "In-app" : "Slack"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
        ))}

        {isAdmin && firmSettings && (
          <CardSection
            title="Firm reminders"
            description="Automated email reminders sent to advisors and ops about cases that need attention."
          >
            <FieldRow label="Reminders enabled" hint="Master switch — turning this off pauses all reminder emails firm-wide.">
              <Toggle value={remindersEnabled} onChange={setRemindersEnabled} />
            </FieldRow>
            <FieldRow label="Stalled cases" hint="Email when a case sits in a stage too long.">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Toggle value={stalledCaseReminders} onChange={setStalledCaseReminders} />
                <span style={{ fontSize: 12, color: T.textSecondary }}>
                  After
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={stalledCaseDays}
                    onChange={(e) => setStalledCaseDays(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                    style={{
                      width: 56,
                      margin: "0 6px",
                      background: T.input,
                      border: `1px solid ${T.border}`,
                      color: T.text,
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 13,
                    }}
                  />
                  days
                </span>
              </div>
            </FieldRow>
            <FieldRow label="Overdue tasks" hint="Email when a task passes its due date.">
              <Toggle value={overdueTaskReminders} onChange={setOverdueTaskReminders} />
            </FieldRow>
            <FieldRow label="Missing documents" hint="Email when a case is missing a required checklist item." isLast>
              <Toggle value={missingDocsReminders} onChange={setMissingDocsReminders} />
            </FieldRow>
          </CardSection>
        )}
      </div>
    </div>
  );
}
