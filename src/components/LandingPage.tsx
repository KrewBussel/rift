"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ─── Design tokens ─────────────────────────────────────────────────────────────
// Accent is gold/bronze (#b8860b / #d4a017). If you hand-write rgba, use rgba(184,134,11,α).
const C = {
  heroBlack: "#0c0a07",
  accent: "#b8860b",
  accentLight: "#d4a017",
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
    span: "",
    accentColor: C.accent,
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Progress bar segments */}
        <rect x="4" y="20" width="8" height="10" rx="2" fill="#b8683d"/>
        <rect x="14" y="20" width="8" height="10" rx="2" fill="#b8683d"/>
        <rect x="24" y="20" width="8" height="10" rx="2" fill="#b8683d"/>
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
        <path d="M38 24l4-4m0 0l-4-4m4 4H28" stroke="#e0905c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Smart Checklists",
    desc: "Auto-generated required document checklists per rollover type. Track what's been requested, received, and reviewed.",
    span: "",
    accentColor: "#4a7c59",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="8" width="6" height="6" rx="1" fill="#b8683d"/>
        <path d="M6 11l1.5 1.5L10 9" stroke="#0c0a07" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="9" width="20" height="4" rx="1" fill="#3a3228"/>
        <rect x="4" y="19" width="6" height="6" rx="1" stroke="#5a4f3e" strokeWidth="1.5" fill="none"/>
        <rect x="14" y="20" width="16" height="4" rx="1" fill="#3a3228"/>
        <rect x="4" y="30" width="6" height="6" rx="1" fill="#b8683d"/>
        <path d="M6 33l1.5 1.5L10 31" stroke="#0c0a07" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="14" y="31" width="22" height="4" rx="1" fill="#3a3228"/>
      </svg>
    ),
  },
  {
    title: "Task Engine",
    desc: "Assign work to advisors or ops with due dates and status tracking. Get alerts before tasks go overdue.",
    span: "",
    accentColor: "#b07d2a",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Calendar grid */}
        <rect x="4" y="8" width="22" height="22" rx="3" fill="#1e1810" stroke="#3a3228" strokeWidth="1.5"/>
        <rect x="4" y="8" width="22" height="6" rx="3" fill="#3a3228"/>
        <rect x="4" y="11" width="22" height="3" fill="#3a3228"/>
        <line x1="10" y1="18" x2="10" y2="18" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="18" x2="16" y2="18" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="22" y1="18" x2="22" y2="18" stroke="#b8683d" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="23" x2="10" y2="23" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="23" x2="16" y2="23" stroke="#9c8f7a" strokeWidth="2" strokeLinecap="round"/>
        {/* Clock overlay */}
        <circle cx="28" cy="28" r="10" fill="#1e1810" stroke="#b8683d" strokeWidth="1.5"/>
        <line x1="28" y1="23" x2="28" y2="28" stroke="#e0905c" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="28" x2="32" y2="31" stroke="#b8683d" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="28" cy="28" r="1.5" fill="#e0905c"/>
      </svg>
    ),
  },
  {
    title: "Document Vault",
    desc: "Secure file storage tied directly to each case. No more emailing PDFs back and forth.",
    span: "",
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
        <rect x="11" y="3" width="10" height="7" rx="2" fill="none" stroke="#b8683d" strokeWidth="2"/>
        <rect x="14" y="1" width="4" height="4" rx="1" fill="#b8683d"/>
      </svg>
    ),
  },
  {
    title: "Compliance Audit Trail",
    desc: "Every status change, note, and action is logged with a timestamp and actor. Always know what happened and when.",
    span: "",
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
            stroke={t.major ? "#b8683d" : "#5a4f3e"}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}
        {/* Sweeping arrow hand */}
        <path d="M20 20 L28 10" stroke="#e0905c" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M28 10 L30 14 M28 10 L24 10" stroke="#e0905c" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="20" y1="20" x2="20" y2="12" stroke="#b8683d" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="20" x2="26" y2="22" stroke="#9c8f7a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="20" r="2" fill="#b8683d"/>
      </svg>
    ),
  },
  {
    title: "Team Coordination",
    desc: "Advisors and ops work from the same case view. Assign roles, see who owns what, and never duplicate effort.",
    span: "",
    accentColor: "#3a6b8a",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Two avatar circles */}
        <circle cx="14" cy="16" r="8" fill="#2a3a28" stroke="#b8683d" strokeWidth="1.5"/>
        <circle cx="26" cy="16" r="8" fill="#1a2834" stroke="#4a7c59" strokeWidth="1.5"/>
        {/* Face dots */}
        <circle cx="11" cy="15" r="1.2" fill="#b8683d"/>
        <circle cx="17" cy="15" r="1.2" fill="#b8683d"/>
        <circle cx="23" cy="15" r="1.2" fill="#9c8f7a"/>
        <circle cx="29" cy="15" r="1.2" fill="#9c8f7a"/>
        {/* Connector line */}
        <line x1="14" y1="16" x2="26" y2="16" stroke="#b8683d" strokeWidth="1" strokeDasharray="2 2"/>
        {/* Shared document at bottom */}
        <rect x="13" y="27" width="14" height="10" rx="2" fill="#1a1510" stroke="#b8683d" strokeWidth="1.2"/>
        <rect x="15" y="30" width="8" height="1.5" rx="0.5" fill="#9c8f7a"/>
        <rect x="15" y="33" width="6" height="1.5" rx="0.5" fill="#9c8f7a"/>
        {/* Connector lines from avatars to document */}
        <line x1="14" y1="24" x2="17" y2="27" stroke="#b8683d" strokeWidth="1" strokeDasharray="2 2"/>
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
            background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
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
                    background: C.accent,
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
                  <path d="M4 12l5 5L20 7" stroke={C.accentLight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
                style={{ background: C.accent, color: "#0c0a07" }}
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

// ─── Process timeline — horizontal filmstrip, scroll-driven ──────────────────
// A single translate3d on the strip gives a butter-smooth slide with zero
// crossfade/overlap artifacts. Each panel is a fully-formed scene with a
// rich mock UI — no empty space, nothing to "click" between.

type Step = typeof STEPS[number];

function ProcessTimeline() {
  const containerRef   = useRef<HTMLDivElement>(null);
  const stripRef       = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const glowRef        = useRef<HTMLDivElement>(null);
  const labelRefs      = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const strip       = stripRef.current;
    const progressBar = progressBarRef.current;
    const glow        = glowRef.current;
    const labels      = labelRefs.current;

    let targetProgress  = 0;
    let currentProgress = 0;
    let rafId   = 0;
    let running = false;

    function updateTarget() {
      const container = containerRef.current;
      if (!container) return;
      const rect       = container.getBoundingClientRect();
      const scrolled   = Math.max(0, -rect.top);
      const scrollable = container.offsetHeight - window.innerHeight;
      if (scrollable <= 0) { targetProgress = 0; return; }
      const t = Math.min(1, Math.max(0, scrolled / scrollable));
      targetProgress = t * (STEPS.length - 1);
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    }

    function tick() {
      // Lerp current → target. This is what makes scroll wheel ticks feel
      // like a continuous glide instead of discrete steps ("clicky").
      const delta = targetProgress - currentProgress;
      currentProgress += delta * 0.13;
      if (Math.abs(delta) < 0.0004) currentProgress = targetProgress;

      const progress = currentProgress;
      const pct      = progress / (STEPS.length - 1); // 0 → 1

      // One transform on the strip. Each panel occupies 1/N of the strip,
      // so moving by (progress / N * 100)% of the strip's own width
      // scrolls us exactly (progress * panel-width) px. No per-frame math.
      if (strip) {
        const tx = -progress * (100 / STEPS.length);
        strip.style.transform = `translate3d(${tx.toFixed(4)}%, 0, 0)`;
      }

      if (progressBar) {
        progressBar.style.transform = `scaleX(${pct.toFixed(4)})`;
      }

      // Ambient glow drifts horizontally across the stage
      if (glow) {
        const gx = (pct - 0.5) * 240;
        glow.style.transform = `translate3d(${gx.toFixed(1)}px, 0, 0)`;
      }

      for (let i = 0; i < labels.length; i++) {
        const l = labels[i];
        if (!l) continue;
        l.style.opacity = progress >= i - 0.35 ? "1" : "0.3";
      }

      if (Math.abs(targetProgress - currentProgress) > 0.0004) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }

    updateTarget();
    currentProgress = targetProgress;
    tick();

    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);
    return () => {
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height: "260vh" }}>
      <div style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header + progress rail ── */}
        <div style={{ padding: "56px 64px 0", flexShrink: 0, position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{
                color: C.accent, fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
              }}>
                Process
              </div>
              <h2 style={{
                color: C.warmWhite,
                fontSize: "clamp(1.75rem, 2.8vw, 2.5rem)",
                fontWeight: 900,
                marginTop: "6px",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}>
                Up and running in minutes
              </h2>
            </div>
            <div style={{
              color: C.muted, fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              Scroll to advance
            </div>
          </div>

          {/* Progress rail */}
          <div style={{
            marginTop: "32px",
            height: "1px",
            width: "100%",
            background: "rgba(184,134,11,0.12)",
            position: "relative",
          }}>
            <div
              ref={progressBarRef}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
                transformOrigin: "left center",
                transform: "scaleX(0)",
                boxShadow: `0 0 10px ${C.accent}aa, 0 0 22px ${C.accent}55`,
                willChange: "transform",
              }}
            />
          </div>

          {/* Step labels */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
            marginTop: "12px",
          }}>
            {STEPS.map((s, i) => (
              <div
                key={i}
                ref={el => { labelRefs.current[i] = el; }}
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.accentLight,
                  opacity: i === 0 ? 1 : 0.3,
                  transition: "opacity 0.4s ease",
                }}
              >
                {s.num} · {s.title}
              </div>
            ))}
          </div>
        </div>

        {/* ── Filmstrip area ── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ambient glow orb */}
          <div
            ref={glowRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "900px",
              height: "900px",
              marginLeft: "-450px",
              marginTop: "-450px",
              background: `radial-gradient(circle, ${C.accent}24 0%, ${C.accent}08 32%, transparent 60%)`,
              pointerEvents: "none",
              willChange: "transform",
              filter: "blur(4px)",
              zIndex: 0,
            }}
          />

          <div
            ref={stripRef}
            style={{
              display: "flex",
              height: "100%",
              width: `${STEPS.length * 100}%`,
              willChange: "transform",
              position: "relative",
              zIndex: 1,
            }}
          >
            {STEPS.map((step, idx) => (
              <StepPanel key={step.num} step={step} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── One full panel in the filmstrip ──────────────────────────────────────────

function StepPanel({ step, index }: { step: Step; index: number }) {
  return (
    <div style={{
      width: `${100 / STEPS.length}%`,
      flexShrink: 0,
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      alignItems: "center",
      padding: "0 64px",
      gap: "48px",
    }}>
      {/* Left: text block, right-aligned within its column */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "460px", width: "100%" }}>

          {/* Big italic number */}
          <div style={{
            fontSize: "clamp(88px, 9vw, 140px)",
            fontWeight: 900,
            fontStyle: "italic",
            lineHeight: 0.85,
            letterSpacing: "-0.05em",
            background: `linear-gradient(135deg, ${C.accent} 10%, ${C.accentLight} 50%, ${C.accent} 95%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "16px",
          }}>
            {step.num}
          </div>

          {step.tag && (
            <div style={{ marginBottom: "14px" }}>
              <span style={{
                display: "inline-block",
                background: "rgba(184,134,11,0.15)",
                color: C.accentLight,
                border: `1px solid rgba(184,134,11,0.35)`,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "5px 14px",
                borderRadius: "999px",
                textTransform: "uppercase",
              }}>
                {step.tag}
              </span>
            </div>
          )}

          <h3 style={{
            color: C.warmWhite,
            fontSize: "clamp(1.75rem, 2.6vw, 2.5rem)",
            fontWeight: 900,
            lineHeight: 1.08,
            marginBottom: "18px",
            letterSpacing: "-0.02em",
          }}>
            {step.title}
          </h3>

          <p style={{
            color: C.muted,
            fontSize: "clamp(0.95rem, 1.05vw, 1.05rem)",
            lineHeight: 1.85,
          }}>
            {step.desc}
          </p>
        </div>
      </div>

      {/* Right: rich mock UI, left-aligned within its column */}
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <StepVisual index={index} />
      </div>
    </div>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) return <NewCaseCard />;
  if (index === 1) return <PipelineCard />;
  if (index === 2) return <AlertsCard />;
  return <AuditCard />;
}

// ─── Step 01: New case intake form ────────────────────────────────────────────

function NewCaseCard() {
  const fields = [
    { label: "Client Name",     value: "Sarah Mitchell" },
    { label: "Source Provider", value: "Fidelity 401(k)" },
    { label: "Destination",     value: "Schwab IRA" },
  ];
  return (
    <div style={{
      width: "100%",
      maxWidth: "460px",
      background: "rgba(22, 16, 11, 0.88)",
      border: `1px solid rgba(184,134,11,0.28)`,
      borderRadius: "14px",
      padding: "28px",
      boxShadow: "0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2) inset",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ color: C.accent, fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em" }}>
          NEW CASE
        </div>
        <div style={{
          fontSize: "9px", fontWeight: 700, color: C.accentLight,
          background: "rgba(184,134,11,0.15)",
          border: `1px solid rgba(184,134,11,0.3)`,
          padding: "3px 10px", borderRadius: "999px",
          letterSpacing: "0.08em",
        }}>INTAKE</div>
      </div>

      {fields.map((f) => (
        <div key={f.label} style={{ marginBottom: "14px" }}>
          <div style={{
            fontSize: "9px", color: C.muted, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px",
          }}>
            {f.label}
          </div>
          <div style={{
            background: "rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "8px",
            padding: "10px 12px",
            color: C.warmWhite, fontSize: "13px", fontWeight: 500,
          }}>
            {f.value}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: "20px", paddingTop: "16px",
        borderTop: "1px solid rgba(184,134,11,0.14)",
      }}>
        <div style={{
          fontSize: "9px", color: C.muted, letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "10px", fontWeight: 700,
        }}>
          Auto-generated
        </div>
        {["8 checklist items", "3 tasks created"].map((text) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px",
          }}>
            <div style={{
              width: "14px", height: "14px", borderRadius: "3px",
              background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M1 5l3 3 5-6" stroke={C.heroBlack} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: "12px", color: C.warmWhite }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 02: Pipeline kanban ─────────────────────────────────────────────────

function PipelineCard() {
  const columns = [
    { label: "Intake",     count: 3,  active: false },
    { label: "Processing", count: 5,  active: true  },
    { label: "Completed",  count: 12, active: false },
  ];
  return (
    <div style={{
      width: "100%",
      maxWidth: "500px",
      background: "rgba(22, 16, 11, 0.88)",
      border: `1px solid rgba(184,134,11,0.28)`,
      borderRadius: "14px",
      padding: "24px",
      boxShadow: "0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2) inset",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "18px",
      }}>
        <div style={{ color: C.accent, fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em" }}>
          PIPELINE
        </div>
        <div style={{ color: C.muted, fontSize: "10px", fontWeight: 600 }}>
          20 active
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        {columns.map((col) => (
          <div key={col.label}>
            <div style={{
              fontSize: "9px",
              color: col.active ? C.accentLight : C.muted,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <span>{col.label}</span>
              <span style={{
                background: col.active ? C.accent : "rgba(255,255,255,0.08)",
                color:      col.active ? C.heroBlack : C.muted,
                padding: "1px 6px", borderRadius: "99px",
                fontSize: "9px", fontWeight: 800,
              }}>{col.count}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Array.from({ length: Math.min(3, col.count) }).map((_, j) => {
                const highlight = col.active && j === 0;
                return (
                  <div key={j} style={{
                    background: highlight ? "rgba(184,134,11,0.14)" : "rgba(0,0,0,0.28)",
                    border: `1px solid ${highlight ? "rgba(184,134,11,0.4)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "6px",
                    padding: "8px 9px",
                  }}>
                    <div style={{
                      height: "4px", width: "65%",
                      background: highlight ? C.accentLight : "rgba(255,255,255,0.18)",
                      borderRadius: "2px", marginBottom: "5px",
                    }} />
                    <div style={{
                      height: "3px", width: "40%",
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "2px",
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 03: Alerts feed ─────────────────────────────────────────────────────

function AlertsCard() {
  const alerts = [
    { mark: "!", title: "Document overdue",  sub: "Fidelity auth form · Mitchell case", time: "2h ago",  urgent: true  },
    { mark: "⏱", title: "Task due today",    sub: "Follow up with Johnson",              time: "4h ago",  urgent: false },
    { mark: "•", title: "Case stale",         sub: "RFT-2891 · no movement in 5 days",   time: "1d ago",  urgent: false },
  ];
  return (
    <div style={{
      width: "100%",
      maxWidth: "460px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{
        color: C.accent, fontSize: "10px", fontWeight: 800,
        letterSpacing: "0.14em", marginBottom: "4px",
      }}>
        RECENT ALERTS
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          background: "rgba(22, 16, 11, 0.88)",
          border: `1px solid ${a.urgent ? "rgba(184,134,11,0.45)" : "rgba(255,255,255,0.06)"}`,
          borderLeft: `3px solid ${a.urgent ? C.accent : "rgba(184,134,11,0.3)"}`,
          borderRadius: "8px",
          padding: "14px 16px",
          display: "flex",
          gap: "12px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          backdropFilter: "blur(8px)",
        }}>
          <div style={{
            width: "30px", height: "30px",
            borderRadius: "6px",
            background: a.urgent ? "rgba(184,134,11,0.2)" : "rgba(184,134,11,0.08)",
            border: `1px solid ${a.urgent ? "rgba(184,134,11,0.4)" : "rgba(184,134,11,0.18)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            color: C.accentLight,
            fontSize: "13px",
            fontWeight: 800,
          }}>
            {a.mark}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              gap: "10px", marginBottom: "3px",
            }}>
              <div style={{ color: C.warmWhite, fontSize: "12px", fontWeight: 700 }}>{a.title}</div>
              <div style={{ color: C.muted, fontSize: "10px", flexShrink: 0 }}>{a.time}</div>
            </div>
            <div style={{ color: C.muted, fontSize: "11px" }}>{a.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 04: Audit trail ─────────────────────────────────────────────────────

function AuditCard() {
  const events = [
    { label: "Case created",            date: "Mar 15", time: "10:24" },
    { label: "Documents received",      date: "Mar 18", time: "14:07" },
    { label: "Submitted to custodian",  date: "Mar 22", time: "09:15" },
    { label: "Confirmed by receiving",  date: "Mar 24", time: "11:42" },
    { label: "Case closed",             date: "Mar 25", time: "16:30" },
  ];
  return (
    <div style={{
      width: "100%",
      maxWidth: "460px",
      background: "rgba(22, 16, 11, 0.88)",
      border: `1px solid rgba(184,134,11,0.28)`,
      borderRadius: "14px",
      padding: "26px",
      boxShadow: "0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2) inset",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <div style={{
          width: "26px", height: "26px",
          borderRadius: "50%",
          background: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 16px ${C.accent}66`,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3 3 7-7" stroke={C.heroBlack} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{
          color: C.warmWhite, fontSize: "13px", fontWeight: 800,
          letterSpacing: "0.08em",
        }}>
          CASE CLOSED
        </div>
      </div>
      <div style={{
        color: C.muted, fontSize: "11px", marginBottom: "22px", paddingLeft: "38px",
      }}>
        RFT-2847 · Sarah Mitchell · $125,400
      </div>

      <div style={{
        paddingTop: "16px",
        borderTop: "1px solid rgba(184,134,11,0.14)",
      }}>
        <div style={{
          fontSize: "9px", color: C.muted, letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: "12px", fontWeight: 700,
        }}>
          Audit Trail
        </div>
        {events.map((ev, i) => {
          const last = i === events.length - 1;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "6px 0",
            }}>
              <div style={{
                width: "8px", height: "8px",
                borderRadius: "50%",
                background: last ? C.accent : "rgba(184,134,11,0.45)",
                flexShrink: 0,
                boxShadow: last ? `0 0 10px ${C.accent}` : "none",
              }} />
              <div style={{ flex: 1, color: C.warmWhite, fontSize: "12px", fontWeight: 500 }}>
                {ev.label}
              </div>
              <div style={{
                color: C.muted, fontSize: "10px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}>
                {ev.date} · {ev.time}
              </div>
            </div>
          );
        })}
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
          borderBottom: "1px solid rgba(184,134,11,0.12)",
        }}
      >
        {/* Wordmark logo — two overlapping rectangles form the "R" */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <svg width="32" height="28" viewBox="0 0 32 28" fill="none">
            <rect x="0" y="0" width="14" height="28" rx="2" fill={C.accent}/>
            <rect x="6" y="0" width="18" height="14" rx="2" fill={C.accentLight} opacity="0.85"/>
            <rect x="12" y="12" width="16" height="16" rx="2" fill={C.accent} opacity="0.6"/>
          </svg>
          <span
            className="text-xl font-black tracking-tight"
            style={{ color: C.accent, letterSpacing: "-0.02em" }}
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
          <Link
            href="/login"
            className="text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: C.accent }}
          >
            Sign In
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:bg-yellow-600/10"
            style={{
              border: `1.5px solid ${C.accent}`,
              color: C.accent,
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
          <circle cx="540" cy="60" r="340" stroke={C.accent} strokeWidth="1.2" fill="none"/>
          <circle cx="540" cy="60" r="280" stroke={C.accentLight} strokeWidth="0.6" fill="none"/>
        </svg>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            {/* Overline */}
            <div className="flex items-center gap-3 mb-8">
              <div style={{ width: "32px", height: "1px", background: C.accent }}/>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: C.accent }}
              >
                Rollover management software
              </span>
            </div>

            <h1 className="text-6xl lg:text-7xl font-black leading-none mb-4">
              <span style={{ color: C.warmWhite }}>The rollover command center</span>
              <br />
              <span
                style={{
                  color: C.accent,
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
                background: `linear-gradient(90deg, ${C.accent}, transparent)`,
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
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: C.accent, color: "#0c0a07" }}
              >
                Finance Professional Sign In
              </Link>

              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-yellow-900/20"
                style={{
                  border: `1.5px solid ${C.accent}`,
                  color: C.accent,
                }}
              >
                Individual Investor Sign In
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(184,134,11,0.18)", color: C.accentLight, fontSize: "10px" }}
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
                <span className="demo-btn-arrow" style={{ color: C.accent }}>→</span>
              </button>
            </div>
          </div>

          {/* Right: pipeline stage visualization */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="relative rounded-2xl px-6 py-7 w-full max-w-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(184,134,11,0.18)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-5"
                style={{ color: C.accent }}
              >
                Case Pipeline
              </p>

              <div className="flex flex-col gap-0">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <div key={stage.label}>
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{
                        border: stage.active ? `1.5px solid ${C.accent}` : "1.5px solid transparent",
                        background: stage.active ? "rgba(184,134,11,0.08)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: stage.active ? C.accent : "rgba(156,143,122,0.4)",
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
                            style={{ background: C.accent, color: "#fff", fontSize: "9px" }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: stage.active ? C.accentLight : C.muted }}
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
                            borderLeft: `1px dashed ${C.accent}`,
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
                style={{ borderTop: "1px solid rgba(184,134,11,0.12)" }}
              >
                <p className="text-xs" style={{ color: C.muted }}>
                  <span style={{ color: C.accentLight, fontWeight: 600 }}>34</span> total active cases
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE BAND ────────────────────────────────────────────────────── */}
      <section
        className="py-16 overflow-hidden"
        style={{
          background: C.darkGreen,
          borderTop: `1px solid rgba(184,134,11,0.15)`,
          borderBottom: `1px solid rgba(184,134,11,0.15)`,
        }}
      >
        <p
          className="text-center text-sm font-bold uppercase tracking-widest mb-7"
          style={{ color: "rgba(184,134,11,0.55)" }}
        >
          Trusted by firms across the country
        </p>
        <div className="overflow-hidden">
          <div className="marquee-track flex gap-0 whitespace-nowrap">
            {[...TRUSTED_FIRMS, ...TRUSTED_FIRMS].map((firm, i) => (
              <span key={i} className="inline-flex items-center gap-8 px-10 text-2xl font-semibold" style={{ color: C.accent }}>
                {firm}
                <span style={{ color: "rgba(184,134,11,0.35)", fontSize: "26px", lineHeight: 1 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section
        className="py-16 px-8"
        style={{ background: "#eee9df" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="py-4"
                style={{
                  borderRight: i < STATS.length - 1 ? "1px solid #d8cfc4" : "none",
                }}
              >
                <div
                  className="text-4xl lg:text-5xl font-black mb-2"
                  style={{ color: C.accent, letterSpacing: "-0.03em" }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium" style={{ color: "#7a6f62" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ──────────────────────────────────────────────── */}
      <section className="py-24 px-8" style={{ background: C.cream }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.accent }}
            >
              The difference
            </span>
            <h2 className="text-3xl lg:text-4xl font-black mt-3 mb-3" style={{ color: "#1a1510" }}>
              Built for teams who know the old way is broken
            </h2>
            <p className="text-sm mx-auto" style={{ color: "#7a6f62", maxWidth: "460px" }}>
              Most firms still manage rollovers with spreadsheets, email threads, and guesswork. Here's what changes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div
              className="rounded-2xl p-8"
              style={{
                border: "1px solid #d8cfc4",
                background: "#f5f0e8",
                boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f3e5e3" }}>
                  <span className="text-xs font-bold" style={{ color: "#c04a3a" }}>✗</span>
                </div>
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: "#9c3a2a" }}
                >
                  Before Rift
                </span>
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
                border: `1px solid rgba(184,134,11,0.25)`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(184,134,11,0.15)" }}>
                  <span className="text-xs font-bold" style={{ color: C.accentLight }}>✓</span>
                </div>
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: C.accentLight }}
                >
                  With Rift
                </span>
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
                    style={{ color: C.accent }}
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
      <section
        className="py-24 px-8 relative overflow-hidden"
        style={{
          background: C.darkGreen,
          borderTop: `1px solid rgba(184,134,11,0.12)`,
          borderBottom: `1px solid rgba(184,134,11,0.12)`,
        }}
      >
        {/* Subtle texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: C.diagonalHatch, backgroundSize: "20px 20px" }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.accent }}
            >
              Features
            </span>
            <h2 className="text-3xl lg:text-4xl font-black mt-3 mb-3" style={{ color: C.warmWhite }}>
              Everything your ops team needs
            </h2>
            <p className="text-sm mx-auto" style={{ color: C.muted, maxWidth: "420px" }}>
              Purpose-built tools for every stage of the rollover lifecycle.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl p-7 flex flex-col transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid rgba(184,134,11,0.15)`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(184,134,11,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,134,11,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,134,11,0.15)";
                }}
              >
                <div className="mb-5 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.18)" }}>
                  {feat.icon}
                </div>
                <h3
                  className="font-black text-base mb-2"
                  style={{ color: C.warmWhite }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="relative" style={{ background: C.heroBlack, borderTop: `1px solid rgba(184,134,11,0.08)` }}>
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
      <section className="py-24 px-8" style={{ background: C.cream }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.accent }}
            >
              What teams say
            </span>
            <h2 className="text-3xl lg:text-4xl font-black mt-3 mb-3" style={{ color: "#1a1510" }}>
              Real results from real operations teams
            </h2>
            <p className="text-sm mx-auto" style={{ color: "#7a6f62", maxWidth: "420px" }}>
              Don't take our word for it — hear from RIA ops teams already using Rift.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-8 flex flex-col justify-between"
                style={{
                  background: "#fff",
                  border: "1px solid #e8e2d8",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                {/* Quote mark */}
                <div>
                  <svg width="28" height="20" viewBox="0 0 28 20" fill="none" className="mb-4" style={{ opacity: 0.15 }}>
                    <path d="M0 20V12C0 5.4 4.2 1.4 12.6 0l1.4 3C9.8 4.2 7.6 6.8 7.2 10H12v10H0zm16 0V12c0-6.6 4.2-10.6 12.6-12L28 3c-4.2 1.2-6.4 3.8-6.8 7H28v10H16z" fill="#1a1510"/>
                  </svg>
                  <p
                    className="text-sm leading-relaxed mb-8"
                    style={{ color: "#2e2820" }}
                  >
                    {t.quote}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-5" style={{ borderTop: "1px solid #ece7df" }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: C.darkGreen, color: C.accentLight }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "#1a1510" }}
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
          background: C.darkGreen,
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
          <circle cx="-40" cy="420" r="320" stroke={C.accent} strokeWidth="1" fill="none"/>
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
                stroke={C.accent}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="text-base leading-relaxed" style={{ color: C.muted, maxWidth: "480px", margin: "0 auto 40px" }}>
            Join 30+ RIA firms that replaced their spreadsheet chaos with a purpose-built rollover platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setDemoOpen(true)}
              className="rounded-xl px-8 py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: C.accent, color: "#0c0a07" }}
            >
              Request Demo
            </button>
            <Link
              href="/login"
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
        style={{ background: C.heroBlack, borderTop: `1px solid rgba(184,134,11,0.12)` }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <svg width="28" height="24" viewBox="0 0 32 28" fill="none">
                  <rect x="0" y="0" width="14" height="28" rx="2" fill={C.accent}/>
                  <rect x="6" y="0" width="18" height="14" rx="2" fill={C.accentLight} opacity="0.85"/>
                  <rect x="12" y="12" width="16" height="16" rx="2" fill={C.accent} opacity="0.6"/>
                </svg>
                <span
                  className="text-lg font-black"
                  style={{ color: C.accent, letterSpacing: "-0.02em" }}
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
                  style={{ color: "rgba(184,134,11,0.6)" }}
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
                  style={{ color: "rgba(184,134,11,0.6)" }}
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
            style={{ borderTop: "1px solid rgba(184,134,11,0.1)" }}
          >
            <p className="text-xs" style={{ color: "rgba(156,143,122,0.55)" }}>
              © 2026 Rift Technologies, Inc. All rights reserved.
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
