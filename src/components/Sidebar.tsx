"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buildApexUrl } from "@/lib/firmDomain";
import { T, avatarColor, HEADLINE_STACK } from "./tokens";
import { Icon, Avatar } from "./primitives";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: number;
};

type NavItemDef = NavItem & { adminOnly?: boolean };

const NAV: NavItemDef[] = [
  { href: "/dashboard",              label: "Dashboard",    icon: "home",  exact: true },
  { href: "/dashboard/cases",        label: "Cases",        icon: "cases" },
  { href: "/dashboard/intelligence", label: "Intelligence", icon: "spark" },
  { href: "/dashboard/team",         label: "Team",         icon: "users", adminOnly: true },
  { href: "/dashboard/settings",     label: "Settings",     icon: "cog"   },
];

export type SidebarRecentCase = {
  id: string;
  name: string;
  sub: string;
};

export default function SidebarV2({
  user,
  firm,
  caseCount,
  recentCases,
}: {
  user: { id: string; name: string | null; email: string | null; role?: string | null; avatarUrl?: string | null };
  firm: { name: string; plan?: string | null };
  caseCount: number;
  recentCases: SidebarRecentCase[];
}) {
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  const userName = user.name?.trim() || user.email || "User";

  return (
    <>
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          background: T.sidebar,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "14px 12px 12px",
        }}
      >
        {/* Brand / firm */}
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 8px 14px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: T.accent,
              color: T.surface1,
              display: "grid",
              placeItems: "center",
              fontFamily: HEADLINE_STACK,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: -0.5,
            }}
          >
            R
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
                letterSpacing: -0.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {firm.name}
            </div>
            {firm.plan && (
              <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{firm.plan}</div>
            )}
          </div>
        </Link>

        {/* Search shortcut */}
        <div style={{ padding: "0 4px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 30,
              padding: "0 10px",
              background: T.surface1,
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              color: T.textTertiary,
              cursor: "pointer",
            }}
          >
            <Icon name="search" size={14} />
            <span style={{ fontSize: 12.5, flex: 1 }}>Search cases…</span>
            <span
              style={{
                fontSize: 10.5,
                fontFamily: "ui-monospace, monospace",
                padding: "1px 5px",
                border: `1px solid ${T.border}`,
                borderRadius: 4,
                background: T.surface2,
              }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: T.textTertiary,
              padding: "8px 10px 6px",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Workspace
          </div>
          {NAV.filter((n) => !n.adminOnly || user.role === "ADMIN").map((n) => (
            <NavItemRow
              key={n.href}
              item={n}
              badge={n.href === "/dashboard/cases" ? caseCount : undefined}
              active={isActive(n)}
            />
          ))}

          {recentCases.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: T.textTertiary,
                  padding: "20px 10px 6px",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Recent cases
              </div>
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/cases/${c.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      color: T.textSecondary,
                      fontSize: 12.5,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.surface3;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: avatarColor(c.name),
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: T.text,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: T.textTertiary, marginTop: 1 }}>
                        {c.sub}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User card */}
        <div
          style={{
            marginTop: 8,
            padding: "10px 8px",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Avatar
            name={userName}
            size={28}
            image={user.id ? `/api/users/${user.id}/avatar` : undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: T.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: T.textTertiary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            title="Sign out"
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: T.textTertiary,
              display: "inline-flex",
            }}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      {confirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(31,30,26,0.35)",
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380,
              width: "100%",
              margin: "0 16px",
              background: T.surface1,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 22,
              boxShadow: "0 16px 48px rgba(60,55,40,0.18)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T.text }}>Sign out?</h2>
            <p style={{ fontSize: 13, color: T.textSecondary, margin: "6px 0 18px" }}>
              Are you sure you want to sign out?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  background: T.surface1,
                  color: T.text,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.assign(buildApexUrl("/login"));
                }}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${T.danger}`,
                  borderRadius: 7,
                  background: T.danger,
                  color: T.surface1,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItemRow({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link href={item.href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 10px",
          margin: "1px 0",
          borderRadius: 7,
          cursor: "pointer",
          color: active ? T.accent : hover ? T.text : T.textSecondary,
          background: active ? T.accentSoft : hover ? T.surface3 : "transparent",
          fontSize: 13,
          fontWeight: 500,
          border: active ? `1px solid ${T.accentBorder}` : "1px solid transparent",
          transition: "background 100ms, color 100ms, border-color 100ms",
        }}
      >
        <Icon name={item.icon} size={15} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {badge != null && badge > 0 && (
          <span
            style={{
              fontSize: 10.5,
              padding: "1px 6px",
              borderRadius: 999,
              background: active ? T.surface1 : T.surface1,
              color: active ? T.accent : T.textTertiary,
              border: `1px solid ${active ? T.accentBorder : T.border}`,
              fontWeight: 600,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
