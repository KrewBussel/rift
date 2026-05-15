"use client";

import { useMemo, useState } from "react";
import { T, HEADLINE_STACK, ROLE_HUE, timeAgo } from "./tokens";
import { Card, Pill, Btn, Icon, Avatar, TextInput, SelectInput } from "./primitives";

export type V2TeamMemberFull = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "ADVISOR" | "OPS";
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  deactivatedAt: string | null;
  activeCases: number;
  completedCases: number;
};

export default function TeamPageV2({
  members,
  firmName,
  seatsLimit,
  seatsUsed,
}: {
  members: V2TeamMemberFull[];
  firmName: string;
  seatsLimit: number;
  seatsUsed: number;
}) {
  const [role, setRole] = useState<"ALL" | "ADMIN" | "ADVISOR" | "OPS">("ALL");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(members[0]?.id ?? null);

  const visible = useMemo(() => {
    return members.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [members, role, search]);

  const sel = members.find((u) => u.id === selectedId) ?? members[0];

  const counts = useMemo(() => {
    const c = { ALL: members.length, ADMIN: 0, ADVISOR: 0, OPS: 0 };
    for (const u of members) c[u.role]++;
    return c;
  }, [members]);

  const seatsRemaining = Math.max(0, seatsLimit - seatsUsed);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: T.page }}>
      {/* Header */}
      <div
        style={{
          padding: "26px 36px 18px",
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: T.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            {firmName}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              color: T.text,
              letterSpacing: -0.5,
              fontFamily: HEADLINE_STACK,
            }}
          >
            Team
          </h1>
          <div style={{ marginTop: 5, fontSize: 13.5, color: T.textSecondary }}>
            {members.length} {members.length === 1 ? "member" : "members"} · {seatsUsed} of {seatsLimit} seats used · {seatsRemaining} remaining
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn primary onClick={() => setInviteOpen(true)}>
            <Icon name="plus" size={14} /> Invite teammate
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: "0 36px 14px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 3,
            background: T.surface2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
          }}
        >
          {(
            [
              ["ALL", "All"],
              ["ADMIN", "Admins"],
              ["ADVISOR", "Advisors"],
              ["OPS", "Ops"],
            ] as Array<["ALL" | "ADMIN" | "ADVISOR" | "OPS", string]>
          ).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setRole(k)}
              style={{
                height: 26,
                padding: "0 11px",
                background: role === k ? T.surface1 : "transparent",
                border: "none",
                borderRadius: 5,
                color: role === k ? T.text : T.textTertiary,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "inherit",
                boxShadow: role === k ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {lbl}
              <span
                style={{
                  color: T.textTertiary,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                }}
              >
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: 280 }}>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email…"
            prefix={<Icon name="search" size={14} />}
          />
        </div>
      </div>

      {/* Split layout */}
      <div
        style={{
          flex: 1,
          padding: "0 36px 28px",
          display: "grid",
          gridTemplateColumns: "1.45fr 1fr",
          gap: 12,
          minHeight: 0,
        }}
      >
        <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: T.surface2, zIndex: 1 }}>
                  {["Name", "Role", "Active", "Completed", "Last seen"].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: i >= 2 && i <= 3 ? "right" : "left",
                        padding: "10px 14px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: T.textTertiary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((u, i) => {
                  const isSel = u.id === sel?.id;
                  const baseBg = isSel ? T.accentSoft : i % 2 === 0 ? T.surface1 : T.striped;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      style={{ background: baseBg, cursor: "pointer" }}
                    >
                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: `1px solid ${T.borderSoft}`,
                          borderLeft: `2px solid ${isSel ? T.accent : "transparent"}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={`${u.firstName} ${u.lastName}`} size={28} />
                          <div>
                            <div style={{ color: T.text, fontWeight: 500 }}>
                              {u.firstName} {u.lastName}
                              {!u.lastLoginAt && (
                                <span style={{ marginLeft: 6 }}>
                                  <Pill hue="amber" small>
                                    Invite pending
                                  </Pill>
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: T.textTertiary }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                        <Pill hue={ROLE_HUE[u.role]} small dot>
                          {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                        </Pill>
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: `1px solid ${T.borderSoft}`,
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          color: T.text,
                          fontWeight: 500,
                        }}
                      >
                        {u.activeCases || "—"}
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: `1px solid ${T.borderSoft}`,
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          color: T.textSecondary,
                        }}
                      >
                        {u.completedCases || "—"}
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: `1px solid ${T.borderSoft}`,
                          color: T.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: T.textTertiary,
                        fontSize: 13,
                      }}
                    >
                      No members match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detail panel */}
        {sel && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            <Card>
              <div
                style={{
                  padding: "18px 22px 14px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <Avatar name={`${sel.firstName} ${sel.lastName}`} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: T.text,
                      letterSpacing: -0.2,
                      fontFamily: HEADLINE_STACK,
                    }}
                  >
                    {sel.firstName} {sel.lastName}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 2 }}>
                    {sel.email}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill hue={ROLE_HUE[sel.role]} small dot>
                      {sel.role.charAt(0) + sel.role.slice(1).toLowerCase()}
                    </Pill>
                    <Pill hue="slate" small>
                      Joined {new Date(sel.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </Pill>
                    {sel.twoFactorEnabled ? (
                      <Pill hue="green" small dot>
                        2FA on
                      </Pill>
                    ) : (
                      <Pill hue="amber" small>
                        2FA off
                      </Pill>
                    )}
                  </div>
                </div>
                <a href={`mailto:${sel.email}`} style={{ textDecoration: "none" }}>
                  <Btn small>
                    <Icon name="mail" size={12} /> Message
                  </Btn>
                </a>
              </div>
              <div
                style={{
                  padding: "14px 22px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 14,
                }}
              >
                {[
                  ["Active", sel.activeCases.toString(), T.text],
                  ["Completed", sel.completedCases.toString(), T.text],
                  [
                    "Last seen",
                    sel.lastLoginAt ? timeAgo(sel.lastLoginAt) : "—",
                    T.text,
                  ],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: T.textTertiary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {l}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 22,
                        color: c,
                        fontWeight: 600,
                        letterSpacing: -0.4,
                        fontFamily: HEADLINE_STACK,
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADVISOR" | "OPS" | "ADMIN">("ADVISOR");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("All fields required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/firm/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }
      if (body.temporaryPassword) {
        setTempPassword(body.temporaryPassword);
      } else {
        onSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(31,30,26,0.4)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: "100%",
          margin: "0 16px",
          background: T.surface1,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 16px 48px rgba(60,55,40,0.18)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: T.text,
            fontFamily: HEADLINE_STACK,
          }}
        >
          {tempPassword ? "Invite created" : "Invite teammate"}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: T.textSecondary,
            margin: "6px 0 18px",
            lineHeight: 1.5,
          }}
        >
          {tempPassword
            ? "Share this temporary password with the new member. They can change it after signing in."
            : "We'll create the account and generate a temporary password for them."}
        </p>
        {tempPassword ? (
          <div>
            <div
              style={{
                padding: "12px 14px",
                background: T.surface2,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
                color: T.text,
                marginBottom: 14,
              }}
            >
              {tempPassword}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn primary onClick={onSuccess}>
                Done
              </Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <TextInput value={firstName} onChange={setFirstName} placeholder="First name" />
              <TextInput value={lastName} onChange={setLastName} placeholder="Last name" />
            </div>
            <TextInput value={email} onChange={setEmail} placeholder="Email" type="email" />
            <SelectInput
              value={role}
              onChange={(v) => setRole(v as "ADVISOR" | "OPS" | "ADMIN")}
              options={[
                { value: "ADVISOR", label: "Advisor — manages cases" },
                { value: "OPS", label: "Operations — processes paperwork" },
                { value: "ADMIN", label: "Admin — full firm access" },
              ]}
            />
            {error && (
              <div style={{ fontSize: 12.5, color: T.danger }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <Btn onClick={onClose} disabled={sending}>
                Cancel
              </Btn>
              <Btn primary onClick={submit} disabled={sending}>
                {sending ? "Inviting…" : "Send invite"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
