"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardSection,
  TextInput,
  SelectInput,
  Btn,
  Pill,
  Modal,
  Icon,
  InitialsAvatar,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

type TeamUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "ADVISOR" | "OPS";
  twoFactorEnabled: boolean;
  deactivatedAt: string | null;
  lastLoginAt: string | null;
};

const ROLE_HUE: Record<string, "violet" | "blue" | "green"> = {
  ADMIN: "violet",
  ADVISOR: "blue",
  OPS: "green",
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ADVISOR: "Advisor",
  OPS: "Operations",
};
const ROLE_DESC: Record<string, string> = {
  ADMIN: "Full workspace access incl. billing & members.",
  ADVISOR: "Manages clients & cases, no billing/admin.",
  OPS: "Processes cases, no client or billing access.",
};

function formatLastActive(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

export default function TeamSection({
  currentUserId,
  seatsLimit,
  seatsUsed,
}: {
  currentUserId: string;
  seatsLimit: number;
  seatsUsed: number;
}) {
  const [users, setUsers] = useState<TeamUser[] | null>(null);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "ADVISOR" | "OPS">("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/firm/team");
    if (res.ok) setUsers(await res.json());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/firm/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update user.");
      return;
    }
    await refresh();
  }

  const rows = (users ?? []).filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (`${u.firstName} ${u.lastName} ${u.email}`).toLowerCase().includes(q);
  });

  const seatsRemaining = Math.max(0, seatsLimit - seatsUsed);

  return (
    <div>
      <SectionHeader
        title="Team & roles"
        description={`${seatsUsed} of ${seatsLimit} seats used · ${seatsRemaining} remaining`}
        right={<Btn primary onClick={() => setInviteOpen(true)}><Icon name="plus" size={14} /> Invite member</Btn>}
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 1100 }}>
        <CrmTeamImportPanel
          seatsRemaining={seatsRemaining}
          onInvited={refresh}
          onError={(msg) => setError(msg)}
        />

        {tempCredential && (
          <div
            style={{
              background: "#0f1a2e",
              border: `1px solid #1f2e4d`,
              borderRadius: 8,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 6 }}>
              User invited — temporary password
            </div>
            <div style={{ fontSize: 12, color: T.accent, marginBottom: 8 }}>
              Share with {tempCredential.email}. They should change it on first sign-in. Shown only once.
            </div>
            <code
              style={{
                display: "block",
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                background: T.page,
                color: "#a5d6ff",
                padding: "8px 12px",
                borderRadius: 6,
              }}
            >
              {tempCredential.password}
            </code>
            <div style={{ marginTop: 10 }}>
              <Btn ghost small onClick={() => setTempCredential(null)}>Dismiss</Btn>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <Card>
          {/* Toolbar */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, maxWidth: 320 }}>
              <TextInput
                value={filter}
                onChange={setFilter}
                placeholder="Search members…"
                prefix={<Icon name="search" size={14} color={T.textTertiary} />}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 2,
                background: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
              }}
            >
              {(["ALL", "ADMIN", "ADVISOR", "OPS"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11.5,
                    borderRadius: 4,
                    cursor: "pointer",
                    color: roleFilter === r ? T.text : T.textSecondary,
                    background: roleFilter === r ? T.surface3 : "transparent",
                    border: "none",
                    fontWeight: roleFilter === r ? 600 : 500,
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                >
                  {r === "ALL" ? "All" : ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11.5, color: T.textTertiary }}>
              {users == null ? "" : `${rows.length} of ${users.length}`}
            </div>
          </div>

          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 110px 110px",
              padding: "10px 16px",
              borderBottom: `1px solid ${T.border}`,
              fontSize: 10,
              fontWeight: 600,
              color: T.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              background: T.striped,
            }}
          >
            <div>Member</div>
            <div>Role</div>
            <div>Last active</div>
            <div>Status</div>
            <div></div>
          </div>

          {/* Rows */}
          {users == null ? (
            <div style={{ padding: "20px 16px", fontSize: 12, color: T.textTertiary }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: 12, color: T.textTertiary }}>No members match.</div>
          ) : (
            rows.map((m, i) => {
              const isSelf = m.id === currentUserId;
              const isActive = !m.deactivatedAt;
              const isLast = i === rows.length - 1;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 1fr 110px 110px",
                    padding: "12px 16px",
                    alignItems: "center",
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <InitialsAvatar firstName={m.firstName} lastName={m.lastName} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
                        {m.firstName} {m.lastName}
                        {isSelf && <span style={{ color: T.textTertiary, fontWeight: 400 }}> · you</span>}
                        {m.twoFactorEnabled && (
                          <span style={{ marginLeft: 6 }}>
                            <Pill hue="green">2FA</Pill>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.textTertiary, fontFamily: "ui-monospace, monospace" }}>
                        {m.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    <SelectInput<"ADMIN" | "ADVISOR" | "OPS">
                      value={m.role}
                      onChange={(role) => updateUser(m.id, { role })}
                      options={[
                        { value: "ADMIN", label: "Admin" },
                        { value: "ADVISOR", label: "Advisor" },
                        { value: "OPS", label: "Operations" },
                      ]}
                      style={{ maxWidth: 140 }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>{formatLastActive(m.lastLoginAt)}</div>
                  <div>
                    {isActive ? (
                      <Pill hue="slate">
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
                        Active
                      </Pill>
                    ) : (
                      <Pill hue="red">Deactivated</Pill>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Btn
                      small
                      ghost
                      disabled={isSelf}
                      onClick={() => updateUser(m.id, { deactivated: isActive })}
                    >
                      {isActive ? "Deactivate" : "Reactivate"}
                    </Btn>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        <CardSection title="Roles" description="What each role can access." style={{ marginTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {(["ADMIN", "ADVISOR", "OPS"] as const).map((key) => (
              <div
                key={key}
                style={{
                  background: T.striped,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Pill hue={ROLE_HUE[key]}>{ROLE_LABEL[key]}</Pill>
                </div>
                <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>{ROLE_DESC[key]}</div>
              </div>
            ))}
          </div>
        </CardSection>
      </div>

      {inviteOpen && (
        <InviteMemberModal
          seatsRemaining={seatsRemaining}
          onClose={() => setInviteOpen(false)}
          onInvited={async (cred) => {
            setInviteOpen(false);
            setTempCredential(cred);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Invite member modal ─────────────────────────────────────────────── */

function InviteMemberModal({
  seatsRemaining,
  onClose,
  onInvited,
}: {
  seatsRemaining: number;
  onClose: () => void;
  onInvited: (c: { email: string; password: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ADVISOR" | "OPS">("ADVISOR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/firm/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to invite user.");
      return;
    }
    const data = await res.json();
    onInvited({ email: data.user.email, password: data.tempPassword });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite member"
      footer={
        <>
          <Btn ghost onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn primary onClick={submit} disabled={saving || seatsRemaining < 1}>
            {saving ? "Sending…" : "Send invite"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Labeled label="First name">
          <TextInput value={firstName} onChange={setFirstName} placeholder="Jane" />
        </Labeled>
        <Labeled label="Last name">
          <TextInput value={lastName} onChange={setLastName} placeholder="Doe" />
        </Labeled>
        <Labeled label="Email">
          <TextInput value={email} onChange={setEmail} type="email" placeholder="teammate@yourfirm.com" />
        </Labeled>
        <Labeled label="Role">
          <SelectInput<"ADMIN" | "ADVISOR" | "OPS">
            value={role}
            onChange={setRole}
            options={[
              { value: "ADMIN",   label: "Admin — full access" },
              { value: "ADVISOR", label: "Advisor — manages clients & cases" },
              { value: "OPS",     label: "Operations — processes cases" },
            ]}
          />
          <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 8, lineHeight: 1.5 }}>
            {ROLE_DESC[role]}
          </div>
        </Labeled>
        <div
          style={{
            background: T.striped,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: 12,
            display: "flex",
            gap: 10,
          }}
        >
          <Icon name="info" size={14} color={T.accent} />
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            They&rsquo;ll receive an email invite. {seatsRemaining > 0
              ? <>Adding a member uses 1 of {seatsRemaining} available seats.</>
              : <span style={{ color: T.warning }}>No seats remaining — increase your seat limit before inviting.</span>}
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: T.danger }}>{error}</div>}
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

/* ─── CRM team import ──────────────────────────────────────────────────── */

type CrmTeamRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  riftStatus: "available" | "in_firm" | "other_firm";
  existingRole: "ADMIN" | "OPS" | "ADVISOR" | null;
};

type RoleSel = "ADVISOR" | "OPS" | "SKIP";

/**
 * Lazy-loadable panel that pulls the firm's Wealthbox account members and lets
 * the admin invite them in bulk by picking a Rift role per row. Hidden until
 * the admin clicks "Import from Wealthbox" so we don't hit the CRM API on
 * every settings page load.
 */
function CrmTeamImportPanel({
  seatsRemaining,
  onInvited,
  onError,
}: {
  seatsRemaining: number;
  onInvited: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<CrmTeamRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, RoleSel>>({});
  const [outcomes, setOutcomes] = useState<Record<string, "ok" | "pending" | "error">>({});
  const [inviting, setInviting] = useState(false);
  const [hasCrm, setHasCrm] = useState<boolean | null>(null);

  // Light precheck on mount: don't show the panel at all if no CRM is connected.
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/integrations/crm");
      if (!res.ok) {
        setHasCrm(false);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { connection?: unknown };
      setHasCrm(!!body.connection);
    })();
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/integrations/crm/users");
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error ?? `Couldn't load (HTTP ${res.status})`);
      return;
    }
    const body = (await res.json()) as { users: CrmTeamRow[] };
    setUsers(body.users ?? []);
    const defaults: Record<string, RoleSel> = {};
    for (const u of body.users ?? []) defaults[u.id] = "SKIP";
    setSelections(defaults);
  }

  async function inviteSelected() {
    if (!users) return;
    setInviting(true);
    const next: Record<string, "ok" | "pending" | "error"> = {};
    for (const u of users) {
      const role = selections[u.id] ?? "SKIP";
      if (role === "SKIP" || u.riftStatus !== "available") continue;
      const fallback = u.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Teammate";
      const firstName = u.firstName ?? fallback.split(/\s+/)[0] ?? "Teammate";
      const lastName = u.lastName ?? fallback.split(/\s+/).slice(1).join(" ") ?? "(unknown)";
      next[u.id] = "pending";
      setOutcomes({ ...next });
      try {
        const res = await fetch("/api/firm/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName: lastName || "(unknown)", email: u.email, role }),
        });
        if (res.ok) {
          next[u.id] = "ok";
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          next[u.id] = "error";
          onError(body.error ?? `Invite for ${u.email} failed (HTTP ${res.status})`);
        }
      } catch (e) {
        next[u.id] = "error";
        onError(e instanceof Error ? e.message : "Network error");
      }
      setOutcomes({ ...next });
    }
    setInviting(false);
    await onInvited();
  }

  if (hasCrm === false || hasCrm === null) return null;

  const visibleUsers = users ?? [];
  const availableCount = visibleUsers.filter((u) => u.riftStatus === "available").length;
  const pickedCount = visibleUsers.filter(
    (u) => u.riftStatus === "available" && (selections[u.id] === "ADVISOR" || selections[u.id] === "OPS"),
  ).length;
  const overSeatLimit = pickedCount > seatsRemaining;
  const finishedCount = Object.values(outcomes).filter((o) => o === "ok").length;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ padding: "20px 24px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <WealthboxBadge />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                  Import from Wealthbox
                </div>
                {users && users.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.textSecondary,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: T.page,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    {availableCount} eligible · {visibleUsers.length} total
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                Pull your Wealthbox team and invite them in bulk. You pick the Rift role for each — Wealthbox doesn&rsquo;t track that distinction.
              </div>
            </div>
            <Btn
              small
              onClick={() => {
                setOpen((v) => !v);
                if (!users && !open) void load();
              }}
            >
              {open ? "Hide" : users ? "Show list" : "Load list"}
            </Btn>
          </div>

          {/* Loaded body */}
          {open && (
            <div style={{ marginTop: 16 }}>
              {loading ? (
                <div
                  style={{
                    fontSize: 12,
                    color: T.textSecondary,
                    padding: "16px 12px",
                    textAlign: "center",
                    background: T.page,
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                  }}
                >
                  Loading your Wealthbox team…
                </div>
              ) : err ? (
                <div
                  style={{
                    fontSize: 12,
                    color: T.danger,
                    padding: "10px 12px",
                    background: "#2d1515",
                    border: "1px solid #5a2020",
                    borderRadius: 6,
                  }}
                >
                  {err}
                </div>
              ) : visibleUsers.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: T.textSecondary,
                    padding: "16px 12px",
                    textAlign: "center",
                    background: T.page,
                    border: `1px dashed ${T.border}`,
                    borderRadius: 6,
                  }}
                >
                  No additional users found on your Wealthbox account.
                </div>
              ) : (
                <>
                  {/* Column header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 100px",
                      gap: 12,
                      padding: "0 12px 6px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    <span>Wealthbox member</span>
                    <span>Rift role</span>
                    <span style={{ textAlign: "right" }}>Status</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: T.page,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    {visibleUsers.map((u, i) => {
                      const role = selections[u.id] ?? "SKIP";
                      const outcome = outcomes[u.id];
                      const displayName = u.firstName || u.lastName
                        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                        : u.email.split("@")[0];
                      return (
                        <div
                          key={u.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 140px 100px",
                            gap: 12,
                            alignItems: "center",
                            padding: "10px 12px",
                            borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <InitialsAvatar
                              firstName={u.firstName ?? displayName.charAt(0)}
                              lastName={u.lastName ?? ""}
                              size={26}
                              color={u.riftStatus === "in_firm" ? "#3fb950" : T.accent}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: T.text,
                                  fontWeight: 500,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {displayName}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.textSecondary,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {u.email}
                              </div>
                            </div>
                          </div>

                          <div>
                            {u.riftStatus === "in_firm" ? (
                              <Pill hue="green">On team · {u.existingRole?.toLowerCase()}</Pill>
                            ) : u.riftStatus === "other_firm" ? (
                              <Pill hue="red">Other firm</Pill>
                            ) : (
                              <select
                                value={role}
                                onChange={(e) =>
                                  setSelections({ ...selections, [u.id]: e.target.value as RoleSel })
                                }
                                disabled={inviting || outcome === "ok"}
                                style={{
                                  width: "100%",
                                  background: T.input,
                                  border: `1px solid ${T.border}`,
                                  color: T.text,
                                  borderRadius: 6,
                                  padding: "6px 8px",
                                  fontSize: 12,
                                  cursor: outcome === "ok" ? "not-allowed" : "pointer",
                                }}
                              >
                                <option value="SKIP">Skip</option>
                                <option value="ADVISOR">Advisor</option>
                                <option value="OPS">Ops</option>
                              </select>
                            )}
                          </div>

                          <div style={{ fontSize: 11, textAlign: "right" }}>
                            {outcome === "ok" ? (
                              <span style={{ color: "#6ee7b7" }}>✓ Invited</span>
                            ) : outcome === "pending" ? (
                              <span style={{ color: T.textSecondary }}>Sending…</span>
                            ) : outcome === "error" ? (
                              <span style={{ color: T.danger }}>Error</span>
                            ) : u.riftStatus === "available" && role !== "SKIP" ? (
                              <span style={{ color: T.accent }}>Ready</span>
                            ) : (
                              <span style={{ color: T.textSecondary }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer action row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <Btn
                      primary
                      small
                      onClick={inviteSelected}
                      disabled={inviting || pickedCount === 0 || overSeatLimit}
                    >
                      {inviting
                        ? "Sending invites…"
                        : pickedCount === 0
                        ? "Pick a role to begin"
                        : `Send ${pickedCount} invite${pickedCount === 1 ? "" : "s"}`}
                    </Btn>

                    {overSeatLimit && (
                      <span style={{ fontSize: 12, color: T.danger }}>
                        Over seat limit — only {seatsRemaining} seat{seatsRemaining === 1 ? "" : "s"} remaining.
                      </span>
                    )}

                    {!overSeatLimit && pickedCount > 0 && !inviting && (
                      <span style={{ fontSize: 11, color: T.textSecondary }}>
                        {pickedCount} of {seatsRemaining} remaining seat{seatsRemaining === 1 ? "" : "s"} selected
                      </span>
                    )}

                    {finishedCount > 0 && !inviting && (
                      <span style={{ fontSize: 11, color: "#6ee7b7" }}>
                        {finishedCount} invited successfully
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
      </div>
    </Card>
  );
}

/**
 * A small Wealthbox-branded badge — replaces the bare plus icon that was
 * floating at the left of the panel header without any visual weight.
 */
function WealthboxBadge() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#152130",
        border: `1px solid ${T.border}`,
        color: "#5b8def",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
      aria-hidden
    >
      WB
    </div>
  );
}
