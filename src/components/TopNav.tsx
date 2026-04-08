"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  user: { name?: string | null; email?: string | null };
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Cases" },
];

export default function TopNav({ user }: Props) {
  const pathname = usePathname();
  const onSettingsPage = pathname.startsWith("/dashboard/settings");

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30" style={{ boxShadow: "var(--shadow-xs)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo + Nav */}
          <div className="flex items-center gap-7">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 6.5h9M7.5 3L11 6.5 7.5 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-[15px] tracking-tight">Rift</span>
            </Link>

            <nav className="flex items-center gap-0.5">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* User / Settings */}
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                onSettingsPage ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"
              }`}
              title="Settings"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold ${onSettingsPage ? "bg-blue-600" : "bg-gray-700"}`}>
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <span className={`text-sm hidden sm:block font-medium ${onSettingsPage ? "text-blue-700" : "text-gray-700"}`}>
                {user.name ?? user.email}
              </span>
            </Link>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-200 mx-1" />

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors px-2.5 py-1.5 rounded-md hover:bg-gray-50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5M9.5 9.5L13 7m0 0L9.5 4.5M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
