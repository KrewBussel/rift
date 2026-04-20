// Design 1 — "Operational Control Room"
// Dark, dense, terminal-inspired. Product-first. Shows live pipeline as hero.
// Target: ops-person-first. "This is what your day looks like in Rift."

const D1 = {
  bg:        '#0a0b0d',        // near-black cool
  surface:   '#111316',
  surface2:  '#1a1d21',
  line:      '#24272c',
  lineBold:  '#35393f',
  text:      '#e8eaec',
  textDim:   '#8a8f96',
  textDimmer:'#5a5e64',
  accent:    '#d4ff4a',        // electric lime — "active / moving"
  accentDim: '#8fa830',
  warn:      '#ff9b5c',        // soft orange — "needs attention"
  ok:        '#7cb87c',
  mono:      '"JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, monospace',
  sans:      '"Inter", -apple-system, system-ui, sans-serif',
};

function D1Landing() {
  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      background: D1.bg,
      color: D1.text,
      fontFamily: D1.sans,
      fontFeatureSettings: '"ss01", "cv11"',
    }}>
      <D1Nav />
      <D1Hero />
      <D1Strip />
      <D1Pipeline />
      <D1Features />
      <D1Workflow />
      <D1Quote />
      <D1CTA />
      <D1Footer />
    </div>
  );
}

// ── Nav ─────────────────────────────────────────────────────────
function D1Nav() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 48px', borderBottom: `1px solid ${D1.line}`,
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(10,11,13,0.85)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <D1Wordmark />
        <div style={{ display: 'flex', gap: 26, fontSize: 13, color: D1.textDim }}>
          {['Product', 'Workflow', 'Pricing', 'Changelog', 'Docs'].map(x => (
            <span key={x} style={{ cursor: 'pointer' }}>{x}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          fontFamily: D1.mono, fontSize: 11, color: D1.textDim,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: D1.accent,
            boxShadow: `0 0 8px ${D1.accent}`,
          }}/>
          v2.4 · all systems operational
        </div>
        <div style={{ width: 1, height: 18, background: D1.line }} />
        <button style={{
          background: 'transparent', border: 'none', color: D1.text,
          fontSize: 13, cursor: 'pointer', padding: '8px 14px',
        }}>Sign in</button>
        <button style={{
          background: D1.accent, color: D1.bg, border: 'none',
          padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: D1.sans,
        }}>Book a walkthrough →</button>
      </div>
    </div>
  );
}

function D1Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <rect x="1" y="1" width="20" height="20" rx="4" fill="none" stroke={D1.accent} strokeWidth="1.5"/>
        <path d="M6 7 L6 15 M10 7 L10 15 M14 11 L14 15 M18 7 L18 15"
              stroke={D1.accent} strokeWidth="1.5" strokeLinecap="square" fill="none"/>
      </svg>
      <span style={{
        fontFamily: D1.mono, fontSize: 14, fontWeight: 600,
        letterSpacing: '-0.01em', color: D1.text,
      }}>rift<span style={{ color: D1.accent }}>.</span>ops</span>
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────
function D1Hero() {
  return (
    <div style={{ padding: '72px 48px 56px', position: 'relative' }}>
      {/* Corner meta */}
      <div style={{
        position: 'absolute', top: 24, right: 48,
        fontFamily: D1.mono, fontSize: 10, color: D1.textDimmer,
        textAlign: 'right', lineHeight: 1.7,
      }}>
        LAT 40.7128°N<br/>
        LNG 74.0060°W<br/>
        {new Date().toISOString().slice(0,10).replace(/-/g,'.')} · 14:32:07 ET
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '5px 12px 5px 10px',
        border: `1px solid ${D1.line}`,
        borderRadius: 999, fontSize: 11, color: D1.textDim,
        fontFamily: D1.mono, marginBottom: 28,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%', background: D1.accent,
        }}/>
        BUILT FOR RIA OPS · PHASE 1 FIRMS WELCOME
      </div>

      <h1 style={{
        fontSize: 76, fontWeight: 500, lineHeight: 0.98,
        letterSpacing: '-0.035em', margin: 0,
        maxWidth: 1000,
      }}>
        The rollover desk,<br/>
        <span style={{ fontStyle: 'italic', fontWeight: 400 }}>run like a control room.</span>
      </h1>

      <p style={{
        marginTop: 28, fontSize: 17, lineHeight: 1.55, color: D1.textDim,
        maxWidth: 560,
      }}>
        Every 401(k) rollover your firm touches — intake, forms, custodian submission,
        confirmation — tracked in one pipeline your ops and advisors share. No more
        shared spreadsheets. No more "what stage is this in?"
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 36, alignItems: 'center' }}>
        <button style={{
          background: D1.accent, color: D1.bg, border: 'none',
          padding: '13px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: D1.sans,
        }}>Start tracking cases →</button>
        <button style={{
          background: 'transparent', color: D1.text,
          border: `1px solid ${D1.lineBold}`,
          padding: '13px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: D1.sans,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="2,1 10,6 2,11" fill={D1.text}/></svg>
          Watch 2-minute tour
        </button>
        <div style={{
          marginLeft: 10, fontFamily: D1.mono, fontSize: 11, color: D1.textDimmer,
        }}>
          Free during pilot · SOC-2 roadmap
        </div>
      </div>
    </div>
  );
}

// ── Trusted strip ───────────────────────────────────────────────
function D1Strip() {
  const firms = ['APEX WEALTH', 'SUMMIT CAPITAL', 'HARBOR FINANCIAL',
                 'MERIDIAN', 'CORNERSTONE', 'CLEARWATER', 'BLUESKY'];
  return (
    <div style={{
      borderTop: `1px solid ${D1.line}`,
      borderBottom: `1px solid ${D1.line}`,
      padding: '18px 48px',
      display: 'flex', alignItems: 'center', gap: 40,
      fontFamily: D1.mono, fontSize: 11, color: D1.textDimmer,
      overflow: 'hidden',
    }}>
      <div style={{ flexShrink: 0 }}>PILOTING WITH →</div>
      <div style={{ display: 'flex', gap: 40, flex: 1 }}>
        {firms.map((f, i) => (
          <span key={i} style={{
            letterSpacing: '0.12em', color: i === 2 ? D1.text : D1.textDimmer,
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline showcase ───────────────────────────────────────────
function D1Pipeline() {
  const stages = [
    { k: 'INTAKE',     n: 3,  active: false },
    { k: 'AWAITING',   n: 7,  active: false },
    { k: 'READY',      n: 2,  active: false },
    { k: 'SUBMITTED',  n: 5,  active: true  },
    { k: 'PROCESSING', n: 4,  active: false },
    { k: 'TRANSIT',    n: 1,  active: false },
    { k: 'CLOSED',     n: 12, active: false },
  ];
  const cases = [
    { id: 'RFT-2891', client: 'S. Mitchell',  from: 'Fidelity 401(k)', to: 'Schwab IRA',   owner: 'KM', days: 2, stage: 3, flag: null },
    { id: 'RFT-2890', client: 'J. Carter',    from: 'Voya 403(b)',     to: 'Vanguard IRA', owner: 'PS', days: 5, stage: 3, flag: 'STALE' },
    { id: 'RFT-2887', client: 'R. Patel',     from: 'Empower 401(k)',  to: 'Fidelity IRA', owner: 'KM', days: 1, stage: 3, flag: null },
    { id: 'RFT-2884', client: 'A. Lindqvist', from: 'Principal 401(k)',to: 'Schwab IRA',   owner: 'JC', days: 3, stage: 3, flag: 'NIGO' },
    { id: 'RFT-2881', client: 'M. Okafor',    from: 'ADP 401(k)',      to: 'Altruist IRA', owner: 'PS', days: 2, stage: 3, flag: null },
  ];
  return (
    <div style={{ padding: '56px 48px' }}>
      <D1SectionLabel n="01" kicker="LIVE VIEW" title="Your entire rollover desk, in one pipeline." />

      <div style={{
        background: D1.surface,
        border: `1px solid ${D1.line}`,
        borderRadius: 12, marginTop: 36,
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px',
          borderBottom: `1px solid ${D1.line}`,
          fontFamily: D1.mono, fontSize: 11, color: D1.textDim,
        }}>
          <span style={{ color: D1.text }}>~/pipeline</span>
          <span style={{ color: D1.textDimmer }}>·</span>
          <span>34 active cases</span>
          <span style={{ color: D1.textDimmer }}>·</span>
          <span>3 flagged</span>
          <div style={{ flex: 1 }} />
          <D1Pill>all owners</D1Pill>
          <D1Pill>march 2026</D1Pill>
          <D1Pill accent>+ new case</D1Pill>
        </div>

        {/* Stage rail */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
          borderBottom: `1px solid ${D1.line}`,
        }}>
          {stages.map((s, i) => (
            <div key={s.k} style={{
              padding: '16px 14px',
              borderRight: i < stages.length - 1 ? `1px solid ${D1.line}` : 'none',
              background: s.active ? 'rgba(212,255,74,0.04)' : 'transparent',
              position: 'relative',
            }}>
              {s.active && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: D1.accent, boxShadow: `0 0 10px ${D1.accent}`,
                }}/>
              )}
              <div style={{
                fontFamily: D1.mono, fontSize: 10, color: s.active ? D1.accent : D1.textDim,
                letterSpacing: '0.08em',
              }}>{s.k}</div>
              <div style={{
                fontSize: 28, fontWeight: 500, marginTop: 4,
                color: s.active ? D1.text : D1.textDim,
                letterSpacing: '-0.02em',
              }}>{s.n}</div>
            </div>
          ))}
        </div>

        {/* Case rows */}
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 1.2fr 1.6fr 60px 70px 80px 40px',
            padding: '10px 20px', borderBottom: `1px solid ${D1.line}`,
            fontFamily: D1.mono, fontSize: 10, color: D1.textDimmer,
            letterSpacing: '0.06em',
          }}>
            <span>CASE</span>
            <span>CLIENT</span>
            <span>SOURCE → DEST</span>
            <span>OWNER</span>
            <span>IN STAGE</span>
            <span>FLAG</span>
            <span></span>
          </div>
          {cases.map((c, i) => (
            <div key={c.id} style={{
              display: 'grid',
              gridTemplateColumns: '90px 1.2fr 1.6fr 60px 70px 80px 40px',
              padding: '14px 20px',
              borderBottom: i < cases.length - 1 ? `1px solid ${D1.line}` : 'none',
              alignItems: 'center', fontSize: 13,
              background: i === 0 ? 'rgba(212,255,74,0.03)' : 'transparent',
            }}>
              <span style={{ fontFamily: D1.mono, color: D1.textDim, fontSize: 11 }}>{c.id}</span>
              <span>{c.client}</span>
              <span style={{ color: D1.textDim, fontSize: 12 }}>
                {c.from} <span style={{ color: D1.textDimmer }}>→</span> {c.to}
              </span>
              <span>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: D1.surface2, border: `1px solid ${D1.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontFamily: D1.mono, color: D1.text,
                }}>{c.owner}</div>
              </span>
              <span style={{ fontFamily: D1.mono, fontSize: 11, color: c.days >= 5 ? D1.warn : D1.textDim }}>
                {c.days}d
              </span>
              <span>
                {c.flag && (
                  <span style={{
                    fontFamily: D1.mono, fontSize: 9, fontWeight: 600,
                    padding: '3px 7px', borderRadius: 3,
                    background: c.flag === 'STALE' ? 'rgba(255,155,92,0.12)' : 'rgba(255,155,92,0.2)',
                    color: D1.warn, border: `1px solid ${c.flag === 'STALE' ? 'rgba(255,155,92,0.25)' : 'rgba(255,155,92,0.4)'}`,
                  }}>{c.flag}</span>
                )}
              </span>
              <span style={{ color: D1.textDimmer, fontFamily: D1.mono, fontSize: 11 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mini annotations */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        marginTop: 36, fontSize: 13, color: D1.textDim,
      }}>
        {[
          ['Stage counts tick live', 'As you change a status, the rail above updates instantly across every teammate\'s screen.'],
          ['Flags that don\'t hide', 'STALE · NIGO · missing docs surface at the row level — you see them without filtering.'],
          ['Search that knows your desk', 'Fuzzy search on client, custodian, provider, or RFT-ID from anywhere in the app.'],
        ].map(([t, d]) => (
          <div key={t}>
            <div style={{
              fontFamily: D1.mono, fontSize: 10, color: D1.accent,
              letterSpacing: '0.08em', marginBottom: 8,
            }}>→ {t.toUpperCase()}</div>
            <div style={{ lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function D1Pill({ children, accent }) {
  return (
    <span style={{
      fontFamily: D1.mono, fontSize: 11,
      padding: '5px 10px', borderRadius: 4,
      border: `1px solid ${accent ? D1.accent : D1.lineBold}`,
      color: accent ? D1.accent : D1.textDim,
      background: accent ? 'rgba(212,255,74,0.08)' : 'transparent',
    }}>{children}</span>
  );
}

function D1SectionLabel({ n, kicker, title }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: D1.mono, fontSize: 11, color: D1.textDim,
      }}>
        <span style={{ color: D1.accent }}>{n}</span>
        <span style={{ width: 30, height: 1, background: D1.line }}/>
        <span style={{ letterSpacing: '0.08em' }}>{kicker}</span>
      </div>
      <h2 style={{
        fontSize: 42, fontWeight: 500, letterSpacing: '-0.025em',
        lineHeight: 1.05, margin: '16px 0 0', maxWidth: 700,
      }}>{title}</h2>
    </div>
  );
}

// ── Feature grid ────────────────────────────────────────────────
function D1Features() {
  const feats = [
    {
      k: 'CHECKLIST',
      t: 'Per-case document checklists',
      d: 'Every new rollover inherits the required-form checklist for that provider and account type. Requested · Received · Reviewed · Complete.',
      viz: <D1FVizChecklist />,
    },
    {
      k: 'TASKS',
      t: 'Work queue, not a to-do app',
      d: 'Open tasks pin to the top of each case. Overdue items fire email reminders before clients have to chase you.',
      viz: <D1FVizTasks />,
    },
    {
      k: 'AUDIT',
      t: 'Every keystroke, timestamped',
      d: 'Status changes, notes, uploads, owner reassignments — all append-only, all stamped with actor and UTC time.',
      viz: <D1FVizAudit />,
    },
    {
      k: 'CLIENT',
      t: 'Client touchpoint, not a portal',
      d: 'A magic-link page where clients upload what you asked for. No balance data. No confusion about who owns status.',
      viz: <D1FVizClient />,
    },
  ];
  return (
    <div style={{ padding: '56px 48px', borderTop: `1px solid ${D1.line}` }}>
      <D1SectionLabel n="02" kicker="THE MODULES" title="Four things a rollover desk actually needs." />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 36,
      }}>
        {feats.map((f) => (
          <div key={f.k} style={{
            background: D1.surface, border: `1px solid ${D1.line}`,
            borderRadius: 12, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
            minHeight: 320,
          }}>
            <div>
              <div style={{
                fontFamily: D1.mono, fontSize: 10, color: D1.accent,
                letterSpacing: '0.1em', marginBottom: 10,
              }}>{f.k}</div>
              <div style={{
                fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
                lineHeight: 1.15, marginBottom: 10,
              }}>{f.t}</div>
              <div style={{ color: D1.textDim, fontSize: 14, lineHeight: 1.55 }}>{f.d}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              {f.viz}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function D1FVizChecklist() {
  const items = [
    ['Distribution form',        'COMPLETE'],
    ['Letter of authorization',  'COMPLETE'],
    ['ID verification',          'RECEIVED'],
    ['Medallion signature',      'REQUESTED'],
    ['Internal review',          'NOT STARTED'],
  ];
  const color = (s) =>
    s === 'COMPLETE' ? D1.accent :
    s === 'RECEIVED' ? D1.ok :
    s === 'REQUESTED'? D1.warn : D1.textDimmer;
  return (
    <div style={{
      width: '100%', fontFamily: D1.mono, fontSize: 11,
      background: D1.bg, border: `1px solid ${D1.line}`, borderRadius: 6,
      padding: 14,
    }}>
      {items.map(([t, s], i) => (
        <div key={t} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${D1.line}` : 'none',
        }}>
          <span style={{
            width: 12, height: 12, borderRadius: 2,
            border: `1.5px solid ${color(s)}`,
            background: s === 'COMPLETE' ? D1.accent : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {s === 'COMPLETE' && (
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M1 4 L3 6 L7 2" stroke={D1.bg} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span style={{ flex: 1, color: D1.text, fontFamily: D1.sans, fontSize: 12 }}>{t}</span>
          <span style={{ color: color(s), fontSize: 9, letterSpacing: '0.06em' }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function D1FVizTasks() {
  const tasks = [
    { t: 'Request signed LOA from client',  due: 'today',   owner: 'KM', done: false, overdue: false },
    { t: 'Confirm receipt with Schwab ops', due: 'mar 24',  owner: 'PS', done: false, overdue: true },
    { t: 'Upload ID scan',                   due: 'mar 20',  owner: 'KM', done: true,  overdue: false },
  ];
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tasks.map((t, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: t.overdue ? 'rgba(255,155,92,0.06)' : D1.bg,
          border: `1px solid ${t.overdue ? 'rgba(255,155,92,0.3)' : D1.line}`,
          borderRadius: 6,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: t.done ? D1.accent : 'transparent',
            border: `1.5px solid ${t.done ? D1.accent : D1.lineBold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {t.done && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4 L3 6 L7 2" stroke={D1.bg} strokeWidth="1.5" fill="none"/></svg>}
          </div>
          <span style={{
            flex: 1, fontSize: 12,
            textDecoration: t.done ? 'line-through' : 'none',
            color: t.done ? D1.textDimmer : D1.text,
          }}>{t.t}</span>
          <span style={{
            fontFamily: D1.mono, fontSize: 10,
            color: t.overdue ? D1.warn : D1.textDim,
          }}>{t.due}</span>
          <span style={{
            fontFamily: D1.mono, fontSize: 9,
            color: D1.textDim, padding: '2px 5px',
            border: `1px solid ${D1.line}`, borderRadius: 3,
          }}>{t.owner}</span>
        </div>
      ))}
    </div>
  );
}

function D1FVizAudit() {
  const ev = [
    ['14:32:07', 'status → processing',         'k.mitchell'],
    ['14:28:55', 'note added',                  'k.mitchell'],
    ['11:02:14', 'uploaded: LOA_signed.pdf',    'client'],
    ['09:15:42', 'checklist: ID received',      'p.sharma'],
    ['mar 20',   'owner → k.mitchell',          'system'],
  ];
  return (
    <div style={{
      width: '100%', fontFamily: D1.mono, fontSize: 10,
      background: D1.bg, border: `1px solid ${D1.line}`, borderRadius: 6,
      padding: '10px 12px',
    }}>
      {ev.map(([t, e, a], i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '4px 0',
          color: i === 0 ? D1.text : D1.textDim,
        }}>
          <span style={{ color: i === 0 ? D1.accent : D1.textDimmer, width: 60, flexShrink: 0 }}>{t}</span>
          <span style={{ flex: 1 }}>{e}</span>
          <span style={{ color: D1.textDimmer }}>{a}</span>
        </div>
      ))}
    </div>
  );
}

function D1FVizClient() {
  return (
    <div style={{
      width: '100%', background: D1.bg, border: `1px solid ${D1.line}`,
      borderRadius: 6, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: D1.textDim, marginBottom: 4, fontFamily: D1.mono }}>
        HI SARAH — NEXT STEP
      </div>
      <div style={{ fontSize: 14, color: D1.text, marginBottom: 14, lineHeight: 1.4 }}>
        Upload a signed copy of your distribution form.
      </div>
      <div style={{
        border: `1.5px dashed ${D1.lineBold}`, borderRadius: 6,
        padding: '18px 12px', textAlign: 'center',
        color: D1.textDim, fontSize: 11, fontFamily: D1.mono,
      }}>
        ⌁ DROP PDF HERE · OR CLICK TO BROWSE
      </div>
      <div style={{
        display: 'flex', gap: 6, marginTop: 10,
        fontFamily: D1.mono, fontSize: 10, color: D1.textDimmer,
      }}>
        <span>STEP 2 OF 4</span>
        <span>·</span>
        <span>EST. 2 MIN</span>
      </div>
    </div>
  );
}

// ── Workflow row ────────────────────────────────────────────────
function D1Workflow() {
  const steps = [
    ['Intake', 'Client info, provider, custodian. Checklist auto-generates.'],
    ['Collect', 'Request forms by email or client link. Watch items turn green.'],
    ['Submit', 'Send paperwork to custodian. Mark Submitted in Rift.'],
    ['Close', 'Confirm transfer, export audit summary, archive.'],
  ];
  return (
    <div style={{ padding: '56px 48px', borderTop: `1px solid ${D1.line}` }}>
      <D1SectionLabel n="03" kicker="THE MOTION" title="A case goes from intake to closed in four moves." />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        marginTop: 36, border: `1px solid ${D1.line}`, borderRadius: 10,
        background: D1.surface, overflow: 'hidden',
      }}>
        {steps.map(([t, d], i) => (
          <div key={t} style={{
            padding: '28px 22px',
            borderRight: i < 3 ? `1px solid ${D1.line}` : 'none',
            position: 'relative',
          }}>
            <div style={{
              fontFamily: D1.mono, fontSize: 10, color: D1.accent,
              letterSpacing: '0.1em', marginBottom: 14,
            }}>PHASE · 0{i+1}</div>
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>{t}</div>
            <div style={{ color: D1.textDim, fontSize: 13, lineHeight: 1.55 }}>{d}</div>
            {i < 3 && (
              <div style={{
                position: 'absolute', right: -8, top: '50%',
                width: 16, height: 16, borderRadius: '50%',
                background: D1.surface, border: `1px solid ${D1.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: D1.accent, fontSize: 10, fontFamily: D1.mono,
              }}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quote block ─────────────────────────────────────────────────
function D1Quote() {
  return (
    <div style={{ padding: '72px 48px', borderTop: `1px solid ${D1.line}` }}>
      <div style={{ maxWidth: 820 }}>
        <div style={{
          fontFamily: D1.mono, fontSize: 11, color: D1.accent,
          letterSpacing: '0.1em', marginBottom: 18,
        }}>"/ PILOT FEEDBACK</div>
        <div style={{
          fontSize: 34, fontWeight: 400, lineHeight: 1.25,
          letterSpacing: '-0.015em',
        }}>
          "We used to track rollovers in a shared sheet that three people edited
          at the same time. Rift replaced it in a week.
          <span style={{ color: D1.textDim }}> We haven't touched the spreadsheet since.</span>"
        </div>
        <div style={{
          marginTop: 22, fontFamily: D1.mono, fontSize: 12, color: D1.textDim,
          display: 'flex', gap: 20, alignItems: 'center',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: D1.surface2, border: `1px solid ${D1.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: D1.text, fontSize: 11,
          }}>SM</div>
          <div>
            <div style={{ color: D1.text, fontFamily: D1.sans, fontSize: 13 }}>Sarah Mitchell</div>
            <div>Director of Operations · Apex Wealth Advisors</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────────
function D1CTA() {
  return (
    <div style={{
      padding: '72px 48px', borderTop: `1px solid ${D1.line}`,
      background: `radial-gradient(ellipse 700px 400px at 20% 50%, rgba(212,255,74,0.08), transparent 60%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 48, flexWrap: 'wrap',
      }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{
            fontFamily: D1.mono, fontSize: 11, color: D1.accent,
            letterSpacing: '0.1em', marginBottom: 14,
          }}>/ SCHEDULE A WALKTHROUGH</div>
          <h2 style={{
            fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em',
            lineHeight: 1.05, margin: 0,
          }}>Bring your next five rollovers<br/>into Rift this week.</h2>
          <p style={{
            marginTop: 18, fontSize: 15, color: D1.textDim, maxWidth: 480,
          }}>
            30-minute walkthrough tailored to your firm's workflow. We set up your
            first firm + users and you run a real case alongside us.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260 }}>
          <button style={{
            background: D1.accent, color: D1.bg, border: 'none',
            padding: '16px 22px', borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: D1.sans, textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>Book a walkthrough<span>→</span></button>
          <button style={{
            background: 'transparent', color: D1.text,
            border: `1px solid ${D1.lineBold}`,
            padding: '16px 22px', borderRadius: 8, fontSize: 15, fontWeight: 500,
            cursor: 'pointer', fontFamily: D1.sans, textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>Read the product plan<span style={{ color: D1.textDim }}>→</span></button>
          <div style={{
            fontFamily: D1.mono, fontSize: 10, color: D1.textDimmer,
            textAlign: 'right', marginTop: 4,
          }}>NO CREDIT CARD · 2-WEEK PILOT</div>
        </div>
      </div>
    </div>
  );
}

// ── Footer ──────────────────────────────────────────────────────
function D1Footer() {
  return (
    <div style={{
      padding: '28px 48px', borderTop: `1px solid ${D1.line}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: D1.mono, fontSize: 11, color: D1.textDimmer,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <D1Wordmark />
        <span style={{ marginLeft: 18 }}>© 2026 RIFT SYSTEMS, INC.</span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <span>PRIVACY</span>
        <span>TERMS</span>
        <span>SECURITY</span>
        <span>STATUS ●</span>
      </div>
    </div>
  );
}

Object.assign(window, { D1Landing });
