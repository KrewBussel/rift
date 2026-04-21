"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Bento sizing ──────────────────────────────────────────────────────── */

type WidgetSize = "small" | "medium" | "large";

const BENTO_ROW_PX = 285;
const BENTO_GAP_PX = 16;

/** Grid dimensions per size class. Two mediums stacked occupy the same visual
 *  footprint as one large, so they pack together without gaps. */
function sizeGrid(size: WidgetSize): { colSpan: number; rowSpan: number; heightPx: number } {
  switch (size) {
    case "small":  return { colSpan: 3, rowSpan: 1, heightPx: BENTO_ROW_PX };
    case "medium": return { colSpan: 6, rowSpan: 1, heightPx: BENTO_ROW_PX };
    case "large":  return { colSpan: 6, rowSpan: 2, heightPx: BENTO_ROW_PX * 2 + BENTO_GAP_PX };
  }
}

function colSpanClass(n: number) {
  return { 3: "md:col-span-3", 6: "md:col-span-6", 12: "md:col-span-12" }[n] ?? "md:col-span-6";
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type PipelineBucket = { status: string; label: string; count: number; color: string };
export type NeedsAttentionItem = {
  id: string;
  kind: "stalled_case" | "overdue_task";
  title: string;
  detail: string;
  href: string;
  daysAgo: number;
};
export type ActivityItem = {
  id: string;
  actor: string | null;
  verb: string;
  target: string | null;
  href: string | null;
  createdAt: string;
};
export type AiUsage = {
  planName: string;
  tokensUsed: number;
  tokensLimit: number;
  percentUsed: number;
  periodResetsAt: string;
};
export type CrmHealth = {
  connected: boolean;
  provider: "WEALTHBOX" | "SALESFORCE" | null;
  lastSyncedAt: string | null;
  healthOk: boolean;
  healthError: string | null;
  linkedCaseCount: number;
};
export type TeamMember = {
  id: string;
  name: string;
  role: "ADVISOR" | "OPS";
  activeCases: number;
};
export type Throughput = {
  openedThisMonth: number;
  completedThisMonth: number;
  openedLastMonth: number;
  completedLastMonth: number;
};
export type Velocity = {
  avgDaysToComplete: number | null; // null if no completions in the window
  completedIn30Days: number;
};

export interface AdminDashboardData {
  pipeline: PipelineBucket[];
  needsAttention: NeedsAttentionItem[];
  activity: ActivityItem[];
  aiUsage: AiUsage;
  crm: CrmHealth;
  team: TeamMember[];
  throughput: Throughput;
  velocity: Velocity;
}

/* ─── Widget registry ────────────────────────────────────────────────────── */

type WidgetId = "pipeline" | "attention" | "activity" | "ai-usage" | "crm-health" | "team-workload" | "throughput" | "velocity";

interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  size: WidgetSize;
  render: (data: AdminDashboardData) => React.ReactNode;
}

const WIDGETS: WidgetDef[] = [
  {
    id: "pipeline",
    title: "Case pipeline",
    description: "Active cases grouped by stage.",
    size: "medium",
    render: (d) => <PipelineWidget buckets={d.pipeline} />,
  },
  {
    id: "attention",
    title: "Needs attention",
    description: "Stalled cases and overdue tasks that need action.",
    size: "medium",
    render: (d) => <NeedsAttentionWidget items={d.needsAttention} />,
  },
  {
    id: "activity",
    title: "Recent activity",
    description: "Latest actions across your firm.",
    size: "large",
    render: (d) => <ActivityWidget items={d.activity} />,
  },
  {
    id: "ai-usage",
    title: "AI usage",
    description: "Tokens used this billing period.",
    size: "small",
    render: (d) => <AiUsageWidget usage={d.aiUsage} />,
  },
  {
    id: "crm-health",
    title: "CRM sync",
    description: "Integration health and last sync.",
    size: "small",
    render: (d) => <CrmHealthWidget crm={d.crm} />,
  },
  {
    id: "team-workload",
    title: "Team workload",
    description: "Active cases per advisor and ops user.",
    size: "large",
    render: (d) => <TeamWorkloadWidget team={d.team} />,
  },
  {
    id: "throughput",
    title: "Throughput",
    description: "New vs. completed cases this month.",
    size: "small",
    render: (d) => <ThroughputWidget throughput={d.throughput} />,
  },
  {
    id: "velocity",
    title: "Completion velocity",
    description: "Average days to close a case.",
    size: "small",
    render: (d) => <VelocityWidget velocity={d.velocity} />,
  },
];

const WIDGET_MAP: Record<WidgetId, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w])
) as Record<WidgetId, WidgetDef>;

/** Ordered so the bento packs cleanly:
 *   [ activity (L) ] [ pipeline (M)  ]
 *   [            ] [ attention (M) ]
 *   [ team (L)  ] [ ai  ][ crm     ]
 *   [           ] [ thr ][ velocity ] */
const DEFAULT_LAYOUT: WidgetId[] = [
  "activity",
  "pipeline",
  "attention",
  "team-workload",
  "ai-usage",
  "crm-health",
  "throughput",
  "velocity",
];

/* ─── Shared styles ──────────────────────────────────────────────────────── */

const CARD = {
  background: "#141a24",
  border: "1px solid #252b38",
  borderRadius: 12,
};
const MUTED = "#8b949e";
const TEXT = "#e4e6ea";


/* ─── Root ───────────────────────────────────────────────────────────────── */

export default function AdminDashboard({
  data,
  initialLayout,
}: {
  data: AdminDashboardData;
  initialLayout: WidgetId[] | null;
}) {
  const [layout, setLayout] = useState<WidgetId[]>(() => {
    const saved = (initialLayout ?? DEFAULT_LAYOUT).filter((id): id is WidgetId => id in WIDGET_MAP);
    return saved.length > 0 ? saved : DEFAULT_LAYOUT;
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const hidden: WidgetId[] = useMemo(
    () => WIDGETS.map((w) => w.id).filter((id) => !layout.includes(id)),
    [layout]
  );

  const persist = useCallback(async (next: WidgetId[]) => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { dashboardWidgets: next } }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as WidgetId);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = layout.indexOf(active.id as WidgetId);
    const to = layout.indexOf(over.id as WidgetId);
    if (from < 0 || to < 0) return;
    const next = arrayMove(layout, from, to);
    setLayout(next);
    persist(next);
  };

  const removeWidget = (id: WidgetId) => {
    const next = layout.filter((w) => w !== id);
    setLayout(next);
    persist(next);
  };

  const addWidget = (id: WidgetId) => {
    if (layout.includes(id)) return;
    const next = [...layout, id];
    setLayout(next);
    persist(next);
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    persist(DEFAULT_LAYOUT);
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-4">
        {editing && hidden.length > 0 && (
          <span className="text-xs" style={{ color: MUTED }}>
            {hidden.length} hidden · drag to reorder
          </span>
        )}
        {saving && <span className="text-xs" style={{ color: MUTED }}>Saving…</span>}
        {editing && (
          <button
            onClick={resetLayout}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
          >
            Reset to default
          </button>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors"
          style={{
            background: editing ? "#2563eb" : "#161b22",
            border: editing ? "1px solid #2563eb" : "1px solid #30363d",
            color: editing ? "#fff" : "#c9d1d9",
          }}
        >
          {editing ? "Done" : "Edit widgets"}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          <div
            className="relative grid grid-cols-1 md:grid-cols-12"
            style={{
              gap: `${BENTO_GAP_PX}px`,
              gridAutoRows: `${BENTO_ROW_PX}px`,
              gridAutoFlow: "row dense",
              backgroundImage: activeId
                ? "linear-gradient(to right, rgba(96,165,250,0.09) 1px, transparent 1px)"
                : undefined,
              backgroundSize: activeId ? "calc(100%/12) 100%" : undefined,
            }}
          >
            {layout.map((id) => {
              const def = WIDGET_MAP[id];
              if (!def) return null;
              return (
                <SortableTile
                  key={id}
                  id={id}
                  def={def}
                  editing={editing}
                  dragging={activeId !== null}
                  isActive={activeId === id}
                  onRemove={() => removeWidget(id)}
                >
                  {def.render(data)}
                </SortableTile>
              );
            })}
          </div>
        </SortableContext>

        {/* Smooth floating preview of the dragged widget */}
        <DragOverlay dropAnimation={null}>
          {activeId && WIDGET_MAP[activeId] ? (
            <DragPreview def={WIDGET_MAP[activeId]} data={data} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {editing && hidden.length > 0 && (
        <div className="mt-6 rounded-xl p-5" style={CARD}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: MUTED }}>
            Add widgets
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hidden.map((id) => {
              const w = WIDGET_MAP[id];
              return (
                <button
                  key={id}
                  onClick={() => addWidget(id)}
                  className="text-left rounded-lg p-4 transition-colors hover:border-[#2563eb]"
                  style={{ background: "#0a0d12", border: "1px solid #252b38" }}
                >
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{w.title}</p>
                  <p className="text-xs mt-1" style={{ color: MUTED }}>{w.description}</p>
                  <p className="text-xs mt-2" style={{ color: "#60a5fa" }}>+ Add to dashboard</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sortable tile wrapper ──────────────────────────────────────────────── */

function SortableTile({
  id,
  def,
  editing,
  dragging,
  isActive,
  onRemove,
  children,
}: {
  id: WidgetId;
  def: WidgetDef;
  editing: boolean;
  dragging: boolean;
  isActive: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: !editing });

  const { colSpan, rowSpan } = sizeGrid(def.size);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original while the DragOverlay shows a floating copy.
    opacity: isActive ? 0 : 1,
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${rowSpan}`,
  };

  const isDropTarget = dragging && !isActive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`col-span-1 ${colSpanClass(colSpan)} relative`}
    >
      <div
        className="relative rounded-xl overflow-hidden flex flex-col h-full"
        style={{
          ...CARD,
          outline: isDropTarget
            ? "1px dashed rgba(96,165,250,0.35)"
            : editing
            ? "1px dashed #334155"
            : undefined,
          outlineOffset: editing || isDropTarget ? "-2px" : undefined,
          transition: "outline-color 150ms ease, box-shadow 150ms ease",
        }}
      >
        <TileHeader
          def={def}
          editing={editing}
          dragAttributes={attributes}
          dragListeners={listeners}
          onRemove={onRemove}
        />
        <div className="p-5 flex-1 overflow-hidden min-h-0">{children}</div>
      </div>
    </div>
  );
}

function TileHeader({
  def,
  editing,
  dragAttributes,
  dragListeners,
  onRemove,
}: {
  def: WidgetDef;
  editing: boolean;
  // @dnd-kit returns loosely-typed handler bags; we just spread them onto the drag handle.
  dragAttributes?: React.HTMLAttributes<HTMLElement> | Record<string, unknown>;
  dragListeners?: React.HTMLAttributes<HTMLElement> | Record<string, unknown>;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid #252b38" }}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold truncate" style={{ color: TEXT }}>{def.title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {editing && (
          <>
            <button
              {...dragAttributes}
              {...dragListeners}
              className="px-2 py-1 rounded-md text-xs cursor-grab active:cursor-grabbing"
              style={{ background: "#161b22", border: "1px solid #30363d", color: "#9ca3af" }}
              aria-label={`Drag ${def.title}`}
            >
              <DragIcon />
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="px-2 py-1 rounded-md text-xs"
                style={{ background: "#2a1515", border: "1px solid #5c2626", color: "#f87171" }}
                aria-label={`Remove ${def.title}`}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Floating copy of the dragged tile. Rendered inside a <DragOverlay>
 *  portal, so it follows the cursor smoothly and isn't constrained by
 *  the grid's layout while other items reflow. */
function DragPreview({ def, data }: { def: WidgetDef; data: AdminDashboardData }) {
  const { colSpan, heightPx } = sizeGrid(def.size);
  // Approximate the widget's rendered width at 1/12 per col within a typical
  // container. The grid keeps its own width; we just want roughly the same.
  const widthPct = (colSpan / 12) * 100;
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col pointer-events-none"
      style={{
        ...CARD,
        width: `min(100%, ${widthPct}%)`,
        height: heightPx,
        boxShadow: "0 28px 70px -15px rgba(0,0,0,0.85), 0 0 0 1px rgba(96,165,250,0.55)",
        transform: "scale(1.01)",
      }}
    >
      <TileHeader def={def} editing={true} />
      <div className="p-5 flex-1 overflow-hidden widget-scroll">{def.render(data)}</div>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="3" cy="3"  r="1" fill="currentColor" />
      <circle cx="9" cy="3"  r="1" fill="currentColor" />
      <circle cx="3" cy="6"  r="1" fill="currentColor" />
      <circle cx="9" cy="6"  r="1" fill="currentColor" />
      <circle cx="3" cy="9"  r="1" fill="currentColor" />
      <circle cx="9" cy="9"  r="1" fill="currentColor" />
    </svg>
  );
}

/* ─── Widgets ────────────────────────────────────────────────────────────── */

function PipelineWidget({ buckets }: { buckets: PipelineBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return <EmptyState title="No active cases" hint="Create a case to see the pipeline here." />;
  }
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-semibold" style={{ color: TEXT }}>{total.toLocaleString()}</p>
        <p className="text-xs" style={{ color: MUTED }}>cases · all stages</p>
      </div>
      <div className="mt-4 flex h-2 rounded-full overflow-hidden" style={{ background: "#0a0d12", border: "1px solid #252b38" }}>
        {buckets.map((b) => {
          const pct = (b.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={b.status}
              style={{ width: `${pct}%`, background: b.color }}
              title={`${b.label}: ${b.count}`}
            />
          );
        })}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
        {buckets.map((b) => (
          <li key={b.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
              <Link
                href={`/dashboard/cases?status=${b.status}`}
                className="truncate hover:underline"
                style={{ color: "#c9d1d9" }}
              >
                {b.label}
              </Link>
            </span>
            <span className="tabular-nums" style={{ color: MUTED }}>{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NeedsAttentionWidget({ items }: { items: NeedsAttentionItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Nothing needs attention" hint="Cases and tasks are within SLA." ok />;
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 6).map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#141924]"
            style={{ background: "#0a0d12", border: "1px solid #252b38" }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={kindBadgeStyle(item.kind)}>
                {item.kind === "stalled_case" ? <IconClock /> : <IconTask />}
              </span>
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: TEXT }}>{item.title}</p>
                <p className="text-xs truncate" style={{ color: MUTED }}>{item.detail}</p>
              </div>
            </div>
            <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: "#f59e0b" }}>
              {item.daysAgo}d
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function kindBadgeStyle(kind: NeedsAttentionItem["kind"]): React.CSSProperties {
  if (kind === "stalled_case") return { background: "#2d2208", border: "1px solid #3b2a0e", color: "#fbbf24" };
  return { background: "#1d1535", border: "1px solid #2d2f5a", color: "#c4b5fd" };
}

function ActivityWidget({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="No recent activity" hint="Activity will appear as your team works." />;
  }
  // Cap at what fits cleanly in a Large card, then distribute vertically
  // so spacing is balanced regardless of line-wrap.
  const visible = items.slice(0, 10);
  return (
    <ul className="flex flex-col justify-between h-full">
      {visible.map((e) => (
        <li key={e.id} className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#60a5fa" }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm" style={{ color: "#c9d1d9" }}>
              <span style={{ color: TEXT, fontWeight: 500 }}>{e.actor ?? "System"}</span>{" "}
              {e.verb}
              {e.target && (
                <>
                  {" "}
                  {e.href ? (
                    <Link href={e.href} className="hover:underline" style={{ color: "#60a5fa" }}>
                      {e.target}
                    </Link>
                  ) : (
                    <span style={{ color: TEXT }}>{e.target}</span>
                  )}
                </>
              )}
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{relativeTime(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AiUsageWidget({ usage }: { usage: AiUsage }) {
  const pct = Math.min(100, Math.max(0, Math.round(usage.percentUsed)));
  const color = pct >= 90 ? "#f87171" : pct >= 75 ? "#fbbf24" : "#60a5fa";
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>
        {usage.planName}
      </p>
      <p className="text-4xl font-semibold mt-1 tabular-nums leading-none" style={{ color: TEXT }}>
        {pct}%
      </p>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        {usage.tokensUsed.toLocaleString()} / {usage.tokensLimit.toLocaleString()} tokens
      </p>
      <div className="mt-auto">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0a0d12", border: "1px solid #252b38" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 400ms" }} />
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>
          Resets {formatDate(usage.periodResetsAt)}
        </p>
      </div>
    </div>
  );
}

function CrmHealthWidget({ crm }: { crm: CrmHealth }) {
  if (!crm.connected) {
    return (
      <div className="flex flex-col h-full">
        <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Status</p>
        <p className="text-base font-semibold mt-1" style={{ color: TEXT }}>Not connected</p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: MUTED }}>
          Connect Wealthbox or Salesforce to sync opportunity stages.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-block mt-auto text-xs font-medium px-3 py-1.5 rounded-md self-start"
          style={{ background: "#2563eb", color: "#fff" }}
        >
          Connect CRM →
        </Link>
      </div>
    );
  }
  const providerLabel = crm.provider === "SALESFORCE" ? "Salesforce" : "Wealthbox";
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>{providerLabel}</p>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{
            background: crm.healthOk ? "#062e1e" : "#2a1515",
            color: crm.healthOk ? "#6ee7b7" : "#f87171",
            border: `1px solid ${crm.healthOk ? "#065f46" : "#5c2626"}`,
          }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: crm.healthOk ? "#6ee7b7" : "#f87171" }} />
          {crm.healthOk ? "Live" : "Error"}
        </span>
      </div>
      <p className="text-4xl font-semibold mt-2 tabular-nums leading-none" style={{ color: TEXT }}>
        {crm.linkedCaseCount}
      </p>
      <p className="text-xs mt-2" style={{ color: MUTED }}>cases linked</p>
      <div className="mt-auto">
        <p className="text-xs" style={{ color: MUTED }}>
          {crm.lastSyncedAt ? `Last sync ${relativeTime(crm.lastSyncedAt)}` : "No sync yet"}
        </p>
        {!crm.healthOk && crm.healthError && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#f87171" }}>
            {crm.healthError}
          </p>
        )}
      </div>
    </div>
  );
}

function TeamWorkloadWidget({ team }: { team: TeamMember[] }) {
  if (team.length === 0) {
    return <EmptyState title="No team members" hint="Invite advisors or ops to see workload." />;
  }
  const max = Math.max(1, ...team.map((m) => m.activeCases));
  const totalActive = team.reduce((s, m) => s + m.activeCases, 0);
  // Flag anyone carrying 50%+ more than the team average
  const avg = totalActive / team.length;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-3 flex-shrink-0">
        <p className="text-xs" style={{ color: MUTED }}>{team.length} people · {totalActive} active cases</p>
      </div>
      <ul className="space-y-2.5 flex-1 overflow-y-auto widget-scroll min-h-0 pr-1 -mr-1">
        {team.map((m) => {
          const pct = (m.activeCases / max) * 100;
          const overloaded = m.activeCases >= Math.ceil(avg * 1.5) && totalActive >= 6;
          const barColor = overloaded ? "#f59e0b" : m.role === "ADVISOR" ? "#60a5fa" : "#a78bfa";
          return (
            <li key={m.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate" style={{ color: TEXT }}>{m.name}</span>
                  <span
                    className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      background: m.role === "ADVISOR" ? "#0d1f38" : "#1d1535",
                      color: m.role === "ADVISOR" ? "#79c0ff" : "#c4b5fd",
                      border: m.role === "ADVISOR" ? "1px solid #1e3a8a" : "1px solid #2d2f5a",
                    }}
                  >
                    {m.role === "ADVISOR" ? "ADV" : "OPS"}
                  </span>
                </span>
                <span className="tabular-nums text-sm flex-shrink-0" style={{ color: overloaded ? "#f59e0b" : MUTED }}>
                  {m.activeCases}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0a0d12", border: "1px solid #252b38" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 400ms" }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ThroughputWidget({ throughput }: { throughput: Throughput }) {
  const openedDelta = throughput.openedThisMonth - throughput.openedLastMonth;
  const completedDelta = throughput.completedThisMonth - throughput.completedLastMonth;
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>This month</p>
      <div className="mt-3 flex-1 flex flex-col justify-center gap-4">
        <ThroughputStat label="Opened" value={throughput.openedThisMonth} delta={openedDelta} />
        <ThroughputStat label="Completed" value={throughput.completedThisMonth} delta={completedDelta} positiveIsGood />
      </div>
      <p className="text-[11px] mt-auto" style={{ color: MUTED }}>
        vs. {throughput.openedLastMonth} / {throughput.completedLastMonth} last month
      </p>
    </div>
  );
}

function ThroughputStat({
  label, value, delta, positiveIsGood,
}: { label: string; value: number; delta: number; positiveIsGood?: boolean }) {
  const sign = delta > 0 ? "+" : "";
  const good = (delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood);
  const neutral = delta === 0;
  const color = neutral ? "#7d8590" : good ? "#6ee7b7" : "#f59e0b";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs" style={{ color: MUTED }}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: TEXT }}>{value}</span>
        <span className="text-xs tabular-nums" style={{ color }}>
          {neutral ? "—" : `${sign}${delta}`}
        </span>
      </span>
    </div>
  );
}

function VelocityWidget({ velocity }: { velocity: Velocity }) {
  if (velocity.avgDaysToComplete === null || velocity.completedIn30Days === 0) {
    return (
      <div className="flex flex-col h-full">
        <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Last 30 days</p>
        <p className="text-base font-semibold mt-2" style={{ color: TEXT }}>No completions</p>
        <p className="text-xs mt-auto" style={{ color: MUTED }}>
          Velocity will show once cases reach Completed.
        </p>
      </div>
    );
  }
  const days = velocity.avgDaysToComplete;
  const color = days <= 14 ? "#6ee7b7" : days <= 30 ? "#60a5fa" : "#f59e0b";
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>Avg days to close</p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-4xl font-semibold tabular-nums leading-none" style={{ color }}>
          {days.toFixed(1)}
        </p>
        <span className="text-sm" style={{ color: MUTED }}>days</span>
      </div>
      <p className="text-xs leading-relaxed mt-auto" style={{ color: MUTED }}>
        Based on {velocity.completedIn30Days} {velocity.completedIn30Days === 1 ? "case" : "cases"} completed in the last 30 days.
      </p>
    </div>
  );
}

/* ─── Empty state + utils ────────────────────────────────────────────────── */

function EmptyState({ title, hint, ok }: { title: string; hint: string; ok?: boolean }) {
  return (
    <div className="text-center py-6">
      <div
        className="inline-flex w-10 h-10 rounded-full items-center justify-center mb-3"
        style={{
          background: ok ? "#062e1e" : "#161b22",
          border: `1px solid ${ok ? "#065f46" : "#252b38"}`,
          color: ok ? "#6ee7b7" : "#7d8590",
        }}
      >
        {ok ? <IconCheck /> : <IconDash />}
      </div>
      <p className="text-sm font-medium" style={{ color: TEXT }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: MUTED }}>{hint}</p>
    </div>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTask() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7l1.5 1.5L10 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDash() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  return `${mo}mo ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
