import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rift — Every rollover. One lane.",
  description:
    "Rift replaces the spreadsheet, the email thread, and the sticky note on your monitor with a structured pipeline for moving retirement accounts from intake to funded — built for independent RIAs.",
};

const DEMO_MAILTO =
  "mailto:krewb003@gmail.com?subject=Rift%20demo%20request&body=Hi%20Krew%2C%0A%0AI%27d%20like%20to%20see%20Rift%20in%20action.%0A%0AFirm%3A%20%0ARole%3A%20%0ATeam%20size%3A%20%0A";

/* ─────────────────────── Paper palette ─────────────────────── */
const T = {
  page: "#faf9f5",
  surface1: "#fdfcf7",
  surface2: "#f7f5ec",
  surface3: "#e3dcc5",

  border: "#e6e3d4",
  borderSoft: "#ece9dc",
  borderStrong: "#d4d0bd",

  text: "#1f1e1a",
  textSecondary: "#5b584f",
  textTertiary: "#8b8879",

  accent: "#c96442",
  accentHover: "#b25232",
  accentSoft: "#f4e1d6",
  accentBorder: "#ecccbc",

  warning: "#8a6418",
  warningSoft: "#f3e2bf",
  warningBorder: "#e0c993",
  success: "#3a6b3e",
  successSoft: "#e1eed7",
  successBorder: "#bfd6aa",
  info: "#2f5a8a",
  infoSoft: "#e0ebf4",
  infoBorder: "#bfd5e6",
  violet: "#5d4a86",
  violetSoft: "#e7e0ef",
  violetBorder: "#cfc4dd",
} as const;

const SERIF = 'var(--font-instrument-serif), "Charter", "Iowan Old Style", Georgia, serif';
const SANS = 'var(--font-inter-tight), "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const CONTAINER_W = 1240;

export default function LandingPage() {
  return (
    <>
      <PaperStyles />
      <div style={{ background: T.page, color: T.text, fontFamily: SANS, minHeight: "100vh" }}>
        <TopNav />
        <Hero />
        <LogoRow />
        <ProblemSection />
        <PipelineSection />
        <ClientPortalFeature />
        <FeatureSection />
        <StatsStrip />
        <QuoteSection />
        <PricingSection />
        <ClosingCta />
        <Footer />
      </div>
    </>
  );
}

/* Local styles: paper texture overlay + hover affordances we can't get
   from pure inline styles. */
function PaperStyles() {
  return (
    <style>{`
      html, body { background: ${T.page}; }
      body::before {
        content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 1000;
        background-image: radial-gradient(rgba(105,80,40,0.045) 1px, transparent 1px);
        background-size: 3px 3px; mix-blend-mode: multiply; opacity: 0.6;
      }
      ::selection { background: ${T.accentSoft}; color: ${T.text}; }

      .rift-nav-link { color: ${T.textSecondary}; transition: background 100ms, color 100ms; }
      .rift-nav-link:hover { background: ${T.surface3}; color: ${T.text}; }

      .rift-btn { transition: background 90ms linear, border-color 90ms linear, color 90ms linear, box-shadow 90ms linear; font-family: inherit; }
      .rift-btn-primary { background: ${T.accent}; border: 1px solid ${T.accent}; color: #fdfcf7; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
      .rift-btn-primary:hover { background: ${T.accentHover}; border-color: ${T.accentHover}; }
      .rift-btn-secondary { background: ${T.surface1}; border: 1px solid ${T.border}; color: ${T.text}; }
      .rift-btn-secondary:hover { background: ${T.surface3}; border-color: ${T.borderStrong}; }
      .rift-btn-on-dark { background: transparent; border: 1px solid rgba(253,252,247,0.3); color: #fdfcf7; }
      .rift-btn-on-dark:hover { background: rgba(253,252,247,0.06); border-color: rgba(253,252,247,0.55); }

      .rift-footer-link { color: ${T.textSecondary}; transition: color 100ms; }
      .rift-footer-link:hover { color: ${T.text}; }

      .rift-pricing-cta-secondary { background: ${T.surface1}; border: 1px solid ${T.border}; color: ${T.text}; }
      .rift-pricing-cta-secondary:hover { background: ${T.surface3}; border-color: ${T.borderStrong}; }
    `}</style>
  );
}

/* ─────────────────────── Top nav ─────────────────────── */
function TopNav() {
  const links: { label: string; href: string }[] = [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Custodian intel", href: "#custodian-intel" },
    { label: "Pricing", href: "#pricing" },
    { label: "Customers", href: "#customers" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(250,249,245,0.85)",
      backdropFilter: "saturate(140%) blur(8px)",
      WebkitBackdropFilter: "saturate(140%) blur(8px)",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        maxWidth: CONTAINER_W, margin: "0 auto",
        padding: "14px 36px",
        display: "flex", alignItems: "center", gap: 28,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <RiftMark size={22} />
          <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, letterSpacing: -0.3, color: T.text }}>Rift</span>
        </Link>
        <nav style={{ display: "flex", gap: 4, flex: 1, marginLeft: 14 }}>
          {links.map(l => (
            <a key={l.label} href={l.href} className="rift-nav-link" style={{
              padding: "7px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500,
              textDecoration: "none",
            }}>{l.label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, padding: "7px 12px", textDecoration: "none" }}>Sign in</Link>
          <PrimaryButton href={DEMO_MAILTO}>
            Book a demo <ArrowIcon size={13} />
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}

function RiftMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="11" fill={T.accent} />
      <path d="M7.5 6.5 L11 17.5 M16.5 6.5 L13 17.5" stroke="#fdfcf7" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 11.5 L18 11.5" stroke="#fdfcf7" strokeWidth="1.4" strokeLinecap="round" opacity={0.85} />
    </svg>
  );
}

/* ─────────────────────── Buttons ─────────────────────── */
function PrimaryButton({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <a href={href} className="rift-btn rift-btn-primary" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 32, padding: "0 14px", borderRadius: 7,
      fontSize: 12.5, fontWeight: 600, textDecoration: "none",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </a>
  );
}

function SecondaryButton({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <a href={href} className="rift-btn rift-btn-secondary" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 32, padding: "0 14px", borderRadius: 7,
      fontSize: 12.5, fontWeight: 500, textDecoration: "none",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </a>
  );
}

/* ─────────────────────── Hero ─────────────────────── */
function Hero() {
  return (
    <section style={{
      borderBottom: `1px solid ${T.border}`,
      background: `
        radial-gradient(900px 480px at 88% -10%, ${T.accentSoft}, transparent 60%),
        radial-gradient(700px 360px at 12% 110%, #efe9d6, transparent 70%),
        ${T.page}
      `,
    }}>
      <div style={{
        maxWidth: CONTAINER_W, margin: "0 auto",
        padding: "84px 36px 72px",
        display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 64,
        alignItems: "center",
      }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 11px 5px 7px", borderRadius: 999,
            background: T.surface1, border: `1px solid ${T.border}`,
            fontSize: 12, color: T.textSecondary, marginBottom: 26,
          }}>
            <span style={{
              padding: "2px 8px", borderRadius: 999,
              background: T.accentSoft, color: T.accent, fontSize: 10.5,
              fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase",
              border: `1px solid ${T.accentBorder}`,
            }}>New</span>
            Custodian Intelligence — query 25+ custodians in plain English
          </div>
          <h1 style={{
            margin: 0, fontFamily: SERIF, fontSize: 80, lineHeight: 1.02,
            letterSpacing: -1.6, color: T.text, fontWeight: 400,
          }}>
            Every rollover.<br />
            <span style={{ fontStyle: "italic", color: T.accent }}>One lane.</span>
          </h1>
          <p style={{
            marginTop: 22, fontSize: 17.5, lineHeight: 1.55, color: T.textSecondary,
            maxWidth: 520,
          }}>
            Rift replaces the spreadsheet, the email thread, and the sticky note on your monitor
            with a structured pipeline for moving retirement accounts from intake to funded —
            built for independent RIAs.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 32, alignItems: "center", flexWrap: "wrap" }}>
            <PrimaryButton href={DEMO_MAILTO} style={{ height: 40, padding: "0 18px", fontSize: 14 }}>
              Book a 20-min demo <ArrowIcon size={14} />
            </PrimaryButton>
            <SecondaryButton href="#product" style={{ height: 40, padding: "0 16px", fontSize: 14 }}>
              See the product tour
            </SecondaryButton>
          </div>
          <div style={{
            marginTop: 32, display: "flex", gap: 24, alignItems: "center",
            fontSize: 12, color: T.textTertiary, flexWrap: "wrap",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={13} color={T.success} /> SOC 2 in progress
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={13} color={T.success} /> Works with 10+ CRMs out of the box
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={13} color={T.success} /> Free 14-day trial
            </span>
          </div>
        </div>

        <HeroBoardPreview />
      </div>
    </section>
  );
}

function HeroBoardPreview() {
  const kpis = [
    { l: "Active", v: "42", d: "+12%" },
    { l: "AUM", v: "$148M", d: "+11%" },
    { l: "Cycle", v: "23d", d: "−4d" },
    { l: "Win", v: "68%", d: "+6%" },
  ];
  const pipeline = [
    { l: "Proposal", c: 8, k: T.textTertiary },
    { l: "Awaiting", c: 11, k: T.warning },
    { l: "Ready", c: 5, k: T.info },
    { l: "Submitted", c: 7, k: T.violet },
    { l: "Processing", c: 4, k: T.accent },
    { l: "Transit", c: 3, k: T.accent },
    { l: "Won", c: 4, k: T.success },
  ];
  const rows: { n: string; r: string; s: string; h: PillHue; u: string }[] = [
    { n: "Margaret Chen", r: "Fidelity → Schwab", s: "Awaiting client", h: "amber", u: "2h" },
    { n: "Daniel Park", r: "Vanguard → Schwab", s: "Submitted", h: "violet", u: "5h" },
    { n: "Aisha Patel", r: "Empower → Altruist", s: "Processing", h: "coral", u: "1d" },
  ];
  return (
    <div style={{
      position: "relative",
      background: T.surface1, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 18,
      boxShadow: "0 24px 60px -28px rgba(60,40,20,0.22), 0 2px 0 rgba(60,40,20,0.02)",
    }}>
      <BrowserChrome url="rift.app/dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
        {kpis.map(k => (
          <div key={k.l} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 10px", background: T.surface1 }}>
            <div style={{ fontSize: 8.5, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>{k.l}</div>
            <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 17, fontWeight: 600, marginTop: 3, letterSpacing: -0.3 }}>{k.v}</div>
            <div style={{ fontSize: 9.5, color: T.success, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>{k.d}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginBottom: 8 }}>Pipeline</div>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {pipeline.map((p, i) => (
            <span key={p.l} style={{ display: "contents" }}>
              <div style={{
                flex: 1, background: T.surface1, border: `1px solid ${T.border}`,
                borderTop: `3px solid ${p.k}`, borderRadius: 5,
                padding: "7px 6px 6px", display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontSize: 7.5, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500, lineHeight: 1.2 }}>{p.l}</div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 17, fontWeight: 600, marginTop: 4, letterSpacing: -0.3 }}>{p.c}</div>
              </div>
              {i < pipeline.length - 1 && (
                <div style={{ width: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="8" viewBox="0 0 14 14"><path d="M3 7h8M8 4l3 3-3 3" stroke={T.textTertiary} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, border: `1px solid ${T.border}`, borderRadius: 7, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.n} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
            borderTop: i ? `1px solid ${T.borderSoft}` : "none",
            background: i % 2 ? T.surface2 : T.surface1,
          }}>
            <Avatar name={r.n} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>{r.n}</div>
              <div style={{ fontSize: 10.5, color: T.textTertiary, fontVariantNumeric: "tabular-nums" }}>{r.r}</div>
            </div>
            <Pill hue={r.h} small dot>{r.s}</Pill>
            <span style={{ fontSize: 10.5, color: T.textTertiary, fontVariantNumeric: "tabular-nums", width: 24, textAlign: "right" }}>{r.u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserChrome({ url, secure }: { url: string; secure?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      paddingBottom: 12, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", gap: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e0c7b8" }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e6dcc4" }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#cfd9c4" }} />
      </div>
      <div style={{
        flex: 1, height: 22, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 5,
        display: "flex", alignItems: "center", paddingLeft: 9, gap: 6,
      }}>
        {secure ? <ShieldIcon size={11} color={T.success} /> : <SearchIcon size={11} color={T.textTertiary} />}
        <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: secure ? "ui-monospace, monospace" : SANS }}>{url}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Logo / custodians row ─────────────────────── */
function LogoRow() {
  const logos = [
    { n: "Fidelity", m: "Covington, KY · Salt Lake, UT" },
    { n: "Schwab", m: "El Paso, TX · Omaha, NE" },
    { n: "Vanguard", m: "Malvern, PA" },
    { n: "Empower", m: "Greenwood Village, CO" },
    { n: "Altruist", m: "Culver City, CA" },
    { n: "Pershing", m: "Jersey City, NJ" },
    { n: "Betterment", m: "New York, NY" },
    { n: "TIAA", m: "Charlotte, NC" },
    { n: "Principal", m: "Des Moines, IA" },
    { n: "Voya", m: "Atlanta, GA" },
    { n: "John Hancock", m: "Boston, MA" },
    { n: "Ascensus", m: "Brainerd, MN" },
  ];
  const stats = [
    { v: "8,200+", l: "Packages routed" },
    { v: "74", l: "Mailing addresses" },
    { v: "0", l: "Returned to sender, ytd" },
  ];
  return (
    <section id="custodian-intel" style={{ padding: "76px 36px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
      <div style={{ maxWidth: CONTAINER_W, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 580 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: T.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Routes paperwork to</div>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: 44, lineHeight: 1.08, letterSpacing: -0.8, color: T.text, fontWeight: 400 }}>
              <span style={{ fontStyle: "italic", color: T.accent }}>25+ custodians.</span> Every quirk pre-mapped.
            </h2>
            <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.55, color: T.textSecondary, maxWidth: 520 }}>
              Mailing routes, signature rules, processing windows — kept current so the right envelope goes to the right address the first time.
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {stats.map(s => (
              <div key={s.l} style={{ padding: "10px 14px", background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontFamily: SERIF, fontWeight: 500, color: T.text, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10,
          background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 12, padding: 10,
        }}>
          {logos.map(l => (
            <div key={l.n} style={{
              padding: "16px 14px", borderRadius: 8, background: T.surface2,
              border: `1px solid ${T.borderSoft}`,
              display: "flex", flexDirection: "column", gap: 4, minHeight: 70, justifyContent: "center",
            }}>
              <div style={{ fontFamily: SERIF, fontSize: 19, color: T.text, fontWeight: 500, letterSpacing: -0.3 }}>{l.n}</div>
              <div style={{ fontSize: 10.5, color: T.textTertiary, letterSpacing: 0.2 }}>{l.m}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 12.5, color: T.textTertiary, textAlign: "center" }}>
          Don&rsquo;t see yours? We add custodians on request — usually within a day.
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Section shell ─────────────────────── */
function SectionShell({
  id, eyebrow, title, lead, children, dark, centered, number,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children: React.ReactNode;
  dark?: boolean;
  centered?: boolean;
  number?: string;
}) {
  return (
    <section id={id} style={{
      padding: "92px 36px",
      background: dark ? T.surface2 : T.page,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: CONTAINER_W, margin: "0 auto" }}>
        <div style={{
          maxWidth: centered ? 760 : 720,
          margin: centered ? "0 auto 44px" : "0 0 44px",
          textAlign: centered ? "center" : "left",
        }}>
          {number ? (
            <div style={{
              fontFamily: SERIF, fontSize: 15, color: T.accent, fontWeight: 600,
              letterSpacing: 1, marginBottom: 14,
              display: "inline-flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ width: 28, height: 1, background: T.accent, display: "inline-block" }} />
              <span>{number}</span>
              <span style={{ width: 28, height: 1, background: T.accent, display: "inline-block" }} />
            </div>
          ) : eyebrow ? (
            <div style={{
              fontSize: 11.5, fontWeight: 500, color: T.accent,
              textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12,
            }}>{eyebrow}</div>
          ) : null}
          <h2 style={{
            margin: 0, fontFamily: SERIF, fontSize: 54, lineHeight: 1.06,
            letterSpacing: -1, color: T.text, fontWeight: 400,
          }}>{title}</h2>
          {lead && (
            <p style={{
              fontSize: 17, lineHeight: 1.55, color: T.textSecondary,
              maxWidth: 620, margin: centered ? "18px auto 0" : "18px 0 0",
            }}>{lead}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────── Problem section ─────────────────────── */
function ProblemSection() {
  const items = [
    {
      h: "Shared inbox",
      b: "Forwards stack up. Two advisors email the same client. A medallion gets requested twice and signed never.",
    },
    {
      h: "Tracker spreadsheet",
      b: "One person owns it. They go on PTO. Statuses are stale within a week. Nobody trusts the column called “notes.”",
    },
    {
      h: "Custodian tribal knowledge",
      b: "Schwab mails to El Paso for TX. Or was it Phoenix? The person who knew left six months ago.",
    },
  ];
  return (
    <SectionShell
      id="product"
      eyebrow="The problem"
      centered
      title={
        <>
          Rollover ops <em style={{ fontStyle: "italic", color: T.accent }}>shouldn&rsquo;t live in three places.</em>
        </>
      }
      lead="Most RIA firms run rollovers across an inbox, a spreadsheet, and a custodian-quirks doc that lives in one person's head. It works — until it doesn't."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {items.map((it, i) => (
          <div key={it.h} style={{
            background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 12, padding: "26px 26px 28px",
            position: "relative",
          }}>
            <div style={{
              fontFamily: SERIF, fontSize: 40, color: T.accent, fontWeight: 500,
              opacity: 0.45, position: "absolute", top: 12, right: 20, fontVariantNumeric: "tabular-nums",
            }}>0{i + 1}</div>
            <div style={{ fontFamily: SERIF, fontSize: 23, color: T.text, marginBottom: 10, fontWeight: 500, letterSpacing: -0.3 }}>{it.h}</div>
            <div style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.55 }}>{it.b}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────────── Pipeline section ─────────────────────── */
function PipelineSection() {
  const stages = [
    { k: "Proposal accepted", d: "Client said yes. CRM is updated. Rift creates the case automatically.", c: T.textTertiary },
    { k: "Awaiting client", d: "Forms out. Medallion needed. The case waits — Rift nudges, you don't.", c: T.warning },
    { k: "Ready to submit", d: "All docs in, reviewed. One click hands off to ops.", c: T.info },
    { k: "Submitted", d: "Paperwork is at the custodian. The clock starts.", c: T.violet },
    { k: "Processing", d: "Custodian is working it. Rift tracks SLA against their published times.", c: T.accent },
    { k: "In transit", d: "Assets confirmed moving. Client gets a status email.", c: T.accent },
    { k: "Won", d: "Funded. CRM marked. Advisor and ops both get credit.", c: T.success },
  ];
  return (
    <SectionShell
      id="how-it-works"
      number="01 — The pipeline"
      title={<>Seven stages. <em style={{ fontStyle: "italic", color: T.accent }}>No exceptions.</em></>}
      lead="Every rollover moves through the same seven stages. The two bookends sync with your CRM. The five in the middle are Rift&rsquo;s — and that&rsquo;s where the time used to disappear."
      dark
    >
      <div style={{
        background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14, marginBottom: 28 }}>
          {stages.map((s, i) => (
            <div key={s.k} style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ height: 4, background: s.c, borderRadius: 999, marginBottom: 12 }} />
              <div style={{ fontSize: 10, color: T.textTertiary, fontWeight: 500, letterSpacing: 0.4, textTransform: "uppercase" }}>Stage {i + 1}</div>
              <div style={{ fontFamily: SERIF, fontSize: 18, color: T.text, fontWeight: 500, marginTop: 4, lineHeight: 1.2, letterSpacing: -0.2 }}>{s.k}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 18, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 22 }}>
          {stages.map(s => (
            <div key={s.k} style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>{s.d}</div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────── Client portal feature ─────────────────────── */
function ClientPortalFeature() {
  const items: { i: "check" | "upload" | "shield"; h: string; b: string }[] = [
    { i: "check", h: "Plain-English progress", b: "Five friendly stages, not seven internal ones. They see “We're waiting on one signature” — not “AWAITING_CLIENT_ACTION.”" },
    { i: "upload", h: "Upload, sign, and verify", b: "Drag-and-drop, mobile photo capture, e-signature on standard forms. Everything lands directly on the case." },
    { i: "shield", h: "Secure by default", b: "Magic-link auth, signed S3 URLs, 24-hour link expiry. No client passwords, no client accounts to manage." },
  ];
  return (
    <section id="client-portal" style={{
      padding: "92px 36px",
      borderBottom: `1px solid ${T.border}`,
      background: `
        radial-gradient(800px 420px at 100% 0%, ${T.accentSoft}, transparent 60%),
        radial-gradient(700px 360px at 0% 100%, #efe9d6, transparent 70%),
        ${T.page}
      `,
    }}>
      <div style={{ maxWidth: CONTAINER_W, margin: "0 auto", display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 72, alignItems: "center" }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "4px 11px", borderRadius: 999,
            background: T.accentSoft, color: T.accent,
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
            border: `1px solid ${T.accentBorder}`, marginBottom: 22,
          }}>
            <UsersIcon size={12} /> Client portal
          </div>
          <h3 style={{
            margin: 0, fontFamily: SERIF, fontSize: 60, lineHeight: 1.04, letterSpacing: -1.2,
            color: T.text, fontWeight: 400,
          }}>
            Your client sees<br />
            <em style={{ fontStyle: "italic", color: T.accent }}>exactly where they stand.</em>
          </h3>
          <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.55, color: T.textSecondary, maxWidth: 520 }}>
            A magic-link portal — no password, no app to install. Clients see a friendly version of
            their rollover progress, upload the documents you need, and message you back without
            another email thread.
          </p>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map(x => (
              <div key={x.h} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: T.accentSoft, border: `1px solid ${T.accentBorder}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", color: T.accent,
                }}>
                  {x.i === "check" && <CheckIcon size={16} color={T.accent} />}
                  {x.i === "upload" && <UploadIcon size={16} color={T.accent} />}
                  {x.i === "shield" && <ShieldIcon size={16} color={T.accent} />}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: T.text, marginBottom: 4, letterSpacing: -0.1 }}>{x.h}</div>
                  <div style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.5 }}>{x.b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ClientPortalMock />
      </div>
    </section>
  );
}

function ClientPortalMock() {
  const stages: { l: string; done?: boolean; active?: boolean }[] = [
    { l: "Started", done: true },
    { l: "Your turn", active: true },
    { l: "In review" },
    { l: "Submitted" },
    { l: "Funded" },
  ];
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        background: T.surface1, border: `1px solid ${T.border}`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 30px 70px -32px rgba(60,40,20,0.28), 0 2px 0 rgba(60,40,20,0.02)",
      }}>
        <BrowserChromeBar />

        <div style={{ padding: "24px 26px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>Your rollover</div>
              <div style={{ fontFamily: SERIF, fontSize: 24, color: T.text, fontWeight: 500, letterSpacing: -0.3, marginTop: 4 }}>Fidelity 401(k) → Schwab IRA</div>
            </div>
            <Avatar name="Sarah Mitchell" size={36} />
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", position: "relative" }}>
              {stages.map((s, i) => (
                <div key={s.l} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  position: "relative", minWidth: 0,
                }}>
                  {i < stages.length - 1 && (
                    <div style={{
                      position: "absolute", left: "50%", right: "-50%", top: 12,
                      height: 2,
                      background: stages[i + 1].done || s.done ? T.success : T.surface3,
                      zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                    background: s.done ? T.success : (s.active ? T.accent : T.surface2),
                    border: `1px solid ${s.done ? T.successBorder : (s.active ? T.accentBorder : T.border)}`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: s.done || s.active ? "#fdfcf7" : T.textTertiary,
                    fontSize: 11, fontWeight: 600, position: "relative", zIndex: 1,
                  }}>
                    {s.done ? <CheckIcon size={13} color="#fdfcf7" /> : i + 1}
                    {s.active && (
                      <span style={{
                        position: "absolute", inset: -5, borderRadius: 999,
                        border: `2px solid ${T.accent}`, opacity: 0.25,
                      }} />
                    )}
                  </div>
                  <div style={{
                    marginTop: 9, textAlign: "center", width: "100%",
                    fontSize: 10.5, color: s.active ? T.accent : T.textTertiary,
                    fontWeight: s.active ? 600 : 500, letterSpacing: 0.3,
                    textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 22, padding: "16px 16px 14px",
            background: T.accentSoft, border: `1px solid ${T.accentBorder}`, borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <WarnIcon size={14} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>Your turn · 1 thing</span>
            </div>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>
              Upload a medallion-signed Letter of Authorization.
            </div>
            <div style={{
              border: `1.5px dashed ${T.accentBorder}`, borderRadius: 8,
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              background: T.surface1,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: T.accent, color: "#fdfcf7",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <UploadIcon size={17} color="#fdfcf7" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Drop the signed PDF here, or take a photo</div>
                <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 2 }}>PDF or JPG · up to 20MB · we&rsquo;ll check it before submitting</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>Messages with Sarah</div>
              <span style={{ fontSize: 11, color: T.success, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: T.success }} /> Replies in ~2h
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <Avatar name="Sarah Mitchell" size={26} />
                <div style={{
                  flex: 1, background: T.surface2, border: `1px solid ${T.border}`,
                  borderRadius: "10px 10px 10px 4px", padding: "9px 12px",
                  fontSize: 13, color: T.text, lineHeight: 1.45,
                }}>
                  Quick one — we got everything except the medallion. Any bank or credit union can stamp it. Most do it free for clients.
                  <div style={{ fontSize: 10.5, color: T.textTertiary, marginTop: 6 }}>Sarah · yesterday</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start", flexDirection: "row-reverse" }}>
                <Avatar name="Margaret Chen" size={26} />
                <div style={{
                  background: T.text, color: "#fdfcf7",
                  borderRadius: "10px 10px 4px 10px", padding: "9px 12px",
                  fontSize: 13, lineHeight: 1.45, maxWidth: "75%",
                }}>
                  Got it stamped this morning. Uploading now — thanks!
                  <div style={{ fontSize: 10.5, color: "rgba(253,252,247,0.55)", marginTop: 6 }}>You · just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserChromeBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
      <div style={{ display: "flex", gap: 5 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e0c7b8" }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e6dcc4" }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#cfd9c4" }} />
      </div>
      <div style={{
        flex: 1, height: 22, background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 5,
        display: "flex", alignItems: "center", paddingLeft: 9, gap: 6,
      }}>
        <ShieldIcon size={11} color={T.success} />
        <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: "ui-monospace, monospace" }}>rift.app/client/margaret-c…</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Cases / Intel / Workload features ─────────────────────── */
function FeatureSection() {
  const features: { eyebrow: string; title: React.ReactNode; body: React.ReactNode; mock: React.ReactNode; reverse: boolean }[] = [
    {
      eyebrow: "Cases",
      title: "Everything about a rollover, on one page.",
      body: "Source, destination, account type, assignees, checklist, tasks, documents, notes, full audit log — no tab-switching, no “who’s got the latest version” guessing.",
      mock: <CaseMock />,
      reverse: false,
    },
    {
      eyebrow: "Custodian Intelligence",
      title: <>An expert on every custodian, <em style={{ fontStyle: "italic", color: T.accent }}>on call.</em></>,
      body: "Ask in plain English — “What’s Schwab’s medallion policy for an IRA rollover under $50k from Texas?” Rift pulls from the central directory plus your firm’s own notes. The answer comes with citations.",
      mock: <IntelMock />,
      reverse: true,
    },
    {
      eyebrow: "Team workload",
      title: "See who's drowning before they tell you.",
      body: "Admin dashboards surface workload by advisor and ops, stalled cases, SLA breaches, and pipeline conversion. Make assignment decisions on data, not vibes.",
      mock: <WorkloadMock />,
      reverse: false,
    },
  ];
  return (
    <>
      {features.map((f, i) => (
        <section key={f.eyebrow} style={{
          padding: "92px 36px",
          background: i % 2 ? T.page : T.surface2,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{
            maxWidth: CONTAINER_W, margin: "0 auto",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center",
            direction: f.reverse ? "rtl" : "ltr",
          }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: T.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>{f.eyebrow}</div>
              <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 44, lineHeight: 1.08, letterSpacing: -0.8, color: T.text, fontWeight: 400 }}>{f.title}</h3>
              <p style={{ marginTop: 18, fontSize: 16, lineHeight: 1.55, color: T.textSecondary, maxWidth: 480 }}>{f.body}</p>
              <a href={DEMO_MAILTO} style={{
                marginTop: 22, display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 13.5, fontWeight: 600, color: T.accent, textDecoration: "none",
              }}>Take the tour <ArrowIcon size={13} /></a>
            </div>
            <div style={{ direction: "ltr" }}>{f.mock}</div>
          </div>
        </section>
      ))}
    </>
  );
}

function CaseMock() {
  const meta = [
    { l: "Source", v: "Fidelity 401(k)" },
    { l: "Destination", v: "Schwab IRA" },
    { l: "Account", v: "Traditional IRA" },
    { l: "Value", v: "$412,840" },
  ];
  const checks: { d: boolean; t: string; w?: boolean }[] = [
    { d: true, t: "Account statement (most recent)" },
    { d: true, t: "Distribution form, signed" },
    { d: false, t: "Medallion signature guarantee", w: true },
  ];
  return (
    <div style={{
      background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22,
      boxShadow: "0 18px 50px -28px rgba(60,40,20,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: T.text, letterSpacing: -0.3 }}>Margaret Chen</div>
          <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2 }}>margaret.chen@email.com · opened 8d ago</div>
        </div>
        <Pill hue="amber" dot>Awaiting client</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        {meta.map(x => (
          <div key={x.l}>
            <div style={{ fontSize: 10, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>{x.l}</div>
            <div style={{ fontSize: 13.5, color: T.text, marginTop: 3, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{x.v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 11, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginBottom: 10 }}>Checklist · 6 of 9</div>
        <div style={{ height: 6, background: T.surface3, borderRadius: 999, overflow: "hidden", display: "flex" }}>
          <span style={{ flex: 6, background: T.success }} />
          <span style={{ flex: 1, background: T.warning }} />
          <span style={{ flex: 2, background: T.surface3 }} />
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{
                width: 16, height: 16, borderRadius: 4, border: `1px solid ${c.d ? T.success : T.border}`,
                background: c.d ? T.successSoft : (c.w ? T.warningSoft : T.surface1),
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {c.d && <CheckIcon size={10} color={T.success} />}
                {c.w && <WarnIcon size={10} color={T.warning} />}
              </span>
              <span style={{ color: c.d ? T.textTertiary : T.text, textDecoration: c.d ? "line-through" : "none" }}>{c.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntelMock() {
  return (
    <div style={{
      background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18,
      boxShadow: "0 18px 50px -28px rgba(60,40,20,0.2)",
    }}>
      <div style={{
        padding: "12px 14px", background: T.surface2, borderRadius: 8, border: `1px solid ${T.border}`,
        fontSize: 13, color: T.text, lineHeight: 1.5,
      }}>
        What&rsquo;s Schwab&rsquo;s medallion policy for an IRA-to-IRA rollover under $50k from Texas?
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 10 }}>
        <Pill hue="coral" small dot>search_custodians(&quot;Schwab&quot;)</Pill>
        <span style={{ fontSize: 11, color: T.textTertiary }}>1 result · 248ms</span>
      </div>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
        For IRA-to-IRA rollovers, Schwab waives medallion under $250k <span style={{ color: T.textTertiary }}>(per their published custodian guide)</span>.
        Texas clients mail to the <b>El Paso</b> processing center — not Omaha. Typical processing time is 3–5 business days once received.
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T.textTertiary }}>Sources:</span>
        <Pill hue="slate" small>Schwab custodian profile</Pill>
        <Pill hue="slate" small>Firm note · pinned by Sarah M.</Pill>
      </div>
    </div>
  );
}

function WorkloadMock() {
  const rows = [
    { n: "Sarah Mitchell", open: 14, bars: [4, 3, 2, 3, 2] },
    { n: "Marcus Lee", open: 11, bars: [3, 4, 1, 2, 1] },
    { n: "Priya Iyer", open: 9, bars: [2, 2, 2, 2, 1] },
    { n: "Daniel Park", open: 6, bars: [1, 2, 1, 1, 1] },
  ];
  const maxN = Math.max(...rows.map(r => r.open));
  const stageColors = [T.textTertiary, T.warning, T.info, T.violet, T.success];
  return (
    <div style={{
      background: T.surface1, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22,
      boxShadow: "0 18px 50px -28px rgba(60,40,20,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 500, color: T.text, letterSpacing: -0.3 }}>Advisor workload</div>
        <span style={{ fontSize: 11, color: T.textTertiary }}>Last 30 days</span>
      </div>
      {rows.map(r => (
        <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.borderSoft}` }}>
          <Avatar name={r.n} size={26} />
          <div style={{ width: 130, fontSize: 12.5, color: T.text, fontWeight: 500 }}>{r.n}</div>
          <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: T.surface2, border: `1px solid ${T.border}` }}>
            {r.bars.map((b, i) => (
              <span key={i} style={{ flex: b / maxN, background: stageColors[i] }} />
            ))}
          </div>
          <div style={{ width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 600, color: T.text }}>{r.open}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── Stats strip ─────────────────────── */
function StatsStrip() {
  const stats = [
    { v: "23d", l: "Average cycle time — down from 41" },
    { v: "94%", l: "Win rate on cases that reach Ready" },
    { v: "0", l: "Clients lost to “we forgot to follow up”" },
    { v: "$148M", l: "AUM moved through Rift in Q1 alone" },
  ];
  return (
    <section style={{ padding: "68px 36px", background: T.text, color: "#fdfcf7", borderBottom: `1px solid ${T.text}` }}>
      <div style={{ maxWidth: CONTAINER_W, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {stats.map(s => (
          <div key={s.l}>
            <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 400, letterSpacing: -1.5, lineHeight: 1, color: "#fdfcf7" }}>{s.v}</div>
            <div style={{ marginTop: 12, fontSize: 13.5, color: "rgba(253,252,247,0.7)", lineHeight: 1.45, maxWidth: 220 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── Quote ─────────────────────── */
function QuoteSection() {
  return (
    <section id="customers" style={{ padding: "92px 36px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "left" }}>
        <div style={{ fontFamily: SERIF, fontSize: 90, color: T.accent, fontWeight: 400, lineHeight: 0.6, marginBottom: 8 }}>&ldquo;</div>
        <blockquote style={{
          margin: 0, fontFamily: SERIF, fontSize: 44, lineHeight: 1.18,
          letterSpacing: -0.6, color: T.text, fontWeight: 400,
        }}>
          We went from a 14-tab spreadsheet to one screen. The medallion that used to get
          forgotten <em style={{ fontStyle: "italic", color: T.accent }}>twice a quarter</em> hasn&rsquo;t been missed since.
        </blockquote>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
          <Avatar name="Helena Brewer" size={44} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Helena Brewer</div>
            <div style={{ fontSize: 12.5, color: T.textTertiary }}>Ops Lead · Northgate Wealth Partners · 18 advisors</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Pricing ─────────────────────── */
function PricingSection() {
  const tiers: {
    n: string; p: string; pu: string; lead: string;
    cta: { l: string; primary: boolean; href: string };
    featured?: boolean; feats: string[];
  }[] = [
    {
      n: "Starter",
      p: "$240",
      pu: "/seat/mo",
      lead: "For independent advisors and small ops teams.",
      cta: { l: "Start free trial", primary: false, href: DEMO_MAILTO },
      feats: [
        "Unlimited cases & checklists",
        "Wealthbox sync",
        "Custodian directory (read-only)",
        "Email support",
      ],
    },
    {
      n: "Pro",
      p: "$390",
      pu: "/seat/mo",
      lead: "For growing RIAs with dedicated ops.",
      cta: { l: "Start free trial", primary: true, href: DEMO_MAILTO },
      featured: true,
      feats: [
        "Everything in Starter",
        "Custodian Intelligence (AI)",
        "Firm-authored custodian notes",
        "Salesforce sync",
        "Workload analytics",
        "Priority support",
      ],
    },
    {
      n: "Firm",
      p: "Custom",
      pu: "",
      lead: "For multi-office firms with custom workflows.",
      cta: { l: "Talk to founders", primary: false, href: DEMO_MAILTO },
      feats: [
        "Everything in Pro",
        "Custom stage names & rules",
        "SSO + SCIM",
        "Dedicated migration",
        "SLA & DPA",
      ],
    },
  ];
  return (
    <SectionShell
      id="pricing"
      eyebrow="Pricing"
      centered
      title={<>Priced per seat. <em style={{ fontStyle: "italic", color: T.accent }}>No per-case fees.</em></>}
      lead="Rift charges by who&rsquo;s using it, not how much they&rsquo;re moving. Move a million dollars or a hundred — the price is the same."
      dark
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {tiers.map(t => (
          <div key={t.n} style={{
            background: t.featured ? T.text : T.surface1,
            color: t.featured ? "#fdfcf7" : T.text,
            border: `1px solid ${t.featured ? T.text : T.border}`,
            borderRadius: 14, padding: "28px 26px 26px",
            position: "relative", display: "flex", flexDirection: "column",
          }}>
            {t.featured && (
              <div style={{
                position: "absolute", top: -10, left: 26,
                padding: "3px 10px", background: T.accent, color: "#fdfcf7",
                borderRadius: 999, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase",
              }}>Most popular</div>
            )}
            <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, letterSpacing: -0.4 }}>{t.n}</div>
            <div style={{ fontSize: 13, color: t.featured ? "rgba(253,252,247,0.7)" : T.textTertiary, marginTop: 4, lineHeight: 1.45 }}>{t.lead}</div>
            <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: SERIF, fontSize: 50, fontWeight: 500, letterSpacing: -1, lineHeight: 1 }}>{t.p}</span>
              {t.pu && <span style={{ fontSize: 13, color: t.featured ? "rgba(253,252,247,0.6)" : T.textTertiary }}>{t.pu}</span>}
            </div>
            <div style={{
              marginTop: 22, paddingTop: 22,
              borderTop: `1px solid ${t.featured ? "rgba(253,252,247,0.15)" : T.border}`,
              display: "flex", flexDirection: "column", gap: 10, flex: 1,
            }}>
              {t.feats.map(f => (
                <div key={f} style={{
                  display: "flex", gap: 9, alignItems: "flex-start",
                  fontSize: 13, lineHeight: 1.45,
                  color: t.featured ? "rgba(253,252,247,0.9)" : T.textSecondary,
                }}>
                  <CheckIcon size={14} color={t.featured ? T.accent : T.success} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              {t.cta.primary ? (
                <PrimaryButton href={t.cta.href} style={{ width: "100%", justifyContent: "center", height: 40, fontSize: 14 }}>
                  {t.cta.l}
                </PrimaryButton>
              ) : (
                <a
                  href={t.cta.href}
                  className={t.featured ? "rift-btn rift-btn-on-dark" : "rift-btn rift-pricing-cta-secondary"}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "100%", height: 40, borderRadius: 7,
                    fontSize: 14, fontWeight: 500, textDecoration: "none",
                  }}
                >
                  {t.cta.l}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────────── Closing CTA ─────────────────────── */
function ClosingCta() {
  return (
    <section style={{
      padding: "92px 36px",
      background: `
        radial-gradient(700px 360px at 100% 0%, ${T.accentSoft}, transparent 60%),
        radial-gradient(600px 340px at 0% 100%, #efe9d6, transparent 70%),
        ${T.page}
      `,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          margin: 0, fontFamily: SERIF, fontSize: 64, fontWeight: 400,
          letterSpacing: -1.4, lineHeight: 1.04, color: T.text,
        }}>
          Replace the spreadsheet.<br />
          <em style={{ fontStyle: "italic", color: T.accent }}>Keep the team.</em>
        </h2>
        <p style={{ marginTop: 22, fontSize: 17, color: T.textSecondary, lineHeight: 1.55, maxWidth: 560, margin: "22px auto 0" }}>
          Most firms are running on Rift inside a week. Bring your custodian list — we&rsquo;ll migrate the rest.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <PrimaryButton href={DEMO_MAILTO} style={{ height: 42, padding: "0 22px", fontSize: 14 }}>
            Book a 20-min demo <ArrowIcon size={13} />
          </PrimaryButton>
          <SecondaryButton href={DEMO_MAILTO} style={{ height: 42, padding: "0 18px", fontSize: 14 }}>
            Start free 14-day trial
          </SecondaryButton>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Footer ─────────────────────── */
function Footer() {
  const cols = [
    { h: "Product", links: ["Cases", "Custodian Intelligence", "Team workload", "Integrations", "Roadmap"] },
    { h: "Resources", links: ["RIA rollover guide", "Custodian directory", "Changelog", "Status"] },
    { h: "Company", links: ["About", "Founders", "Careers", "Press"] },
    { h: "Legal", links: ["Privacy", "Terms", "DPA", "Subprocessors"] },
  ];
  return (
    <footer style={{ padding: "56px 36px 32px", background: T.surface2 }}>
      <div style={{ maxWidth: CONTAINER_W, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 36 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <RiftMark size={22} />
            <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: -0.3 }}>Rift</span>
          </div>
          <p style={{ marginTop: 14, fontSize: 13, color: T.textSecondary, lineHeight: 1.55, maxWidth: 280 }}>
            Rollover case management for independent RIAs. Built by ops people who got tired of the spreadsheet.
          </p>
          <div style={{ marginTop: 16, fontSize: 11.5, color: T.textTertiary }}>© {new Date().getFullYear()} Rift Software, Inc.</div>
        </div>
        {cols.map(c => (
          <div key={c.h}>
            <div style={{ fontSize: 11, fontWeight: 500, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{c.h}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {c.links.map(l => (
                <a key={l} href="#" className="rift-footer-link" style={{ fontSize: 13, textDecoration: "none" }}>{l}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}

/* ─────────────────────── Pills + Avatar ─────────────────────── */
type PillHue = "slate" | "blue" | "green" | "amber" | "red" | "violet" | "coral";

const PILL_HUES: Record<PillHue, { fg: string; bg: string; line: string; dot: string }> = {
  slate: { fg: T.textSecondary, bg: T.surface2, line: T.border, dot: T.textTertiary },
  blue: { fg: T.info, bg: T.infoSoft, line: T.infoBorder, dot: T.info },
  green: { fg: T.success, bg: T.successSoft, line: T.successBorder, dot: T.success },
  amber: { fg: T.warning, bg: T.warningSoft, line: T.warningBorder, dot: T.warning },
  red: { fg: "#a13a26", bg: "#f4dccf", line: "#e7b9a3", dot: "#a13a26" },
  violet: { fg: T.violet, bg: T.violetSoft, line: T.violetBorder, dot: T.violet },
  coral: { fg: T.accent, bg: T.accentSoft, line: T.accentBorder, dot: T.accent },
};

function Pill({ children, hue = "slate", dot, small }: { children: React.ReactNode; hue?: PillHue; dot?: boolean; small?: boolean }) {
  const c = PILL_HUES[hue];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: small ? "1px 7px" : "2px 9px", borderRadius: 999,
      fontSize: small ? 10.5 : 11, fontWeight: 500,
      color: c.fg, background: c.bg, border: `1px solid ${c.line}`,
      lineHeight: 1.5,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c.dot, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["#c96442", "#8a6418", "#5d4a86", "#2f5a8a", "#3a6b3e", "#a13a26", "#7d6336"];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const bg = avatarColor(name);
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fdfcf7",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.42), fontWeight: 600,
      flexShrink: 0, border: `1.5px solid ${T.surface1}`,
      letterSpacing: 0.2, overflow: "hidden",
    }}>{initials || "?"}</div>
  );
}

/* ─────────────────────── Icons ─────────────────────── */
type IconProps = { size?: number; color?: string };

function iconBase(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function ArrowIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function CheckIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
function UploadIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <path d="M12 4v12M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}
function ShieldIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}
function UsersIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M22 18c0-2.5-2-4-5-4" />
    </svg>
  );
}
function WarnIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.01" />
    </svg>
  );
}
function SearchIcon({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg {...iconBase(size, color)}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}
