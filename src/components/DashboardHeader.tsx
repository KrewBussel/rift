"use client";

import Link from "next/link";
import GlobalSearch from "./GlobalSearch";

/** Persistent dashboard header. User identity on the left, firm on the right.
 *  Client component so the avatar image can fail over to initials on error. */
export default function DashboardHeader({
  user,
  firm,
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN" | "ADVISOR" | "OPS" | string;
  };
  firm: {
    name: string;
    logoUrl?: string | null;
    updatedAt?: Date | string | null;
  } | null;
}) {
  const logoSrc =
    firm?.logoUrl
      ? `/api/firm/logo?v=${
          firm.updatedAt
            ? new Date(firm.updatedAt).getTime()
            : Date.now()
        }`
      : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?";
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const roleLabel = user.role === "ADMIN" ? "Admin" : user.role === "ADVISOR" ? "Advisor" : "Ops";

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur-md"
      style={{
        background: "rgba(10, 13, 18, 0.78)",
        borderBottom: "1px solid #252b38",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center gap-6">
        {/* Left: firm */}
        {firm && (
          <Link
            href="/dashboard"
            className="min-w-0 flex items-center gap-2.5 flex-shrink-0 rounded-lg px-2 py-1 -mx-2 transition-colors hover:bg-[#161b22]"
          >
            {logoSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-auto max-w-[140px] object-contain flex-shrink-0"
              />
            ) : (
              <span
                aria-hidden
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ background: "linear-gradient(180deg, #60a5fa 0%, #a78bfa 100%)" }}
              />
            )}
            <p
              className="text-xl font-bold truncate leading-tight font-[family-name:var(--font-inter-tight)]"
              style={{ color: "#e4e6ea", letterSpacing: "-0.015em" }}
            >
              {firm.name}
            </p>
          </Link>
        )}

        {/* Middle: global search */}
        <div className="flex-1 min-w-0 max-w-xl mx-auto hidden md:block">
          <GlobalSearch userRole={(user.role as "ADMIN" | "ADVISOR" | "OPS") ?? "OPS"} />
        </div>

        {/* Right: identity */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 min-w-0 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-[#161b22]"
        >
          <div className="min-w-0 text-right hidden sm:block">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: "#e4e6ea" }}>
              {fullName}
            </p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: "#7d8590" }}>
              {roleLabel}
            </p>
          </div>
          <div
            className="relative w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 55%, #0891b2 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <AvatarImage userId={user.id} initials={initials} />
          </div>
        </Link>
      </div>
    </header>
  );
}

/** Uploaded avatar image with initials fallback. Uses the existing avatar
 *  endpoint; the <img> errors silently back to the initials layer behind it. */
function AvatarImage({ userId, initials }: { userId: string; initials: string }) {
  return (
    <>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{ color: "#fff" }}>
        {initials}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/users/${userId}/avatar`}
        alt=""
        className="relative w-full h-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </>
  );
}
