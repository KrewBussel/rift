"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { formatDistanceToNow } from "@/lib/utils";
import type { CasesViewCase } from "./CasesView";
import {
  STATUSES,
  STATUS_BY_VALUE,
  HUE,
  ACCOUNT_LABEL,
  BOARD_TEXT,
  BOARD_MUTED,
  BOARD_TERTIARY,
  BOARD_BORDER,
  BOARD_BORDER_STRONG,
  BOARD_SURFACE_1,
  BOARD_SURFACE_2,
  BOARD_SURFACE_3,
  BOARD_ACCENT,
  resolveEnabledStages,
  resolveStageLabel,
  type StageConfigRow,
} from "./casesDesignTokens";

type Props = {
  cases: CasesViewCase[];
  onStatusChange: (caseId: string, status: string) => void;
  stageConfig?: StageConfigRow[] | null;
};

type SortKey = "client" | "stage" | "provider" | "custodian" | "accountType" | "age" | "advisorId" | "opsId" | "lastUpdate";
type SortState = { key: SortKey; dir: "asc" | "desc" };

export default function CasesViewWorkbench({ cases, onStatusChange, stageConfig = null }: Props) {
  const [sort, setSort] = useState<SortState>({ key: "lastUpdate", dir: "desc" });
  // `selectedId` is the user's intent; the actually-displayed case falls back to
  // the first row when the selection no longer exists in the current filter.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 3_600_000);
    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    const arr = [...cases];
    const dir = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sort.key) {
        case "client":
          av = a.clientLastName + a.clientFirstName;
          bv = b.clientLastName + b.clientFirstName;
          break;
        case "stage":
          av = STATUSES.findIndex((s) => s.value === a.status);
          bv = STATUSES.findIndex((s) => s.value === b.status);
          break;
        case "provider":   av = a.sourceProvider; bv = b.sourceProvider; break;
        case "custodian":  av = a.destinationCustodian; bv = b.destinationCustodian; break;
        case "accountType":av = a.accountType; bv = b.accountType; break;
        case "age":        av = ageDays(a.createdAt, now); bv = ageDays(b.createdAt, now); break;
        case "advisorId":  av = a.assignedAdvisor?.lastName ?? "zzz"; bv = b.assignedAdvisor?.lastName ?? "zzz"; break;
        case "opsId":      av = a.assignedOps?.lastName ?? "zzz"; bv = b.assignedOps?.lastName ?? "zzz"; break;
        case "lastUpdate": av = a.updatedAt; bv = b.updatedAt; break;
      }
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return arr;
  }, [cases, sort, now]);

  // Fallback selection: if the user's choice is filtered out, show the first row.
  const active = useMemo(() => {
    if (!sorted.length) return null;
    if (selectedId) {
      const match = sorted.find((c) => c.id === selectedId);
      if (match) return match;
    }
    return sorted[0];
  }, [sorted, selectedId]);
  const activeId = active?.id ?? null;

  function onSort(key: SortKey) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  function changeStatus(caseId: string, next: string) {
    setFlashId(caseId);
    onStatusChange(caseId, next);
    setTimeout(() => setFlashId((id) => (id === caseId ? null : id)), 240);
  }

  return (
    <div className="flex overflow-hidden rounded-lg" style={{ background: BOARD_SURFACE_1, border: `1px solid ${BOARD_BORDER}`, minHeight: 520 }}>
      {/* Left: grid */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <Th label="Stage"   sort={sort} sortKey="stage"       onSort={onSort} w={130} />
                <Th label="Client"  sort={sort} sortKey="client"      onSort={onSort} w={240} />
                <Th label="From"    sort={sort} sortKey="provider"    onSort={onSort} w={170} />
                <Th label="To"      sort={sort} sortKey="custodian"   onSort={onSort} w={130} />
                <Th label="Type"    sort={sort} sortKey="accountType" onSort={onSort} w={130} />
                <Th label="Age"     sort={sort} sortKey="age"         onSort={onSort} align="right" w={56} />
                <Th label="Advisor" sort={sort} sortKey="advisorId"   onSort={onSort} w={120} />
                <Th label="Ops"     sort={sort} sortKey="opsId"       onSort={onSort} w={120} />
                <Th label="Updated" sort={sort} sortKey="lastUpdate"  onSort={onSort} w={90} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12" style={{ color: BOARD_TERTIARY }}>
                    No cases match these filters
                  </td>
                </tr>
              )}
              {sorted.map((c, i) => {
                const isActive = c.id === activeId;
                const flashing = flashId === c.id;
                const stale = ageDays(c.createdAt, now) > 14 && c.status !== "WON" && c.status !== "IN_TRANSIT";
                const rowBg = flashing ? BOARD_SURFACE_3 : isActive ? BOARD_SURFACE_2 : i % 2 ? "#10141d" : BOARD_SURFACE_1;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer"
                    style={{
                      background: rowBg,
                      borderBottom: `1px solid ${BOARD_BORDER}`,
                      transition: "background-color 200ms ease-out",
                    }}
                  >
                    <td className="py-1.5 px-2.5" style={isActive ? { boxShadow: `inset 2px 0 0 ${BOARD_ACCENT}` } : undefined}>
                      <InlineStatus status={c.status} stageConfig={stageConfig} onChange={(v) => changeStatus(c.id, v)} />
                    </td>
                    <td className="py-1.5 px-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.highPriority && <span className="flex-shrink-0" style={{ width: 3, height: 14, background: "#e5484d", borderRadius: 1 }} />}
                        <Link
                          href={`/dashboard/cases/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium truncate hover:underline"
                          style={{ color: BOARD_TEXT }}
                        >
                          {c.clientFirstName} {c.clientLastName}
                        </Link>
                        {c.needsReview && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider flex-shrink-0"
                            style={{ color: "#d29922" }}
                            title={c.reviewReason ?? "Needs review"}
                          >
                            Review
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 truncate" style={{ color: BOARD_MUTED, maxWidth: 0 }}>{c.sourceProvider}</td>
                    <td className="py-1.5 px-2.5 truncate" style={{ color: BOARD_MUTED, maxWidth: 0 }}>{c.destinationCustodian}</td>
                    <td className="py-1.5 px-2.5 text-[11px]" style={{ color: BOARD_TERTIARY }}>{ACCOUNT_LABEL[c.accountType] ?? c.accountType}</td>
                    <td className="py-1.5 px-2.5 text-right tabular-nums text-[11px]" style={{ color: stale ? "#d29922" : BOARD_TERTIARY }}>
                      {ageDays(c.createdAt, now)}d
                    </td>
                    <td className="py-1.5 px-2.5">
                      {c.assignedAdvisor ? (
                        <span className="inline-flex items-center gap-1.5 truncate" style={{ color: BOARD_MUTED }}>
                          <Avatar
                            userId={c.assignedAdvisor.id}
                            firstName={c.assignedAdvisor.firstName}
                            lastName={c.assignedAdvisor.lastName}
                            size={16}
                          />
                          <span className="truncate">
                            {c.assignedAdvisor.firstName} {c.assignedAdvisor.lastName.charAt(0)}.
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: BOARD_TERTIARY }}>—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5">
                      {c.assignedOps ? (
                        <span className="inline-flex items-center gap-1.5 truncate" style={{ color: BOARD_MUTED }}>
                          <Avatar
                            userId={c.assignedOps.id}
                            firstName={c.assignedOps.firstName}
                            lastName={c.assignedOps.lastName}
                            size={16}
                          />
                          <span className="truncate">
                            {c.assignedOps.firstName} {c.assignedOps.lastName.charAt(0)}.
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: BOARD_TERTIARY }}>—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-[10px] tabular-nums" style={{ color: BOARD_TERTIARY }}>
                      {formatDistanceToNow(c.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer hints */}
        <div
          className="flex items-center gap-3 px-4 py-1.5 text-[11px] tabular-nums"
          style={{ borderTop: `1px solid ${BOARD_BORDER}`, background: BOARD_SURFACE_1, color: BOARD_TERTIARY }}
        >
          <span>{sorted.length} {sorted.length === 1 ? "row" : "rows"}</span>
          <span style={{ color: "#3a4252" }}>·</span>
          <span>Sorted by {sort.key} {sort.dir}</span>
        </div>
      </div>

      {/* Right: preview pane */}
      <PreviewPane
        rolloverCase={active}
        now={now}
        onClose={() => setSelectedId(null)}
        onChangeStatus={changeStatus}
        stageConfig={stageConfig}
      />
    </div>
  );
}

/* ─── Header cell with click-to-sort ───────────────────────────────────── */

function Th({
  label,
  sort,
  sortKey,
  onSort,
  align = "left",
  w,
}: {
  label: string;
  sort: SortState;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  w: number;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        textAlign: align,
        padding: "7px 10px",
        color: active ? BOARD_TEXT : BOARD_TERTIARY,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        borderBottom: `1px solid ${BOARD_BORDER}`,
        background: BOARD_SURFACE_2,
        cursor: "pointer",
        userSelect: "none",
        width: w,
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {label}
      <span className="ml-1" style={{ color: active ? BOARD_ACCENT : "#3a4252", fontSize: 9 }}>
        {active ? (sort.dir === "asc" ? "▲" : "▼") : "▾"}
      </span>
    </th>
  );
}

/* ─── Inline status pill with dropdown ────────────────────────────────── */

function InlineStatus({
  status,
  stageConfig,
  onChange,
}: {
  status: string;
  stageConfig: StageConfigRow[] | null;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = STATUS_BY_VALUE[status];
  const c = s ? HUE[s.hue] : HUE.slate;
  // Custom label for the active pill (shorten by using `short` when no override)
  const visibleStages = useMemo(() => resolveEnabledStages(stageConfig), [stageConfig]);
  const overlayLabel = resolveStageLabel(status, stageConfig);
  const showShortLabel = overlayLabel === s?.label; // user didn't customize, fall back to "short"

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
        style={{
          background: "transparent",
          border: `1px solid transparent`,
          color: c.fg,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.line)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {showShortLabel ? s?.short ?? status : overlayLabel}
      </button>
      {open && (
        <div
          className="absolute left-0 mt-1 z-30 rounded-md min-w-[180px]"
          style={{ background: BOARD_SURFACE_2, border: `1px solid ${BOARD_BORDER_STRONG}` }}
        >
          {visibleStages.map((opt) => {
            const oc = HUE[opt.hue];
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px]"
                style={{ background: opt.value === status ? BOARD_SURFACE_3 : "transparent", color: oc.fg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: oc.dot }} />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Right preview pane ───────────────────────────────────────────────── */

function PreviewPane({
  rolloverCase: c,
  now,
  onClose,
  onChangeStatus,
  stageConfig,
}: {
  rolloverCase: CasesViewCase | null;
  now: number;
  onClose: () => void;
  onChangeStatus: (id: string, status: string) => void;
  stageConfig: StageConfigRow[] | null;
}) {
  if (!c) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center px-6"
        style={{ width: 380, minWidth: 380, background: BOARD_SURFACE_1, borderLeft: `1px solid ${BOARD_BORDER}`, color: BOARD_TERTIARY, fontSize: 12 }}
      >
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 10, opacity: 0.4 }}>
          <rect x="6" y="8" width="28" height="24" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M11 14h18M11 19h14M11 24h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <div className="font-medium mb-1" style={{ color: BOARD_MUTED }}>No case selected</div>
        <div className="leading-relaxed">Click any row to preview here.</div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ width: 380, minWidth: 380, background: BOARD_SURFACE_1, borderLeft: `1px solid ${BOARD_BORDER}` }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BOARD_BORDER}` }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px]" style={{ color: BOARD_TERTIARY }}>
            {c.id.slice(-6).toUpperCase()}
          </span>
          {c.highPriority && (
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#e5484d" }}>
              ● Priority
            </span>
          )}
          <div className="ml-auto flex gap-1">
            <Link
              href={`/dashboard/cases/${c.id}`}
              className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "transparent", border: `1px solid ${BOARD_BORDER}`, color: BOARD_MUTED }}
              title="Open full view"
            >
              ↗ Open
            </Link>
            <button
              onClick={onClose}
              className="px-2 py-0.5 rounded text-[10px]"
              style={{ background: "transparent", border: `1px solid ${BOARD_BORDER}`, color: BOARD_MUTED }}
              title="Close pane"
            >
              ✕
            </button>
          </div>
        </div>
        <h3 className="text-[16px] font-semibold leading-tight" style={{ color: BOARD_TEXT, letterSpacing: "-0.005em" }}>
          {c.clientFirstName} {c.clientLastName}
        </h3>
        <div className="text-[11px] mt-0.5" style={{ color: BOARD_MUTED }}>{c.clientEmail}</div>
        <div className="mt-2.5">
          <InlineStatus status={c.status} stageConfig={stageConfig} onChange={(v) => onChangeStatus(c.id, v)} />
        </div>
      </div>

      {/* Quick facts */}
      <div className="px-4 py-3 grid gap-3" style={{ borderBottom: `1px solid ${BOARD_BORDER}`, gridTemplateColumns: "1fr 1fr" }}>
        <Fact label="Source" value={c.sourceProvider} />
        <Fact label="Destination" value={c.destinationCustodian} />
        <Fact label="Account" value={ACCOUNT_LABEL[c.accountType] ?? c.accountType} />
        <Fact label="Age" value={`${ageDays(c.createdAt, now)}d`} />
        <Fact
          label="Advisor"
          value={
            c.assignedAdvisor ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar
                  userId={c.assignedAdvisor.id}
                  firstName={c.assignedAdvisor.firstName}
                  lastName={c.assignedAdvisor.lastName}
                  size={14}
                />
                {c.assignedAdvisor.firstName} {c.assignedAdvisor.lastName}
              </span>
            ) : (
              <span style={{ color: BOARD_TERTIARY }}>Unassigned</span>
            )
          }
        />
        <Fact
          label="Ops"
          value={
            c.assignedOps ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar
                  userId={c.assignedOps.id}
                  firstName={c.assignedOps.firstName}
                  lastName={c.assignedOps.lastName}
                  size={14}
                />
                {c.assignedOps.firstName} {c.assignedOps.lastName}
              </span>
            ) : (
              <span style={{ color: BOARD_TERTIARY }}>Unassigned</span>
            )
          }
        />
      </div>

      {/* Notes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-[11px]" style={{ color: BOARD_MUTED }}>
        <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: BOARD_TERTIARY }}>
          Last update
        </div>
        <div className="leading-relaxed">
          Status changed {formatDistanceToNow(c.statusUpdatedAt)} · last touched {formatDistanceToNow(c.updatedAt)}.
        </div>
        {c.needsReview && (
          <div
            className="mt-3 px-2.5 py-2 rounded text-[11px]"
            style={{
              background: "#241a08",
              border: `1px solid ${HUE.amber.line}`,
              color: HUE.amber.fg,
            }}
          >
            <span className="font-semibold">Needs review:</span> {c.reviewReason ?? "Auto-created from CRM with missing fields"}
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: BOARD_TERTIARY }}>
        {label}
      </div>
      <div className="text-[12px]" style={{ color: BOARD_TEXT }}>{value}</div>
    </div>
  );
}

function ageDays(iso: string | undefined, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}
