"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, SETTINGS_TOKENS, Btn } from "./primitives";

const T = SETTINGS_TOKENS;

export type SettingsSectionId =
  | "profile"
  | "notifications"
  | "security"
  | "workspace"
  | "team"
  | "billing"
  | "integrations";

export type SettingsRole = "ADMIN" | "ADVISOR" | "OPS";

const SECTION_DEFS: Array<{
  id: SettingsSectionId;
  label: string;
  group: "Personal" | "Workspace";
  icon: React.ComponentProps<typeof Icon>["name"];
  adminOnly?: boolean;
}> = [
  { id: "profile",       label: "Profile",       group: "Personal",  icon: "user" },
  { id: "notifications", label: "Notifications", group: "Personal",  icon: "bell" },
  { id: "security",      label: "Security",      group: "Personal",  icon: "shield" },
  { id: "workspace",     label: "Workspace",     group: "Workspace", icon: "building", adminOnly: true },
  { id: "team",          label: "Team & roles",  group: "Workspace", icon: "users",    adminOnly: true },
  { id: "billing",       label: "Billing",       group: "Workspace", icon: "card",     adminOnly: true },
  { id: "integrations",  label: "Integrations",  group: "Workspace", icon: "plug",     adminOnly: true },
];

export function visibleSections(role: SettingsRole): typeof SECTION_DEFS {
  if (role === "ADMIN") return SECTION_DEFS;
  return SECTION_DEFS.filter((s) => !s.adminOnly);
}

/* ─── Sidebar ─────────────────────────────────────────────────────────── */

export function SettingsSidebar({
  active,
  onSelect,
  role,
}: {
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  role: SettingsRole;
}) {
  const visible = visibleSections(role);
  const groups = ["Personal", "Workspace"] as const;

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "0 8px",
          overflowY: "auto",
          flex: 1,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: T.textTertiary,
            padding: "0 10px 8px",
          }}
        >
          Settings
        </div>
        {groups.map((g) => {
          const items = visible.filter((s) => s.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: T.textDisabled,
                  padding: "0 10px 4px",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {g}
              </div>
              {items.map((s) => {
                const isActive = s.id === active;
                return (
                  <SidebarItem
                    key={s.id}
                    isActive={isActive}
                    label={s.label}
                    iconName={s.icon}
                    onClick={() => onSelect(s.id)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SidebarItem({
  isActive,
  label,
  iconName,
  onClick,
}: {
  isActive: boolean;
  label: string;
  iconName: React.ComponentProps<typeof Icon>["name"];
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 6,
        cursor: "pointer",
        color: isActive || hover ? T.text : T.textSecondary,
        background: isActive ? T.surface3 : hover ? T.surface2 : "transparent",
        fontSize: 13,
        fontWeight: 500,
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 1,
            top: 6,
            bottom: 6,
            width: 2,
            background: T.accent,
            borderRadius: 2,
          }}
        />
      )}
      <Icon name={iconName} />
      <span>{label}</span>
    </div>
  );
}

/* ─── Section header ───────────────────────────────────────────────────── */

export function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "32px 40px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: T.textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          Settings
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            color: T.text,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: T.textSecondary,
              maxWidth: 640,
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

/* ─── Section transition wrapper ───────────────────────────────────────── */

export function SectionTransition({
  activeId,
  children,
}: {
  activeId: string;
  children: (renderId: string) => React.ReactNode;
}) {
  const [displayId, setDisplayId] = useState(activeId);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeId === displayId) return;
    setPhase("out");
    const t = window.setTimeout(() => {
      setDisplayId(activeId);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("in"));
      });
    }, 140);
    return () => window.clearTimeout(t);
  }, [activeId, displayId]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        background: T.page,
        position: "relative",
      }}
    >
      <div
        style={{
          opacity: phase === "in" ? 1 : 0,
          transform: phase === "in" ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 220ms cubic-bezier(0.32,0.72,0,1), transform 220ms cubic-bezier(0.32,0.72,0,1)",
          willChange: "opacity, transform",
        }}
      >
        {children(displayId)}
      </div>
    </div>
  );
}

/* ─── Sticky save bar ──────────────────────────────────────────────────── */

export function SaveBar({
  visible,
  saving,
  message,
  onSave,
  onCancel,
}: {
  visible: boolean;
  saving?: boolean;
  message?: { type: "success" | "error"; text: string } | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        bottom: 24,
        background: T.surface3,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        transform: visible ? "translateY(0)" : "translateY(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 180ms ease",
        pointerEvents: visible ? "auto" : "none",
        zIndex: 10,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.warning }} />
      <div style={{ flex: 1, fontSize: 12.5, color: T.text }}>
        {message?.type === "error"
          ? <span style={{ color: T.danger }}>{message.text}</span>
          : message?.type === "success"
          ? <span style={{ color: T.success }}>{message.text}</span>
          : "You have unsaved changes"}
      </div>
      <Btn ghost onClick={onCancel} disabled={saving}>Discard</Btn>
      <Btn primary onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Btn>
    </div>
  );
}
