import Link from "next/link";
import type { Metadata } from "next";
import LogoMark from "@/components/LogoMark";

export const metadata: Metadata = {
  title: "Rift — Rollover operations for independent RIAs",
  description:
    "Structured case workflows, a client-facing portal, and CRM sync that replace the spreadsheets your ops team is fighting with today.",
};

const DEMO_MAILTO =
  "mailto:krewb003@gmail.com?subject=Rift%20demo%20request&body=Hi%20Krew%2C%0A%0AI%27d%20like%20to%20see%20Rift%20in%20action.%0A%0AFirm%3A%20%0ARole%3A%20%0ATeam%20size%3A%20%0A";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0d12", color: "#c9d1d9" }}>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Integrations />
        <Pain />
        <Features />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ─── Shared ────────────────────────────────────────────────────────────── */

const CONTAINER = "max-w-[1180px] mx-auto px-6 sm:px-8";
const HEADING = "font-[family-name:var(--font-inter-tight)] tracking-tight text-balance";
const MUTED = { color: "#8b949e" };
const BORDER = "1px solid #1e2330";
const CARD_BG = "#0f131b";

/* ─── Nav ───────────────────────────────────────────────────────────────── */

function Nav() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ background: "rgba(10, 13, 18, 0.75)", borderBottom: BORDER }}
    >
      <div className={`${CONTAINER} h-14 flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2">
          <LogoMark id="logo-nav" />
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "#e4e6ea" }}>
            Rift
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#integrations">Integrations</NavLink>
          <NavLink href="#security">Security</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-[#1a1f2a]"
            style={{ color: "#c9d1d9" }}
          >
            Sign in
          </Link>
          <a
            href={DEMO_MAILTO}
            className="text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors"
            style={{ background: "#2563eb", color: "#fff" }}
          >
            Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-md transition-colors hover:bg-[#1a1f2a]"
      style={{ color: "#9ca3af" }}
    >
      {children}
    </a>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GradientBackdrop />
      <div className={`${CONTAINER} pt-20 pb-24 md:pt-28 md:pb-32`}>
        <div className="max-w-[760px]">
          <span
            className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full"
            style={{ background: "#111826", border: "1px solid #1f2a3d", color: "#a5b4fc" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#818cf8" }} />
            For independent RIAs
          </span>
          <h1
            className={`${HEADING} text-4xl sm:text-5xl md:text-[68px] font-semibold mt-6 leading-[1.03]`}
            style={{ color: "#e4e6ea" }}
          >
            Rollover operations that don&rsquo;t{" "}
            <span className="chrome-text">slip through the cracks.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-[640px] leading-relaxed" style={MUTED}>
            Structured case workflows, a client-facing portal, and CRM sync that replace the
            spreadsheets your ops team is fighting with today.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={DEMO_MAILTO}
              className="text-sm font-medium px-4 py-2.5 rounded-md transition-transform hover:-translate-y-px"
              style={{ background: "#2563eb", color: "#fff" }}
            >
              Book a demo
            </a>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2.5 rounded-md"
              style={{ background: "#161b22", border: BORDER, color: "#e4e6ea" }}
            >
              Sign in →
            </Link>
          </div>
        </div>

        <div className="mt-16 md:mt-20">
          <PipelinePreview />
        </div>
      </div>
    </section>
  );
}

function GradientBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1080px] h-[560px] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(ellipse at center, #1e3a8a 0%, transparent 60%)" }}
      />
      <div
        className="absolute top-[5%] right-[-10%] w-[560px] h-[560px] rounded-full blur-3xl opacity-35"
        style={{ background: "radial-gradient(circle at center, #6d28d9 0%, transparent 55%)" }}
      />
    </div>
  );
}

function PipelinePreview() {
  const stages: { label: string; bg: string; color: string; dot: string; done?: boolean }[] = [
    { label: "Intake", bg: "#21262d", color: "#8b949e", dot: "#6e7681", done: true },
    { label: "Awaiting client", bg: "#2d2208", color: "#e09937", dot: "#d29922", done: true },
    { label: "Ready to submit", bg: "#0d1f38", color: "#79c0ff", dot: "#388bfd", done: true },
    { label: "Submitted", bg: "#1d1535", color: "#c4b5fd", dot: "#a78bfa" },
    { label: "Processing", bg: "#2d1f0e", color: "#fdba74", dot: "#fb923c" },
    { label: "In transit", bg: "#0d1535", color: "#a5b4fc", dot: "#818cf8" },
    { label: "Completed", bg: "#0d2318", color: "#6ee7b7", dot: "#3fb950" },
  ];
  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        background: "linear-gradient(180deg, #11151d 0%, #0d1117 100%)",
        border: BORDER,
        boxShadow: "0 30px 80px -20px rgba(37, 99, 235, 0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="live-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#3fb950" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#3fb950" }} />
          </span>
          <span className="text-xs uppercase tracking-wider" style={{ color: "#7d8590" }}>
            Live case · Robert Nguyen
          </span>
        </div>
        <span className="text-xs" style={{ color: "#7d8590" }}>
          Fidelity NetBenefits → Schwab
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap"
              style={{ background: s.bg, color: s.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <span className="h-px w-4 md:w-6" style={{ background: s.done ? "#388bfd" : "#21262d" }} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <MiniCard label="Checklist" value="6 of 9" detail="3 awaiting client" />
        <MiniCard label="Days in stage" value="2" detail="Well under 7-day SLA" />
        <MiniCard label="Synced to CRM" value="Wealthbox" detail="Last synced 2 min ago" />
      </div>
    </div>
  );
}

function MiniCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#0a0d12", border: BORDER }}>
      <p className="text-xs uppercase tracking-wider" style={{ color: "#7d8590" }}>{label}</p>
      <p className="text-xl font-semibold mt-1" style={{ color: "#e4e6ea" }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{detail}</p>
    </div>
  );
}

/* ─── Pain (editorial rows + broken-state symptom chips) ─────────────── */

type PainChip = { label: string; value: string };
type PainItem = { n: string; title: string; body: string; chips: PainChip[] };

function Pain() {
  const items: PainItem[] = [
    {
      n: "01",
      title: "Spreadsheets lose state",
      body: "Stage, owner, and next action live in somebody's memory or a stale tab. One unchecked box and a 401(k) rollover stalls for weeks.",
      chips: [
        { label: "Stage", value: "—" },
        { label: "Owner", value: "???" },
        { label: "Last update", value: "18d ago" },
      ],
    },
    {
      n: "02",
      title: "Clients chase you for updates",
      body: "Without a portal, every status question turns into an email thread. Advisors field calls that should be a glance at a dashboard.",
      chips: [
        { label: "Unread emails", value: "7" },
        { label: "Follow-up", value: "pending" },
        { label: "Portal", value: "none" },
      ],
    },
    {
      n: "03",
      title: "Your CRM drifts out of sync",
      body: "Ops marked the case submitted, but Wealthbox still says \u201CNeeds analysis.\u201D Pipeline reports lie and compensation math gets messy.",
      chips: [
        { label: "Rift stage", value: "Submitted" },
        { label: "CRM stage", value: "Needs analysis" },
        { label: "Drift", value: "11 days" },
      ],
    },
  ];

  return (
    <section
      className="relative py-24 md:py-28"
      style={{
        background: "linear-gradient(180deg, #0a0d12 0%, #0f0d0a 50%, #0a0d12 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ background: "radial-gradient(ellipse at 10% 30%, #f59e0b 0%, transparent 50%)" }}
      />
      <div className={`${CONTAINER} relative`}>
        <div className="max-w-[820px] mb-14">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#f59e0b" }}>
            The problem
          </p>
          <h2
            className={`${HEADING} text-3xl md:text-5xl font-semibold mt-3 leading-[1.08]`}
            style={{ color: "#e4e6ea" }}
          >
            Rollovers are the most avoidable way{" "}
            <span style={{ color: "#fbbf24" }}>to lose a client.</span>
          </h2>
        </div>

        <ol className="space-y-0">
          {items.map((it, idx) => (
            <PainRow key={it.n} item={it} first={idx === 0} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function PainRow({ item, first }: { item: PainItem; first: boolean }) {
  return (
    <li
      className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-x-10 gap-y-6 py-10 md:py-12 items-center"
      style={{ borderTop: first ? "1px solid #1f1810" : "1px solid #15130e" }}
    >
      {/* Big numeral — solid amber gradient, not outlined */}
      <span
        className={`${HEADING} text-6xl md:text-7xl font-semibold tabular-nums leading-none select-none`}
        style={{
          background: "linear-gradient(180deg, #fbbf24 0%, #b45309 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 0 40px rgba(251, 191, 36, 0.12)",
        }}
      >
        {item.n}
      </span>

      {/* Title + body */}
      <div className="max-w-[580px]">
        <h3 className={`${HEADING} text-xl md:text-2xl font-semibold`} style={{ color: "#e4e6ea" }}>
          {item.title}
        </h3>
        <p className="text-base leading-relaxed mt-2" style={MUTED}>
          {item.body}
        </p>
      </div>

      {/* Broken-state symptom chips */}
      <div
        className="rounded-lg p-3 min-w-[240px] md:min-w-[280px]"
        style={{
          background: "linear-gradient(180deg, #141008 0%, #0d0b08 100%)",
          border: "1px solid #2a1f0c",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <IconWarn />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#f59e0b" }}>
            Today&rsquo;s reality
          </span>
        </div>
        <div className="space-y-1.5">
          {item.chips.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-xs">
              <span style={{ color: "#7d6a4a" }}>{c.label}</span>
              <span
                className="font-mono px-1.5 py-0.5 rounded"
                style={{ background: "#2a1a0c", color: "#fcd34d", border: "1px solid #3b2a0e" }}
              >
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

function IconWarn() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5l6 11h-12l6-11z" stroke="#f59e0b" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 5v3.5M7 10.5v.5" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Features (bento grid, per-tile accents) ────────────────────────────── */

type FeatureTile = {
  title: string;
  body: string;
  accent: string;          // border glow + icon bg
  iconFg: string;
  icon: React.ReactNode;
  span?: "large" | "wide";
  preview?: React.ReactNode;
};

function Features() {
  const tiles: FeatureTile[] = [
    {
      title: "Case pipeline",
      body: "Every rollover moves through the same stages with clear owners and SLAs. Nothing gets forgotten in somebody's inbox.",
      accent: "#3b82f6",
      iconFg: "#93c5fd",
      icon: <IconPipeline />,
      span: "large",
      preview: <FeaturePipelinePreview />,
    },
    {
      title: "Client portal",
      body: "Magic-link access lets clients upload documents and message the team without passwords.",
      accent: "#a78bfa",
      iconFg: "#c4b5fd",
      icon: <IconClient />,
    },
    {
      title: "Tasks & checklists",
      body: "Per-case task lists and per-account-type document checklists — always know what's next.",
      accent: "#fb923c",
      iconFg: "#fdba74",
      icon: <IconTasks />,
    },
    {
      title: "CRM sync",
      body: "Two-way with Wealthbox or Salesforce. Opportunity stages update automatically with the case.",
      accent: "#22d3ee",
      iconFg: "#67e8f9",
      icon: <IconSync />,
    },
    {
      title: "Document vault",
      body: "Encrypted per-firm S3 storage, scoped by case. No email attachments, no shared folders.",
      accent: "#f472b6",
      iconFg: "#f9a8d4",
      icon: <IconVault />,
    },
    {
      title: "Audit & compliance",
      body: "Every action logged. Role-based access. Configurable retention for compliance review.",
      accent: "#34d399",
      iconFg: "#6ee7b7",
      icon: <IconShield />,
    },
  ];

  return (
    <section id="features" className="relative py-24 md:py-32">
      {/* soft grid pattern wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
        }}
      />
      <div className={`${CONTAINER} relative`}>
        <div className="max-w-[760px]">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#818cf8" }}>
            What you get
          </p>
          <h2 className={`${HEADING} text-3xl md:text-5xl font-semibold mt-3 leading-[1.1]`} style={{ color: "#e4e6ea" }}>
            Built specifically for RIA operations teams.
          </h2>
          <p className="mt-4 text-base md:text-lg leading-relaxed" style={MUTED}>
            Not a generic CRM, not a generic task manager. Every feature exists because a real
            rollover case needs it.
          </p>
        </div>

        {/* Bento grid: large tile spans 2 cols on large screens */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(220px,auto)]">
          {tiles.map((t) => (
            <FeatureCard key={t.title} tile={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ tile }: { tile: FeatureTile }) {
  const isLarge = tile.span === "large";
  return (
    <div
      className={`relative rounded-xl p-6 overflow-hidden group transition-colors ${
        isLarge ? "lg:col-span-2 lg:row-span-2" : ""
      }`}
      style={{
        background: CARD_BG,
        border: BORDER,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02)`,
      }}
    >
      {/* top-edge accent */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${tile.accent}, transparent)`,
          opacity: 0.5,
        }}
      />
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{
          background: `${tile.accent}15`,
          border: `1px solid ${tile.accent}30`,
          color: tile.iconFg,
        }}
      >
        {tile.icon}
      </div>
      <h3 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>
        {tile.title}
      </h3>
      <p className={`mt-2 text-sm leading-relaxed ${isLarge ? "max-w-[520px]" : ""}`} style={MUTED}>
        {tile.body}
      </p>
      {tile.preview && <div className="mt-6">{tile.preview}</div>}
    </div>
  );
}

function FeaturePipelinePreview() {
  return (
    <div className="mt-2 space-y-2">
      {[
        { n: "ROB-1042", name: "Robert Nguyen", stage: "Awaiting client", color: "#d29922" },
        { n: "LIN-1038", name: "Linda Torres",  stage: "Ready to submit", color: "#388bfd" },
        { n: "DAV-1029", name: "David Kim",     stage: "Submitted",       color: "#a78bfa" },
        { n: "KEV-0994", name: "Kevin Anderson",stage: "Completed",       color: "#3fb950" },
      ].map((r) => (
        <div
          key={r.n}
          className="flex items-center justify-between rounded-md px-3 py-2"
          style={{ background: "#0a0d12", border: BORDER }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono" style={{ color: "#7d8590" }}>{r.n}</span>
            <span className="text-sm" style={{ color: "#e4e6ea" }}>{r.name}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
            <span style={{ color: r.color }}>{r.stage}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Integrations (paired sync panels + CRM grid) ───────────────────── */

function Integrations() {
  return (
    <section
      id="integrations"
      className="relative py-24 md:py-28"
      style={{
        background: "linear-gradient(180deg, #0a0d12 0%, #0c1018 50%, #0a0d12 100%)",
        borderTop: BORDER,
        borderBottom: BORDER,
      }}
    >
      <div className={`${CONTAINER} relative`}>
        <div className="max-w-[760px] mb-12">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#22d3ee" }}>
            Integrations
          </p>
          <h2 className={`${HEADING} text-3xl md:text-5xl font-semibold mt-3 leading-[1.1]`} style={{ color: "#e4e6ea" }}>
            Plugs into the CRM you already run on.
          </h2>
          <p className="mt-4 text-base md:text-lg leading-relaxed" style={MUTED}>
            Two-way sync so your advisors keep working in the CRM they know, and your ops team
            drives cases from Rift. No duplicate entry.
          </p>
        </div>

        <SyncPanels />

        <div className="mt-14">
          <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "#7d8590" }}>
            Supported CRMs
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CrmCard name="Wealthbox"  brand="#3b82f6" blurb="Opportunity stage sync, task linking." status="live" />
            <CrmCard name="Salesforce" brand="#00A1E0" blurb="Opportunity stage sync via OAuth." status="live" />
            <CrmCard name="Redtail"    brand="#ef4444" blurb="Contact + activity sync." status="soon" />
            <CrmCard name="Orion"      brand="#f97316" blurb="Household-level case linkage." status="soon" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Two side-by-side app panels — Rift on the left, the CRM on the right —
 *  connected by a sync rail with animated flow dots. Shows the same case
 *  in both systems at matching stages, which is the whole value prop. */
function SyncPanels() {
  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-0 items-stretch">
      {/* Left: Rift panel */}
      <SyncPanel
        eyebrow="Rift case"
        title="ROB-1042 · Robert Nguyen"
        subtitle="Traditional IRA rollover · Schwab"
        stageColor="#d29922"
        stageLabel="Awaiting client"
        accent="#2563eb"
        rows={[
          { label: "Advisor",     value: "Sarah Mitchell" },
          { label: "Checklist",   value: "6 of 9 · 3 awaiting client" },
          { label: "Last update", value: "2 minutes ago" },
        ]}
      />

      {/* Connector */}
      <SyncRail />

      {/* Right: CRM panel */}
      <SyncPanel
        eyebrow="Wealthbox opportunity"
        title="Robert Nguyen — Rollover"
        subtitle="Opportunity #38241"
        stageColor="#d29922"
        stageLabel="Awaiting Client"
        accent="#3b82f6"
        rows={[
          { label: "Owner",    value: "Sarah Mitchell" },
          { label: "Amount",   value: "$482,300" },
          { label: "Updated",  value: "Synced 2 min ago" },
        ]}
      />
    </div>
  );
}

function SyncPanel({
  eyebrow,
  title,
  subtitle,
  stageLabel,
  stageColor,
  accent,
  rows,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  stageLabel: string;
  stageColor: string;
  accent: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #11151d 0%, #0d1117 100%)",
        border: BORDER,
        boxShadow: `0 20px 60px -20px ${accent}30`,
      }}
    >
      {/* top accent */}
      <span aria-hidden className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.6 }}
      />
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: BORDER }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: "#7d8590" }}>{eyebrow}</p>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={{ background: stageColor + "22", color: stageColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColor }} />
            {stageLabel}
          </span>
        </div>
        <h3 className={`${HEADING} text-base md:text-lg font-semibold mt-2`} style={{ color: "#e4e6ea" }}>{title}</h3>
        <p className="text-xs mt-1" style={{ color: "#7d8590" }}>{subtitle}</p>
      </div>
      <dl className="px-5 py-4 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <dt style={{ color: "#7d8590" }}>{r.label}</dt>
            <dd style={{ color: "#c9d1d9" }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SyncRail() {
  return (
    <div className="flex md:flex-col items-center justify-center px-2 md:px-6 py-4 md:py-0">
      <div className="relative flex md:flex-col items-center gap-2">
        {/* Rail background */}
        <div className="md:hidden h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #334155, transparent)" }} />
        <div className="hidden md:block w-px h-24" style={{ background: "linear-gradient(180deg, transparent, #334155, transparent)" }} />

        {/* Badge */}
        <div
          className="relative z-10 px-3 py-1.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5"
          style={{ background: "#0a0d12", border: "1px solid #334155", color: "#a5f3fc" }}
        >
          <span className="relative flex w-1.5 h-1.5">
            <span className="live-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#22d3ee" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#22d3ee" }} />
          </span>
          Syncing
        </div>

        <div className="md:hidden h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #334155, transparent)" }} />
        <div className="hidden md:block w-px h-24" style={{ background: "linear-gradient(180deg, transparent, #334155, transparent)" }} />
      </div>
    </div>
  );
}

function CrmCard({ name, brand, blurb, status }: { name: string; brand: string; blurb: string; status: "live" | "soon" }) {
  const isSoon = status === "soon";
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden transition-colors"
      style={{
        background: CARD_BG,
        border: BORDER,
        opacity: isSoon ? 0.55 : 1,
      }}
    >
      <span aria-hidden className="absolute top-0 left-0 right-0 h-px"
        style={{ background: isSoon ? "transparent" : `linear-gradient(90deg, transparent, ${brand}, transparent)`, opacity: 0.6 }}
      />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] font-bold"
            style={{ background: `${brand}22`, color: brand, border: `1px solid ${brand}44` }}
          >
            {name[0]}
          </span>
          <span className={`${HEADING} text-[15px] font-semibold`} style={{ color: "#e4e6ea" }}>
            {name}
          </span>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{
            background: isSoon ? "#1f2937" : "#062e1e",
            color:      isSoon ? "#9ca3af" : "#6ee7b7",
            border:     isSoon ? "1px solid #374151" : "1px solid #065f46",
          }}
        >
          {isSoon ? "Soon" : "Live"}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={MUTED}>{blurb}</p>
    </div>
  );
}

/* ─── Security (single panel, vault SVG, green/teal) ──────────────────── */

function Security() {
  const bullets = [
    { title: "Encrypted at rest", body: "AES-256-GCM for credentials and tokens. TLS 1.2+ in transit. Per-firm S3 buckets." },
    { title: "Role-based access",  body: "Admin, advisor, and ops roles. Non-admins only see cases they own. All actions audited." },
    { title: "Two-factor auth",    body: "TOTP 2FA available on every account; enforceable firm-wide by admins." },
    { title: "Configurable retention", body: "Set case-data and audit-log retention per firm to match your compliance policy." },
  ];
  return (
    <section id="security" className="relative py-24 md:py-32">
      <div className={CONTAINER}>
        <div className="max-w-[760px] mb-12">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#34d399" }}>
            Security
          </p>
          <h2 className={`${HEADING} text-3xl md:text-5xl font-semibold mt-3 leading-[1.1]`} style={{ color: "#e4e6ea" }}>
            Client data held to the standard your compliance team expects.
          </h2>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a1210 0%, #0d1317 50%, #0a0d12 100%)",
            border: "1px solid #1a2a22",
          }}
        >
          <div className="grid md:grid-cols-[280px_1fr] gap-0">
            <div
              className="flex items-center justify-center p-10 md:border-r relative overflow-hidden"
              style={{ borderColor: "#1a2a22", background: "radial-gradient(ellipse at center, #0e1a17 0%, transparent 70%)" }}
            >
              <VaultIllustration />
            </div>
            <div className="p-8 md:p-10 grid sm:grid-cols-2 gap-6">
              {bullets.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "#052e24", border: "1px solid #065f46", color: "#6ee7b7" }}
                  >
                    <IconCheck />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>{b.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed" style={MUTED}>{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VaultIllustration() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" aria-hidden>
      <defs>
        <radialGradient id="vault-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="90" cy="90" r="85" fill="url(#vault-glow)" />
      {/* outer ring */}
      <circle cx="90" cy="90" r="65" stroke="#10372d" strokeWidth="2" fill="#0a1512" />
      {/* dial marks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 90 + Math.cos(angle) * 58;
        const y1 = 90 + Math.sin(angle) * 58;
        const x2 = 90 + Math.cos(angle) * 64;
        const y2 = 90 + Math.sin(angle) * 64;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e4d3d" strokeWidth="1.5" />;
      })}
      {/* inner ring */}
      <circle cx="90" cy="90" r="48" stroke="#1e4d3d" strokeWidth="1.5" fill="#0d1f1a" />
      {/* spokes (handle) */}
      <line x1="90" y1="30" x2="90" y2="150" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="90" x2="150" y2="90" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      {/* center with lock */}
      <circle cx="90" cy="90" r="22" fill="#0a1512" stroke="#34d399" strokeWidth="1.5" />
      <rect x="83" y="88" width="14" height="11" rx="2" stroke="#6ee7b7" strokeWidth="1.5" fill="none" />
      <path d="M85.5 88v-3a4.5 4.5 0 019 0v3" stroke="#6ee7b7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Final CTA (liquid chrome button) ────────────────────────────────── */

function FinalCta() {
  return (
    <section className="py-24 md:py-32">
      <div className={CONTAINER}>
        <div
          className="relative overflow-hidden rounded-2xl p-10 md:p-20 text-center"
          style={{
            background: "linear-gradient(135deg, #0b1024 0%, #1a103a 55%, #1e1b4b 100%)",
            border: "1px solid #2d2f5a",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, #3b82f6 0%, transparent 60%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-24 right-[-10%] w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle at center, #a855f7 0%, transparent 55%)" }}
          />
          <div className="relative">
            <h2
              className={`${HEADING} text-3xl md:text-5xl font-semibold max-w-[720px] mx-auto leading-[1.1]`}
              style={{ color: "#e4e6ea" }}
            >
              Stop losing rollovers to the <span className="chrome-text">spreadsheet</span>.
            </h2>
            <p className="mt-4 text-base md:text-lg max-w-[560px] mx-auto" style={MUTED}>
              Twenty minutes to set up. Your first case moves through Rift the same day.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 justify-center">
              <ChromeButton href={DEMO_MAILTO}>Book a demo</ChromeButton>
              <Link
                href="/login"
                className="text-sm font-medium px-5 py-3 rounded-md"
                style={{ background: "#161b22", border: BORDER, color: "#e4e6ea" }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Liquid chrome CTA: animated metallic border + metallic hover fill */
function ChromeButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="chrome-border relative inline-flex items-center justify-center text-sm font-semibold px-5 py-3 rounded-md transition-transform hover:-translate-y-px"
      style={{
        background: "#0a0d12",
        color: "#e4e6ea",
      }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <span style={{ color: "#c7ccd6" }}>→</span>
      </span>
    </a>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer style={{ borderTop: BORDER }}>
      <div className={`${CONTAINER} py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
        <div className="flex items-center gap-2">
          <LogoMark id="logo-footer" />
          <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Rift</span>
          <span className="text-xs ml-2" style={{ color: "#7d8590" }}>
            © {new Date().getFullYear()} Rift. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <a href={DEMO_MAILTO} style={{ color: "#9ca3af" }} className="hover:text-white transition-colors">
            Contact
          </a>
          <Link href="/login" style={{ color: "#9ca3af" }} className="hover:text-white transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function IconPipeline() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="3" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="15" cy="9" r="2" fill="currentColor" />
      <path d="M5 9h2M11 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconClient() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 15c1-3 3.2-4.5 6-4.5s5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconSync() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 8a6 6 0 0110-3M15 10a6 6 0 01-10 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 2v3h-3M5 16v-3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTasks() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVault() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3" y="4" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2l5 2v5c0 3.5-2.2 6-5 7-2.8-1-5-3.5-5-7V4l5-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 9l1.5 1.5L11 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 9l3.5 3.5L14 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
