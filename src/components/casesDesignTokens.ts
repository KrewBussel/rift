/**
 * Shared design tokens + status definitions for the Cases redesign.
 * Mapped from the design handoff (data.jsx -> HUE / STATUSES) onto Rift's
 * actual CaseStatus enum. Keep this file free of React imports so it can be
 * imported by both server and client components.
 */

export type StatusHue = "slate" | "amber" | "blue" | "violet" | "orange" | "indigo" | "green";

export type StatusDef = {
  value: string;
  label: string;
  short: string;
  hue: StatusHue;
};

export const STATUSES: StatusDef[] = [
  { value: "PROPOSAL_ACCEPTED",      label: "Proposal accepted", short: "Proposal",   hue: "slate"  },
  { value: "AWAITING_CLIENT_ACTION", label: "Awaiting client",   short: "Awaiting",   hue: "amber"  },
  { value: "READY_TO_SUBMIT",        label: "Ready to submit",   short: "Ready",      hue: "blue"   },
  { value: "SUBMITTED",              label: "Submitted",         short: "Submitted",  hue: "violet" },
  { value: "PROCESSING",             label: "Processing",        short: "Processing", hue: "orange" },
  { value: "IN_TRANSIT",             label: "In transit",        short: "In transit", hue: "indigo" },
  { value: "WON",                    label: "Won",               short: "Won",        hue: "green"  },
];

export const STATUS_BY_VALUE: Record<string, StatusDef> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s])
);

/**
 * Stages whose enabled state is locked on. PROPOSAL_ACCEPTED is the inbound
 * trigger and WON is the outbound close — neither can be disabled because the
 * Wealthbox bookend sync depends on them.
 */
export const ALWAYS_ENABLED_STATUSES = new Set(["PROPOSAL_ACCEPTED", "WON"] as const);

/** A firm's per-stage configuration row, shaped for client + server consumption. */
export type StageConfigRow = {
  status: string;
  customLabel: string | null;
  isEnabled: boolean;
  sortOrder: number;
};

/**
 * Resolve the user-facing label for a given status using the firm's overlay,
 * falling back to the canonical label. Pass `null` overlays for "no firm
 * config available" (e.g. server-side renders where preload hasn't happened).
 */
export function resolveStageLabel(
  status: string,
  overlays: StageConfigRow[] | null,
): string {
  const def = STATUS_BY_VALUE[status];
  const fallback = def?.label ?? status;
  if (!overlays) return fallback;
  const o = overlays.find((r) => r.status === status);
  if (!o) return fallback;
  return o.customLabel?.trim() ? o.customLabel.trim() : fallback;
}

/**
 * Build the firm's pipeline as the cases UI should render it: enabled stages
 * in canonical order, with custom labels swapped in. Bookends are always
 * present even if the overlay row says otherwise.
 */
export function resolveEnabledStages(overlays: StageConfigRow[] | null): StatusDef[] {
  return STATUSES.filter((s) => {
    if (ALWAYS_ENABLED_STATUSES.has(s.value as "PROPOSAL_ACCEPTED" | "WON")) return true;
    if (!overlays) return true;
    const o = overlays.find((r) => r.status === s.value);
    return o ? o.isEnabled : true;
  }).map((s) => ({ ...s, label: resolveStageLabel(s.value, overlays) }));
}

export const HUE: Record<StatusHue, { fg: string; bg: string; line: string; dot: string }> = {
  slate:  { fg: "#a3acba", bg: "#1a2030", line: "#2b3346", dot: "#7a8497" },
  amber:  { fg: "#d29922", bg: "#241a08", line: "#3d2c10", dot: "#bb8b1f" },
  blue:   { fg: "#5b8def", bg: "#0f1a2e", line: "#1f2e4d", dot: "#4f7fd9" },
  violet: { fg: "#a78bfa", bg: "#1a1530", line: "#2a234a", dot: "#8a72d8" },
  orange: { fg: "#d77a3a", bg: "#23170a", line: "#3a2611", dot: "#bf6c33" },
  indigo: { fg: "#7e8cf3", bg: "#141938", line: "#252b54", dot: "#6b78d8" },
  green:  { fg: "#3fb950", bg: "#0e2117", line: "#163a26", dot: "#379a44" },
};

export const ACCOUNT_LABEL: Record<string, string> = {
  TRADITIONAL_IRA_401K: "401(k) → Trad IRA",
  ROTH_IRA_401K: "401(k) → Roth IRA",
  IRA_403B: "403(b) → IRA",
  OTHER: "Other",
};

/* Surfaces — the design's flat dark stack, sized for Rift's palette. */
export const BOARD_PAGE         = "#0a0d12";
export const BOARD_SURFACE_1    = "#0f131b";
export const BOARD_SURFACE_2    = "#141923";
export const BOARD_SURFACE_3    = "#1a1f2b";
export const BOARD_INPUT        = "#0d1119";
export const BOARD_BORDER       = "#1d2330";
export const BOARD_BORDER_STRONG= "#252b3a";
export const BOARD_BORDER_FOCUS = "#2f4262";
export const BOARD_TEXT         = "#e4e6ea";
export const BOARD_MUTED        = "#a3acba";
export const BOARD_TERTIARY     = "#6b7384";
export const BOARD_DISABLED     = "#4a5160";
export const BOARD_ACCENT       = "#5b8def";
