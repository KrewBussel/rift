// Design 3 — "Motion Pipeline"
// A big, visible, living pipeline diagram is the hero metaphor.
// Modern SaaS — crisp sans, soft neutrals, one bold accent, playful.

const D3 = {
  bg:      '#fbfaf7',     // warm paper
  bg2:     '#f3f1ec',
  surface: '#ffffff',
  line:    '#e7e4dc',
  line2:   '#d4d0c4',
  ink:     '#14120f',
  ink2:    '#2f2c27',
  muted:   '#7b7769',
  accent:  '#ff5a1f',     // vivid signal orange
  accent2: '#ffe8dc',     // tint
  cool:    '#1d3f3c',     // deep teal complement
  sans:    '"Inter", -apple-system, system-ui, sans-serif',
  display: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
  mono:    '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

function D3Landing() {
  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: D3.bg, color: D3.ink,
      fontFamily: D3.sans,
      fontFeatureSettings: '"ss01","cv11"',
    }}>
      <D3Nav />
      <D3Hero />
      <D3Logos />
      <D3Problem />
      <D3Modules />
      <D3ClientSlice />
      <D3Tape />
      <D3CTA />
      <D3Footer />
    </div>
  );
}

// ── Nav ─────────────────────────────────────────────────────────
function D3Nav() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 48px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
        }}>
          <D3Logo />
          Rift
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13.5, color: D3.ink2 }}>
          <span>Product</span>
          <span>How it works</span>
          <span>For RIAs</span>
          <span>Pricing</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13.5, color: D3.ink2 }}>Sign in</span>
        <button style={{
          background: D3.ink, color: D3.bg,
          border: 'none', padding: '9px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Book a walkthrough</button>
      </div>
    </div>
  );
}

function D3Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="12" fill={D3.accent}/>
      <path d="M6 13 L11 13 M13 13 L20 13 M13 13 L13 8 M13 13 L17 17"
            stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="6" cy="13" r="2" fill="#fff"/>
      <circle cx="20" cy="13" r="2" fill="#fff"/>
    </svg>
  );
}

// ── Hero ────────────────────────────────────────────────────────
function D3Hero() {
  return (
    <div style={{ padding: '48px 48px 24px', position: 'relative' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 6px',
        background: D3.accent2, color: D3.accent,
        borderRadius: 999, fontSize: 12, fontWeight: 600,
        marginBottom: 22,
      }}>
        <span style={{
          background: D3.accent, color: '#fff',
          padding: '2px 8px', borderRadius: 999, fontSize: 10, letterSpacing: '0.04em',
        }}>NEW</span>
        Phase 2 checklists are live →
      </div>

      <h1 style={{
        fontSize: 108, fontWeight: 400,
        fontFamily: D3.display, letterSpacing: '-0.035em',
        lineHeight: 0.92, margin: 0, maxWidth: 1100,
      }}>
        Move rollovers like<br/>
        <span style={{ fontStyle: 'italic' }}>they're on rails.</span>
      </h1>

      <div style={{
        marginTop: 28, display: 'grid',
        gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'end',
      }}>
        <p style={{
          fontSize: 19, lineHeight: 1.5, color: D3.ink2, margin: 0,
          maxWidth: 640,
        }}>
          Rift is a rollover case management system for independent RIAs.
          One shared pipeline, one checklist per case, one audit trail —
          so ops, advisors, and clients all see the same truth.
        </p>
        <div style={{ display: 'flex', gap: 10, justifySelf: 'end' }}>
          <button style={{
            background: D3.accent, color: '#fff',
            border: 'none', padding: '13px 22px', borderRadius: 999,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Book a walkthrough →</button>
          <button style={{
            background: 'transparent', color: D3.ink,
            border: `1px solid ${D3.line2}`, padding: '13px 20px', borderRadius: 999,
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', background: D3.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="7" height="7" viewBox="0 0 7 7"><polygon points="1,0 7,3.5 1,7" fill="#fff"/></svg>
            </span>
            Watch the 90-second tour
          </button>
        </div>
      </div>

      {/* Hero pipeline diagram */}
      <D3HeroPipeline />
    </div>
  );
}

function D3HeroPipeline() {
  const stages = [
    { k: 'Intake',      n: 3, icon: '●' },
    { k: 'Awaiting',    n: 7, icon: '◐' },
    { k: 'Ready',       n: 2, icon: '◑' },
    { k: 'Submitted',   n: 5, icon: '◕', hot: true },
    { k: 'Processing',  n: 4, icon: '◓' },
    { k: 'In transit',  n: 1, icon: '◒' },
    { k: 'Completed',   n: 12, icon: '○' },
  ];
  return (
    <div style={{
      marginTop: 44, position: 'relative',
      background: D3.surface, borderRadius: 16,
      border: `1px solid ${D3.line}`,
      boxShadow: '0 24px 60px -20px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)',
      padding: 24, overflow: 'hidden',
    }}>
      {/* window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        fontSize: 12, color: D3.muted, fontFamily: D3.mono,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ec6a5e' }}/>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f4be4f' }}/>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#61c455' }}/>
        </div>
        <span style={{ marginLeft: 14 }}>rift.app / pipeline</span>
        <div style={{ flex: 1 }}/>
        <span>34 active · 3 flagged · 12 closed this week</span>
      </div>

      {/* the rail */}
      <div style={{ position: 'relative', padding: '38px 0 18px' }}>
        {/* line */}
        <div style={{
          position: 'absolute', top: 66, left: 40, right: 40, height: 2,
          background: `linear-gradient(90deg, ${D3.line2} 0%, ${D3.line2} 40%, ${D3.accent} 40%, ${D3.accent} 60%, ${D3.line2} 60%, ${D3.line2} 100%)`,
          borderRadius: 1,
        }}/>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
          position: 'relative',
        }}>
          {stages.map((s, i) => (
            <div key={s.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, color: D3.muted, fontWeight: 500 }}>
                {s.n} case{s.n === 1 ? '' : 's'}
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: s.hot ? D3.accent : D3.surface,
                border: `2px solid ${s.hot ? D3.accent : D3.line2}`,
                color: s.hot ? '#fff' : D3.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, position: 'relative',
                boxShadow: s.hot ? `0 6px 18px -4px ${D3.accent}88` : 'none',
              }}>
                {s.icon}
                {s.hot && (
                  <div style={{
                    position: 'absolute', inset: -8, borderRadius: '50%',
                    border: `2px solid ${D3.accent}`, opacity: 0.25,
                  }}/>
                )}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: s.hot ? D3.accent : D3.ink2,
              }}>{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* hovering cards below */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        marginTop: 18, paddingTop: 18, borderTop: `1px solid ${D3.line}`,
      }}>
        {[
          { name: 'Sarah Mitchell', path: 'Fidelity 401(k) → Schwab IRA', stage: 'Submitted', day: 2, tone: 'hot' },
          { name: 'James Carter',   path: 'Voya 403(b) → Vanguard IRA',    stage: 'Processing',day: 5, tone: 'warn' },
          { name: 'Rina Patel',     path: 'Empower 401(k) → Fidelity IRA', stage: 'Ready',      day: 1, tone: 'calm' },
        ].map((c, i) => (
          <div key={i} style={{
            padding: 14, borderRadius: 10,
            background: c.tone === 'hot' ? D3.accent2 : D3.bg2,
            border: `1px solid ${c.tone === 'hot' ? '#ffbda1' : D3.line}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{
                fontSize: 10, fontFamily: D3.mono, color: D3.muted,
              }}>RFT-289{i+1}</div>
            </div>
            <div style={{ fontSize: 12, color: D3.muted, marginBottom: 10 }}>{c.path}</div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px',
                borderRadius: 999,
                background: c.tone === 'hot' ? D3.accent : '#fff',
                color: c.tone === 'hot' ? '#fff' : D3.ink2,
                border: c.tone === 'hot' ? 'none' : `1px solid ${D3.line2}`,
              }}>{c.stage}</span>
              <span style={{ fontSize: 11, color: c.tone === 'warn' ? D3.accent : D3.muted, fontFamily: D3.mono }}>
                {c.day}d in stage
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Logos ──────────────────────────────────────────────────────
function D3Logos() {
  const firms = ['Apex Wealth', 'Summit Capital', 'Harbor Financial', 'Meridian', 'Cornerstone', 'Clearwater', 'BlueSky'];
  return (
    <div style={{ padding: '32px 48px 16px' }}>
      <div style={{
        textAlign: 'center', fontSize: 12, color: D3.muted, marginBottom: 18,
      }}>Piloting with independent RIAs across the US</div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: D3.display, fontSize: 22, color: D3.ink2,
        fontStyle: 'italic', opacity: 0.75,
      }}>
        {firms.map((f, i) => <span key={i}>{f}</span>)}
      </div>
    </div>
  );
}

// ── Problem → solution panel ────────────────────────────────────
function D3Problem() {
  return (
    <div style={{ padding: '72px 48px' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
        alignItems: 'stretch',
      }}>
        <div style={{
          background: D3.bg2, border: `1px solid ${D3.line}`,
          borderRadius: 16, padding: 36, position: 'relative',
        }}>
          <div style={{
            fontSize: 11, color: D3.muted, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 14,
          }}>Before Rift</div>
          <h3 style={{
            fontFamily: D3.display, fontSize: 40, fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 20px',
          }}>
            A <span style={{ fontStyle: 'italic' }}>spreadsheet</span> with three editors.
          </h3>
          <ul style={{
            margin: 0, padding: 0, listStyle: 'none',
            fontSize: 15, color: D3.ink2, lineHeight: 1.9,
          }}>
            {[
              'Excel tab with conditional color coding',
              'Forwarded emails with PDF attachments',
              'Sticky notes about "what is this case waiting on?"',
              'A compliance officer asking for a paper trail',
              'Six weeks from intake to closed',
            ].map((t, i) => (
              <li key={i} style={{
                display: 'flex', gap: 10, alignItems: 'baseline',
              }}>
                <span style={{ color: D3.muted, flex: '0 0 14px' }}>—</span>
                <span style={{ textDecoration: 'line-through', textDecorationColor: '#bbb' }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          background: D3.ink, color: D3.bg,
          borderRadius: 16, padding: 36, position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -80, top: -80,
            width: 260, height: 260, borderRadius: '50%',
            background: D3.accent, opacity: 0.18,
          }}/>
          <div style={{
            fontSize: 11, color: D3.accent, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 14,
          }}>After Rift</div>
          <h3 style={{
            fontFamily: D3.display, fontSize: 40, fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 20px',
            color: '#fff',
          }}>
            One desk. <span style={{ fontStyle: 'italic', color: D3.accent }}>One truth.</span>
          </h3>
          <ul style={{
            margin: 0, padding: 0, listStyle: 'none',
            fontSize: 15, lineHeight: 1.9, color: 'rgba(251,250,247,0.85)',
          }}>
            {[
              'Shared pipeline everyone sees at once',
              'Auto-generated checklist per rollover type',
              'Tasks with owners, due dates, reminders',
              'Append-only audit trail you can export',
              'Under three weeks, average',
            ].map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ color: D3.accent, flex: '0 0 14px' }}>✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Modules (feature grid) ─────────────────────────────────────
function D3Modules() {
  const mods = [
    { tag: '01', t: 'Pipeline', d: 'A shared kanban across seven status stages with flags for NIGO, stale, and missing docs.',
      viz: <D3VizPipeline /> },
    { tag: '02', t: 'Checklists', d: 'Per-rollover-type document lists generate on case creation. Each item walks from Requested to Complete.',
      viz: <D3VizChecklist /> },
    { tag: '03', t: 'Tasks & reminders', d: 'Open tasks pin to the top of each case. Overdue ones fire email nudges on their own.',
      viz: <D3VizTasks /> },
    { tag: '04', t: 'Audit trail', d: 'Every action, actor, and timestamp — append-only, exportable, compliance-friendly.',
      viz: <D3VizAudit /> },
  ];
  return (
    <div style={{ padding: '40px 48px 72px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 20,
      }}>
        <h2 style={{
          fontFamily: D3.display, fontSize: 64, fontWeight: 400,
          letterSpacing: '-0.03em', lineHeight: 1, margin: 0, maxWidth: 640,
        }}>
          Four modules, <span style={{ fontStyle: 'italic' }}>zero clutter.</span>
        </h2>
        <p style={{
          fontSize: 15, color: D3.muted, margin: 0, maxWidth: 320, lineHeight: 1.55,
        }}>
          Rift is opinionated on purpose. No CRM, no custodial sync, no AI — just the
          shortest path between a case and a closed rollover.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        {mods.map((m, i) => (
          <div key={m.tag} style={{
            background: D3.surface, border: `1px solid ${D3.line}`,
            borderRadius: 14, padding: 24, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 18,
            minHeight: 320,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{
                fontFamily: D3.mono, fontSize: 11, color: D3.accent,
                fontWeight: 600, letterSpacing: '0.05em',
              }}>{m.tag}</span>
              <h3 style={{
                fontFamily: D3.display, fontSize: 28, fontWeight: 400,
                letterSpacing: '-0.02em', margin: 0,
              }}>{m.t}</h3>
            </div>
            <p style={{
              fontSize: 14.5, color: D3.muted, lineHeight: 1.55, margin: 0,
              maxWidth: 480,
            }}>{m.d}</p>
            <div style={{ marginTop: 'auto' }}>{m.viz}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function D3VizPipeline() {
  const cols = [
    { k: 'Ready',      n: 2 },
    { k: 'Submitted',  n: 5, hot: true },
    { k: 'Processing', n: 4 },
  ];
  return (
    <div style={{
      background: D3.bg2, border: `1px solid ${D3.line}`,
      borderRadius: 10, padding: 12,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    }}>
      {cols.map(c => (
        <div key={c.k}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8, fontSize: 11, fontWeight: 600,
            color: c.hot ? D3.accent : D3.ink2,
          }}>
            <span>{c.k}</span>
            <span style={{
              background: c.hot ? D3.accent : '#fff',
              color: c.hot ? '#fff' : D3.muted,
              padding: '1px 7px', borderRadius: 999, fontSize: 10,
              border: c.hot ? 'none' : `1px solid ${D3.line2}`,
            }}>{c.n}</span>
          </div>
          {Array.from({length: Math.min(2, c.n)}).map((_, j) => (
            <div key={j} style={{
              background: '#fff', border: `1px solid ${D3.line}`,
              borderRadius: 6, padding: '8px 9px', marginBottom: 5,
              borderLeft: c.hot && j === 0 ? `3px solid ${D3.accent}` : `3px solid ${D3.line2}`,
            }}>
              <div style={{ height: 4, width: '70%', background: D3.line2, borderRadius: 2, marginBottom: 4 }}/>
              <div style={{ height: 3, width: '45%', background: D3.line, borderRadius: 2 }}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function D3VizChecklist() {
  const items = [
    ['Distribution form',        'done'],
    ['Letter of authorization',  'done'],
    ['ID verification',          'active'],
    ['Medallion signature',      'todo'],
  ];
  return (
    <div style={{
      background: D3.bg2, border: `1px solid ${D3.line}`,
      borderRadius: 10, padding: 14,
    }}>
      {items.map(([t, s], i) => (
        <div key={t} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 0',
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: 4,
            background: s === 'done' ? D3.accent : '#fff',
            border: `1.5px solid ${s === 'done' ? D3.accent : s === 'active' ? D3.accent : D3.line2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {s === 'done' && (
              <svg width="9" height="9" viewBox="0 0 9 9">
                <path d="M1.5 4.5 L3.5 6.5 L7.5 2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {s === 'active' && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: D3.accent }}/>
            )}
          </span>
          <span style={{
            fontSize: 13, color: s === 'done' ? D3.muted : D3.ink,
            textDecoration: s === 'done' ? 'line-through' : 'none',
          }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function D3VizTasks() {
  return (
    <div style={{
      background: D3.bg2, border: `1px solid ${D3.line}`,
      borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {[
        ['Request signed LOA', 'today', 'KM', false],
        ['Confirm with Schwab ops', 'overdue', 'PS', true],
      ].map(([t, d, o, bad], i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', background: '#fff',
          border: `1px solid ${bad ? '#ffbda1' : D3.line}`,
          borderRadius: 7,
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 4,
            border: `1.5px solid ${D3.line2}`,
          }}/>
          <span style={{ flex: 1, fontSize: 12.5 }}>{t}</span>
          <span style={{
            fontSize: 10.5, color: bad ? D3.accent : D3.muted,
            fontWeight: bad ? 600 : 500, fontFamily: D3.mono,
          }}>{d}</span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 999,
            background: D3.bg2, color: D3.ink2, fontFamily: D3.mono,
          }}>{o}</span>
        </div>
      ))}
    </div>
  );
}

function D3VizAudit() {
  return (
    <div style={{
      background: D3.bg2, border: `1px solid ${D3.line}`,
      borderRadius: 10, padding: 12, fontFamily: D3.mono, fontSize: 11,
    }}>
      {[
        ['14:32', 'status → processing', D3.accent],
        ['11:02', 'uploaded LOA_signed.pdf', D3.muted],
        ['09:15', 'checklist: ID received', D3.muted],
      ].map(([t, e, c], i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '5px 0',
        }}>
          <span style={{ color: D3.muted, width: 44 }}>{t}</span>
          <span style={{ flex: 1, color: i === 0 ? D3.ink : D3.ink2 }}>{e}</span>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: c,
            alignSelf: 'center',
          }}/>
        </div>
      ))}
    </div>
  );
}

// ── Client slice ────────────────────────────────────────────────
function D3ClientSlice() {
  return (
    <div style={{
      padding: '72px 48px', background: D3.bg2,
      borderTop: `1px solid ${D3.line}`, borderBottom: `1px solid ${D3.line}`,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48,
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: 11, color: D3.accent, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 14,
          }}>For your client</div>
          <h2 style={{
            fontFamily: D3.display, fontSize: 56, fontWeight: 400,
            letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 20px',
          }}>
            A small page,<br/>
            <span style={{ fontStyle: 'italic' }}>not a whole portal.</span>
          </h2>
          <p style={{
            fontSize: 16, color: D3.ink2, lineHeight: 1.6, margin: '0 0 16px',
            maxWidth: 480,
          }}>
            Your client gets a magic link. They see the next step, upload the one
            thing you need, and get a confirmation. No account balances, no log-ins
            to remember, no "status" they can change.
          </p>
          <div style={{
            display: 'flex', gap: 24, marginTop: 22, fontSize: 13, color: D3.muted,
          }}>
            <span>· Magic-link access</span>
            <span>· Mobile-ready uploads</span>
            <span>· Zero advisor support tickets</span>
          </div>
        </div>

        <D3ClientCard />
      </div>
    </div>
  );
}

function D3ClientCard() {
  return (
    <div style={{
      background: D3.surface, border: `1px solid ${D3.line}`,
      borderRadius: 16, padding: 28,
      boxShadow: '0 24px 60px -24px rgba(0,0,0,0.12)',
      maxWidth: 460, marginLeft: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <D3Logo />
        <div style={{ fontSize: 13, color: D3.muted }}>Rollover with Apex Wealth</div>
      </div>
      <div style={{ fontSize: 22, fontFamily: D3.display, letterSpacing: '-0.01em', marginBottom: 6 }}>
        Hi Sarah,
      </div>
      <p style={{ fontSize: 14.5, color: D3.ink2, lineHeight: 1.55, margin: '0 0 20px' }}>
        Upload a signed copy of your distribution form and we'll take it from here.
      </p>

      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center',
      }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 3,
            background: i <= 2 ? D3.accent : D3.line,
          }}/>
        ))}
        <span style={{ fontSize: 11, color: D3.muted, fontFamily: D3.mono, marginLeft: 6 }}>2/4</span>
      </div>

      <div style={{
        border: `2px dashed ${D3.line2}`, borderRadius: 10,
        padding: '30px 12px', textAlign: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: D3.accent2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 10px',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M9 3 L9 13 M4 8 L9 3 L14 8" stroke={D3.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Drop your PDF here</div>
        <div style={{ fontSize: 12, color: D3.muted }}>or click to browse · up to 10 MB</div>
      </div>

      <div style={{
        marginTop: 14, display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: D3.muted,
      }}>
        <span>Secure magic-link session</span>
        <span>Est. 2 minutes</span>
      </div>
    </div>
  );
}

// ── Tape / stats ────────────────────────────────────────────────
function D3Tape() {
  const items = ['6 → 3 weeks to close', '94% docs-ready on submit', '0 custodian integrations', '7 status stages', '2-15 advisors per firm', '5-30 rollovers per month'];
  return (
    <div style={{
      padding: '18px 0', background: D3.ink, color: D3.bg,
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        display: 'flex', gap: 40, fontFamily: D3.display, fontSize: 28,
        fontStyle: 'italic', paddingLeft: 40, whiteSpace: 'nowrap',
      }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {t}
            <span style={{ color: D3.accent, fontSize: 20 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────────
function D3CTA() {
  return (
    <div style={{
      padding: '80px 48px',
      display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48,
      alignItems: 'center',
    }}>
      <div>
        <h2 style={{
          fontFamily: D3.display, fontSize: 86, fontWeight: 400,
          letterSpacing: '-0.035em', lineHeight: 0.95, margin: 0,
        }}>
          Put your next five<br/>
          <span style={{ fontStyle: 'italic', color: D3.accent }}>rollovers</span> in Rift.
        </h2>
        <p style={{
          marginTop: 18, fontSize: 16, color: D3.muted, lineHeight: 1.55,
          maxWidth: 520,
        }}>
          Two-week pilot, no card. We set up your firm, walk you through one
          real case end-to-end, and you keep the full audit trail.
        </p>
      </div>
      <div style={{
        background: D3.surface, border: `1px solid ${D3.line}`,
        borderRadius: 16, padding: 28,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          fontSize: 11, color: D3.accent, letterSpacing: '0.1em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 14,
        }}>Start a pilot</div>
        {[
          ['Work email', 'jane@yourfirm.com'],
          ['Firm name', 'Apex Wealth Advisors'],
          ['Rollovers per month', '6 – 15'],
        ].map(([l, p], i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: D3.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
            <div style={{
              padding: '11px 14px', borderRadius: 8,
              background: D3.bg2, border: `1px solid ${D3.line}`,
              fontSize: 13.5, color: D3.muted,
            }}>{p}</div>
          </div>
        ))}
        <button style={{
          marginTop: 8, width: '100%',
          background: D3.accent, color: '#fff',
          border: 'none', padding: '13px', borderRadius: 999,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Request walkthrough →</button>
        <div style={{
          marginTop: 10, fontSize: 11, color: D3.muted, textAlign: 'center',
        }}>Reply within one business day · no spam</div>
      </div>
    </div>
  );
}

function D3Footer() {
  return (
    <div style={{
      padding: '26px 48px',
      borderTop: `1px solid ${D3.line}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 12, color: D3.muted,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <D3Logo />
        <span>© 2026 Rift Systems</span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <span>Privacy</span><span>Terms</span><span>Security</span><span>Changelog</span>
      </div>
    </div>
  );
}

Object.assign(window, { D3Landing });
