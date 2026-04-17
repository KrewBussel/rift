"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import UserAvatar from "./UserAvatar";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                 { bg: "#21262d", text: "#8b949e", dot: "#6e7681" },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208", text: "#e09937", dot: "#d29922" },
  READY_TO_SUBMIT:        { bg: "#0d1f38", text: "#79c0ff", dot: "#388bfd" },
  SUBMITTED:              { bg: "#1d1535", text: "#c4b5fd", dot: "#a78bfa" },
  PROCESSING:             { bg: "#2d1f0e", text: "#fdba74", dot: "#fb923c" },
  IN_TRANSIT:             { bg: "#0d1535", text: "#a5b4fc", dot: "#818cf8" },
  COMPLETED:              { bg: "#0d2318", text: "#6ee7b7", dot: "#3fb950" },
};

const STATUS_ORDER = [
  "INTAKE",
  "AWAITING_CLIENT_ACTION",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "PROCESSING",
  "IN_TRANSIT",
  "COMPLETED",
];

const STATUS_LABELS: Record<string, string> = {
  INTAKE:                 "Intake",
  AWAITING_CLIENT_ACTION: "Awaiting Client",
  READY_TO_SUBMIT:        "Ready to Submit",
  SUBMITTED:              "Submitted",
  PROCESSING:             "Processing",
  IN_TRANSIT:             "In Transit",
  COMPLETED:              "Completed",
};

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

function PersonStatRow({ person, maxTotal }: { person: PersonStat; maxTotal: number }) {
  const activePct = maxTotal > 0 ? (person.active / maxTotal) * 100 : 0;
  const completedPct = maxTotal > 0 ? (person.completed / maxTotal) * 100 : 0;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium truncate" style={{ color: "#c9d1d9" }}>
          {person.firstName} {person.lastName}
        </span>
        <span className="text-xs font-bold flex-shrink-0 ml-3" style={{ color: "#e4e6ea" }}>
          {person.total}
        </span>
      </div>
      <div className="w-full h-1.5 flex overflow-hidden" style={{ background: "#21262d" }}>
        <div style={{ width: `${activePct}%`, background: "#388bfd", transition: "width 0.4s" }} />
        <div style={{ width: `${completedPct}%`, background: "#3fb950", transition: "width 0.4s" }} />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-[10px]" style={{ color: "#7d8590" }}>
          <span style={{ color: "#388bfd" }}>■</span> {person.active} active
        </span>
        <span className="text-[10px]" style={{ color: "#7d8590" }}>
          <span style={{ color: "#3fb950" }}>■</span> {person.completed} done
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard({
  recentCases,
  advisorStats,
  opsStats,
  firmTotals,
  statusCounts,
  statusLabels,
}: Props) {
  const maxTotal = Math.max(...[...advisorStats, ...opsStats].map((p) => p.total), 1);

  return (
    <div>
      {/* ── Full-width stat tiles ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Cases",     value: firmTotals.total,          color: "#e4e6ea" },
          { label: "Active",          value: firmTotals.active,          color: "#388bfd" },
          { label: "Completed",       value: firmTotals.completed,       color: "#3fb950" },
          { label: "Awaiting Client", value: firmTotals.awaitingClient,  color: "#d29922" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="px-5 py-4"
            style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 4 }}
          >
            <p className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
              {value}
            </p>
            <p className="text-[11px] mt-2 uppercase tracking-wider font-medium" style={{ color: "#484f58" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Two-col body ── */}
      <div className="flex gap-5 items-start">
        {/* Left: recently viewed */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>
                Recently Viewed
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
                Your last 6 opened cases
              </p>
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
              className="flex items-center justify-center py-24 text-center"
              style={{ border: "1px solid #21262d", background: "#161b22", borderRadius: 4 }}
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
                      borderRadius: 4,
                      border: "1px solid #21262d",
                      borderLeft: c.highPriority ? "3px solid #f87171" : "1px solid #21262d",
                      minHeight: 210,
                    }}
                  >
                    {/* Body */}
                    <div
                      className="flex-1 flex flex-col p-4 transition-colors group-hover:bg-[#1c2128]"
                      style={{ background: "#161b22" }}
                    >
                      <div className="mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: colors.dot }} />
                          {statusLabels[c.status] ?? c.status}
                        </span>
                      </div>

                      <div className="flex-1">
                        {c.highPriority && (
                          <span
                            className="inline-block text-[9px] font-bold px-1 py-0.5 uppercase tracking-widest mb-1.5"
                            style={{ background: "#3d1f1f", color: "#f87171" }}
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

                    {/* Footer */}
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

        {/* Right: team panel */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: 268, borderRadius: 4, border: "1px solid #21262d", background: "#161b22" }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #21262d" }}>
            <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Team Performance</h2>
            <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Case distribution by status and person</p>
          </div>

          {/* Pipeline breakdown */}
          <div style={{ borderBottom: "1px solid #21262d" }}>
            <div className="px-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#484f58" }}>
                Pipeline
              </p>
            </div>
            <div className="px-4 py-2">
              {STATUS_ORDER.map((key) => {
                const count = statusCounts[key] ?? 0;
                const colors = STATUS_COLORS[key];
                return (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 flex-shrink-0" style={{ background: colors.dot }} />
                      <span className="text-xs" style={{ color: count > 0 ? "#8b949e" : "#484f58" }}>
                        {STATUS_LABELS[key]}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: count > 0 ? "#c9d1d9" : "#484f58" }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advisors */}
          {advisorStats.length > 0 && (
            <div style={{ borderBottom: "1px solid #21262d" }}>
              <div className="px-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#484f58" }}>
                  Advisors
                </p>
              </div>
              {[...advisorStats].sort((a, b) => b.total - a.total).map((person, i) => (
                <div key={person.id} style={{ borderTop: i > 0 ? "1px solid #21262d" : undefined }}>
                  <PersonStatRow person={person} maxTotal={maxTotal} />
                </div>
              ))}
            </div>
          )}

          {/* Ops */}
          {opsStats.length > 0 && (
            <div>
              <div className="px-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#484f58" }}>
                  Operations
                </p>
              </div>
              {[...opsStats].sort((a, b) => b.total - a.total).map((person, i) => (
                <div key={person.id} style={{ borderTop: i > 0 ? "1px solid #21262d" : undefined }}>
                  <PersonStatRow person={person} maxTotal={maxTotal} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
