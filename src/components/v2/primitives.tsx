"use client";

import { type ReactNode, type CSSProperties, useState } from "react";
import { T, PILL_HUES, type Hue, avatarColor, HEADLINE_STACK } from "./tokens";

/* ──────────────────────────────────────────────────────────────────────── */
/* Icon (lucide-style SVG set, 1.6 stroke)                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const ICONS: Record<string, ReactNode> = {
  user:     <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
  bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  shield:   <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></>,
  users:    <><circle cx="9" cy="8" r="3.2"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M22 18c0-2.5-2-4-5-4"/></>,
  card:     <><rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 10h18M7 15h3"/></>,
  plug:     <path d="M9 2v4M15 2v4M7 6h10v5a5 5 0 0 1-10 0V6zM12 16v6"/>,
  cases:    <><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>,
  home:     <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>,
  doc:      <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></>,
  task:     <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></>,
  spark:    <><path d="M12 3l1.6 4.8L18 9l-4.4 1.2L12 15l-1.6-4.8L6 9l4.4-1.2z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
  search:   <><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></>,
  check:    <path d="M5 12l4 4 10-10"/>,
  x:        <path d="M6 6l12 12M18 6L6 18"/>,
  plus:     <path d="M12 5v14M5 12h14"/>,
  chev:     <path d="M9 6l6 6-6 6"/>,
  down:     <path d="M6 9l6 6 6-6"/>,
  up:       <path d="M6 15l6-6 6 6"/>,
  left:     <path d="M15 6l-6 6 6 6"/>,
  ext:      <path d="M14 4h6v6M20 4l-9 9M19 13v6H5V5h6"/>,
  copy:     <><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></>,
  trash:    <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
  key:      <><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></>,
  info:     <><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 11v6"/></>,
  warn:     <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></>,
  cog:      <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8M4.6 9a1.7 1.7 0 0 0-.3-1.8M12 3v2M12 19v2M21 12h-2M5 12H3"/></>,
  logout:   <path d="M9 5H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 19h4M16 16l4-4-4-4M9 12h11"/>,
  filter:   <path d="M3 5h18M6 12h12M10 19h4"/>,
  grid:     <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  board:    <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></>,
  list:     <path d="M4 6h16M4 12h16M4 18h12"/>,
  star:     <path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/>,
  flag:     <path d="M5 21V4M5 4h13l-2 4 2 4H5"/>,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
  arrowDown:  <path d="M12 5v14M5 13l7 7 7-7"/>,
  refresh:    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4"/>,
  link:       <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>,
  dots:       <><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></>,
  mail:       <><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/></>,
  upload:     <path d="M12 4v12M7 9l5-5 5 5M5 20h14"/>,
  download:   <path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>,
  bolt:       <path d="M13 3L4 14h7l-1 7 9-11h-7z"/>,
  eye:        <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  moon:       <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>,
  phone:      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
};

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  style,
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      {path}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Card                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  padded,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface1,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: padded ? 20 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Btn                                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

export function Btn({
  children,
  primary,
  danger,
  ghost,
  small,
  disabled,
  onClick,
  title,
  type,
  style,
}: {
  children: ReactNode;
  primary?: boolean;
  danger?: boolean;
  ghost?: boolean;
  small?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const base: CSSProperties = {
    height: small ? 28 : 32,
    padding: small ? "0 10px" : "0 14px",
    borderRadius: 7,
    border: "1px solid",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background 80ms linear, border-color 80ms linear, color 80ms linear, box-shadow 80ms linear",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
  };
  let s: CSSProperties;
  if (primary) {
    s = {
      ...base,
      background: hover ? T.accentHover : T.accent,
      borderColor: hover ? T.accentHover : T.accent,
      color: T.surface1,
      fontWeight: 600,
      boxShadow: hover
        ? "0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.18)"
        : "inset 0 1px 0 rgba(255,255,255,0.18)",
    };
  } else if (danger) {
    s = {
      ...base,
      background: hover ? T.dangerSoft : T.surface1,
      borderColor: hover ? T.dangerBorder : T.border,
      color: T.danger,
    };
  } else if (ghost) {
    s = {
      ...base,
      background: hover ? T.surface3 : "transparent",
      borderColor: "transparent",
      color: T.textSecondary,
    };
  } else {
    s = {
      ...base,
      background: hover ? T.surface3 : T.surface1,
      borderColor: hover ? T.borderStrong : T.border,
      color: T.text,
      boxShadow: hover ? "0 1px 0 rgba(0,0,0,0.02)" : "none",
    };
  }
  return (
    <button
      disabled={disabled}
      title={title}
      type={type ?? "button"}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...s, ...style }}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* TextInput                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  prefix,
  suffix,
  readOnly,
  autoFocus,
  name,
  onKeyDown,
}: {
  value: string | undefined;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: CSSProperties;
  prefix?: ReactNode;
  suffix?: ReactNode;
  readOnly?: boolean;
  autoFocus?: boolean;
  name?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 32,
        width: "100%",
        background: readOnly ? T.surface2 : T.input,
        border: `1px solid ${focus ? T.borderFocus : T.border}`,
        borderRadius: 7,
        padding: "0 10px",
        gap: 8,
        transition: "border-color 100ms",
        ...style,
      }}
    >
      {prefix && <span style={{ fontSize: 12, color: T.textTertiary, display: "inline-flex" }}>{prefix}</span>}
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={onKeyDown}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: readOnly ? T.textSecondary : T.text,
          fontSize: 13,
          outline: "none",
          height: "100%",
          minWidth: 0,
          fontFamily: "inherit",
        }}
      />
      {suffix && <span style={{ fontSize: 11, color: T.textTertiary }}>{suffix}</span>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* SelectInput                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

export function SelectInput({
  value,
  onChange,
  options,
  style,
  disabled,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          width: "100%",
          height: 32,
          background: T.input,
          border: `1px solid ${T.border}`,
          borderRadius: 7,
          padding: "0 28px 0 10px",
          color: T.text,
          fontSize: 13,
          appearance: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          outline: "none",
        }}
      >
        {options.map((o) => {
          const v = typeof o === "object" ? o.value : o;
          const l = typeof o === "object" ? o.label : o;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Icon name="down" size={14} color={T.textTertiary} />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Toggle                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export function Toggle({
  value,
  onChange,
  size = "md",
  disabled,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const w = size === "sm" ? 28 : 32;
  const h = size === "sm" ? 16 : 18;
  const k = h - 4;
  return (
    <div
      onClick={() => !disabled && onChange && onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        position: "relative",
        cursor: onChange && !disabled ? "pointer" : "default",
        opacity: disabled ? 0.5 : 1,
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
          background: T.surface1,
          transition: "left 180ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Pill                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

export function Pill({
  children,
  hue = "slate",
  dot,
  small,
  style,
}: {
  children: ReactNode;
  hue?: Hue;
  dot?: boolean;
  small?: boolean;
  style?: CSSProperties;
}) {
  const c = PILL_HUES[hue];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: small ? "1px 7px" : "2px 9px",
        borderRadius: 999,
        fontSize: small ? 10.5 : 11,
        fontWeight: 500,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.line}`,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{ width: 6, height: 6, borderRadius: 999, background: c.dot, flexShrink: 0 }}
        />
      )}
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Avatar — initials with seeded color, supports image src                  */
/* ──────────────────────────────────────────────────────────────────────── */

export function Avatar({
  name,
  size = 28,
  image,
  style,
}: {
  name: string;
  size?: number;
  image?: string | null;
  style?: CSSProperties;
}) {
  const initials =
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const bg = avatarColor(name || "?");
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: image ? "transparent" : bg,
        color: T.surface1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        flexShrink: 0,
        border: `1.5px solid ${T.surface1}`,
        letterSpacing: 0.2,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* CardSection — Card with optional title/description header                */
/* ──────────────────────────────────────────────────────────────────────── */

export function CardSection({
  title,
  description,
  children,
  footer,
  right,
  style,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Card style={{ marginBottom: 18, ...style }}>
      {(title || description || right) && (
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: -0.1 }}>
                {title}
              </div>
            )}
            {description && (
              <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                {description}
              </div>
            )}
          </div>
          {right}
        </div>
      )}
      <div style={{ padding: "16px 22px" }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: "12px 22px",
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

/* ──────────────────────────────────────────────────────────────────────── */
/* FieldRow — 200px label + 1fr control                                     */
/* ──────────────────────────────────────────────────────────────────────── */

export function FieldRow({
  label,
  hint,
  children,
  full,
  isLast,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  full?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: full ? "1fr" : "200px 1fr",
        gap: full ? 8 : 24,
        padding: "14px 0",
        borderBottom: isLast ? "none" : `1px solid ${T.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 4, lineHeight: 1.5 }}>
            {hint}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 32,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* SectionHeader — eyebrow + h1 + description + right slot                  */
/* ──────────────────────────────────────────────────────────────────────── */

export function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "32px 36px 22px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        background: T.page,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: T.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: T.text,
            letterSpacing: -0.4,
            fontFamily: HEADLINE_STACK,
          }}
        >
          {title}
        </h1>
        {description && (
          <div
            style={{
              marginTop: 6,
              fontSize: 13.5,
              color: T.textSecondary,
              maxWidth: 680,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* ChipSelect — compact inline filter pill with native <select>             */
/* ──────────────────────────────────────────────────────────────────────── */

export function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const selected = options.find((o) => o.value === value);
  const isActive = value !== "ALL" && value !== "";
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        padding: "0 26px 0 10px",
        background: isActive ? T.accentSoft : T.surface1,
        border: `1px solid ${isActive ? T.accentBorder : T.border}`,
        borderRadius: 7,
        cursor: "pointer",
        color: isActive ? T.accent : T.textSecondary,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.6, marginRight: 5 }}>{label}:</span>
      <span>{selected ? selected.label : ""}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="down"
        size={12}
        color={isActive ? T.accent : T.textTertiary}
        style={{ position: "absolute", right: 8, pointerEvents: "none" }}
      />
    </div>
  );
}
