"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, STAGE_HUE, fmtMoney, timeAgo, HEADLINE_STACK, TAB_NUM_STYLE } from "./tokens";
import { Card, Pill, Btn, Icon, Avatar, TextInput, ChipSelect } from "./primitives";
import {
  STATUSES,
  resolveStageLabel,
  type StageConfigRow,
} from "@/components/casesDesignTokens";

export type V2CasesUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type V2CasesCase = {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  highPriority: boolean;
  needsReview: boolean;
  reviewReason: string | null;
  statusUpdatedAt: string;
  updatedAt: string;
  createdAt: string;
  wealthboxAmount?: number | null;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
};

type Role = "ADMIN" | "ADVISOR" | "OPS";
type ViewMode = "board" | "grid" | "list";

export default function CasesViewV2({
  cases: initialCases,
  users,
  userRole,
  initialStatus = "",
  stageConfig = null,
  firmName,
  crmProvider,
}: {
  cases: V2CasesCase[];
  users: V2CasesUser[];
  userRole: Role;
  initialStatus?: string;
  stageConfig?: StageConfigRow[] | null;
  firmName: string;
  crmProvider?: string | null;
}) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  useEffect(() => setCases(initialCases), [initialCases]);

  const [view, setView] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus || "ALL");
  const [advisor, setAdvisor] = useState("ALL");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const advisors = useMemo(() => users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN"), [users]);

  const filtered = useMemo(() => {
    let out = cases;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((c) =>
        `${c.clientFirstName} ${c.clientLastName} ${c.sourceProvider} ${c.destinationCustodian} ${c.clientEmail}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (advisor !== "ALL") out = out.filter((c) => c.assignedAdvisor?.id === advisor);
    if (status !== "ALL") out = out.filter((c) => c.status === status);
    if (priorityOnly) out = out.filter((c) => c.highPriority);
    return out;
  }, [cases, search, advisor, status, priorityOnly]);

  const totalValue = filtered.reduce((s, c) => s + (c.wealthboxAmount ?? 0), 0);

  async function syncCrm() {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/integrations/crm/poll", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: T.page,
      }}
    >
      {/* Header */}
      <div style={{ padding: "26px 36px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 18 }}>
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
              {userRole === "ADMIN" ? "Cases" : "Your cases"}
            </h1>
            <div
              style={{
                marginTop: 5,
                fontSize: 13.5,
                color: T.textSecondary,
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>{filtered.length} shown</span>
              {totalValue > 0 && (
                <>
                  <span style={{ color: T.textDisabled }}>·</span>
                  <span>
                    <span style={{ color: T.text, fontWeight: 500 }}>{fmtMoney(totalValue)}</span> in motion
                  </span>
                </>
              )}
              {crmProvider && (
                <>
                  <span style={{ color: T.textDisabled }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
                    {crmProvider === "WEALTHBOX" ? "Wealthbox" : "Salesforce"} synced
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {crmProvider && userRole === "ADMIN" && (
              <Btn onClick={syncCrm} disabled={syncing}>
                <Icon name="refresh" size={14} /> {syncing ? "Syncing…" : "Sync CRM"}
              </Btn>
            )}
            <Link href="/dashboard/cases/new" style={{ textDecoration: "none" }}>
              <Btn primary>
                <Icon name="plus" size={14} /> New case
              </Btn>
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px",
            background: T.surface1,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            flexWrap: "wrap",
          }}
        >
          <div style={{ width: 280, minWidth: 220, flexShrink: 0 }}>
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search by client or custodian…"
              prefix={<Icon name="search" size={14} />}
            />
          </div>
          <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />
          <ChipSelect
            label="Stage"
            value={status}
            options={[
              { value: "ALL", label: "All stages" },
              ...STATUSES.map((s) => ({
                value: s.value,
                label: resolveStageLabel(s.value, stageConfig),
              })),
            ]}
            onChange={setStatus}
          />
          {userRole === "ADMIN" && (
            <ChipSelect
              label="Advisor"
              value={advisor}
              options={[
                { value: "ALL", label: "Any advisor" },
                ...advisors.map((u) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                })),
              ]}
              onChange={setAdvisor}
            />
          )}
          <button
            onClick={() => setPriorityOnly((p) => !p)}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 7,
              border: `1px solid ${priorityOnly ? T.accentBorder : T.border}`,
              background: priorityOnly ? T.accentSoft : T.surface1,
              color: priorityOnly ? T.accent : T.textSecondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "inherit",
            }}
          >
            <Icon name="flag" size={12} /> Priority only
          </button>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: "flex",
              padding: 2,
              background: T.surface2,
              border: `1px solid ${T.border}`,
              borderRadius: 7,
            }}
          >
            {([
              ["board", "board", "Board"],
              ["grid", "grid", "Grid"],
              ["list", "list", "Table"],
            ] as Array<[ViewMode, string, string]>).map(([k, icon, lbl]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                style={{
                  height: 24,
                  padding: "0 9px",
                  background: view === k ? T.surface1 : "transparent",
                  border: "none",
                  borderRadius: 5,
                  color: view === k ? T.text : T.textTertiary,
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: view === k ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  fontFamily: "inherit",
                }}
              >
                <Icon name={icon} size={12} /> {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "0 36px 28px",
          minHeight: 0,
        }}
      >
        {view === "board" && (
          <BoardView cases={filtered} stageConfig={stageConfig} setCases={setCases} />
        )}
        {view === "grid" && <GridView cases={filtered} stageConfig={stageConfig} />}
        {view === "list" && <TableView cases={filtered} stageConfig={stageConfig} />}
      </div>
    </div>
  );
}

function fullName(u: { firstName: string; lastName: string } | null): string {
  if (!u) return "Unassigned";
  return `${u.firstName} ${u.lastName}`.trim();
}

/* ─── Board view ─── */

function BoardView({
  cases,
  stageConfig,
  setCases,
}: {
  cases: V2CasesCase[];
  stageConfig: StageConfigRow[] | null;
  setCases: React.Dispatch<React.SetStateAction<V2CasesCase[]>>;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  async function moveCase(id: string, status: string) {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // optimistic — silent failure
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${STATUSES.length}, minmax(248px, 1fr))`,
        gap: 12,
        height: "100%",
        overflowX: "auto",
        paddingBottom: 12,
      }}
    >
      {STATUSES.map((stage) => {
        const stageCases = cases.filter((c) => c.status === stage.value);
        const stageValue = stageCases.reduce((s, c) => s + (c.wealthboxAmount ?? 0), 0);
        const hue = STAGE_HUE[stage.value] ?? "slate";
        return (
          <div
            key={stage.value}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => {
              if (dragId) {
                moveCase(dragId, stage.value);
                setDragId(null);
              }
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: T.surface2,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                padding: "2px 4px",
              }}
            >
              <Pill hue={hue} dot small>
                {resolveStageLabel(stage.value, stageConfig)}
              </Pill>
              <span style={{ fontSize: 11.5, color: T.textTertiary, fontWeight: 500 }}>
                {stageCases.length}
              </span>
              <div style={{ flex: 1 }} />
              {stageValue > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: T.textTertiary,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {fmtMoney(stageValue)}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflowY: "auto",
                flex: 1,
                paddingRight: 2,
              }}
            >
              {stageCases.map((c) => (
                <CaseCard key={c.id} c={c} onDragStart={() => setDragId(c.id)} />
              ))}
              {stageCases.length === 0 && (
                <div
                  style={{
                    border: `1px dashed ${T.border}`,
                    borderRadius: 8,
                    padding: "16px 10px",
                    textAlign: "center",
                    color: T.textTertiary,
                    fontSize: 11.5,
                  }}
                >
                  No cases
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CaseCard({ c, onDragStart }: { c: V2CasesCase; onDragStart?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <Link href={`/dashboard/cases/${c.id}`} style={{ textDecoration: "none" }}>
      <div
        draggable
        onDragStart={onDragStart}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: T.surface1,
          border: `1px solid ${hover ? T.borderStrong : T.border}`,
          borderRadius: 8,
          padding: 11,
          cursor: "grab",
          boxShadow: hover
            ? "0 2px 6px rgba(60,55,40,0.06)"
            : "0 1px 0 rgba(60,55,40,0.02)",
          transition: "border-color 100ms, box-shadow 100ms",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.text,
              letterSpacing: -0.1,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.clientFirstName} {c.clientLastName}
          </span>
          {c.highPriority && <Icon name="flag" size={12} color={T.accent} />}
          {c.needsReview && (
            <Pill hue="amber" small>
              Review
            </Pill>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: T.textSecondary,
            marginBottom: 9,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>{c.sourceProvider}</span>
          <Icon name="arrowRight" size={10} color={T.textTertiary} />
          <span style={{ color: T.text, fontWeight: 500 }}>{c.destinationCustodian}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 0 0",
            borderTop: `1px solid ${T.borderSoft}`,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              color: T.text,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 500,
            }}
          >
            {c.wealthboxAmount ? fmtMoney(c.wealthboxAmount) : "—"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10.5, color: T.textTertiary }}>
              {timeAgo(c.statusUpdatedAt)}
            </span>
            <div style={{ display: "flex", marginLeft: 4 }}>
              {c.assignedAdvisor && (
                <Avatar name={fullName(c.assignedAdvisor)} size={18} />
              )}
              {c.assignedOps && (
                <div style={{ marginLeft: -5 }}>
                  <Avatar name={fullName(c.assignedOps)} size={18} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Grid view ─── */

function GridView({
  cases,
  stageConfig,
}: {
  cases: V2CasesCase[];
  stageConfig: StageConfigRow[] | null;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
        height: "100%",
        overflowY: "auto",
        paddingBottom: 8,
        alignContent: "start",
      }}
    >
      {cases.map((c) => {
        const hue = STAGE_HUE[c.status] ?? "slate";
        return (
          <Link key={c.id} href={`/dashboard/cases/${c.id}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: T.surface1,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: 14,
                cursor: "pointer",
                transition: "border-color 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.borderStrong;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Avatar name={`${c.clientFirstName} ${c.clientLastName}`} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: T.text,
                      letterSpacing: -0.1,
                    }}
                  >
                    {c.clientFirstName} {c.clientLastName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textTertiary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.clientEmail}
                  </div>
                </div>
                {c.highPriority && <Icon name="flag" size={13} color={T.accent} />}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  color: T.textSecondary,
                  marginBottom: 12,
                }}
              >
                <span>{c.sourceProvider}</span>
                <Icon name="arrowRight" size={10} color={T.textTertiary} />
                <span style={{ color: T.text, fontWeight: 500 }}>{c.destinationCustodian}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Pill hue={hue} dot small>
                  {resolveStageLabel(c.status, stageConfig)}
                </Pill>
                <span style={{ fontSize: 11, color: T.textTertiary }}>{timeAgo(c.statusUpdatedAt)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTop: `1px solid ${T.borderSoft}`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Value
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: T.text,
                      fontFamily: "ui-monospace, monospace",
                      marginTop: 1,
                    }}
                  >
                    {c.wealthboxAmount ? fmtMoney(c.wealthboxAmount) : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Team
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                    {c.assignedAdvisor && <Avatar name={fullName(c.assignedAdvisor)} size={22} />}
                    {c.assignedOps && (
                      <div style={{ marginLeft: -6 }}>
                        <Avatar name={fullName(c.assignedOps)} size={22} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Table view ─── */

function TableView({
  cases,
  stageConfig,
}: {
  cases: V2CasesCase[];
  stageConfig: StageConfigRow[] | null;
}) {
  const router = useRouter();
  return (
    <Card style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: T.surface2, zIndex: 1 }}>
              {["Client", "Rollover", "Stage", "Value", "Team", "Updated", ""].map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: i === 3 ? "right" : "left",
                    padding: "10px 16px",
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
            {cases.map((c, idx) => {
              const hue = STAGE_HUE[c.status] ?? "slate";
              const baseBg = idx % 2 === 0 ? T.surface1 : T.striped;
              return (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/cases/${c.id}`)}
                  style={{
                    background: baseBg,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.surface3;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = baseBg;
                  }}
                >
                  <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={`${c.clientFirstName} ${c.clientLastName}`} size={26} />
                      <div>
                        <div
                          style={{
                            color: T.text,
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          {c.clientFirstName} {c.clientLastName}
                          {c.highPriority && <Icon name="flag" size={11} color={T.accent} />}
                        </div>
                        <div style={{ fontSize: 11, color: T.textTertiary }}>{c.clientEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.borderSoft}`,
                      color: T.textSecondary,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {c.sourceProvider}
                      <Icon name="arrowRight" size={10} color={T.textTertiary} />
                      <span style={{ color: T.text, fontWeight: 500 }}>{c.destinationCustodian}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>{c.accountType}</div>
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
                    <Pill hue={hue} dot small>
                      {resolveStageLabel(c.status, stageConfig)}
                    </Pill>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.borderSoft}`,
                      textAlign: "right",
                      fontFamily: "ui-monospace, monospace",
                      color: T.text,
                      fontWeight: 500,
                      ...TAB_NUM_STYLE,
                    }}
                  >
                    {c.wealthboxAmount ? fmtMoney(c.wealthboxAmount) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
                    <div style={{ display: "flex" }}>
                      {c.assignedAdvisor && <Avatar name={fullName(c.assignedAdvisor)} size={22} />}
                      {c.assignedOps && (
                        <div style={{ marginLeft: -6 }}>
                          <Avatar name={fullName(c.assignedOps)} size={22} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.borderSoft}`,
                      color: T.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {timeAgo(c.updatedAt)}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.borderSoft}`,
                      textAlign: "right",
                    }}
                  >
                    <Icon name="chev" size={14} color={T.textTertiary} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

