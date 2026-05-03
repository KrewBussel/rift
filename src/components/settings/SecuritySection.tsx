"use client";

import { useEffect, useState } from "react";
import {
  CardSection,
  FieldRow,
  TextInput,
  Btn,
  Pill,
  Modal,
  Icon,
  SETTINGS_TOKENS,
  Toggle,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string | null;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type SecurityFirmSettings = {
  require2FA: boolean;
};

export type SecurityPlatformBaseline = {
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  sessionTimeoutMinutes: number;
};

export default function SecuritySection({
  twoFactorEnabled,
  isAdmin,
  firmSettings,
  baseline,
  registerSave,
}: {
  twoFactorEnabled: boolean;
  isAdmin: boolean;
  firmSettings: SecurityFirmSettings | null;
  baseline: SecurityPlatformBaseline;
  registerSave: (id: string, dirty: boolean, save: () => Promise<void> | void, reset: () => void) => void;
}) {
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [require2FA, setRequire2FA] = useState(firmSettings?.require2FA ?? false);

  const isDirty = isAdmin && firmSettings && require2FA !== firmSettings.require2FA;
  registerSave(
    "security",
    !!isDirty,
    async () => {
      if (!isAdmin) return;
      const res = await fetch("/api/firm/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ require2FA }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save security settings.");
      }
    },
    () => {
      if (firmSettings) setRequire2FA(firmSettings.require2FA);
    }
  );

  return (
    <div>
      <SectionHeader
        title="Security"
        description="Password, two-factor, and audit trail."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 980 }}>
        <CardSection title="Password & 2FA">
          <FieldRow label="Password" hint={`At least ${baseline.passwordMinLength} characters${baseline.passwordRequireNumber ? ", with a number" : ""}${baseline.passwordRequireSymbol ? " and a symbol" : ""}.`}>
            <Btn onClick={() => setPwModalOpen(true)}>Change password</Btn>
          </FieldRow>
          <FieldRow label="Two-factor auth" hint={firmSettings?.require2FA ? "Required by your firm." : "Optional but recommended."}>
            {twoFactorEnabled ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Pill hue="green">
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
                  Enabled
                </Pill>
                <Btn ghost small>Reconfigure</Btn>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Pill hue="amber">Not enabled</Pill>
                <Btn small>Set up 2FA</Btn>
              </div>
            )}
          </FieldRow>
          <FieldRow
            label="Session timeout"
            hint={`Sessions expire after ${baseline.sessionTimeoutMinutes} minutes of inactivity (platform-wide).`}
            isLast
          >
            <span style={{ fontSize: 13, color: T.textSecondary }}>{baseline.sessionTimeoutMinutes} minutes</span>
          </FieldRow>
        </CardSection>

        {isAdmin && firmSettings && (
          <CardSection title="Firm policy" description="Security requirements for everyone in the workspace.">
            <FieldRow label="Require 2FA" hint="When enabled, members must set up an authenticator before they can access the dashboard." isLast>
              <Toggle value={require2FA} onChange={setRequire2FA} />
            </FieldRow>
          </CardSection>
        )}

        {isAdmin && <AuditLogCard />}
      </div>

      {pwModalOpen && <ChangePasswordModal onClose={() => setPwModalOpen(false)} baseline={baseline} />}
    </div>
  );
}

/* ─── Audit log card ───────────────────────────────────────────────────── */

function AuditLogCard() {
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
  useEffect(() => {
    load();
  }, []);

  return (
    <CardSection
      title="Audit log"
      description="Immutable record of admin and security events."
      footer={
        cursor ? (
          <Btn
            ghost
            small
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await load(cursor);
              setLoadingMore(false);
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Btn>
        ) : null
      }
    >
      {!entries ? (
        <p style={{ fontSize: 12, color: T.textTertiary }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 12, color: T.textTertiary }}>No audit entries yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                gap: 16,
                padding: "10px 0",
                borderBottom: i === entries.length - 1 ? "none" : `1px solid ${T.border}`,
                alignItems: "center",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: 999, background: T.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: T.text }}>
                <span style={{ fontWeight: 500 }}>
                  {e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : "System"}
                </span>
                <span style={{ color: T.textSecondary }}> · </span>
                <span style={{ fontFamily: "ui-monospace, monospace", color: T.textSecondary, fontSize: 12 }}>
                  {e.action}
                </span>
                {e.ipAddress && (
                  <span style={{ color: T.textTertiary, fontSize: 11.5, marginLeft: 8, fontFamily: "ui-monospace, monospace" }}>
                    {e.ipAddress}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: T.textTertiary, whiteSpace: "nowrap" }}>
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSection>
  );
}

/* ─── Change password modal ────────────────────────────────────────────── */

function ChangePasswordModal({
  onClose,
  baseline,
}: {
  onClose: () => void;
  baseline: SecurityPlatformBaseline;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = next.length > 0 && next.length < baseline.passwordMinLength;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current && next.length >= baseline.passwordMinLength && next === confirm && !saving;

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setSaving(false);
    if (res.ok) {
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to change password.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Change password"
      footer={
        <>
          <Btn ghost onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn primary onClick={submit} disabled={!canSubmit}>
            {saving ? "Updating…" : "Update password"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Labeled label="Current password">
          <TextInput value={current} onChange={setCurrent} type="password" />
        </Labeled>
        <Labeled label="New password">
          <TextInput
            value={next}
            onChange={setNext}
            type="password"
            style={tooShort ? { borderColor: "#5c2626" } : undefined}
          />
          {tooShort && (
            <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>
              Must be at least {baseline.passwordMinLength} characters.
            </div>
          )}
        </Labeled>
        <Labeled label="Confirm new password">
          <TextInput
            value={confirm}
            onChange={setConfirm}
            type="password"
            style={mismatch ? { borderColor: "#5c2626" } : undefined}
          />
          {mismatch && (
            <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Passwords do not match.</div>
          )}
        </Labeled>
        <div style={{ fontSize: 11.5, color: T.textTertiary, lineHeight: 1.5 }}>
          Must be at least {baseline.passwordMinLength} characters
          {baseline.passwordRequireNumber ? ", include a number" : ""}
          {baseline.passwordRequireSymbol ? ", and include a symbol" : ""}.
        </div>
        {error && (
          <div style={{ fontSize: 12, color: T.danger, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
