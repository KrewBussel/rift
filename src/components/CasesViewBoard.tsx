"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Avatar from "./Avatar";
import { formatDistanceToNow } from "@/lib/utils";
import type { CasesViewCase } from "./CasesView";
import {
  STATUSES,
  HUE,
  ACCOUNT_LABEL,
  BOARD_TEXT,
  BOARD_MUTED,
  BOARD_TERTIARY,
  BOARD_BORDER,
  BOARD_BORDER_STRONG,
  BOARD_SURFACE_1,
  BOARD_SURFACE_2,
  resolveEnabledStages,
  type StageConfigRow,
} from "./casesDesignTokens";

type Props = {
  cases: CasesViewCase[];
  onStatusChange: (caseId: string, status: string) => void;
  stageConfig?: StageConfigRow[] | null;
};

export default function CasesViewBoard({ cases, onStatusChange, stageConfig = null }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // @dnd-kit generates incrementing internal IDs (DndDescribedBy-N) that
  // diverge between server and client renders, causing a hydration warning.
  // Defer DnD attachment until after hydration so the server HTML never has
  // the mismatched aria-describedby in the first place.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Refresh "age" reference once an hour so stale flags update without a reload.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 3_600_000);
    return () => window.clearInterval(id);
  }, []);

  // Visible columns = enabled stages, with custom labels swapped in. Cases
  // sitting on a now-disabled stage still get displayed under a "fallback"
  // column rendered with the canonical default label so nothing disappears.
  const visibleStages = useMemo(() => resolveEnabledStages(stageConfig), [stageConfig]);
  const visibleStatusSet = useMemo(
    () => new Set(visibleStages.map((s) => s.value)),
    [visibleStages],
  );
  const orphanedStages = useMemo(() => {
    const orphans = new Set<string>();
    for (const c of cases) {
      if (!visibleStatusSet.has(c.status)) orphans.add(c.status);
    }
    return Array.from(orphans)
      .map((v) => STATUSES.find((s) => s.value === v))
      .filter((s): s is (typeof STATUSES)[number] => Boolean(s));
  }, [cases, visibleStatusSet]);
  const allColumns = useMemo(
    () => [...visibleStages, ...orphanedStages],
    [visibleStages, orphanedStages],
  );

  const byStatus = useMemo(() => {
    const m: Record<string, CasesViewCase[]> = {};
    allColumns.forEach((s) => (m[s.value] = []));
    for (const c of cases) (m[c.status] ?? (m[c.status] = [])).push(c);
    return m;
  }, [cases, allColumns]);

  const activeCase = activeId ? cases.find((c) => c.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const draggedId = String(e.active.id);
    if (!overId) return;
    const dragged = cases.find((c) => c.id === draggedId);
    if (!dragged || dragged.status === overId) return;
    onStatusChange(draggedId, overId);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ minHeight: 480 }}>
        {allColumns.map((s) => (
          <BoardColumn key={s.value} status={s} cases={byStatus[s.value] ?? []} now={now} mounted={mounted} />
        ))}
      </div>
      <DragOverlay>
        {activeCase ? <CaseCard rolloverCase={activeCase} now={now} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Column ─────────────────────────────────────────────────────────── */

function BoardColumn({
  status,
  cases,
  now,
  mounted,
}: {
  status: (typeof STATUSES)[number];
  cases: CasesViewCase[];
  now: number;
  mounted: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });
  const hue = HUE[status.hue];

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-shrink-0 rounded-lg"
      style={{
        width: 288,
        background: BOARD_SURFACE_1,
        border: `1px solid ${isOver ? hue.line : BOARD_BORDER}`,
        transition: "border-color 80ms linear",
      }}
    >
      {/* Header */}
      <div className="px-3 pt-2.5 pb-3" style={{ borderBottom: `1px solid ${BOARD_BORDER}` }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: hue.dot }} />
          <span className="text-[12px] font-semibold tracking-tight" style={{ color: BOARD_TEXT }}>
            {status.label}
          </span>
          <span
            className="ml-auto text-[11px] font-medium tabular-nums"
            style={{ color: BOARD_MUTED }}
          >
            {cases.length}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {cases.length === 0 ? (
          <div
            className="text-center py-8 text-[11px] rounded-md"
            style={{ color: BOARD_TERTIARY, border: `1px dashed ${BOARD_BORDER}` }}
          >
            No cases in this stage
          </div>
        ) : (
          cases.map((c) => <DraggableCard key={c.id} rolloverCase={c} now={now} draggable={mounted} />)
        )}
      </div>
    </div>
  );
}

/* ─── Draggable case card ─────────────────────────────────────────────── */

function DraggableCard({
  rolloverCase,
  now,
  draggable,
}: {
  rolloverCase: CasesViewCase;
  now: number;
  draggable: boolean;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: rolloverCase.id });
  // Pre-hydration: render a static wrapper so the server HTML matches what
  // React produces on the first client render. Once mounted, swap to the real
  // draggable wrapper.
  if (!draggable) {
    return (
      <div style={{ touchAction: "none" }}>
        <CaseCard rolloverCase={rolloverCase} now={now} />
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1, touchAction: "none" }}
    >
      <CaseCard rolloverCase={rolloverCase} now={now} />
    </div>
  );
}

function CaseCard({
  rolloverCase: c,
  now,
  dragging = false,
}: {
  rolloverCase: CasesViewCase;
  now: number;
  dragging?: boolean;
}) {
  const ageDays = c.createdAt
    ? Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / 86_400_000))
    : 0;
  const stale = ageDays > 14 && c.status !== "WON" && c.status !== "IN_TRANSIT";
  const accountTail = ACCOUNT_LABEL[c.accountType] ?? c.accountType;

  // Card visual — wrapped by Link only when not the drag overlay so DnD listeners don't fight clicks.
  const card = (
    <div
      className="relative rounded-md p-3 cursor-grab"
      style={{
        background: BOARD_SURFACE_2,
        border: `1px solid ${dragging ? BOARD_BORDER_STRONG : BOARD_BORDER}`,
        boxShadow: dragging ? "0 8px 16px rgba(0,0,0,0.4)" : undefined,
        transition: "border-color 80ms linear",
      }}
    >
      {c.highPriority && (
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 2, background: "#e5484d", borderRadius: "6px 0 0 6px" }}
        />
      )}

      {/* Top meta row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[10px] tabular-nums" style={{ color: BOARD_TERTIARY }}>
          {c.id.slice(-6).toUpperCase()}
        </span>
        {c.needsReview && (
          <span
            className="ml-auto text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "#d29922" }}
          >
            Review
          </span>
        )}
        {stale && !c.needsReview && (
          <span
            className="ml-auto text-[10px] inline-flex items-center gap-1"
            style={{ color: BOARD_MUTED }}
          >
            {ageDays}d
          </span>
        )}
      </div>

      {/* Client name */}
      <div className="text-[13px] font-semibold leading-tight" style={{ color: BOARD_TEXT }}>
        {c.clientFirstName} {c.clientLastName}
      </div>

      {/* Provider → Custodian */}
      <div className="text-[11px] mt-1 leading-snug truncate" style={{ color: BOARD_MUTED }}>
        {c.sourceProvider}
        <span className="mx-1.5" style={{ color: "#3a4252" }}>→</span>
        {c.destinationCustodian}
      </div>

      {/* Footer */}
      <div className="flex items-center mt-2.5 gap-1.5">
        <span className="text-[10px]" style={{ color: BOARD_TERTIARY }}>
          {accountTail}
        </span>
        <div className="ml-auto flex" style={{ gap: 0 }}>
          {c.assignedAdvisor && (
            <Avatar
              userId={c.assignedAdvisor.id}
              firstName={c.assignedAdvisor.firstName}
              lastName={c.assignedAdvisor.lastName}
              size={18}
              title={`Advisor: ${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`}
            />
          )}
          {c.assignedOps && (
            <span style={{ marginLeft: c.assignedAdvisor ? -6 : 0 }}>
              <Avatar
                userId={c.assignedOps.id}
                firstName={c.assignedOps.firstName}
                lastName={c.assignedOps.lastName}
                size={18}
                title={`Ops: ${c.assignedOps.firstName} ${c.assignedOps.lastName}`}
              />
            </span>
          )}
        </div>
      </div>

      {/* Stale/updated hint */}
      <div className="text-[10px] mt-1.5" style={{ color: BOARD_TERTIARY }}>
        {formatDistanceToNow(c.updatedAt)}
      </div>
    </div>
  );

  if (dragging) return card;
  return (
    <Link href={`/dashboard/cases/${c.id}`} className="block" onClick={(e) => e.stopPropagation()}>
      {card}
    </Link>
  );
}
