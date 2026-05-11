"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OnboardingChecklistData } from "@/lib/onboarding";
import { T } from "./tokens";
import { Icon } from "./primitives";

export default function OnboardingChecklistV2({
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferences: { onboardingHidden: true } }),
      });
      router.refresh();
    });
  };

  return (
    <div
      style={{
        background: T.surface1,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          gap: 12,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: allDone ? T.successSoft : T.accentSoft,
              border: `1px solid ${allDone ? T.successBorder : T.accentBorder}`,
              color: allDone ? T.success : T.accent,
              flexShrink: 0,
            }}
          >
            <Icon name={allDone ? "check" : "spark"} size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 13.5,
                fontWeight: 600,
                color: T.text,
                letterSpacing: -0.1,
              }}
            >
              {allDone ? "You're all set up" : "Get started with Rift"}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textSecondary }}>
              {allDone
                ? "Nice work — every item is checked off."
                : `${completedCount} of ${totalCount} steps complete · ${pct}%`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            style={{
              height: 26,
              padding: "0 10px",
              borderRadius: 7,
              background: T.surface1,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            aria-label="Dismiss onboarding checklist"
            title="Dismiss permanently"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              display: "grid",
              placeItems: "center",
              background: T.surface1,
              border: `1px solid ${T.border}`,
              color: T.textTertiary,
              fontSize: 14,
              cursor: "pointer",
              opacity: pending ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 18px 0" }}>
        <div
          style={{
            height: 5,
            borderRadius: 999,
            overflow: "hidden",
            background: T.surface3,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: allDone
                ? T.success
                : `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
              transition: "width 400ms",
            }}
          />
        </div>
      </div>

      {!collapsed && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 8,
          }}
        >
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: item.done ? T.surface2 : T.surface1,
                  border: `1px solid ${T.borderSoft}`,
                  textDecoration: "none",
                  transition: "background 100ms, border-color 100ms",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surface3;
                  e.currentTarget.style.borderColor = T.borderStrong;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = item.done ? T.surface2 : T.surface1;
                  e.currentTarget.style.borderColor = T.borderSoft;
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    marginTop: 1,
                    background: item.done ? T.success : "transparent",
                    border: `1.5px solid ${item.done ? T.success : T.borderStrong}`,
                    color: T.surface1,
                  }}
                >
                  {item.done && (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path
                        d="M3 7l2.5 2.5L11 4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: item.done ? T.textTertiary : T.text,
                      textDecoration: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: T.textTertiary,
                    }}
                  >
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
