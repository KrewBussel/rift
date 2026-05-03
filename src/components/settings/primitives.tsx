"use client";

import { useState } from "react";

/**
 * Settings primitives — flat-surface design tokens, hairline borders, no glow.
 * Lifted from the settings handoff (settings-shell.jsx). Imported by the seven
 * section components and the settings shell.
 */

export const SETTINGS_TOKENS = {
  page: "#0a0d12",
  sidebar: "#0c1018",
  surface1: "#0f131b",
  surface2: "#141923",
  surface3: "#1a1f2b",
  input: "#0d1119",
  striped: "#10141d",
  border: "#1d2330",
  borderStrong: "#252b3a",
  borderFocus: "#2f4262",
  text: "#e4e6ea",
  textSecondary: "#a3acba",
  textTertiary: "#6b7384",
  textDisabled: "#4a5160",
  accent: "#5b8def",
  accentHover: "#6e9af0",
  danger: "#e5484d",
  warning: "#d29922",
  success: "#3fb950",
};

const T = SETTINGS_TOKENS;

/* ─── Icon set (single-stroke, lucide-style) ─────────────────────────────── */
type IconName =
  | "user" | "bell" | "shield" | "building" | "users" | "card" | "plug"
  | "code" | "cases" | "home" | "client" | "doc" | "task"
  | "search" | "check" | "x" | "plus" | "chev" | "down" | "ext"
  | "copy" | "trash" | "key" | "info" | "warn" | "cog" | "logout";

export function Icon({ name, size = 16, color = "currentColor" }: { name: IconName; size?: number; color?: string }) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "user":     return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "bell":     return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "shield":   return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>;
    case "building": return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>;
    case "users":    return <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M22 18c0-2.5-2-4-5-4"/></svg>;
    case "card":     return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 10h18M7 15h3"/></svg>;
    case "plug":     return <svg {...props}><path d="M9 2v4M15 2v4M7 6h10v5a5 5 0 0 1-10 0V6zM12 16v6"/></svg>;
    case "code":     return <svg {...props}><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>;
    case "cases":    return <svg {...props}><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>;
    case "home":     return <svg {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>;
    case "client":   return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/></svg>;
    case "doc":      return <svg {...props}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>;
    case "task":     return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>;
    case "search":   return <svg {...props}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>;
    case "check":    return <svg {...props}><path d="M5 12l4 4 10-10"/></svg>;
    case "x":        return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "plus":     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "chev":     return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "down":     return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case "ext":      return <svg {...props}><path d="M14 4h6v6M20 4l-9 9M19 13v6H5V5h6"/></svg>;
    case "copy":     return <svg {...props}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>;
    case "trash":    return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>;
    case "key":      return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>;
    case "info":     return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 11v6"/></svg>;
    case "warn":     return <svg {...props}><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></svg>;
    case "cog":      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8M4.6 9a1.7 1.7 0 0 0-.3-1.8"/></svg>;
    case "logout":   return <svg {...props}><path d="M9 5H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 19h4M16 16l4-4-4-4M9 12h11"/></svg>;
  }
}

/* ─── Card / CardSection ─────────────────────────────────────────────────── */

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}

export function CardSection({
  title,
  description,
  children,
  footer,
  style,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Card style={{ marginBottom: 20, ...style }}>
      {(title || description) && (
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}` }}>
          {title && <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</div>}
          {description && <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{description}</div>}
        </div>
      )}
      <div style={{ padding: "20px 24px" }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: "12px 24px",
            borderTop: `1px solid ${T.border}`,
            background: T.striped,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderRadius: "0 0 10px 10px",
          }}
        >
          {footer}
        </div>
      )}
    </Card>
  );
}

/* ─── FieldRow ─────────────────────────────────────────────────────────── */

export function FieldRow({
  label,
  hint,
  children,
  full,
  isLast,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: full ? "1fr" : "200px 1fr",
        gap: full ? 8 : 24,
        padding: "12px 0",
        borderBottom: isLast ? "none" : `1px solid ${T.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", minHeight: 32, gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

/* ─── Btn ──────────────────────────────────────────────────────────────── */

export function Btn({
  children,
  primary,
  danger,
  ghost,
  small,
  disabled,
  type = "button",
  onClick,
  title,
}: {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  ghost?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}) {
  const [hover, setHover] = useState(false);
  const base: React.CSSProperties = {
    height: small ? 28 : 32,
    padding: small ? "0 10px" : "0 14px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background 80ms linear, border-color 80ms linear, color 80ms linear",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
  };
  let style: React.CSSProperties;
  if (primary) {
    style = {
      ...base,
      background: hover ? T.accentHover : T.accent,
      borderColor: hover ? T.accentHover : T.accent,
      color: T.page,
      fontWeight: 600,
    };
  } else if (danger) {
    style = {
      ...base,
      background: hover ? "#1f1316" : T.surface2,
      borderColor: hover ? "#7d2429" : "#3a2026",
      color: T.danger,
    };
  } else if (ghost) {
    style = {
      ...base,
      background: hover ? T.surface2 : "transparent",
      borderColor: "transparent",
      color: T.textSecondary,
    };
  } else {
    style = {
      ...base,
      background: hover ? T.surface3 : T.surface2,
      borderColor: hover ? T.borderStrong : T.border,
      color: T.text,
    };
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}

/* ─── TextInput / SelectInput ──────────────────────────────────────────── */

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  prefix,
  suffix,
  readOnly,
  required,
}: {
  value: string | undefined;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "url" | "tel" | "time";
  style?: React.CSSProperties;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 32,
        width: "100%",
        background: T.input,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        padding: "0 10px",
        gap: 8,
        ...style,
      }}
    >
      {prefix && <span style={{ fontSize: 12, color: T.textTertiary, display: "inline-flex" }}>{prefix}</span>}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: readOnly ? T.textSecondary : T.text,
          fontSize: 13,
          outline: "none",
          height: "100%",
          minWidth: 0,
        }}
      />
      {suffix && <span style={{ fontSize: 11, color: T.textTertiary }}>{suffix}</span>}
    </div>
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  style,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string } | T>;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          width: "100%",
          height: 32,
          background: SETTINGS_TOKENS.input,
          border: `1px solid ${SETTINGS_TOKENS.border}`,
          borderRadius: 6,
          padding: "0 28px 0 10px",
          color: SETTINGS_TOKENS.text,
          fontSize: 13,
          appearance: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => {
          const v = typeof o === "object" ? o.value : (o as T);
          const l = typeof o === "object" ? o.label : (o as string);
          return (
            <option key={String(v)} value={v} style={{ background: SETTINGS_TOKENS.input }}>
              {l}
            </option>
          );
        })}
      </select>
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Icon name="down" size={14} color={SETTINGS_TOKENS.textTertiary} />
      </div>
    </div>
  );
}

/* ─── Toggle (rounded slider) ──────────────────────────────────────────── */

export function Toggle({
  value,
  onChange,
  size = "md",
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 28 : 34;
  const h = size === "sm" ? 16 : 20;
  const k = h - 4;
  return (
    <div
      onClick={() => onChange && onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange?.(!value);
        }
      }}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        position: "relative",
        cursor: onChange ? "pointer" : "default",
        background: value ? T.accent : T.borderStrong,
        transition: "background 160ms ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? w - k - 2 : 2,
          width: k,
          height: k,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 180ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

/* ─── Pill / Status badge ──────────────────────────────────────────────── */

type PillHue = "slate" | "blue" | "green" | "amber" | "red" | "violet";

const PILL_HUES: Record<PillHue, { fg: string; bg: string; line: string }> = {
  slate:  { fg: "#a3acba", bg: "#1a2030", line: "#2b3346" },
  blue:   { fg: "#5b8def", bg: "#0f1a2e", line: "#1f2e4d" },
  green:  { fg: "#3fb950", bg: "#0e2117", line: "#163a26" },
  amber:  { fg: "#d29922", bg: "#241a08", line: "#3d2c10" },
  red:    { fg: "#e5484d", bg: "#1f1316", line: "#3a2026" },
  violet: { fg: "#a78bfa", bg: "#1a1530", line: "#2a234a" },
};

export function Pill({
  children,
  hue = "slate",
}: {
  children: React.ReactNode;
  hue?: PillHue;
}) {
  const c = PILL_HUES[hue];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.line}`,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Avatar — initials on a colored circle ────────────────────────────── */

export function InitialsAvatar({
  firstName,
  lastName,
  color,
  size = 28,
}: {
  firstName: string;
  lastName: string;
  color?: string;
  size?: number;
}) {
  const initials = (firstName?.[0] ?? "") + (lastName?.[0] ?? "");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color ?? T.accent,
        color: T.page,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: 0.2,
        flexShrink: 0,
        border: `1px solid ${T.surface2}`,
      }}
    >
      {initials || "?"}
    </div>
  );
}

/* ─── Modal shell ──────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(10,13,18,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "settings-modal-fade 150ms ease-out",
      }}
    >
      <style>{`
        @keyframes settings-modal-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes settings-modal-rise {
          from { opacity: 0; transform: translateY(8px) scale(0.99) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100vh - 80px)",
          background: T.surface2,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          animation: "settings-modal-rise 220ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.text }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{ cursor: "pointer", color: T.textTertiary, padding: 4, background: "transparent", border: "none" }}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              background: T.striped,
              borderRadius: "0 0 12px 12px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
