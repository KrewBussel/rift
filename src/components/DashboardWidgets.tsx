"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  case: { id: string; clientFirstName: string; clientLastName: string };
}

interface StaleCase {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  status: string;
  updatedAt: string;
  daysSinceActivity: number;
}

interface Props {
  myTasks: Task[];
  staleCases: StaleCase[];
  statusCounts: Record<string, number>;
  accountTypeCounts: Record<string, number>;
  totalActive: number;
  totalCompleted: number;
  completedThisMonth: number;
  taskBreakdown: {
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    noDueDate: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PROPOSAL_ACCEPTED: { label: "Proposal Accepted", color: "#58a6ff" },
  AWAITING_CLIENT_ACTION: { label: "Awaiting Client", color: "#e3b341" },
  READY_TO_SUBMIT: { label: "Ready to Submit", color: "#a5a0ff" },
  SUBMITTED: { label: "Submitted", color: "#f0883e" },
  PROCESSING: { label: "Processing", color: "#79c0ff" },
  IN_TRANSIT: { label: "In Transit", color: "#56d364" },
  WON: { label: "Won", color: "#3fb950" },
};

const ACCOUNT_CONFIG: Record<string, { label: string; color: string }> = {
  TRADITIONAL_IRA_401K: { label: "Traditional IRA/401k", color: "#58a6ff" },
  ROTH_IRA_401K: { label: "Roth IRA/401k", color: "#bc8cff" },
  IRA_403B: { label: "IRA / 403(b)", color: "#56d364" },
  OTHER: { label: "Other", color: "#7d8590" },
};

export default function DashboardWidgets({
  myTasks,
  staleCases,
  statusCounts,
  accountTypeCounts,
  totalActive,
  totalCompleted,
  completedThisMonth,
  taskBreakdown,
}: Props) {
  const totalCases = totalActive + totalCompleted;

  const activeStatusData = Object.entries(STATUS_CONFIG)
    .filter(([key]) => key !== "WON")
    .map(([key, cfg]) => ({ key, ...cfg, count: statusCounts[key] ?? 0 }));
  const pipelineTotal = activeStatusData.reduce((s, x) => s + x.count, 0);

  const statusBarData = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({ name: cfg.label, count: statusCounts[key] ?? 0, color: cfg.color }))
    .filter((d) => d.count > 0);

  const pieData = Object.entries(ACCOUNT_CONFIG)
    .map(([key, cfg]) => ({ name: cfg.label, value: accountTypeCounts[key] ?? 0, color: cfg.color }))
    .filter((d) => d.value > 0);

  const taskSegments = [
    { label: "Overdue", count: taskBreakdown.overdue, color: "#f85149" },
    { label: "Due Today", count: taskBreakdown.dueToday, color: "#e3b341" },
    { label: "This Week", count: taskBreakdown.dueThisWeek, color: "#58a6ff" },
    { label: "No Date", count: taskBreakdown.noDueDate, color: "#30363d" },
  ];
  const taskTotal = myTasks.length;

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Active Cases"
          value={totalActive}
          subtitle={`${totalCases} total`}
          valueColor="#58a6ff"
          sparkBars={activeStatusData.filter((d) => d.count > 0).map((d) => ({ count: d.count, color: d.color }))}
        />
        <StatCard
          title="Open Tasks"
          value={taskTotal}
          subtitle={taskBreakdown.overdue > 0 ? `${taskBreakdown.overdue} overdue` : "None overdue"}
          subtitleColor={taskBreakdown.overdue > 0 ? "#f85149" : "#3fb950"}
          valueColor="#e3b341"
          sparkBars={taskSegments.filter((d) => d.count > 0).map((d) => ({ count: d.count, color: d.color }))}
        />
        <StatCard
          title="Completed Cases"
          value={totalCompleted}
          subtitle={`${completedThisMonth} this month`}
          valueColor="#3fb950"
        />
      </div>

      {/* Row 2: Pipeline + Task Breakdown */}
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
            segments={activeStatusData.map((s) => ({ label: s.label, count: s.count, color: s.color }))}
            total={pipelineTotal}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {activeStatusData.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <div className="min-w-0">
                  <p className="text-xs truncate" style={{ color: "#7d8590" }}>{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: "#e4e6ea" }}>{s.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Task Breakdown</p>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
              Total Open&nbsp;&nbsp;<span style={{ color: "#e4e6ea" }}>{taskTotal}</span>
            </p>
          </div>
          <SegmentedBar segments={taskSegments} total={taskTotal} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {taskSegments.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <div>
                  <p className="text-xs" style={{ color: "#7d8590" }}>{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: "#e4e6ea" }}>{s.count}</p>
                </div>
              </div>
            ))}
          </div>
          {staleCases.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid #21262d" }}>
              <p className="text-xs font-medium" style={{ color: "#e09937" }}>
                {staleCases.length} case{staleCases.length !== 1 ? "s" : ""} idle 7+ days
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cases by Status Bar Chart */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#e4e6ea" }}>Cases by Status</p>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
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
                <Tooltip
                  contentStyle={{
                    background: "#21262d",
                    border: "1px solid #30363d",
                    borderRadius: 6,
                    color: "#e4e6ea",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {statusBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No cases yet" />
          )}
        </div>

        {/* Cases by Account Type Donut */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "#e4e6ea" }}>Cases by Account Type</p>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: "55%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#21262d",
                        border: "1px solid #30363d",
                        borderRadius: 6,
                        color: "#e4e6ea",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5 flex-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs truncate flex-1" style={{ color: "#7d8590" }}>{d.name}</span>
                    <span className="text-xs font-bold" style={{ color: "#e4e6ea" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No cases yet" />
          )}
        </div>
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-sm" style={{ color: "#7d8590" }}>{label}</p>
    </div>
  );
}
