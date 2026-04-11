"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import DarkSelect from "./DarkSelect";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Case {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  highPriority: boolean;
  statusUpdatedAt: string;
  updatedAt: string;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
}

interface Props {
  cases: Case[];
  users: User[];
  statusLabels: Record<string, string>;
  filters: { search: string; status: string; advisorId: string };
  compact?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                  { bg: "#21262d",          text: "#8b949e",   dot: "#6e7681"   },
  AWAITING_CLIENT_ACTION:  { bg: "#2d2208",          text: "#e09937",   dot: "#d29922"   },
  READY_TO_SUBMIT:         { bg: "#0d1f38",          text: "#79c0ff",   dot: "#388bfd"   },
  SUBMITTED:               { bg: "#1d1535",          text: "#c4b5fd",   dot: "#a78bfa"   },
  PROCESSING:              { bg: "#2d1f0e",          text: "#fdba74",   dot: "#fb923c"   },
  IN_TRANSIT:              { bg: "#0d1535",          text: "#a5b4fc",   dot: "#818cf8"   },
  COMPLETED:               { bg: "#0d2318",          text: "#6ee7b7",   dot: "#3fb950"   },
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#21262d", text: "#8b949e", dot: "#6e7681" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.dot }} />
      {label}
    </span>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-semibold"
      style={{ background: "#2d333b", color: "#8b949e" }}
    >
      {initials}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: "#161b22",
  border: "1px solid #30363d",
  color: "#c9d1d9",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
};

export default function CaseList({ cases, users, statusLabels, filters, compact = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams({
      search: filters.search,
      status: filters.status,
      advisorId: filters.advisorId,
      [key]: value,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>Cases</h2>
          <p className="text-sm mt-0.5" style={{ color: "#7d8590" }}>
            {cases.length} {cases.length !== 1 ? "cases" : "case"}
            {filters.search || filters.status || filters.advisorId ? " matching filters" : " total"}
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: "#7d8590" }}>
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search clients…"
            defaultValue={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-8 pr-3 py-2 w-52"
            style={{ ...INPUT_STYLE, caretColor: "#58a6ff" }}
          />
        </div>

        <DarkSelect
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
          options={[{ value: "", label: "All statuses" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]}
          className="w-44"
        />

        <DarkSelect
          value={filters.advisorId}
          onChange={(v) => updateFilter("advisorId", v)}
          options={[{ value: "", label: "All advisors" }, ...users.filter(u => u.role === "ADVISOR" || u.role === "ADMIN").map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]}
          className="w-44"
        />
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <div
          className="rounded-xl py-16 text-center"
          style={{ background: "#161b22", border: "1px solid #21262d" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#21262d" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: "#7d8590" }}>
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>No cases found</p>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            {filters.search || filters.status || filters.advisorId
              ? "Try adjusting your filters."
              : "Create a new case to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          {cases.map((c, i) => (
            <Link
              key={c.id}
              href={`/dashboard/cases/${c.id}`}
              className={`flex items-center gap-4 px-5 transition-colors hover:bg-[#1c2128] group ${compact ? "py-2.5" : "py-3.5"}`}
              style={{
                borderTop: i !== 0 ? "1px solid #21262d" : undefined,
                borderLeft: c.highPriority ? "2px solid #f87171" : undefined,
              }}
            >
              {/* Client */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate group-hover:text-blue-400 transition-colors" style={{ color: "#c9d1d9" }}>
                    {c.clientFirstName} {c.clientLastName}
                  </p>
                  {c.highPriority && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "#3d1f1f", color: "#f87171" }}>
                      Priority
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: "#7d8590" }}>
                  {c.sourceProvider}
                  <span className="mx-1" style={{ color: "#484f58" }}>→</span>
                  {c.destinationCustodian}
                </p>
              </div>

              {/* Advisor */}
              <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 w-36">
                {c.assignedAdvisor ? (
                  <>
                    <InitialsAvatar name={`${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`} />
                    <span className="text-xs truncate" style={{ color: "#8b949e" }}>
                      {c.assignedAdvisor.firstName} {c.assignedAdvisor.lastName}
                    </span>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: "#484f58" }}>Unassigned</span>
                )}
              </div>

              {/* Time + status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs hidden sm:block whitespace-nowrap" style={{ color: "#7d8590" }}>
                  {formatDistanceToNow(c.statusUpdatedAt)}
                </span>
                <StatusBadge status={c.status} label={statusLabels[c.status] ?? c.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
