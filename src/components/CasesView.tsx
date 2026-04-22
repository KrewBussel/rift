"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import Avatar from "./Avatar";

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
  statusUpdatedAt: string;
  updatedAt: string;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
};

type Role = "ADMIN" | "ADVISOR" | "OPS";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "INTAKE", label: "Intake" },
  { value: "AWAITING_CLIENT_ACTION", label: "Awaiting client" },
  { value: "READY_TO_SUBMIT", label: "Ready to submit" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                 { bg: "#21262d", text: "#8b949e", dot: "#6e7681" },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208", text: "#e09937", dot: "#d29922" },
  READY_TO_SUBMIT:        { bg: "#0d1f38", text: "#79c0ff", dot: "#388bfd" },
  SUBMITTED:              { bg: "#1d1535", text: "#c4b5fd", dot: "#a78bfa" },
  PROCESSING:             { bg: "#2d1f0e", text: "#fdba74", dot: "#fb923c" },
  IN_TRANSIT:             { bg: "#0d1535", text: "#a5b4fc", dot: "#818cf8" },
  COMPLETED:              { bg: "#0d2318", text: "#6ee7b7", dot: "#3fb950" },
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TRADITIONAL_IRA_401K: "Traditional IRA",
  ROTH_IRA_401K: "Roth IRA",
  IRA_403B: "403(b) → IRA",
  OTHER: "Other",
};

const PANEL = { background: "#141a24", border: "1px solid #252b38" };
const MUTED = "#8b949e";
const TEXT = "#e4e6ea";

/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function CasesView({
  cases,
  users,
  userRole,
  initialStatus = "",
}: {
  cases: CasesViewCase[];
  users: CasesViewUser[];
  userRole: Role;
  initialStatus?: string;
}) {
  const isAdmin = userRole === "ADMIN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [ownerId, setOwnerId] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-xl p-3 md:p-4" style={PANEL}>
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
          {(search || status || ownerId || priorityOnly) && (
            <button
              onClick={() => {
                setSearch("");
                setStatus("");
                setOwnerId("");
                setPriorityOnly(false);
              }}
              className="text-xs px-3 py-1.5 rounded-md ml-auto"
              style={{ background: "transparent", color: "#60a5fa" }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {STATUSES.map((s) => (
            <StatusPill
              key={s.value || "all"}
              label={s.label}
              count={statusCounts[s.value] ?? 0}
              active={status === s.value}
              color={s.value ? STATUS_COLORS[s.value] : undefined}
              onClick={() => setStatus(s.value)}
            />
          ))}
        </div>
      </div>

      {/* Count + create */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: MUTED }}>
          {filtered.length === cases.length
            ? `${cases.length.toLocaleString()} ${cases.length === 1 ? "case" : "cases"}`
            : `Showing ${filtered.length.toLocaleString()} of ${cases.length.toLocaleString()}`}
        </p>
        <Link
          href="/dashboard/cases/new"
          className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          style={{ background: "#2563eb", color: "#fff" }}
        >
          + New case
        </Link>
      </div>

      {/* Case list */}
      <div className="rounded-xl overflow-hidden" style={PANEL}>
        {filtered.length === 0 ? (
          <EmptyState hasFilters={!!(search || status || ownerId || priorityOnly)} />
        ) : (
          <ul>
            {filtered.map((c, i) => (
              <CaseRow key={c.id} rolloverCase={c} isLast={i === filtered.length - 1} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Filter controls ────────────────────────────────────────────────────── */

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[240px] max-w-md">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "#7d8590" }}
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search clients, providers…"
        className="w-full rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-0/40 transition-colors"
        style={{ background: "#0a0d12", border: "1px solid #252b38", color: TEXT }}
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
        border: `1px solid ${active ? "#5c2626" : "#252b38"}`,
        color: active ? "#f87171" : "#9ca3af",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M7 1.5l6 11h-12l6-11z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
          fill={active ? "#3c1818" : "none"}
        />
      </svg>
      High priority
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
        className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md transition-colors"
        style={{
          background: selected ? "#0d1f38" : "transparent",
          border: `1px solid ${selected ? "#1e3a8a" : "#252b38"}`,
          color: selected ? "#79c0ff" : "#c9d1d9",
        }}
      >
        <span style={{ color: selected ? "#79c0ff" : "#7d8590" }}>Owner:</span>
        <span>{current}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-30 rounded-lg overflow-hidden w-72"
          style={{
            background: "#141a24",
            border: "1px solid #2d3548",
            boxShadow: "0 20px 50px -15px rgba(0,0,0,0.6)",
          }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid #252b38" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team members…"
              className="w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none"
              style={{ background: "#0a0d12", border: "1px solid #252b38", color: TEXT }}
            />
          </div>
          <ul className="max-h-72 overflow-y-auto widget-scroll py-1">
            <OwnerOption
              label="Anyone"
              detail={`${Array.from(counts.values()).reduce((a, b) => Math.max(a, b), 0)} max`}
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
              <li className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest" style={{ color: "#6b7280" }}>
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
              <li className="px-3 py-3 text-xs" style={{ color: "#7d8590" }}>
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
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-[#141924]"
        style={{ background: selected ? "#141924" : "transparent" }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate" style={{ color: TEXT }}>{label}</span>
          {role && (
            <span
              className="text-[9px] uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
              style={{
                background: role === "ADMIN" ? "#1d1535" : role === "ADVISOR" ? "#0d1f38" : "#1d1535",
                color: role === "ADMIN" ? "#c4b5fd" : role === "ADVISOR" ? "#79c0ff" : "#c4b5fd",
              }}
            >
              {role === "ADVISOR" ? "ADV" : role === "OPS" ? "OPS" : "ADM"}
            </span>
          )}
        </span>
        {!hideDetail && (
          <span className="text-xs tabular-nums" style={{ color: "#7d8590" }}>{detail}</span>
        )}
      </button>
    </li>
  );
}

function StatusPill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: { bg: string; text: string; dot: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
      style={{
        background: active ? color?.bg ?? "#1f2937" : "transparent",
        border: `1px solid ${active ? color?.bg ?? "#30363d" : "#252b38"}`,
        color: active ? color?.text ?? TEXT : "#9ca3af",
      }}
    >
      {color && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.dot }} />
      )}
      <span>{label}</span>
      <span className="tabular-nums text-[11px]" style={{ color: active ? color?.text : "#6b7280" }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Case row ───────────────────────────────────────────────────────────── */

function CaseRow({ rolloverCase: c, isLast }: { rolloverCase: CasesViewCase; isLast: boolean }) {
  const color = STATUS_COLORS[c.status] ?? STATUS_COLORS.INTAKE;
  const statusLabel = STATUSES.find((s) => s.value === c.status)?.label ?? c.status;
  const accountLabel = ACCOUNT_TYPE_LABELS[c.accountType] ?? c.accountType;

  return (
    <li style={{ borderBottom: isLast ? undefined : "1px solid #1a1f2a" }}>
      <Link
        href={`/dashboard/cases/${c.id}`}
        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#141924] group"
      >
        {/* Stage dot */}
        <span
          className="flex-shrink-0 w-2 h-2 rounded-full"
          style={{ background: color.dot }}
          aria-label={statusLabel}
        />

        {/* Client + route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
              {c.clientFirstName} {c.clientLastName}
            </p>
            {c.highPriority && (
              <span
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: "#2a1313",
                  color: "#f87171",
                  border: "1px solid #5c2626",
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: "#f87171" }} />
                Priority
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
            <span style={{ color: color.text }}>{statusLabel}</span>
            <span className="mx-1.5" style={{ color: "#3d4450" }}>·</span>
            {c.sourceProvider}
            <span className="mx-1 text-[10px]" style={{ color: "#3d4450" }}>→</span>
            {c.destinationCustodian}
            <span className="mx-1.5" style={{ color: "#3d4450" }}>·</span>
            {accountLabel}
          </p>
        </div>

        {/* Assignees */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <AssigneeChip user={c.assignedAdvisor} role="ADVISOR" />
          <AssigneeChip user={c.assignedOps} role="OPS" />
        </div>

        {/* Last updated */}
        <p className="hidden sm:block flex-shrink-0 text-xs w-28 text-right tabular-nums" style={{ color: "#7d8590" }}>
          {formatDateTime(c.updatedAt)}
        </p>

        {/* Arrow */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: "#7d8590" }}
        >
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </li>
  );
}

function AssigneeChip({
  user,
  role,
}: {
  user: { id: string; firstName: string; lastName: string } | null;
  role: "ADVISOR" | "OPS";
}) {
  if (!user) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: "transparent", border: "1px dashed #30363d", color: "#6b7280" }}
        title={`No ${role === "ADVISOR" ? "advisor" : "ops"}`}
      >
        {role === "ADVISOR" ? "ADV" : "OPS"} —
      </span>
    );
  }
  const colors = role === "ADVISOR"
    ? { bg: "#0d1f38", text: "#79c0ff", border: "#1e3a8a" }
    : { bg: "#1d1535", text: "#c4b5fd", border: "#2d2f5a" };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs pl-0.5 pr-2 py-0.5 rounded"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
      title={`${role === "ADVISOR" ? "Advisor" : "Ops"}: ${user.firstName} ${user.lastName}`}
    >
      <Avatar userId={user.id} firstName={user.firstName} lastName={user.lastName} size={18} />
      <span className="hidden lg:inline">{user.firstName}</span>
    </span>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-14 px-6">
      <div
        className="inline-flex w-11 h-11 rounded-full items-center justify-center mb-4"
        style={{ background: "#141924", border: "1px solid #252b38", color: "#7d8590" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: TEXT }}>
        {hasFilters ? "No cases match these filters" : "No cases yet"}
      </p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>
        {hasFilters ? "Try adjusting or clearing the filters above." : "Create your first case to get started."}
      </p>
      {!hasFilters && (
        <Link
          href="/dashboard/cases/new"
          className="inline-block mt-4 text-xs font-medium px-3 py-1.5 rounded-md"
          style={{ background: "#2563eb", color: "#fff" }}
        >
          + New case
        </Link>
      )}
    </div>
  );
}
