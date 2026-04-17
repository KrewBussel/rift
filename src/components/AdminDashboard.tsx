"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                 { bg: "#21262d", text: "#8b949e", dot: "#6e7681" },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208", text: "#e09937", dot: "#d29922" },
  READY_TO_SUBMIT:        { bg: "#0d1f38", text: "#79c0ff", dot: "#388bfd" },
  SUBMITTED:              { bg: "#1d1535", text: "#c4b5fd", dot: "#a78bfa" },
  PROCESSING:             { bg: "#2d1f0e", text: "#fdba74", dot: "#fb923c" },
  IN_TRANSIT:             { bg: "#0d1535", text: "#a5b4fc", dot: "#818cf8" },
  COMPLETED:              { bg: "#0d2318", text: "#6ee7b7", dot: "#3fb950" },
};

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "INTAKE",                 label: "Intake",            color: "#58a6ff" },
  { key: "AWAITING_CLIENT_ACTION", label: "Awaiting Client",   color: "#e3b341" },
  { key: "READY_TO_SUBMIT",        label: "Ready to Submit",   color: "#a5a0ff" },
  { key: "SUBMITTED",              label: "Submitted",         color: "#f0883e" },
  { key: "PROCESSING",             label: "Processing",        color: "#79c0ff" },
  { key: "IN_TRANSIT",             label: "In Transit",        color: "#56d364" },
  { key: "COMPLETED",              label: "Completed",         color: "#3fb950" },
];

interface RecentCase {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  sourceProvider: string;
  destinationCustodian: string;
  status: string;
  highPriority: boolean;
  statusUpdatedAt: string;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
}

interface PersonStat {
  id: string;
  firstName: string;
  lastName: string;
  total: number;
  active: number;
  completed: number;
}

interface FirmTotals {
  total: number;
  active: number;
  completed: number;
  awaitingClient: number;
}

interface Props {
  recentCases: RecentCase[];
  advisorStats: PersonStat[];
  opsStats: PersonStat[];
  firmTotals: FirmTotals;
  statusCounts: Record<string, number>;
  statusLabels: Record<string, string>;
}

const tooltipStyle = {
  contentStyle: {
    background: "#21262d",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#e4e6ea",
    fontSize: 12,
  },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

export default function AdminDashboard({
  recentCases,
  advisorStats,
  opsStats,
  firmTotals,
  statusCounts,
  statusLabels,
}: Props) {
  const activeStatuses = STATUS_CONFIG.filter((s) => s.key !== "COMPLETED");
  const pipelineTotal = activeStatuses.reduce((sum, s) => sum + (statusCounts[s.key] ?? 0), 0);

  const statusBarData = STATUS_CONFIG
    .map((s) => ({ name: s.label, count: statusCounts[s.key] ?? 0, color: s.color }))
    .filter((d) => d.count > 0);

  const allPersons = [...advisorStats, ...opsStats].sort((a, b) => b.total - a.total);
  const teamBarData = allPersons.slice(0, 10).map((p) => ({
    name: p.firstName,
    Active: p.active,
    Completed: p.completed,
  }));

  // Stat card sparklines
  const activeSpark = activeStatuses
    .map((s) => ({ count: statusCounts[s.key] ?? 0, color: s.color }))
    .filter((s) => s.count > 0);

  return (
    <div className="space-y-4">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={firmTotals.total}
          subtitle={`${firmTotals.active} active · ${firmTotals.completed} done`}
          valueColor="#e4e6ea"
          sparkBars={[
            { count: firmTotals.active, color: "#388bfd" },
            { count: firmTotals.completed, color: "#3fb950" },
          ].filter((b) => b.count > 0)}
        />
        <StatCard
          title="Active Cases"
          value={firmTotals.active}
          subtitle="Currently in pipeline"
          valueColor="#58a6ff"
          sparkBars={activeSpark}
        />
        <StatCard
          title="Completed"
          value={firmTotals.completed}
          subtitle={`${firmTotals.total > 0 ? Math.round((firmTotals.completed / firmTotals.total) * 100) : 0}% completion rate`}
          valueColor="#3fb950"
          sparkBars={[{ count: firmTotals.completed, color: "#3fb950" }]}
        />
        <StatCard
          title="Awaiting Client"
          value={firmTotals.awaitingClient}
          subtitle="Pending client action"
          valueColor="#e3b341"
          sparkBars={[{ count: firmTotals.awaitingClient, color: "#e3b341" }]}
        />
      </div>

      {/* Row 2: Pipeline + Team Snapshot */}
      <div className="grid grid-cols-2 gap-4">
        {/* Case Pipeline */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Case Pipeline</p>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
              Total Active&nbsp;&nbsp;<span style={{ color: "#e4e6ea" }}>{pipelineTotal}</span>
            </p>
          </div>
          <SegmentedBar
            segments={activeStatuses.map((s) => ({ label: s.label, count: statusCounts[s.key] ?? 0, color: s.color }))}
            total={pipelineTotal}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {activeStatuses.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <div className="min-w-0">
                  <p className="text-xs truncate" style={{ color: "#7d8590" }}>{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: "#e4e6ea" }}>{statusCounts[s.key] ?? 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Snapshot */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Team Snapshot</p>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
              {advisorStats.length} advisor{advisorStats.length !== 1 ? "s" : ""} · {opsStats.length} ops
            </p>
          </div>
          {allPersons.length === 0 ? (
            <p className="text-xs mt-6" style={{ color: "#7d8590" }}>No team members yet</p>
          ) : (
            <div className="space-y-3 mt-1">
              {allPersons.slice(0, 6).map((p) => {
                const maxVal = Math.max(...allPersons.map((x) => x.total), 1);
                const activePct = (p.active / maxVal) * 100;
                const completedPct = (p.completed / maxVal) * 100;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate" style={{ color: "#c9d1d9" }}>
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-xs font-bold ml-3 flex-shrink-0" style={{ color: "#e4e6ea" }}>
                        {p.total}
                      </span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "#21262d" }}>
                      <div style={{ width: `${activePct}%`, background: "#388bfd" }} />
                      <div style={{ width: `${completedPct}%`, background: "#3fb950" }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px]" style={{ color: "#7d8590" }}>
                        <span style={{ color: "#388bfd" }}>■</span> {p.active} active
                      </span>
                      <span className="text-[10px]" style={{ color: "#7d8590" }}>
                        <span style={{ color: "#3fb950" }}>■</span> {p.completed} done
                      </span>
                    </div>
                  </div>
                );
              })}
              {allPersons.length > 6 && (
                <p className="text-xs" style={{ color: "#484f58" }}>+{allPersons.length - 6} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cases by Status */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#e4e6ea" }}>Cases by Status</p>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={statusBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7d8590", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#7d8590", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {statusBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm" style={{ color: "#7d8590" }}>No cases yet</p>
            </div>
          )}
        </div>

        {/* Team Workload */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#e4e6ea" }}>Team Workload</p>
          {teamBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={teamBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7d8590", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#7d8590", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "#7d8590", paddingTop: 8 }}
                />
                <Bar dataKey="Active" stackId="a" fill="#388bfd" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Completed" stackId="a" fill="#3fb950" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm" style={{ color: "#7d8590" }}>No team members yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Recently Viewed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Recently Viewed</h2>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Your last 6 opened cases</p>
          </div>
          <Link
            href="/dashboard/cases"
            className="text-xs font-medium transition-colors hover:text-blue-400"
            style={{ color: "#484f58" }}
          >
            View all cases →
          </Link>
        </div>

        {recentCases.length === 0 ? (
          <div
            className="flex items-center justify-center py-16 text-center"
            style={{ border: "1px solid #21262d", background: "#161b22", borderRadius: 8 }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>No recently viewed cases</p>
              <p className="text-xs mt-1" style={{ color: "#7d8590" }}>Open a case to see it here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentCases.map((c) => {
              const colors = STATUS_COLORS[c.status] ?? { bg: "#21262d", text: "#8b949e", dot: "#6e7681" };
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/cases/${c.id}`}
                  className="flex flex-col group overflow-hidden transition-all hover:border-[#388bfd]"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #21262d",
                    borderLeft: c.highPriority ? "3px solid #f87171" : "1px solid #21262d",
                    minHeight: 210,
                  }}
                >
                  <div
                    className="flex-1 flex flex-col p-4 transition-colors group-hover:bg-[#1c2128]"
                    style={{ background: "#161b22" }}
                  >
                    <div className="mb-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: colors.bg, color: colors.text, borderRadius: 4 }}
                      >
                        <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: colors.dot }} />
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex-1">
                      {c.highPriority && (
                        <span
                          className="inline-block text-[9px] font-bold px-1 py-0.5 uppercase tracking-widest mb-1.5"
                          style={{ background: "#3d1f1f", color: "#f87171", borderRadius: 2 }}
                        >
                          Priority
                        </span>
                      )}
                      <p
                        className="text-sm font-semibold leading-snug transition-colors group-hover:text-blue-400"
                        style={{ color: "#e4e6ea" }}
                      >
                        {c.clientFirstName} {c.clientLastName}
                      </p>
                      <p className="text-xs mt-1.5 truncate" style={{ color: "#484f58" }}>
                        {c.sourceProvider}
                        <span className="mx-1">→</span>
                        {c.destinationCustodian}
                      </p>
                    </div>
                    <p className="text-[11px] mt-3" style={{ color: "#484f58" }}>
                      {formatDistanceToNow(c.statusUpdatedAt)}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-4 py-2.5 transition-colors group-hover:bg-[#161b22]"
                    style={{ background: "#0d1117", borderTop: "1px solid #21262d" }}
                  >
                    {c.assignedAdvisor && (
                      <UserAvatar userId={c.assignedAdvisor.id} name={`${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`} />
                    )}
                    {c.assignedOps && (
                      <UserAvatar userId={c.assignedOps.id} name={`${c.assignedOps.firstName} ${c.assignedOps.lastName}`} />
                    )}
                    {!c.assignedAdvisor && !c.assignedOps && (
                      <span className="text-[11px]" style={{ color: "#484f58" }}>Unassigned</span>
                    )}
                    <div className="flex-1" />
                    {(c.assignedAdvisor || c.assignedOps) && (
                      <span className="text-[10px] truncate" style={{ color: "#484f58" }}>
                        {[
                          c.assignedAdvisor && `${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`,
                          c.assignedOps && `${c.assignedOps.firstName} ${c.assignedOps.lastName}`,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  subtitleColor,
  valueColor,
  sparkBars,
}: {
  title: string;
  value: number;
  subtitle: string;
  subtitleColor?: string;
  valueColor: string;
  sparkBars?: { count: number; color: string }[];
}) {
  const max = Math.max(...(sparkBars ?? []).map((b) => b.count), 1);
  return (
    <div
      className="rounded-xl p-5 flex items-start justify-between"
      style={{ background: "#161b22", border: "1px solid #21262d" }}
    >
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: "#7d8590" }}>{title}</p>
        <p className="text-3xl font-bold" style={{ color: valueColor }}>{value}</p>
        <p className="text-xs mt-1.5 font-medium" style={{ color: subtitleColor ?? "#7d8590" }}>
          {subtitle}
        </p>
      </div>
      {sparkBars && sparkBars.length > 0 && (
        <div className="flex items-end gap-0.5 h-10 self-center">
          {sparkBars.map((b, i) => (
            <div
              key={i}
              className="w-2 rounded-sm"
              style={{
                height: `${Math.max(20, (b.count / max) * 100)}%`,
                background: b.color,
                opacity: 0.75,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentedBar({
  segments,
  total,
}: {
  segments: { label: string; count: number; color: string }[];
  total: number;
}) {
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: "#21262d" }}>
      {total > 0 &&
        segments.map(
          (s) =>
            s.count > 0 && (
              <div
                key={s.label}
                style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
                title={`${s.label}: ${s.count}`}
              />
            )
        )}
    </div>
  );
}
