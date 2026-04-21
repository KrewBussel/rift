"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface Props {
  user: { id?: string; name?: string | null; email?: string | null };
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    matchPrefixes: [] as string[],
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M1.5 6.5L8 1.5L14.5 6.5V13.5a.5.5 0 0 1-.5.5H10V10H6v4H2a.5.5 0 0 1-.5-.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/cases",
    label: "Cases",
    matchPrefixes: [] as string[],
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/intelligence",
    label: "Intelligence",
    matchPrefixes: [] as string[],
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5a5 5 0 0 0-3 9V12a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 12v-1.5a5 5 0 0 0-3-9Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M6 14h4M6.5 15.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    matchPrefixes: [] as string[],
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M13.07 9.53a1 1 0 0 0 .2 1.1l.03.03a1.21 1.21 0 0 1-1.71 1.71l-.03-.03a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.91V13a1.21 1.21 0 0 1-2.42 0v-.06a1 1 0 0 0-.65-.92 1 1 0 0 0-1.1.2l-.03.03a1.21 1.21 0 0 1-1.71-1.71l.03-.03a1 1 0 0 0 .2-1.1A1 1 0 0 0 3.27 9H3a1.21 1.21 0 0 1 0-2.42h.06a1 1 0 0 0 .92-.65 1 1 0 0 0-.2-1.1l-.03-.03A1.21 1.21 0 0 1 5.46 3.09l.03.03a1 1 0 0 0 1.1.2A1 1 0 0 0 7.2 2.4V2a1.21 1.21 0 0 1 2.42 0v.06a1 1 0 0 0 .65.91 1 1 0 0 0 1.1-.2l.03-.03a1.21 1.21 0 0 1 1.71 1.71l-.03.03a1 1 0 0 0-.2 1.1A1 1 0 0 0 12.79 7H13a1.21 1.21 0 0 1 0 2.42h-.06a1 1 0 0 0-.87.11Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
];

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const avatarRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rift-sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
    setMounted(true);
  }, []);

  useEffect(() => {
    const img = avatarRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setAvatarError(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("rift-sidebar-collapsed", String(next));
      return next;
    });
  }

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.exact && pathname === item.href) return true;
    if (!item.exact && pathname.startsWith(item.href)) return true;
    return item.matchPrefixes?.some((p) => pathname.startsWith(p)) ?? false;
  }

  // Avoid flash of wrong collapsed state before localStorage loads
  const width = !mounted ? 220 : collapsed ? 60 : 220;

  return (
    <>
      <aside
        className="flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-200"
        style={{
          width,
          minWidth: width,
          background: "#161b22",
          borderRight: "1px solid #21262d",
        }}
      >
        {/* Logo + toggle */}
        <div
          className="flex items-center h-14 flex-shrink-0 px-3"
          style={{ borderBottom: "1px solid #21262d", justifyContent: collapsed ? "center" : "space-between" }}
        >
          {!collapsed && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 select-none min-w-0"
            >
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="flex-shrink-0">
                <defs>
                  <linearGradient id="sb-logo-a" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#60a5fa" />
                    <stop offset="1" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="sb-logo-b" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#a78bfa" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="sb-logo-c" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#67e8f9" />
                    <stop offset="1" stopColor="#0891b2" />
                  </linearGradient>
                </defs>
                <rect x="0"  y="2"  width="10" height="24" rx="2.5" fill="url(#sb-logo-a)" />
                <rect x="6"  y="6"  width="14" height="16" rx="2.5" fill="url(#sb-logo-b)" opacity="0.92" />
                <rect x="14" y="10" width="14" height="12" rx="2.5" fill="url(#sb-logo-c)" opacity="0.85" />
              </svg>
              <span
                className="font-black text-[15px] truncate"
                style={{ color: "#e4e6ea", letterSpacing: "-0.02em" }}
              >
                Rift
              </span>
            </Link>
          )}

          <button
            onClick={toggle}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-[#21262d]"
            style={{ color: "#7d8590" }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors mb-0.5"
                style={{
                  background: active ? "#21262d" : "transparent",
                  color: active ? "#e4e6ea" : "#7d8590",
                  whiteSpace: "nowrap",
                }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="flex-shrink-0 px-2 pb-3" style={{ borderTop: "1px solid #21262d" }}>
          <div className="pt-3">
            <Link
              href="/dashboard/settings"
              title={collapsed ? (user.name ?? user.email ?? "Settings") : undefined}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors hover:bg-[#21262d] mb-0.5"
              style={{ color: "#8b949e" }}
            >
              {!avatarError && user.id ? (
                <img
                  ref={avatarRef}
                  src={`/api/users/${user.id}/avatar`}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                  style={{ background: "#2d333b", color: "#e4e6ea" }}
                >
                  {user.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              {!collapsed && (
                <span className="text-sm truncate" style={{ color: "#8b949e" }}>
                  {user.name ?? user.email}
                </span>
              )}
            </Link>

            <button
              onClick={() => setConfirmOpen(true)}
              title={collapsed ? "Sign out" : undefined}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm transition-colors hover:bg-[#21262d]"
              style={{ color: "#7d8590" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" aria-hidden>
                <path
                  d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11L14 8m0 0L10.5 5M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {!collapsed && <span className="truncate">Sign out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Sign-out confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm mx-4"
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-1" style={{ color: "#e4e6ea" }}>
              Sign out?
            </h2>
            <p className="text-sm mb-5" style={{ color: "#7d8590" }}>
              Are you sure you want to sign out?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[#21262d]"
                style={{ color: "#8b949e" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => { await signOut({ redirect: false }); window.location.href = window.location.origin; }}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors hover:bg-red-700"
                style={{ background: "#b91c1c", color: "#fff" }}
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
