/**
 * Claude paper palette — warm-cream light theme.
 *
 * Used by the v2 admin redesign. Server- and client-safe (no React imports).
 */

export const T = {
  // Surfaces — layered warm cream
  page:        "#faf9f5",
  sidebar:     "#f4f2ea",
  surface1:    "#fdfcf7",
  surface2:    "#f7f5ec",
  surface3:    "#e3dcc5",
  input:       "#fdfcf7",
  inputAlt:    "#f7f5ec",
  striped:     "#f5f3ec",

  // Hairline borders — warm sand
  border:      "#e6e3d4",
  borderSoft:  "#ece9dc",
  borderStrong:"#d4d0bd",
  borderFocus: "#c96442",

  // Ink — warm dark to faint
  text:         "#1f1e1a",
  textSecondary:"#5b584f",
  textTertiary: "#8b8879",
  textDisabled: "#b8b5a6",

  // Accent — Claude coral
  accent:      "#c96442",
  accentHover: "#b25232",
  accentSoft:  "#f4e1d6",
  accentBorder:"#ecccbc",

  // Status (warm-leaning)
  danger:       "#a13a26",
  dangerSoft:   "#f4dccf",
  dangerBorder: "#e7b9a3",
  warning:      "#8a6418",
  warningSoft:  "#f3e2bf",
  warningBorder:"#e0c993",
  success:      "#3a6b3e",
  successSoft:  "#e1eed7",
  successBorder:"#bfd6aa",
  info:         "#2f5a8a",
  infoSoft:     "#e0ebf4",
  infoBorder:   "#bfd5e6",
  violet:       "#5d4a86",
  violetSoft:   "#e7e0ef",
  violetBorder: "#cfc4dd",
} as const;

export type Hue = "slate" | "blue" | "green" | "amber" | "red" | "violet" | "coral";

export const PILL_HUES: Record<Hue, { fg: string; bg: string; line: string; dot: string }> = {
  slate:  { fg: T.textSecondary, bg: T.surface2,    line: T.border,         dot: T.textTertiary },
  blue:   { fg: T.info,          bg: T.infoSoft,    line: T.infoBorder,     dot: T.info },
  green:  { fg: T.success,       bg: T.successSoft, line: T.successBorder,  dot: T.success },
  amber:  { fg: T.warning,       bg: T.warningSoft, line: T.warningBorder,  dot: T.warning },
  red:    { fg: T.danger,        bg: T.dangerSoft,  line: T.dangerBorder,   dot: T.danger },
  violet: { fg: T.violet,        bg: T.violetSoft,  line: T.violetBorder,   dot: T.violet },
  coral:  { fg: T.accent,        bg: T.accentSoft,  line: T.accentBorder,   dot: T.accent },
};

/* Status (rollover stage) → pill hue mapping. */
export const STAGE_HUE: Record<string, Hue> = {
  PROPOSAL_ACCEPTED: "slate",
  AWAITING_CLIENT_ACTION: "amber",
  READY_TO_SUBMIT: "blue",
  SUBMITTED: "violet",
  PROCESSING: "coral",
  IN_TRANSIT: "blue",
  WON: "green",
};

/* Raw color for the stage — used in step-card top strips, progress bars, charts. */
export const STAGE_COLOR: Record<string, string> = {
  PROPOSAL_ACCEPTED: T.textTertiary,
  AWAITING_CLIENT_ACTION: T.warning,
  READY_TO_SUBMIT: T.info,
  SUBMITTED: T.violet,
  PROCESSING: T.accent,
  IN_TRANSIT: T.info,
  WON: T.success,
};

export const ROLE_HUE: Record<string, Hue> = {
  ADMIN: "coral",
  ADVISOR: "blue",
  OPS: "violet",
};

const AVATAR_COLORS = ["#c96442", "#8a6418", "#5d4a86", "#2f5a8a", "#3a6b3e", "#a13a26", "#7d6336"];
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const HEADLINE_STACK = '"Tiempos Headline", "Charter", "Iowan Old Style", Georgia, serif';
export const TAB_NUM_STYLE = { fontVariantNumeric: "tabular-nums" as const };
