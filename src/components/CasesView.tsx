"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CasesViewBoard from "./CasesViewBoard";
import CasesViewWorkbench from "./CasesViewWorkbench";
import {
  STATUSES as STATUS_DEFS,
  HUE,
  BOARD_TEXT,
  BOARD_MUTED,
  BOARD_TERTIARY,
  BOARD_BORDER,
  BOARD_BORDER_STRONG,
  BOARD_SURFACE_2,
  BOARD_SURFACE_3,
  BOARD_INPUT,
  BOARD_ACCENT,
  resolveEnabledStages,
  type StageConfigRow,
} from "./casesDesignTokens";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type CasesViewUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type CasesViewCase = {
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
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
};

type Role = "ADMIN" | "ADVISOR" | "OPS";
type ViewMode = "board" | "grid";

const VIEW_STORAGE_KEY = "rift-cases-view";

/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function CasesView({
  cases: initialCases,
  users,
  userRole,
  initialStatus = "",
  stageConfig = null,
}: {
  cases: CasesViewCase[];
  users: CasesViewUser[];
  userRole: Role;
  initialStatus?: string;
  stageConfig?: StageConfigRow[] | null;
}) {
  const isAdmin = userRole === "ADMIN";

  // Local mirror so we can do optimistic status updates without a refetch.
  const [cases, setCases] = useState(initialCases);
  useEffect(() => setCases(initialCases), [initialCases]);

  const [view, setView] = useState<ViewMode>("board");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [ownerId, setOwnerId] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);

  // Restore view preference (only after mount to avoid SSR mismatch).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (saved === "board" || saved === "grid") setView(saved);
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* noop — storage may be unavailable */
    }
  }

  async function handleStatusChange(caseId: string, nextStatus: string) {
    const previous = cases.find((c) => c.id === caseId);
    if (!previous || previous.status === nextStatus) return;
    // Optimistic update
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: nextStatus, statusUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : c))
    );
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Roll back on failure
      setCases((prev) => prev.map((c) => (c.id === caseId ? previous : c)));
    }
  }

  const filtered = useMemo(() => {
    let result = cases;
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.clientFirstName.toLowerCase().includes(q) ||
          c.clientLastName.toLowerCase().includes(q) ||
          `${c.clientFirstName} ${c.clientLastName}`.toLowerCase().includes(q) ||
          c.clientEmail.toLowerCase().includes(q) ||
          c.sourceProvider.toLowerCase().includes(q) ||
          c.destinationCustodian.toLowerCase().includes(q)
      );
    }
    if (status) result = result.filter((c) => c.status === status);
    if (ownerId && isAdmin) {
      if (ownerId === "unassigned") {
        result = result.filter((c) => !c.assignedAdvisor && !c.assignedOps);
      } else {
        result = result.filter(
          (c) => c.assignedAdvisor?.id === ownerId || c.assignedOps?.id === ownerId
        );
      }
    }
    if (priorityOnly) result = result.filter((c) => c.highPriority);
    return result;
  }, [cases, search, status, ownerId, priorityOnly, isAdmin]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "": cases.length };
    for (const c of cases) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [cases]);

  const ownerCounts = useMemo(() => {
    if (!isAdmin) return { byId: new Map<string, number>(), unassigned: 0 };
    const byId = new Map<string, number>();
    let unassigned = 0;
    for (const c of cases) {
      if (c.assignedAdvisor) byId.set(c.assignedAdvisor.id, (byId.get(c.assignedAdvisor.id) ?? 0) + 1);
      if (c.assignedOps) byId.set(c.assignedOps.id, (byId.get(c.assignedOps.id) ?? 0) + 1);
      if (!c.assignedAdvisor && !c.assignedOps) unassigned++;
    }
    return { byId, unassigned };
  }, [cases, isAdmin]);

  const hasFilters = !!(search || status || ownerId || priorityOnly);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div
        className="rounded-lg p-3"
        style={{ background: BOARD_SURFACE_2, border: `1px solid ${BOARD_BORDER}` }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={setSearch} />
          {isAdmin && (
            <OwnerFilter
              users={users}
              selected={ownerId}
              onChange={setOwnerId}
              counts={ownerCounts.byId}
              unassignedCount={ownerCounts.unassigned}
            />
          )}
          <PriorityToggle active={priorityOnly} onChange={setPriorityOnly} />

          <div className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setOwnerId("");
                  setPriorityOnly(false);
                }}
                className="text-xs px-2.5 py-1.5 rounded-md transition-colors"
                style={{ background: "transparent", color: BOARD_ACCENT }}
              >
                Clear filters
              </button>
            )}
            <ViewToggle view={view} onChange={changeView} />
          </div>
        </div>

        {/* Status tabs — only for grid view (Board uses columns instead) */}
        {view === "grid" && (
          <div className="flex items-center gap-1 flex-wrap mt-3">
            <StatusTab
              label="All"
              count={statusCounts[""] ?? 0}
              active={status === ""}
              onClick={() => setStatus("")}
            />
            {resolveEnabledStages(stageConfig).map((s) => (
              <StatusTab
                key={s.value}
                label={s.label === STATUS_DEFS.find((d) => d.value === s.value)?.label ? s.short : s.label}
                count={statusCounts[s.value] ?? 0}
                active={status === s.value}
                hue={HUE[s.hue]}
                onClick={() => setStatus(status === s.value ? "" : s.value)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Count + create */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: BOARD_MUTED }}>
          {filtered.length === cases.length
            ? `${cases.length.toLocaleString()} ${cases.length === 1 ? "case" : "cases"}`
            : `Showing ${filtered.length.toLocaleString()} of ${cases.length.toLocaleString()}`}
        </p>
        {userRole !== "OPS" && (
          <Link
            href="/dashboard/cases/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            style={{ background: BOARD_ACCENT, color: "#fff" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New case
          </Link>
        )}
      </div>

      {/* Active view */}
      {filtered.length === 0 ? (
        <div className="rounded-lg" style={{ background: BOARD_SURFACE_2, border: `1px solid ${BOARD_BORDER}` }}>
          <EmptyState hasFilters={hasFilters} canCreate={userRole !== "OPS"} />
        </div>
      ) : view === "board" ? (
        <CasesViewBoard cases={filtered} onStatusChange={handleStatusChange} stageConfig={stageConfig} />
      ) : (
        <CasesViewWorkbench cases={filtered} onStatusChange={handleStatusChange} stageConfig={stageConfig} />
      )}
    </div>
  );
}

/* ─── View toggle ────────────────────────────────────────────────────────── */

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="inline-flex rounded-md"
      role="tablist"
      style={{ background: BOARD_INPUT, border: `1px solid ${BOARD_BORDER}` }}
    >
      <ToggleButton active={view === "board"} onClick={() => onChange("board")} label="Board">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="5" y="1" width="3" height="6"  rx="0.5" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9" y="1" width="2" height="8"  rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </ToggleButton>
      <ToggleButton active={view === "grid"} onClick={() => onChange("grid")} label="Grid">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 4.5h10M1 8h10M4.5 1v10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      title={label}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? BOARD_SURFACE_3 : "transparent",
        color: active ? BOARD_TEXT : BOARD_MUTED,
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/* ─── Filter controls ────────────────────────────────────────────────────── */

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[240px] max-w-md">
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: BOARD_TERTIARY }}
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search clients, providers, custodians…"
        className="w-full rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none transition-colors"
        style={{ background: BOARD_INPUT, border: `1px solid ${BOARD_BORDER}`, color: BOARD_TEXT }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f680")}
        onBlur={(e) => (e.currentTarget.style.borderColor = BOARD_BORDER)}
      />
    </div>
  );
}

function PriorityToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md transition-colors"
      style={{
        background: active ? "#2a1313" : "transparent",
        border: `1px solid ${active ? "#5c2626" : BOARD_BORDER}`,
        color: active ? "#f87171" : BOARD_MUTED,
      }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: active ? "#f87171" : BOARD_TERTIARY }} />
      Priority
    </button>
  );
}

function OwnerFilter({
  users,
  selected,
  onChange,
  counts,
  unassignedCount,
}: {
  users: CasesViewUser[];
  selected: string;
  onChange: (v: string) => void;
  counts: Map<string, number>;
  unassignedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const current =
    selected === ""
      ? "Anyone"
      : selected === "unassigned"
      ? "Unassigned"
      : (() => {
          const u = users.find((u) => u.id === selected);
          return u ? `${u.firstName} ${u.lastName}` : "Anyone";
        })();

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md transition-colors"
        style={{
          background: selected ? "#0f1a2e" : "transparent",
          border: `1px solid ${selected ? "#1f2e4d" : BOARD_BORDER}`,
          color: selected ? "#5b8def" : BOARD_TEXT,
        }}
      >
        <span style={{ color: selected ? "#5b8def" : BOARD_MUTED }}>Owner:</span>
        <span>{current}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-30 rounded-lg overflow-hidden w-72"
          style={{ background: BOARD_SURFACE_2, border: `1px solid ${BOARD_BORDER_STRONG}`, boxShadow: "0 20px 50px -15px rgba(0,0,0,0.6)" }}
        >
          <div className="p-2" style={{ borderBottom: `1px solid ${BOARD_BORDER}` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team members…"
              className="w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none"
              style={{ background: BOARD_INPUT, border: `1px solid ${BOARD_BORDER}`, color: BOARD_TEXT }}
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            <OwnerOption
              label="Anyone"
              detail=""
              selected={selected === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              hideDetail
            />
            <OwnerOption
              label="Unassigned"
              detail={`${unassignedCount}`}
              selected={selected === "unassigned"}
              onClick={() => {
                onChange("unassigned");
                setOpen(false);
              }}
            />
            {filteredUsers.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest" style={{ color: BOARD_TERTIARY }}>
                Team
              </li>
            )}
            {filteredUsers.map((u) => (
              <OwnerOption
                key={u.id}
                label={`${u.firstName} ${u.lastName}`}
                detail={`${counts.get(u.id) ?? 0}`}
                selected={selected === u.id}
                role={u.role}
                onClick={() => {
                  onChange(u.id);
                  setOpen(false);
                }}
              />
            ))}
            {filteredUsers.length === 0 && query && (
              <li className="px-3 py-3 text-xs" style={{ color: BOARD_MUTED }}>
                No matches
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function OwnerOption({
  label,
  detail,
  selected,
  role,
  onClick,
  hideDetail,
}: {
  label: string;
  detail: string;
  selected: boolean;
  role?: string;
  onClick: () => void;
  hideDetail?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#1a1f2b]"
        style={{ background: selected ? BOARD_SURFACE_3 : "transparent" }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate" style={{ color: BOARD_TEXT }}>{label}</span>
          {role && (
            <span
              className="text-[9px] uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
              style={{
                background: role === "ADMIN" ? "#1a1530" : role === "ADVISOR" ? "#0f1a2e" : "#1a1530",
                color: role === "ADMIN" ? "#a78bfa" : role === "ADVISOR" ? "#5b8def" : "#a78bfa",
              }}
            >
              {role === "ADVISOR" ? "ADV" : role === "OPS" ? "OPS" : "ADM"}
            </span>
          )}
        </span>
        {!hideDetail && (
          <span className="text-xs tabular-nums" style={{ color: BOARD_TERTIARY }}>{detail}</span>
        )}
      </button>
    </li>
  );
}

function StatusTab({
  label,
  count,
  active,
  hue,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  hue?: { fg: string; bg: string; line: string; dot: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
      style={{
        background: active ? (hue ? hue.bg : BOARD_SURFACE_3) : "transparent",
        border: `1px solid ${active ? (hue ? hue.line : BOARD_BORDER_STRONG) : BOARD_BORDER}`,
        color: active ? (hue ? hue.fg : BOARD_TEXT) : BOARD_MUTED,
      }}
    >
      {hue && <span className="w-1.5 h-1.5 rounded-full" style={{ background: hue.dot }} />}
      <span>{label}</span>
      <span className="tabular-nums text-[10px]" style={{ color: active ? (hue ? hue.fg : BOARD_TEXT) : BOARD_TERTIARY }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

function EmptyState({ hasFilters, canCreate }: { hasFilters: boolean; canCreate: boolean }) {
  return (
    <div className="text-center py-14 px-6">
      <div
        className="inline-flex w-11 h-11 rounded-full items-center justify-center mb-4"
        style={{ background: BOARD_SURFACE_3, border: `1px solid ${BOARD_BORDER}`, color: BOARD_MUTED }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: BOARD_TEXT }}>
        {hasFilters ? "No cases match these filters" : "No cases yet"}
      </p>
      <p className="text-xs mt-1" style={{ color: BOARD_MUTED }}>
        {hasFilters ? "Try adjusting or clearing the filters above." : "Create your first case to get started."}
      </p>
      {!hasFilters && canCreate && (
        <Link
          href="/dashboard/cases/new"
          className="inline-block mt-4 text-xs font-semibold px-3 py-1.5 rounded-md"
          style={{ background: BOARD_ACCENT, color: "#fff" }}
        >
          + New case
        </Link>
      )}
    </div>
  );
}
