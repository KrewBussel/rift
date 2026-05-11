"use client";

import Link from "next/link";
import { T, STAGE_COLOR, HEADLINE_STACK, TAB_NUM_STYLE, timeAgo } from "./tokens";
import { Card, Pill, Btn, Icon, Avatar } from "./primitives";

export type V2PipelineBucket = {
  status: string;
  label: string;
  count: number;
};

export type V2NeedsAttentionItem = {
  id: string;
  kind: "stalled_case" | "overdue_task";
  title: string;
  detail: string;
  href: string;
  daysAgo: number;
};

export type V2ActivityItem = {
  id: string;
  actor: string | null;
  verb: string;
  target: string | null;
  href: string | null;
  createdAt: string;
};

export type V2TeamMember = {
  id: string;
  name: string;
  role: "ADVISOR" | "OPS";
  activeCases: number;
};

export type V2WorkloadRow = {
  id: string;
  name: string;
  role: "ADMIN" | "ADVISOR" | "OPS";
  total: number;
  byStatus: Array<{ status: string; count: number }>;
};

export type V2InflowWeek = { weekStart: string; count: number };

export type AdminDashboardV2Props = {
  firmName: string;
  userFirstName: string;
  pipeline: V2PipelineBucket[];
  needsAttention: V2NeedsAttentionItem[];
  activity: V2ActivityItem[];
  team: V2TeamMember[];
  workloadAdvisors: V2WorkloadRow[];
  workloadOps: V2WorkloadRow[];
  throughput: {
    activeCases: number;
    awaitingClient: number;
    avgCycleDays: number | null;
    completedThisMonth: number;
    completedLastMonth: number;
    openedThisMonth?: number;
    openedLastMonth?: number;
  };
  inflow: V2InflowWeek[];
};

export default function AdminDashboardV2(props: AdminDashboardV2Props) {
  const {
    firmName,
    userFirstName,
    pipeline,
    needsAttention,
    activity,
    workloadAdvisors,
    workloadOps,
    throughput,
    inflow,
  } = props;

  const total = pipeline.reduce((a, p) => a + p.count, 0) || 1;
  const wonCount = pipeline.find((p) => p.status === "WON")?.count ?? 0;
  const wonPct = Math.round((wonCount / total) * 100);

  const stats = [
    {
      label: "Active cases",
      value: throughput.activeCases.toString(),
      delta: `${throughput.completedThisMonth >= throughput.completedLastMonth ? "+" : ""}${throughput.completedThisMonth - throughput.completedLastMonth}`,
      deltaHue:
        throughput.completedThisMonth >= throughput.completedLastMonth ? ("green" as const) : ("red" as const),
      sub: "vs last month",
    },
    {
      label: "Awaiting client",
      value: throughput.awaitingClient.toString(),
      delta: needsAttention.length > 0 ? `${needsAttention.length}` : "0",
      deltaHue: needsAttention.length > 0 ? ("amber" as const) : ("green" as const),
      sub: "needs nudge",
    },
    {
      label: "Cycle time",
      value: throughput.avgCycleDays != null ? `${Math.round(throughput.avgCycleDays)}d` : "—",
      delta: "30d",
      deltaHue: "slate" as const,
      sub: "avg to close",
    },
    {
      label: "Completed (mo)",
      value: throughput.completedThisMonth.toString(),
      delta: `${throughput.completedThisMonth - throughput.completedLastMonth >= 0 ? "+" : ""}${throughput.completedThisMonth - throughput.completedLastMonth}`,
      deltaHue:
        throughput.completedThisMonth >= throughput.completedLastMonth ? ("green" as const) : ("amber" as const),
      sub: "vs last month",
    },
  ];

  const inflowSeries = inflow.length > 0 ? inflow.map((w) => w.count) : [0, 0, 0, 0, 0, 0, 0, 0];
  const inflowThisWeek = inflow[inflow.length - 1]?.count ?? 0;
  const inflowAvg =
    inflow.length > 0
      ? (inflow.reduce((a, w) => a + w.count, 0) / inflow.length).toFixed(1)
      : "0";
  const inflowPrior = inflow.length >= 2 ? inflow[inflow.length - 2].count : 0;
  const inflowVsPrior =
    inflowPrior > 0
      ? `${((inflowThisWeek - inflowPrior) / inflowPrior) * 100 >= 0 ? "+" : ""}${Math.round(
          ((inflowThisWeek - inflowPrior) / inflowPrior) * 100
        )}%`
      : "—";

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.page }}>
      {/* Header */}
      <div style={{ padding: "26px 36px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
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
              {userFirstName ? `Good morning, ${userFirstName}` : "Workspace"}
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
              {firmName} — at a glance
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
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span style={{ color: T.textDisabled }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
                {throughput.activeCases} active cases
              </span>
              {needsAttention.length > 0 && (
                <>
                  <span style={{ color: T.textDisabled }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: T.warning }} />
                    {needsAttention.length} need attention
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard/cases" style={{ textDecoration: "none" }}>
              <Btn>
                <Icon name="cases" size={14} /> View cases
              </Btn>
            </Link>
            <Link href="/dashboard/cases/new" style={{ textDecoration: "none" }}>
              <Btn primary>
                <Icon name="plus" size={14} /> New case
              </Btn>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          padding: "0 36px 18px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: "16px 18px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  fontSize: 11.5,
                  color: T.textTertiary,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {s.label}
              </div>
              <Pill hue={s.deltaHue} small>
                {s.delta}
              </Pill>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 28,
                fontWeight: 600,
                color: T.text,
                letterSpacing: -0.6,
                ...TAB_NUM_STYLE,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 2 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Pipeline + Inflow */}
      <div
        style={{
          padding: "0 36px 18px",
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <Card style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div
            style={{
              padding: "16px 20px 12px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Pipeline</div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                {pipeline.length} stages · {total} cases
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "16px 20px 18px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                overflowX: "auto",
                paddingBottom: 8,
                flex: 1,
                minHeight: 140,
              }}
            >
              {pipeline.map((p, i) => {
                const color = STAGE_COLOR[p.status] ?? T.textTertiary;
                return (
                  <div key={p.status} style={{ display: "contents" }}>
                    <Link
                      href={`/dashboard/cases?status=${p.status}`}
                      style={{
                        flex: 1,
                        minWidth: 92,
                        display: "flex",
                        flexDirection: "column",
                        background: T.surface1,
                        border: `1px solid ${T.border}`,
                        borderTop: `3px solid ${color}`,
                        borderRadius: 6,
                        padding: "12px 10px 12px",
                        position: "relative",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9.5,
                          fontWeight: 500,
                          color: T.textTertiary,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          lineHeight: 1.3,
                          minHeight: 24,
                        }}
                      >
                        {p.label}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          fontSize: 30,
                          fontWeight: 600,
                          color: T.text,
                          letterSpacing: -0.7,
                          lineHeight: 1,
                          marginTop: 6,
                          ...TAB_NUM_STYLE,
                        }}
                      >
                        {p.count}
                      </div>
                    </Link>
                    {i < pipeline.length - 1 && (
                      <div
                        style={{
                          width: 22,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M3 7h8M8 4l3 3-3 3"
                            stroke={T.textTertiary}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${T.border}`,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              {[
                { l: "Total in pipeline", v: `${total} cases` },
                { l: "Won this month", v: throughput.completedThisMonth.toString() },
                { l: "Win share", v: `${wonPct}%` },
              ].map((s) => (
                <div key={s.l}>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: T.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      fontWeight: 500,
                    }}
                  >
                    {s.l}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 14,
                      fontWeight: 600,
                      color: T.text,
                      ...TAB_NUM_STYLE,
                    }}
                  >
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Weekly inflow</div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
              New cases created per week
            </div>
          </div>
          <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 120, display: "flex" }}>
              <AreaChart data={inflowSeries} />
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              <Stat label="vs prior" value={inflowVsPrior} color={inflowThisWeek >= inflowPrior ? T.success : T.danger} />
              <Stat label="this week" value={inflowThisWeek.toString()} />
              <Stat label="weekly avg" value={inflowAvg} />
            </div>
          </div>
        </Card>
      </div>

      {/* Workload */}
      <div
        style={{
          padding: "0 36px 18px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <WorkloadPanel title="Advisor workload" hint="Cases per advisor" rows={workloadAdvisors} pipeline={pipeline} />
        <WorkloadPanel title="Ops workload" hint="Cases per ops owner" rows={workloadOps} pipeline={pipeline} />
      </div>

      {/* Attention + Activity */}
      <div
        style={{
          padding: "0 36px 28px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <Card>
          <div
            style={{
              padding: "14px 20px 10px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>Needs attention</div>
            <Link href="/dashboard/cases" style={{ textDecoration: "none" }}>
              <Btn small ghost>
                View all <Icon name="arrowRight" size={12} />
              </Btn>
            </Link>
          </div>
          <div>
            {needsAttention.length === 0 && (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: T.textTertiary,
                }}
              >
                Nothing flagged — your team is on it.
              </div>
            )}
            {needsAttention.slice(0, 6).map((r, i) => {
              const sev = r.daysAgo >= 14 ? T.danger : T.warning;
              return (
                <Link
                  key={r.id}
                  href={r.href}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 20px",
                      borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.surface3;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: sev,
                        flexShrink: 0,
                      }}
                    />
                    <Avatar name={r.title} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: T.text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.textSecondary }}>{r.detail}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.textTertiary,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {r.daysAgo}d
                    </span>
                    <Icon name="chev" size={13} color={T.textTertiary} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <div
            style={{
              padding: "14px 20px 10px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>Activity</div>
          </div>
          <div style={{ padding: "10px 20px 14px" }}>
            {activity.length === 0 && (
              <div
                style={{
                  padding: "16px 0",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: T.textTertiary,
                }}
              >
                No recent activity yet.
              </div>
            )}
            {activity.slice(0, 7).map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom:
                    i === Math.min(6, activity.length - 1) ? "none" : `1px solid ${T.borderSoft}`,
                }}
              >
                <Avatar name={a.actor ?? "System"} size={22} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12.5,
                    color: T.textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  <b style={{ color: T.text, fontWeight: 600 }}>{a.actor ?? "System"}</b> {a.verb}{" "}
                  {a.target && (
                    <b style={{ color: T.text, fontWeight: 500 }}>{a.target}</b>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: T.textTertiary,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {timeAgo(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: T.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: 14,
          fontWeight: 600,
          color: color ?? T.text,
          ...TAB_NUM_STYLE,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WorkloadPanel({
  title,
  hint,
  rows,
  pipeline,
}: {
  title: string;
  hint: string;
  rows: V2WorkloadRow[];
  pipeline: V2PipelineBucket[];
}) {
  const maxN = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card>
      <div
        style={{
          padding: "14px 20px 10px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</div>
          <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2 }}>{hint}</div>
        </div>
      </div>
      <div style={{ padding: "8px 20px 14px" }}>
        {rows.length === 0 && (
          <div
            style={{
              padding: "16px 0",
              textAlign: "center",
              fontSize: 12.5,
              color: T.textTertiary,
            }}
          >
            No active assignments.
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 56px",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              borderBottom: i === rows.length - 1 ? "none" : `1px solid ${T.borderSoft}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Avatar name={r.name} size={22} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: T.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name}
                </div>
                <div style={{ fontSize: 10.5, color: T.textTertiary }}>{r.role.toLowerCase()}</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                height: 14,
                background: T.surface2,
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${T.border}`,
              }}
            >
              {pipeline.map((p) => {
                const n = r.byStatus.find((x) => x.status === p.status)?.count ?? 0;
                if (n === 0) return null;
                return (
                  <div
                    key={p.status}
                    title={`${p.label}: ${n}`}
                    style={{
                      width: `${(n / maxN) * 100}%`,
                      background: STAGE_COLOR[p.status] ?? T.textTertiary,
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: 12.5,
                color: T.text,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {r.total}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AreaChart({ data }: { data: number[] }) {
  const w = 400;
  const h = 120;
  const max = Math.max(1, ...data);
  const xs = (i: number) => (i / Math.max(1, data.length - 1)) * w;
  const ys = (v: number) => h - (v / max) * (h - 12) - 4;
  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${xs(data.length - 1).toFixed(1)},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="adminAreaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((p, i) => (
        <line
          key={i}
          x1="0"
          x2={w}
          y1={h - p * (h - 8) - 4}
          y2={h - p * (h - 8) - 4}
          stroke={T.borderSoft}
          strokeWidth="1"
          strokeDasharray={p === 0.5 ? "2 3" : ""}
        />
      ))}
      <path d={areaPath} fill="url(#adminAreaGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke={T.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) =>
        i === data.length - 1 ? (
          <circle
            key={i}
            cx={xs(i)}
            cy={ys(v)}
            r="3.5"
            fill={T.accent}
            stroke={T.surface1}
            strokeWidth="1.5"
          />
        ) : null
      )}
    </svg>
  );
}
