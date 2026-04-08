"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";

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
  INTAKE:                  { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  AWAITING_CLIENT_ACTION:  { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  READY_TO_SUBMIT:         { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  SUBMITTED:               { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500" },
  PROCESSING:              { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  IN_TRANSIT:              { bg: "bg-indigo-50",  text: "text-indigo-700", dot: "bg-indigo-500" },
  COMPLETED:               { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500"},
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      {label}
    </span>
  );
}

function InitialsAvatar({ name, color = "bg-gray-700" }: { name: string; color?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-[9px] font-semibold">{initials}</span>
    </div>
  );
}

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
          <h1 className="text-lg font-semibold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {cases.length} {cases.length !== 1 ? "cases" : "case"}
            {filters.search || filters.status || filters.advisorId ? " matching filters" : " total"}
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          style={{ boxShadow: "0 1px 2px rgb(37 99 235 / 0.25)" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-gray-400">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search clients…"
            defaultValue={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            style={{ boxShadow: "var(--shadow-xs)" }}
          />
        </div>

        <select
          defaultValue={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          defaultValue={filters.advisorId}
          onChange={(e) => updateFilter("advisorId", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <option value="">All advisors</option>
          {users.filter(u => u.role === "ADVISOR" || u.role === "ADMIN").map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center" style={{ boxShadow: "var(--shadow-xs)" }}>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No cases found</p>
          <p className="text-sm text-gray-400 mt-1">
            {filters.search || filters.status || filters.advisorId
              ? "Try adjusting your filters."
              : "Create a new case to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "var(--shadow-xs)" }}>
          {cases.map((c, i) => (
            <Link
              key={c.id}
              href={`/dashboard/cases/${c.id}`}
              className={`flex items-center gap-4 px-5 hover:bg-gray-50 transition-colors group ${
                compact ? "py-2.5" : "py-3.5"
              } ${i !== 0 ? "border-t border-gray-100" : ""} ${
                c.highPriority ? "border-l-2 border-l-red-400" : ""
              }`}
            >
              {/* Client */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {c.clientFirstName} {c.clientLastName}
                  </p>
                  {c.highPriority && (
                    <span className="flex-shrink-0 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Priority
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {c.sourceProvider}
                  <span className="mx-1 text-gray-300">→</span>
                  {c.destinationCustodian}
                </p>
              </div>

              {/* Advisor */}
              <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 w-36">
                {c.assignedAdvisor ? (
                  <>
                    <InitialsAvatar name={`${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`} />
                    <span className="text-xs text-gray-500 truncate">
                      {c.assignedAdvisor.firstName} {c.assignedAdvisor.lastName}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-300">Unassigned</span>
                )}
              </div>

              {/* Time + status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">
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
