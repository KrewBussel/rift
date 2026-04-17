"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import DarkSelect from "./DarkSelect";
import UserAvatar from "./UserAvatar";

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

interface Filters {
  search: string;
  status: string;
  advisorId: string;
  opsId: string;
}

interface Props {
  cases: Case[];
  users: User[];
  statusLabels: Record<string, string>;
  filters: Filters;
  compact?: boolean;
  userRole?: "ADMIN" | "ADVISOR" | "OPS";
  advisorCounts?: Record<string, number>;
  opsCounts?: Record<string, number>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                 { bg: "#21262d", text: "#8b949e", dot: "#6e7681" },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208", text: "#e09937", dot: "#d29922" },
  READY_TO_SUBMIT:        { bg: "#0d1f38", text: "#79c0ff", dot: "#388bfd" },
  SUBMITTED:              { bg: "#1d1535", text: "#c4b5fd", dot: "#a78bfa" },
  PROCESSING:             { bg: "#2d1f0e", text: "#fdba74", dot: "#fb923c" },
  IN_TRANSIT:             { bg: "#0d1535", text: "#a5b4fc", dot: "#818cf8" },
  COMPLETED:              { bg: "#0d2318", text: "#6ee7b7", dot: "#3fb950" },
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#21262d", text: "#8b949e", dot: "#6e7681" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: colors.dot }} />
      {label}
    </span>
  );
}

function PersonAvatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "xs";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
      style={{
        width: size === "sm" ? 24 : 20,
        height: size === "sm" ? 24 : 20,
        fontSize: size === "sm" ? 9 : 8,
        background: "#2d333b",
        color: "#8b949e",
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Person filter chip ──────────────────────────────────────────────────── */

function PersonChip({
  active,
  onClick,
  initials,
  name,
  count,
}: {
  active: boolean;
  onClick: () => void;
  initials?: string;
  name: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
      style={{
        padding: "5px 10px 5px 7px",
        background: active ? "#0d2048" : "#1c2128",
        border: `1px solid ${active ? "#388bfd" : "#30363d"}`,
        color: active ? "#79c0ff" : "#8b949e",
      }}
    >
      {initials ? (
        <div
          className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
          style={{
            width: 18,
            height: 18,
            fontSize: 8,
            background: active ? "#388bfd" : "#2d333b",
            color: active ? "#fff" : "#8b949e",
          }}
        >
          {initials}
        </div>
      ) : (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: 18,
            height: 18,
            background: active ? "#388bfd26" : "#21262d",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.5 9c0-1.66 1.567-3 3.5-3s3.5 1.34 3.5 3"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <span className="max-w-[96px] truncate">{name}</span>
      <span
        className="rounded-full px-1.5 font-semibold leading-none"
        style={{
          paddingTop: 3,
          paddingBottom: 3,
          fontSize: 10,
          background: active ? "#388bfd26" : "#21262d",
          color: active ? "#79c0ff" : "#6e7681",
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Person filter row ───────────────────────────────────────────────────── */

function PersonFilterRow({
  label,
  people,
  activeId,
  counts,
  onSelect,
}: {
  label: string;
  people: User[];
  activeId: string;
  counts: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const unassignedCount = counts["unassigned"] ?? 0;

  return (
    <div className="flex items-start gap-3">
      <span
        className="text-[10px] font-semibold uppercase tracking-widest pt-[7px] flex-shrink-0 text-right"
        style={{ color: "#484f58", width: 52 }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <PersonChip
          active={activeId === ""}
          onClick={() => onSelect("")}
          name="All"
          count={total}
        />
        {people.map((person) => (
          <PersonChip
            key={person.id}
            active={activeId === person.id}
            onClick={() => onSelect(activeId === person.id ? "" : person.id)}
            initials={`${person.firstName[0]}${person.lastName[0]}`}
            name={`${person.firstName} ${person.lastName}`}
            count={counts[person.id] ?? 0}
          />
        ))}
        {unassignedCount > 0 && (
          <PersonChip
            active={activeId === "unassigned"}
            onClick={() => onSelect(activeId === "unassigned" ? "" : "unassigned")}
            name="Unassigned"
            count={unassignedCount}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

const INPUT_STYLE: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid #30363d",
  color: "#c9d1d9",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
};

export default function CaseList({
  cases,
  users,
  statusLabels,
  filters,
  compact = false,
  userRole = "ADMIN",
  advisorCounts = {},
  opsCounts = {},
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(updates: Partial<Filters>) {
    const next = { ...filters, ...updates };
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.status) params.set("status", next.status);
    if (next.advisorId) params.set("advisorId", next.advisorId);
    if (next.opsId) params.set("opsId", next.opsId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const isAdmin = userRole === "ADMIN";
  const hasPersonFilter = isAdmin && (filters.advisorId !== "" || filters.opsId !== "");
  const hasAnyFilter = filters.search !== "" || filters.status !== "" || hasPersonFilter;

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>
            Cases
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#7d8590" }}>
            {cases.length} {cases.length !== 1 ? "cases" : "case"}
            {hasAnyFilter ? " matching filters" : " total"}
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: "#2563eb" }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Case
        </Link>
      </div>

      {/* Filter panel */}
      <div
        className="rounded-xl mb-4"
        style={{ background: "#161b22", border: "1px solid #21262d" }}
      >
        {/* Search + status row */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ color: "#7d8590" }}>
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clients…"
              defaultValue={filters.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5"
              style={{ ...INPUT_STYLE, caretColor: "#58a6ff" }}
            />
          </div>

          <DarkSelect
            value={filters.status}
            onChange={(v) => updateFilter({ status: v })}
            options={[
              { value: "", label: "All statuses" },
              ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
            ]}
            className="w-44"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clear filters */}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#21262d]"
              style={{ color: "#7d8590", border: "1px solid #30363d" }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 2l7 7M9 2L2 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Clear filters
            </button>
          )}

          {/* Non-admin scope badge */}
          {!isAdmin && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
              style={{ background: "#0d1117", border: "1px solid #21262d", color: "#7d8590" }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Your assigned cases
            </span>
          )}
        </div>

        {/* Person filters — admin only */}
        {isAdmin && (advisors.length > 0 || ops.length > 0) && (
          <div
            className="px-4 py-3 space-y-2.5"
            style={{ borderTop: "1px solid #21262d" }}
          >
            {advisors.length > 0 && (
              <PersonFilterRow
                label="Advisor"
                people={advisors}
                activeId={filters.advisorId}
                counts={advisorCounts}
                onSelect={(id) => updateFilter({ advisorId: id })}
              />
            )}
            {ops.length > 0 && (
              <PersonFilterRow
                label="Ops"
                people={ops}
                activeId={filters.opsId}
                counts={opsCounts}
                onSelect={(id) => updateFilter({ opsId: id })}
              />
            )}
          </div>
        )}
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <div
          className="rounded-xl py-16 text-center"
          style={{ background: "#161b22", border: "1px solid #21262d" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "#21262d" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: "#7d8590" }}>
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>
            No cases found
          </p>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            {hasAnyFilter ? "Try adjusting your filters." : "Create a new case to get started."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/cases/${c.id}`}
              className="block group rounded overflow-hidden transition-colors"
              style={{
                border: "1px solid #21262d",
                borderLeft: c.highPriority ? "3px solid #f87171" : "1px solid #21262d",
              }}
            >
              {/* Main body */}
              <div
                className="flex items-start justify-between gap-4 px-4 pt-3.5 pb-3 transition-colors group-hover:bg-[#1c2128]"
                style={{ background: "#161b22" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold truncate transition-colors group-hover:text-blue-400"
                      style={{ color: "#e4e6ea" }}
                    >
                      {c.clientFirstName} {c.clientLastName}
                    </span>
                    {c.highPriority && (
                      <span
                        className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                        style={{ background: "#3d1f1f", color: "#f87171" }}
                      >
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: "#7d8590" }}>
                    {c.sourceProvider}
                    <span className="mx-1.5" style={{ color: "#484f58" }}>→</span>
                    {c.destinationCustodian}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  <StatusBadge status={c.status} label={statusLabels[c.status] ?? c.status} />
                </div>
              </div>

              {/* Footer strip */}
              <div
                className="flex items-center gap-5 px-4 py-2 transition-colors group-hover:bg-[#161b22]"
                style={{ background: "#0d1117", borderTop: "1px solid #21262d" }}
              >
                {/* Advisor */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-medium mr-0.5" style={{ color: "#484f58" }}>Adv</span>
                  {c.assignedAdvisor ? (
                    <>
                      <UserAvatar userId={c.assignedAdvisor.id} name={`${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`} size="xs" />
                      <span className="text-xs truncate" style={{ color: "#8b949e" }}>
                        {c.assignedAdvisor.firstName} {c.assignedAdvisor.lastName}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: "#484f58" }}>Unassigned</span>
                  )}
                </div>

                {/* Ops — admin only */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-medium mr-0.5" style={{ color: "#484f58" }}>Ops</span>
                    {c.assignedOps ? (
                      <>
                        <UserAvatar userId={c.assignedOps.id} name={`${c.assignedOps.firstName} ${c.assignedOps.lastName}`} size="xs" />
                        <span className="text-xs truncate" style={{ color: "#8b949e" }}>
                          {c.assignedOps.firstName} {c.assignedOps.lastName}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: "#484f58" }}>—</span>
                    )}
                  </div>
                )}

                <span className="text-xs ml-auto whitespace-nowrap" style={{ color: "#484f58" }}>
                  {formatDistanceToNow(c.statusUpdatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
