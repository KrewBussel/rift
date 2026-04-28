"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OnboardingChecklistData } from "@/lib/onboarding";

const CARD_BG = "#141a24";
const CARD_BORDER = "#252b38";
const TEXT = "#e4e6ea";
const MUTED = "#7d8590";

export default function OnboardingChecklist({
  items,
  completedCount,
  totalCount,
}: OnboardingChecklistData) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);

  const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  const dismiss = () => {
    startTransition(async () => {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { onboardingHidden: true } }),
      });
      router.refresh();
    });
  };

  return (
    <div
      className="rounded-xl mb-6 overflow-hidden"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3 gap-3"
        style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: allDone ? "#062e1e" : "#0d1f38",
              border: `1px solid ${allDone ? "#065f46" : "#1e3a8a"}`,
              color: allDone ? "#6ee7b7" : "#60a5fa",
            }}
          >
            {allDone ? <CheckIcon /> : <RocketIcon />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: TEXT }}>
              {allDone ? "You're all set up" : "Get started with Rift"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              {allDone
                ? "Nice work — every item is checked off."
                : `${completedCount} of ${totalCount} steps complete · ${pct}%`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#c9d1d9" }}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="w-7 h-7 rounded-md text-sm flex items-center justify-center disabled:opacity-50"
            style={{ background: "#161b22", border: "1px solid #30363d", color: MUTED }}
            aria-label="Dismiss onboarding checklist"
            title="Dismiss permanently"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-5 pt-3">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "#0a0d12", border: `1px solid ${CARD_BORDER}` }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: allDone ? "#3fb950" : "#60a5fa",
              transition: "width 400ms",
            }}
          />
        </div>
      </div>

      {!collapsed && (
        <ul className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#1a212c] h-full"
                style={{ background: "#0a0d12", border: `1px solid ${CARD_BORDER}` }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    background: item.done ? "#062e1e" : "transparent",
                    border: `1.5px solid ${item.done ? "#065f46" : "#30363d"}`,
                    color: "#6ee7b7",
                  }}
                >
                  {item.done && <SmallCheck />}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: item.done ? MUTED : TEXT,
                      textDecoration: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: MUTED }}>
                    {item.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5l3 3L12.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 7l2.5 2.5L11 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9.5 2.5c2 0 4 2 4 4 0 1.2-.6 2.4-1.5 3.3l-1.5 1.5-3.3-3.3 1.5-1.5C9.6 5.6 10.8 5 12 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 9.5L2.5 13.5M2.5 13.5l2-.5M2.5 13.5l.5-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
