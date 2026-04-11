"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface Props {
  user: { name?: string | null; email?: string | null };
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
];

export default function TopNav({ user }: Props) {
  const pathname = usePathname();
  const onSettingsPage = pathname.startsWith("/dashboard/settings");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 h-14"
      style={{
        background: "#161b22",
        borderBottom: "1px solid #21262d",
      }}
    >
      {/* Logo + Nav */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 select-none">
          <svg width="22" height="19" viewBox="0 0 32 28" fill="none">
            <rect x="0" y="0" width="14" height="28" rx="2" fill="#388bfd"/>
            <rect x="6" y="0" width="18" height="14" rx="2" fill="#79c0ff" opacity="0.85"/>
            <rect x="12" y="12" width="16" height="16" rx="2" fill="#388bfd" opacity="0.55"/>
          </svg>
          <span className="font-black text-[15px]" style={{ color: "#e4e6ea", letterSpacing: "-0.02em" }}>Rift</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? "#21262d" : "transparent",
                  color: active ? "#e4e6ea" : "#7d8590",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors"
          style={{
            background: onSettingsPage ? "#21262d" : "transparent",
            color: onSettingsPage ? "#e4e6ea" : "#7d8590",
          }}
          title="Settings"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
            style={{ background: onSettingsPage ? "#388bfd26" : "#2d333b", color: onSettingsPage ? "#79c0ff" : "#e4e6ea" }}
          >
            {user.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-sm hidden sm:block font-medium" style={{ color: onSettingsPage ? "#e4e6ea" : "#8b949e" }}>
            {user.name ?? user.email}
          </span>
        </Link>

        <div className="w-px h-4 mx-1" style={{ background: "#21262d" }} />

        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md transition-colors hover:bg-[#21262d]"
          style={{ color: "#7d8590" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5M9.5 9.5L13 7m0 0L9.5 4.5M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>

      {/* Sign-out confirmation */}
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
            <h2 className="text-base font-semibold mb-1" style={{ color: "#e4e6ea" }}>Sign out?</h2>
            <p className="text-sm mb-5" style={{ color: "#7d8590" }}>Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[#21262d]"
                style={{ color: "#8b949e" }}
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors hover:bg-red-700"
                style={{ background: "#b91c1c", color: "#fff" }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
