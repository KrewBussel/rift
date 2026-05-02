"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Role = "ADMIN" | "ADVISOR" | "OPS";

type CaseHit    = { id: string; name: string; status: string; subtitle: string };
type PersonHit  = { id: string; name: string; email: string; role: string };
type TaskHit    = { id: string; title: string; status: string; caseId: string; caseName: string };
type PageHit    = { id: string; label: string; href: string; hint?: string };

type SearchResponse = {
  cases: CaseHit[];
  people: PersonHit[];
  tasks: TaskHit[];
};

/* ─── Static routes (pages + settings tabs) matched client-side ─────────── */

const PAGES: PageHit[] = [
  { id: "page-dashboard",    label: "Dashboard",            href: "/dashboard",                hint: "Home" },
  { id: "page-cases",        label: "All cases",            href: "/dashboard/cases",          hint: "Case list" },
  { id: "page-case-new",     label: "New case",             href: "/dashboard/cases/new",      hint: "Start a rollover" },
  { id: "page-intelligence", label: "Custodian intelligence", href: "/dashboard/intelligence", hint: "Custodian directory + AI" },
];

const SETTINGS_TABS: PageHit[] = [
  { id: "set-profile",       label: "Profile",        href: "/dashboard/settings", hint: "Settings" },
  { id: "set-password",      label: "Password",       href: "/dashboard/settings", hint: "Settings" },
  { id: "set-preferences",   label: "Preferences",    href: "/dashboard/settings", hint: "Settings" },
  { id: "set-org",           label: "Organization",   href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-security",      label: "Security",       href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-team",          label: "Team",           href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-ai",            label: "AI Usage",       href: "/dashboard/settings", hint: "Settings" },
  { id: "set-billing",       label: "Billing",        href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-compliance",    label: "Compliance",     href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-notifications", label: "Notifications",  href: "/dashboard/settings", hint: "Settings (admin)" },
  { id: "set-integrations",  label: "Integrations",   href: "/dashboard/settings", hint: "Settings (admin) · Wealthbox, Salesforce" },
  { id: "set-audit",         label: "Audit log",      href: "/dashboard/settings", hint: "Settings (admin)" },
];

/* ─── Root component ─────────────────────────────────────────────────────── */

export default function GlobalSearch({ userRole }: { userRole: Role }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResponse>({ cases: [], people: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Debounced server search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ cases: [], people: [], tasks: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const body = (await res.json()) as SearchResponse;
        setResults(body);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return [...PAGES, ...SETTINGS_TABS]
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.hint?.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query]);

  // Flatten results into a single linear list for keyboard nav
  const flat = useMemo(() => {
    const items: Array<{ key: string; href: string }> = [];
    for (const c of results.cases) items.push({ key: `c:${c.id}`, href: `/dashboard/cases/${c.id}` });
    for (const p of results.people) items.push({ key: `u:${p.id}`, href: `/dashboard/settings` });
    for (const t of results.tasks) items.push({ key: `t:${t.id}`, href: `/dashboard/cases/${t.caseId}` });
    for (const p of pageHits) items.push({ key: `p:${p.id}`, href: p.href });
    return items;
  }, [results, pageHits]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const hasAny = flat.length > 0;
  const showDropdown = open && query.trim().length >= 2;

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (!hasAny) return;
      e.preventDefault();
      const target = flat[highlight];
      if (target) {
        setOpen(false);
        router.push(target.href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  let runningIndex = 0;
  const wrap = (hit: boolean) => (hit ? runningIndex++ : runningIndex);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "#7d8590" }}
          aria-hidden
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search cases, people, tasks, settings…"
          className="w-full rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none transition-colors"
          style={{
            background: "#141a24",
            border: `1px solid ${showDropdown ? "#3d4964" : "#252b38"}`,
            color: "#e4e6ea",
          }}
        />
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 mt-2 z-40 rounded-xl overflow-hidden"
          style={{
            background: "#0f131b",
            border: "1px solid #252b38",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.7)",
          }}
        >
          {loading && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-xs" style={{ color: "#7d8590" }}>
              Searching…
            </div>
          )}

          {!loading && !hasAny && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "#7d8590" }}>
              No matches for <span style={{ color: "#c9d1d9" }}>&ldquo;{query}&rdquo;</span>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto widget-scroll">
            {results.cases.length > 0 && (
              <Group label="Cases">
                {results.cases.map((c) => {
                  const idx = wrap(true);
                  return (
                    <ResultRow
                      key={`c:${c.id}`}
                      active={highlight === idx}
                      onClick={() => go(`/dashboard/cases/${c.id}`)}
                      onMouseEnter={() => setHighlight(idx)}
                      icon={<DotIcon color={statusDot(c.status)} />}
                      primary={c.name}
                      secondary={`${statusLabel(c.status)} · ${c.subtitle}`}
                    />
                  );
                })}
              </Group>
            )}
            {results.people.length > 0 && (
              <Group label="People">
                {results.people.map((p) => {
                  const idx = wrap(true);
                  const isSelf = p.role === userRole; // not meaningful; keep as hint badge only
                  void isSelf;
                  return (
                    <ResultRow
                      key={`u:${p.id}`}
                      active={highlight === idx}
                      onClick={() => go("/dashboard/settings")}
                      onMouseEnter={() => setHighlight(idx)}
                      icon={<Avatar userId={p.id} firstName={p.name.split(" ")[0] ?? ""} lastName={p.name.split(" ").slice(1).join(" ")} size={20} />}
                      iconBare
                      primary={p.name}
                      secondary={`${p.email} · ${roleLabel(p.role)}`}
                    />
                  );
                })}
              </Group>
            )}
            {results.tasks.length > 0 && (
              <Group label="Tasks">
                {results.tasks.map((t) => {
                  const idx = wrap(true);
                  return (
                    <ResultRow
                      key={`t:${t.id}`}
                      active={highlight === idx}
                      onClick={() => go(`/dashboard/cases/${t.caseId}`)}
                      onMouseEnter={() => setHighlight(idx)}
                      icon={<TaskIcon />}
                      primary={t.title}
                      secondary={`${statusLabel(t.status)} · on ${t.caseName}`}
                    />
                  );
                })}
              </Group>
            )}
            {pageHits.length > 0 && (
              <Group label="Pages & settings">
                {pageHits.map((p) => {
                  const idx = wrap(true);
                  return (
                    <ResultRow
                      key={`p:${p.id}`}
                      active={highlight === idx}
                      onClick={() => go(p.href)}
                      onMouseEnter={() => setHighlight(idx)}
                      icon={<PageIcon />}
                      primary={p.label}
                      secondary={p.hint ?? "Page"}
                    />
                  );
                })}
              </Group>
            )}
          </div>

          {hasAny && (
            <div
              className="px-4 py-2 text-[11px] flex items-center justify-between"
              style={{ borderTop: "1px solid #1e2330", background: "#0a0d12", color: "#7d8590" }}
            >
              <span>↑↓ to navigate · ↵ to open · esc to close</span>
              <span>{flat.length} match{flat.length === 1 ? "" : "es"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Result row + helpers ──────────────────────────────────────────────── */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "#7d8590" }}
      >
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultRow({
  active, onClick, onMouseEnter, icon, iconBare, primary, secondary,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  icon: React.ReactNode;
  iconBare?: boolean;
  primary: string;
  secondary: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
        style={{ background: active ? "#161d2a" : "transparent" }}
      >
        {iconBare ? (
          icon
        ) : (
          <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#0a0d12", border: "1px solid #252b38", color: "#9ca3af" }}>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm truncate" style={{ color: "#e4e6ea" }}>{primary}</span>
          <span className="block text-xs truncate" style={{ color: "#7d8590" }}>{secondary}</span>
        </span>
        <span className="flex-shrink-0 text-[10px]" style={{ color: active ? "#60a5fa" : "#4a515c" }}>
          ↵
        </span>
      </button>
    </li>
  );
}

function Initials({ value }: { value: string }) {
  const init = value.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return <span className="text-[10px] font-semibold">{init || "?"}</span>;
}

function DotIcon({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full" style={{ background: color }} />;
}

function TaskIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6l1.5 1.5L8 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 1.5h4.5L9.5 3.5V10A.5.5 0 019 10.5H3A.5.5 0 012.5 10V2A.5.5 0 013 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function statusDot(status: string): string {
  return {
    PROPOSAL_ACCEPTED: "#6e7681",
    AWAITING_CLIENT_ACTION: "#d29922",
    READY_TO_SUBMIT: "#388bfd",
    SUBMITTED: "#a78bfa",
    PROCESSING: "#fb923c",
    IN_TRANSIT: "#818cf8",
    WON: "#3fb950",
    COMPLETED: "#3fb950",
  }[status] ?? "#6e7681";
}

function statusLabel(status: string): string {
  return {
    PROPOSAL_ACCEPTED: "Proposal Accepted",
    AWAITING_CLIENT_ACTION: "Awaiting client",
    READY_TO_SUBMIT: "Ready to submit",
    SUBMITTED: "Submitted",
    PROCESSING: "Processing",
    IN_TRANSIT: "In transit",
    WON: "Won",
    COMPLETED: "Completed",
    OPEN: "Open",
    BLOCKED: "Blocked",
  }[status] ?? status;
}

function roleLabel(role: string): string {
  return role === "ADMIN" ? "Admin" : role === "ADVISOR" ? "Advisor" : "Ops";
}
