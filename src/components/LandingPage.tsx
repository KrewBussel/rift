"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  heroBlack: "#0c0a07",
  gold: "#c9922a",
  goldLight: "#f0c46a",
  cream: "#faf8f4",
  darkGreen: "#0b1f14",
  warmWhite: "#f5f0e8",
  muted: "#9c8f7a",
  diagonalHatch: `repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)`,
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const TRUSTED_FIRMS = [
  "Apex Wealth Advisors",
  "Summit Capital Group",
  "Harbor Financial Partners",
  "Meridian Wealth Management",
  "Cornerstone Advisors",
  "Clearwater Financial",
  "BlueSky Wealth Partners",
  "Legacy Capital Group",
  "Pinnacle Wealth Advisors",
  "Ridgeline Advisors",
  "Coastal Capital Management",
  "Northstar Wealth Partners",
  "Ironwood Financial",
  "Silverline Advisors",
  "Crestview Wealth Group",
];

const PIPELINE_STAGES = [
  { label: "Intake", count: 3, active: false },
  { label: "Awaiting Client", count: 7, active: false },
  { label: "Ready to Submit", count: 2, active: false },
  { label: "Processing", count: 5, active: true },
  { label: "Awaiting Confirmation", count: 4, active: false },
  { label: "Under Review", count: 1, active: false },
  { label: "Completed", count: 12, active: false },
];

// Pre-computed clock tick coordinates — avoids Node.js / browser trig precision divergence
// (Math.sin/cos can differ at the 15th decimal place between JS engines, causing hydration errors)
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const CLOCK_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 - 90) * (Math.PI / 180);
  return {
    x1: r3(20 + 12 * Math.cos(a)),
    y1: r3(20 + 12 * Math.sin(a)),
    x2: r3(20 + 14 * Math.cos(a)),
    y2: r3(20 + 14 * Math.sin(a)),
    major: i % 3 === 0,
  };
});

const FEATURES = [
  {
    title: "Case Pipeline",
    desc: "A clear status model from Intake to Completed. Every case has a single source of truth — no more hunting through email threads.",
    span: "col-span-3 row-span-2",
    accentColor: C.gold,
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Progress bar segments */}
        <rect x="4" y="20" width="8" height="10" rx="2" fill="#c9922a"/>
        <rect x="14" y="20" width="8" height="10" rx="2" fill="#c9922a"/>
        <rect x="24" y="20" width="8" height="10" rx="2" fill="#c9922a"/>
        <rect x="34" y="20" width="8" height="10" rx="2" fill="#3a3228"/>
        <rect x="44" y="20" width="0" height="10" rx="2" fill="#3a3228"/>
        {/* Connector dots */}
        <circle cx="12" cy="25" r="1.5" fill="#f5f0e8"/>
        <circle cx="22" cy="25" r="1.5" fill="#f5f0e8"/>
        <circle cx="32" cy="25" r="1.5" fill="#f5f0e8"/>
        {/* Label lines */}
        <rect x="4" y="34" width="8" height="2" rx="1" fill="#9c8f7a"/>
        <rect x="14" y="34" width="8" height="2" rx="1" fill="#9c8f7a"/>
        <rect x="24" y="34" width="8" height="2" rx="1" fill="#9c8f7a"/>
        <rect x="34" y="34" width="8" height="2" rx="1" fill="#3a3228"/>
        {/* Arrow */}
        <path d="M38 24l4-4m0 0l-4-4m4 4H28" stroke="#f0c46a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Smart Checklists",
    desc: "Auto-generated required document checklists per rollover type. Track what's been requested, received, and reviewed.",
    span: "col-span-3 row-span-1",
    accentColor: "#4a7c59",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="8" width="6" height="6" rx="1" fill="#c9922a"/>
        <path d="M6 11l1.5 1.5L10 9" stroke="#0c0a07" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="9" width="20" height="4" rx="1" fill="#3a3228"/>
        <rect x="4" y="19" width="6" height="6" rx="1" stroke="#5a4f3e" strokeWidth="1.5" fill="none"/>
        <rect x="14" y="20" width="16" height="4" rx="1" fill="#3a3228"/>
        <rect x="4" y="30" width="6" height="6" rx="1" fill="#c9922a"/>
        <path d="M6 33l1.5 1.5L10 31" stroke="#0c0a07" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="31" width="22" height="4" rx="1" fill="#3a3228"/>
      </svg>
    ),
  },
  {
    title: "Task Engine",
    desc: "Assign work to advisors or ops with due dates and status tracking. Get alerts before tasks go overdue.",
    span: "col-span-2 row-span-1",
    accentColor: "#b07d2a",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Calendar grid */}
        <rect x="4" y="8" width="22" height="22" rx="3" fill="#1e1810" stroke="#3a3228" strokeWidth="1.5"/>
        <rect x="4" y="8" width="22" height="6" rx="3" fill="#3a3228"/>
        <rect x="4" y="11" width="22" height="3" fill="#3a3228"/>
        <line x1="10" y1="18" x2="10" y2="18" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="18" x2="16" y2="18" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="22" y1="18" x2="22" y2="18" stroke="#c9922a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="23" x2="10" y2="23" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="23" x2="16" y2="23" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        {/* Clock overlay */}
        <circle cx="28" cy="28" r="10" fill="#1e1810" stroke="#c9922a" strokeWidth="1.5"/>
        <line x1="28" y1="23" x2="28" y2="28" stroke="#f0c46a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="28" x2="32" y2="31" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="28" cy="28" r="1.5" fill="#f0c46a"/>
      </svg>
    ),
  },
  {
    title: "Document Vault",
    desc: "Secure file storage tied directly to each case. No more emailing PDFs back and forth.",
    span: "col-span-2 row-span-1",
    accentColor: "#7b5ea7",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* 3 stacked sheets */}
        <rect x="14" y="14" width="18" height="22" rx="2" fill="#2a2218" stroke="#3a3228" strokeWidth="1.2"/>
        <rect x="10" y="10" width="18" height="22" rx="2" fill="#221c14" stroke="#3a3228" strokeWidth="1.2"/>
        <rect x="6" y="6" width="18" height="22" rx="2" fill="#1a1510" stroke="#5a4f3e" strokeWidth="1.5"/>
        {/* Lines on top sheet */}
        <rect x="9" y="12" width="10" height="2" rx="1" fill="#9c8f7a"/>
        <rect x="9" y="17" width="12" height="2" rx="1" fill="#9c8f7a"/>
        <rect x="9" y="22" width="8" height="2" rx="1" fill="#9c8f7a"/>
        {/* Gold clip */}
        <rect x="11" y="3" width="10" height="7" rx="2" fill="none" stroke="#c9922a" strokeWidth="2"/>
        <rect x="14" y="1" width="4" height="4" rx="1" fill="#c9922a"/>
      </svg>
    ),
  },
  {
    title: "Compliance Audit Trail",
    desc: "Every status change, note, and action is logged with a timestamp and actor. Always know what happened and when.",
    span: "col-span-2 row-span-1",
    accentColor: "#c04a3a",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Clock face */}
        <circle cx="20" cy="20" r="16" fill="#1a1510" stroke="#5a4f3e" strokeWidth="1.5"/>
        {/* Hour tick marks — use pre-computed coords to prevent SSR/client trig divergence */}
        {CLOCK_TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.major ? "#c9922a" : "#5a4f3e"}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}
        {/* Sweeping arrow hand */}
        <path d="M20 20 L28 10" stroke="#f0c46a" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M28 10 L30 14 M28 10 L24 10" stroke="#f0c46a" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="20" y1="20" x2="20" y2="12" stroke="#c9922a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="20" x2="26" y2="22" stroke="#9c8f7a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="20" r="2" fill="#c9922a"/>
      </svg>
    ),
  },
  {
    title: "Team Coordination",
    desc: "Advisors and ops work from the same case view. Assign roles, see who owns what, and never duplicate effort.",
    span: "col-span-3 row-span-1",
    accentColor: "#3a6b8a",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Two avatar circles */}
        <circle cx="14" cy="16" r="8" fill="#2a3a28" stroke="#c9922a" strokeWidth="1.5"/>
        <circle cx="26" cy="16" r="8" fill="#1a2834" stroke="#4a7c59" strokeWidth="1.5"/>
        {/* Face dots */}
        <circle cx="11" cy="15" r="1.2" fill="#c9922a"/>
        <circle cx="17" cy="15" r="1.2" fill="#c9922a"/>
        <circle cx="23" cy="15" r="1.2" fill="#9c8f7a"/>
        <circle cx="29" cy="15" r="1.2" fill="#9c8f7a"/>
        {/* Connector line */}
        <line x1="14" y1="16" x2="26" y2="16" stroke="#c9922a" strokeWidth="1" strokeDasharray="2 2"/>
        {/* Shared document at bottom */}
        <rect x="13" y="27" width="14" height="10" rx="2" fill="#1a1510" stroke="#c9922a" strokeWidth="1.2"/>
        <rect x="15" y="30" width="8" height="1.5" rx="0.5" fill="#9c8f7a"/>
        <rect x="15" y="33" width="6" height="1.5" rx="0.5" fill="#9c8f7a"/>
        {/* Connector lines from avatars to document */}
        <line x1="14" y1="24" x2="17" y2="27" stroke="#c9922a" strokeWidth="1" strokeDasharray="2 2"/>
        <line x1="26" y1="24" x2="23" y2="27" stroke="#4a7c59" strokeWidth="1" strokeDasharray="2 2"/>
      </svg>
    ),
  },
];

const STEPS = [
  {
    num: "01",
    title: "Open a case",
    desc: "Enter client details, source provider, and destination custodian. Rift auto-generates a tailored document checklist and a default task set so nothing gets missed from day one.",
    tag: null,
  },
  {
    num: "02",
    title: "Work the pipeline",
    desc: "Track status, collect documents, assign tasks to advisors or ops, and log notes — all in one place, with real-time visibility for your whole team.",
    tag: null,
  },
  {
    num: "03",
    title: "Automatic alerts",
    desc: "Rift monitors every open case and fires email reminders when documents go stale, tasks are overdue, or a case hasn't moved in days. Your team gets alerted before the client has to chase you.",
    tag: "Automated",
  },
  {
    num: "04",
    title: "Close it clean",
    desc: "Mark the rollover complete with a full timestamped audit log of every action, status change, and note. Export a case summary for your records or compliance review.",
    tag: null,
  },
];

const TESTIMONIALS = [
  {
    quote: "We used to track rollovers in a shared spreadsheet that three people were editing at once. Rift replaced that in a week. We haven't touched the spreadsheet since.",
    name: "Sarah Mitchell",
    title: "Director of Operations",
    firm: "Apex Wealth Advisors",
    initials: "SM",
  },
  {
    quote: "The checklist feature alone is worth it. We used to lose track of which forms were signed and which weren't. Now it's all right there, and the ops team doesn't have to ask twice.",
    name: "James Carter",
    title: "Senior Financial Advisor",
    firm: "Summit Capital Group",
    initials: "JC",
  },
  {
    quote: "Our average rollover completion time dropped from 6 weeks to under 3 once advisors and ops were working from the same tool instead of their inboxes.",
    name: "Priya Sharma",
    title: "Head of Client Services",
    firm: "Harbor Financial Partners",
    initials: "PS",
  },
];

const STATS = [
  { value: "500+", label: "Rollovers tracked" },
  { value: "3×", label: "Faster completion" },
  { value: "94%", label: "Document accuracy" },
  { value: "30+", label: "Firms onboarded" },
];

// ─── Demo Modal ────────────────────────────────────────────────────────────────

function DemoModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", firm: "", volume: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md relative overflow-hidden"
        style={{
          background: C.cream,
          borderRadius: "16px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Gold top accent bar */}
        <div
          style={{
            height: "5px",
            background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
          }}
        />

        <div className="p-8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(0,0,0,0.06)", color: "#6b6050" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {!submitted ? (
            <>
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: "#1a1510" }}
              >
                Request a demo
              </h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                We'll set up a 30-minute walkthrough tailored to your firm's workflow.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(
                  [
                    { key: "name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
                    { key: "email", label: "Work Email", type: "email", placeholder: "jane@yourfirm.com" },
                    { key: "firm", label: "Firm Name", type: "text", placeholder: "Apex Wealth Advisors" },
                  ] as { key: keyof typeof form; label: string; type: string; placeholder: string }[]
                ).map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label
                      className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                      style={{ color: C.muted }}
                    >
                      {label}
                    </label>
                    <input
                      type={type}
                      required
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        border: "1.5px solid #d8cfc4",
                        background: "#fff",
                        color: "#1a1510",
                      }}
                    />
                  </div>
                ))}

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: C.muted }}
                  >
                    Monthly Rollovers (approx.)
                  </label>
                  <select
                    value={form.volume}
                    onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                    style={{
                      border: "1.5px solid #d8cfc4",
                      background: "#fff",
                      color: form.volume ? "#1a1510" : "#9c8f7a",
                    }}
                  >
                    <option value="">Select range…</option>
                    <option value="1-5">1–5</option>
                    <option value="6-15">6–15</option>
                    <option value="16-30">16–30</option>
                    <option value="30+">30+</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg py-2.5 text-sm font-bold mt-1 transition-opacity hover:opacity-90"
                  style={{
                    background: C.gold,
                    color: "#0c0a07",
                    letterSpacing: "0.04em",
                  }}
                >
                  Request Demo →
                </button>
              </form>
            </>
          ) : (
            <div className="py-8 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: C.darkGreen }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12l5 5L20 7" stroke={C.goldLight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "#1a1510" }}>
                You're on the list
              </h3>
              <p className="text-sm mb-6" style={{ color: C.muted, maxWidth: "260px", margin: "0 auto 24px" }}>
                We'll reach out within one business day to schedule your walkthrough.
              </p>
              <button
                onClick={onClose}
                className="rounded-lg px-6 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.gold, color: "#0c0a07" }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Process timeline (scroll-driven, no React state) ────────────────────────
// All animation is written directly to DOM via refs — zero re-renders, 60fps.

function ProcessTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pre-build arrays so the handler holds no closures over React state
    const frames = frameRefs.current;
    const dots   = dotRefs.current;
    const hint   = hintRef.current;
    let lastActive = -1;

    function paint() {
      const container = containerRef.current;
      if (!container) return;

      const scrolled   = Math.max(0, -container.getBoundingClientRect().top);
      const scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      // progress: 0.0 → STEPS.length - 1, continuous with scroll
      const progress = Math.min(STEPS.length - 1, (scrolled / scrollable) * (STEPS.length - 1));
      const active   = Math.round(progress);

      // ── Animate each step frame directly ──────────────────────────────────
      for (let i = 0; i < frames.length; i++) {
        const el = frames[i];
        if (!el) continue;
        const diff    = i - progress;                        // negative = past, positive = future
        const opacity = Math.max(0, 1 - Math.abs(diff) * 1.6);
        const y       = diff * 72;                           // px offset
        const scale   = 1 - Math.min(Math.abs(diff), 1) * 0.06;
        el.style.opacity   = opacity.toFixed(3);
        el.style.transform = `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
      }

      // ── Update step-indicator dots (only when active step changes) ────────
      if (active !== lastActive) {
        lastActive = active;
        for (let i = 0; i < dots.length; i++) {
          const d = dots[i];
          if (!d) continue;
          d.style.width      = i === active ? "32px" : "6px";
          d.style.background = i <= active ? C.gold : "rgba(201,146,42,0.2)";
        }
        if (hint) hint.style.opacity = active >= STEPS.length - 1 ? "0" : "0.45";
      }
    }

    window.addEventListener("scroll", paint, { passive: true });
    paint(); // set initial state
    return () => window.removeEventListener("scroll", paint);
  }, []);

  return (
    // Each step owns 100 vh of scroll range → 4 steps = 400 vh tall section
    <div ref={containerRef} style={{ height: `${STEPS.length * 100}vh` }}>

      {/* ── Sticky viewport panel ── */}
      <div style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        overflow: "hidden",
      }}>

        {/* Section label + heading */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>
            Process
          </span>
          <h2 className="text-3xl font-black mt-2" style={{ color: C.warmWhite }}>
            Up and running in minutes
          </h2>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center gap-2 mb-14">
          {STEPS.map((_, i) => (
            <div
              key={i}
              ref={el => { dotRefs.current[i] = el; }}
              style={{
                height: "6px",
                borderRadius: "3px",
                // initial state — paint() will correct immediately
                width: i === 0 ? "32px" : "6px",
                background: i === 0 ? C.gold : "rgba(201,146,42,0.2)",
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Step frames — all stacked in the same space, animated by scroll */}
        <div style={{ position: "relative", width: "100%", maxWidth: "600px", height: "290px" }}>
          {STEPS.map((step, idx) => (
            <div
              key={step.num}
              ref={el => { frameRefs.current[idx] = el; }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                willChange: "opacity, transform",
                // initial positions: step 0 visible, rest below
                opacity:   idx === 0 ? 1 : 0,
                transform: `translateY(${idx * 72}px) scale(${idx === 0 ? 1 : 0.94})`,
                pointerEvents: "none",
              }}
            >
              {/* Large gradient step number */}
              <div style={{
                fontSize: "100px",
                fontWeight: 900,
                fontStyle: "italic",
                lineHeight: 1,
                marginBottom: "4px",
                background: `linear-gradient(135deg, ${C.gold} 30%, ${C.goldLight})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {step.num}
              </div>

              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "2rem", fontWeight: 800, color: C.warmWhite, lineHeight: 1.15 }}>
                  {step.title}
                </h3>
                {step.tag && (
                  <span style={{
                    background: "rgba(201,146,42,0.18)",
                    color: C.goldLight,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    flexShrink: 0,
                  }}>
                    {step.tag}
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ color: C.muted, fontSize: "1rem", lineHeight: 1.8, maxWidth: "480px" }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div
          ref={hintRef}
          style={{
            position: "absolute",
            bottom: "36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            opacity: 0.45,
            transition: "opacity 0.5s ease",
          }}
        >
          <span style={{ fontSize: "9px", letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase" }}>
            Scroll
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="scroll-bounce">
            <path d="M1 4l6 6 6-6" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(12, 10, 7, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(201, 146, 42, 0.12)",
        }}
      >
        {/* Wordmark logo — two overlapping rectangles form the "R" */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <svg width="32" height="28" viewBox="0 0 32 28" fill="none">
            <rect x="0" y="0" width="14" height="28" rx="2" fill={C.gold}/>
            <rect x="6" y="0" width="18" height="14" rx="2" fill={C.goldLight} opacity="0.85"/>
            <rect x="12" y="12" width="16" height="16" rx="2" fill={C.gold} opacity="0.6"/>
          </svg>
          <span
            className="text-xl font-black tracking-tight"
            style={{ color: C.gold, letterSpacing: "-0.02em" }}
          >
            Rift
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Product", "Pricing", "About"].map((label) => (
            <Link
              key={label}
              href="#"
              className="text-sm transition-colors hover:opacity-100"
              style={{ color: "rgba(245, 240, 232, 0.55)" }}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => setDemoOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:bg-amber-600/10"
            style={{
              border: `1.5px solid ${C.gold}`,
              color: C.gold,
            }}
          >
            Request Demo
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center pt-20 overflow-hidden"
        style={{
          background: C.heroBlack,
          backgroundImage: C.diagonalHatch,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Faint arc in top-right — NOT a glow orb */}
        <svg
          className="absolute top-0 right-0 pointer-events-none"
          width="600"
          height="600"
          viewBox="0 0 600 600"
          fill="none"
          style={{ opacity: 0.12 }}
        >
          <circle cx="540" cy="60" r="340" stroke={C.gold} strokeWidth="1.2" fill="none"/>
          <circle cx="540" cy="60" r="280" stroke={C.goldLight} strokeWidth="0.6" fill="none"/>
        </svg>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-20 flex flex-col lg:flex-row items-center gap-16">
          {/* Left: copy — 55% */}
          <div className="flex-1 max-w-xl">
            {/* Overline */}
            <div className="flex items-center gap-3 mb-8">
              <div style={{ width: "32px", height: "1px", background: C.gold }}/>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: C.gold }}
              >
                Rollover management software
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-none mb-4">
              <span style={{ color: C.warmWhite }}>The rollover command center</span>
              <br />
              <span
                style={{
                  color: C.gold,
                  fontStyle: "italic",
                }}
              >
                for modern RIAs.
              </span>
            </h1>

            {/* Gold rule divider */}
            <div
              style={{
                height: "1px",
                background: `linear-gradient(90deg, ${C.gold}, transparent)`,
                marginTop: "20px",
                marginBottom: "20px",
                maxWidth: "320px",
              }}
            />

            <p
              className="text-base leading-relaxed mb-10"
              style={{ color: C.muted, maxWidth: "400px" }}
            >
              Built for RIA operations teams. Track every IRA, 401(k), and pension rollover from intake to completion — with checklists, tasks, and a full audit trail.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.gold, color: "#0c0a07" }}
              >
                Finance Professional Sign In
              </Link>

              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-amber-900/20"
                style={{
                  border: `1.5px solid ${C.gold}`,
                  color: C.gold,
                }}
              >
                Individual Investor Sign In
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(201,146,42,0.18)", color: C.goldLight, fontSize: "10px" }}
                >
                  Soon
                </span>
              </button>

              <button
                onClick={() => setDemoOpen(true)}
                className="demo-text-btn inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors"
                style={{ color: C.muted }}
              >
                Request a Demo
                <span className="demo-btn-arrow" style={{ color: C.gold }}>→</span>
              </button>
            </div>
          </div>

          {/* Right: pipeline stage visualization */}
          <div className="flex-shrink-0 w-72">
            <div
              className="relative rounded-2xl px-5 py-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(201, 146, 42, 0.18)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-5"
                style={{ color: C.gold }}
              >
                Case Pipeline
              </p>

              <div className="flex flex-col gap-0">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <div key={stage.label}>
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{
                        border: stage.active ? `1.5px solid ${C.gold}` : "1.5px solid transparent",
                        background: stage.active ? "rgba(201,146,42,0.08)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: stage.active ? C.gold : "rgba(156,143,122,0.4)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: stage.active ? C.warmWhite : C.muted }}
                        >
                          {stage.label}
                        </span>
                        {stage.active && (
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: C.gold, color: "#0c0a07", fontSize: "9px" }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: stage.active ? C.goldLight : C.muted }}
                      >
                        {stage.count}
                      </span>
                    </div>

                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div className="flex justify-start pl-4 my-0.5">
                        <div
                          style={{
                            width: "1px",
                            height: "8px",
                            borderLeft: `1px dashed ${C.gold}`,
                            opacity: 0.35,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="mt-5 pt-4"
                style={{ borderTop: "1px solid rgba(201,146,42,0.12)" }}
              >
                <p className="text-xs" style={{ color: C.muted }}>
                  <span style={{ color: C.goldLight, fontWeight: 600 }}>34</span> total active cases
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE BAND ────────────────────────────────────────────────────── */}
      <section
        className="py-14 overflow-hidden"
        style={{
          background: C.darkGreen,
          borderTop: `1px solid rgba(201,146,42,0.15)`,
          borderBottom: `1px solid rgba(201,146,42,0.15)`,
        }}
      >
        <p
          className="text-center text-sm font-bold uppercase tracking-widest mb-7"
          style={{ color: "rgba(201,146,42,0.55)" }}
        >
          Trusted by firms across the country
        </p>
        <div className="overflow-hidden">
          <div className="marquee-track flex gap-0 whitespace-nowrap">
            {[...TRUSTED_FIRMS, ...TRUSTED_FIRMS].map((firm, i) => (
              <span key={i} className="inline-flex items-center gap-8 px-10 text-2xl font-semibold" style={{ color: C.gold }}>
                {firm}
                <span style={{ color: "rgba(201,146,42,0.35)", fontSize: "26px", lineHeight: 1 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section
        className="py-10 px-8"
        style={{ background: "#eee9df", borderBottom: "1px solid #d8cfc4" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="py-2">
                <div
                  className="text-4xl font-black mb-1"
                  style={{ color: C.gold }}
                >
                  {s.value}
                </div>
                <div className="text-sm" style={{ color: "#7a6f62" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ──────────────────────────────────────────────── */}
      <section className="py-20 px-8" style={{ background: C.cream }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.gold }}
            >
              The difference
            </span>
            <h2 className="text-3xl font-black mt-2" style={{ color: "#1a1510" }}>
              Built for teams who know the old way is broken
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div
              className="rounded-2xl p-8"
              style={{
                border: "2px solid #c8bfb3",
                background: "#f5f0e8",
              }}
            >
              <div
                className="text-sm font-black uppercase tracking-widest mb-5"
                style={{ color: "#9c3a2a" }}
              >
                ✗ Before Rift
              </div>
              {[
                "Shared spreadsheets edited by multiple people simultaneously",
                "Forms lost in email threads and personal inboxes",
                "No visibility into what's pending or overdue",
                "Compliance gaps with no audit trail of actions",
                "Advisors and ops duplicating work constantly",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4">
                  <span
                    className="mt-0.5 text-sm font-bold flex-shrink-0"
                    style={{ color: "#c04a3a" }}
                  >
                    ✗
                  </span>
                  <span className="text-sm" style={{ color: "#5a4f42" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* After */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: C.darkGreen,
                border: `2px solid rgba(201,146,42,0.3)`,
              }}
            >
              <div
                className="text-sm font-black uppercase tracking-widest mb-5"
                style={{ color: C.goldLight }}
              >
                ✓ With Rift
              </div>
              {[
                "Single source of truth for every rollover case",
                "Checklists and documents tied directly to each case",
                "Real-time pipeline view for the whole team",
                "Full timestamped audit log for every action",
                "Clear role assignments so nothing falls through the cracks",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4">
                  <span
                    className="mt-0.5 text-sm font-bold flex-shrink-0"
                    style={{ color: C.gold }}
                  >
                    ✓
                  </span>
                  <span className="text-sm" style={{ color: "rgba(245,240,232,0.8)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (BENTO GRID) ───────────────────────────────────────────── */}
      <section className="py-20 px-8" style={{ background: C.cream }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.gold }}
            >
              Features
            </span>
            <h2 className="text-3xl font-black mt-2" style={{ color: "#1a1510" }}>
              Everything your ops team needs
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl p-7 flex flex-col"
                style={{
                  background: "#f0ece4",
                  border: "1.5px solid #d8cfc4",
                }}
              >
                <div className="mb-5">{feat.icon}</div>
                <h3
                  className="font-black text-base mb-2"
                  style={{ color: "#1a1510" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b6050" }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="relative" style={{ background: C.darkGreen }}>
        {/* Hatch texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: C.diagonalHatch,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10">
          <ProcessTimeline />
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="py-20 px-8" style={{ background: C.cream }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.gold }}
            >
              What teams say
            </span>
            <h2 className="text-3xl font-black mt-2" style={{ color: "#1a1510" }}>
              Real results from real operations teams
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-8 flex flex-col justify-between"
                style={{
                  background: "#f5f0e8",
                  border: "1.5px solid #d8cfc4",
                  borderLeft: `4px solid ${C.gold}`,
                }}
              >
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "#2e2820" }}
                >
                  {t.quote}
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: C.darkGreen, color: C.goldLight }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: C.gold }}
                    >
                      {t.name}
                    </div>
                    <div className="text-xs" style={{ color: C.muted }}>
                      {t.title} · {t.firm}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ─────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-8 relative overflow-hidden"
        style={{
          background: C.heroBlack,
          backgroundImage: C.diagonalHatch,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Same faint arc as hero */}
        <svg
          className="absolute bottom-0 left-0 pointer-events-none"
          width="500"
          height="400"
          viewBox="0 0 500 400"
          fill="none"
          style={{ opacity: 0.07 }}
        >
          <circle cx="-40" cy="420" r="320" stroke={C.gold} strokeWidth="1" fill="none"/>
        </svg>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl lg:text-5xl font-black leading-tight mb-3"
            style={{ color: C.warmWhite }}
          >
            Stop tracking rollovers
            <br />
            in spreadsheets.
          </h2>

          {/* Italic gold underline decoration */}
          <div className="flex justify-center mb-8">
            <svg width="200" height="16" viewBox="0 0 200 16" fill="none">
              <path
                d="M10 10 Q60 2 100 8 Q140 14 190 6"
                stroke={C.gold}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="text-base mb-10" style={{ color: C.muted, maxWidth: "480px", margin: "0 auto 40px" }}>
            Join 30+ RIA firms that replaced their spreadsheet chaos with a purpose-built rollover platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setDemoOpen(true)}
              className="rounded-xl px-8 py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: C.gold, color: "#0c0a07" }}
            >
              Request Demo
            </button>
            <Link
              href="/sign-in"
              className="rounded-xl px-8 py-3.5 text-sm font-semibold transition-all hover:bg-white/5"
              style={{
                border: `1.5px solid rgba(245,240,232,0.35)`,
                color: C.warmWhite,
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer
        className="px-8 pt-12 pb-8"
        style={{ background: C.darkGreen, borderTop: `1px solid rgba(201,146,42,0.12)` }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <svg width="28" height="24" viewBox="0 0 32 28" fill="none">
                  <rect x="0" y="0" width="14" height="28" rx="2" fill={C.gold}/>
                  <rect x="6" y="0" width="18" height="14" rx="2" fill={C.goldLight} opacity="0.85"/>
                  <rect x="12" y="12" width="16" height="16" rx="2" fill={C.gold} opacity="0.6"/>
                </svg>
                <span
                  className="text-lg font-black"
                  style={{ color: C.gold, letterSpacing: "-0.02em" }}
                >
                  Rift
                </span>
              </div>
              <p className="text-xs max-w-xs leading-relaxed" style={{ color: C.muted }}>
                Rollover case management for RIA operations teams.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "rgba(201,146,42,0.6)" }}
                >
                  Product
                </div>
                {["Features", "Pricing", "Security", "Changelog"].map((l) => (
                  <Link
                    key={l}
                    href="#"
                    className="block text-sm mb-2.5 transition-opacity hover:opacity-100"
                    style={{ color: C.muted }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "rgba(201,146,42,0.6)" }}
                >
                  Company
                </div>
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <Link
                    key={l}
                    href="#"
                    className="block text-sm mb-2.5 transition-opacity hover:opacity-100"
                    style={{ color: C.muted }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-3"
            style={{ borderTop: "1px solid rgba(201,146,42,0.1)" }}
          >
            <p className="text-xs" style={{ color: "rgba(156,143,122,0.55)" }}>
              © 2024 Rift Technologies, Inc. All rights reserved.
            </p>
            <div className="flex gap-6">
              {["Privacy", "Terms", "Security"].map((l) => (
                <Link
                  key={l}
                  href="#"
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: "rgba(156,143,122,0.55)" }}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </>
  );
}
