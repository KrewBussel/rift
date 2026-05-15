"use client";

import Link from "next/link";

/** Firm-observed stats + recent cases for a single custodian, computed in
 *  the intelligence page from real RolloverCase data. */
export type CustodianActivity = {
  destinationCount: number;
  sourceCount: number;
  completedCount: number;
  avgDaysToComplete: number | null;
  medianDaysToComplete: number | null;
  recentCases: Array<{
    id: string;
    clientFirstName: string;
    clientLastName: string;
    status: string;
    direction: "to" | "from";
    updatedAt: string;
    createdAt: string;
    advisor: string | null;
  }>;
};

const STATUS_COLOR: Record<string, string> = {
  PROPOSAL_ACCEPTED: "#6e7681",
  AWAITING_CLIENT_ACTION: "#d29922",
  READY_TO_SUBMIT: "#388bfd",
  SUBMITTED: "#a78bfa",
  PROCESSING: "#fb923c",
  IN_TRANSIT: "#818cf8",
  WON: "#3fb950",
};

const STATUS_LABEL: Record<string, string> = {
  PROPOSAL_ACCEPTED: "Proposal Accepted",
  AWAITING_CLIENT_ACTION: "Awaiting client",
  READY_TO_SUBMIT: "Ready to submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In transit",
  WON: "Won",
};

export default function CustodianActivityTab({
  activity,
  typicalProcessingDays,
  minProcessingDays,
  maxProcessingDays,
}: {
  activity: CustodianActivity | undefined;
  typicalProcessingDays: number | null;
  minProcessingDays: number | null;
  maxProcessingDays: number | null;
}) {
  const total = (activity?.destinationCount ?? 0) + (activity?.sourceCount ?? 0);
  if (!activity || total === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: "#e4e6ea" }}>No cases yet</p>
        <p className="text-xs mt-1" style={{ color: "#7d8590" }}>
          Activity will appear once your firm opens a case that touches this custodian.
        </p>
      </div>
    );
  }

  const completionRate =
    activity.destinationCount > 0
      ? Math.round((activity.completedCount / activity.destinationCount) * 100)
      : null;
  const advertised = typicalProcessingDays ?? null;
  const observed = activity.avgDaysToComplete;
  const delta = observed != null && advertised != null ? observed - advertised : null;
  const deltaColor = delta == null ? "#7d8590" : delta <= 1 ? "#6ee7b7" : delta <= 5 ? "#fbbf24" : "#f87171";

  return (
    <div className="space-y-5">
      {/* Performance panel */}
      <section
        className="rounded-xl p-5"
        style={{ background: "#141a24", border: "1px solid #252b38" }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: "#7d8590" }}>
          Your firm&rsquo;s performance
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Observed avg"
            value={observed != null ? observed.toFixed(1) : "—"}
            unit={observed != null ? "days" : undefined}
            detail={activity.completedCount > 0 ? `Across ${activity.completedCount} completed` : "No completions yet"}
          />
          <Stat
            label="Advertised"
            value={advertised != null ? String(advertised) : "—"}
            unit={advertised != null ? "days" : undefined}
            detail={
              minProcessingDays != null && maxProcessingDays != null
                ? `Range ${minProcessingDays}–${maxProcessingDays}`
                : "No range set"
            }
          />
          <Stat
            label="Delta"
            value={delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
            unit={delta != null ? "days" : undefined}
            detail={deltaCaption(delta)}
            valueColor={deltaColor}
          />
          <Stat
            label="Completion rate"
            value={completionRate != null ? `${completionRate}%` : "—"}
            detail={`${activity.completedCount} of ${activity.destinationCount} sent`}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 text-center pt-4" style={{ borderTop: "1px solid #252b38" }}>
          <MiniStat label="Cases to" value={activity.destinationCount} />
          <MiniStat label="Cases from" value={activity.sourceCount} />
          <MiniStat
            label="Median"
            value={activity.medianDaysToComplete != null ? `${activity.medianDaysToComplete.toFixed(0)}d` : "—"}
          />
        </div>
      </section>

      {/* Case history */}
      <section>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#7d8590" }}>
          Recent cases at this custodian
        </p>
        <ul className="rounded-xl overflow-hidden" style={{ background: "#141a24", border: "1px solid #252b38" }}>
          {activity.recentCases.map((c, i) => {
            const color = STATUS_COLOR[c.status] ?? "#6e7681";
            const label = STATUS_LABEL[c.status] ?? c.status;
            return (
              <li
                key={c.id}
                style={{ borderBottom: i === activity.recentCases.length - 1 ? undefined : "1px solid #1a1f2a" }}
              >
                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[#1a1f2a] group"
                >
                  <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#e4e6ea" }}>
                      {c.clientFirstName} {c.clientLastName}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#7d8590" }}>
                      <span style={{ color }}>{label}</span>
                      <span className="mx-1.5" style={{ color: "#3d4450" }}>·</span>
                      <span>
                        {c.direction === "to" ? "Inbound" : "Outbound"}
                      </span>
                      {c.advisor && (
                        <>
                          <span className="mx-1.5" style={{ color: "#3d4450" }}>·</span>
                          <span>{c.advisor}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums flex-shrink-0" style={{ color: "#7d8590" }}>
                    {relativeTime(c.updatedAt)}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 14 14" fill="none"
                    className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "#7d8590" }}
                  >
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label, value, unit, detail, valueColor = "#e4e6ea",
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  valueColor?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest" style={{ color: "#7d8590" }}>{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: valueColor }}>{value}</span>
        {unit && <span className="text-xs" style={{ color: "#7d8590" }}>{unit}</span>}
      </p>
      <p className="text-xs mt-1" style={{ color: "#7d8590" }}>{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest" style={{ color: "#7d8590" }}>{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums" style={{ color: "#e4e6ea" }}>
        {value}
      </p>
    </div>
  );
}

function deltaCaption(delta: number | null): string {
  if (delta == null) return "Not enough data";
  if (delta <= 1) return "Matching advertised";
  if (delta <= 5) return "Slightly slower";
  return "Meaningfully slower";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.round(day / 30)}mo ago`;
}
