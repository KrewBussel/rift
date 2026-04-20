// Design 2 — "Editorial Trust"
// Light, serif-led, financial-publication feel. Calm authority for
// compliance-minded RIA buyers. Quieter than D1 & D3.

const D2 = {
  bg:       '#f7f3ec',     // warm off-white, newsprint
  bgAlt:    '#efe8db',
  ink:      '#15171a',     // near-black
  ink2:     '#2c2e33',
  muted:    '#6b6860',
  rule:     '#d9d2c4',
  ruleSoft: '#e6dfd1',
  accent:   '#3d4f3a',     // deep forest / money-ink green
  accent2:  '#a67b2e',     // muted gold, used sparingly
  paper:    '#ffffff',
  serif:    '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif',
  sans:     '"Inter", -apple-system, system-ui, sans-serif',
  mono:     '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

function D2Landing() {
  return (
    <div style={{
      width: '100%', minHeight: '100%',
      background: D2.bg, color: D2.ink,
      fontFamily: D2.serif,
    }}>
      <D2Masthead />
      <D2Hero />
      <D2Columns />
      <D2ByTheNumbers />
      <D2Case />
      <D2Testimony />
      <D2CTA />
      <D2Footer />
    </div>
  );
}

// ── Masthead ─────────────────────────────────────────────────────
function D2Masthead() {
  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 56px',
        fontFamily: D2.sans, fontSize: 11, color: D2.muted,
        borderBottom: `1px solid ${D2.rule}`,
        letterSpacing: '0.04em',
      }}>
        <span>Vol. I · No. 04</span>
        <span>A rollover journal for independent advisors</span>
        <span>Saturday, April 18, 2026</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '26px 56px 22px',
      }}>
        <div style={{ fontFamily: D2.sans, fontSize: 13, display: 'flex', gap: 22, color: D2.ink2 }}>
          <span>Product</span><span>Workflow</span><span>Pricing</span>
        </div>
        <div style={{
          fontFamily: D2.serif, fontSize: 52, fontWeight: 400,
          letterSpacing: '-0.02em',
        }}>
          <span style={{ fontStyle: 'italic' }}>R</span>ift
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: D2.sans, fontSize: 13, color: D2.ink2 }}>Sign in</span>
          <button style={{
            background: D2.ink, color: D2.bg, border: 'none',
            padding: '9px 16px', borderRadius: 2,
            fontFamily: D2.sans, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', letterSpacing: '0.02em',
          }}>Request a walkthrough</button>
        </div>
      </div>
      <div style={{ borderTop: `2px solid ${D2.ink}`, borderBottom: `1px solid ${D2.ink}`, height: 4 }} />
    </>
  );
}

// ── Hero — newspaper-deck style ─────────────────────────────────
function D2Hero() {
  return (
    <div style={{
      padding: '56px 56px 48px',
      display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56,
      borderBottom: `1px solid ${D2.rule}`,
    }}>
      <div>
        <div style={{
          fontFamily: D2.sans, fontSize: 11, color: D2.accent,
          letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
          marginBottom: 20,
        }}>The Operations Desk · Issue 04</div>
        <h1 style={{
          fontFamily: D2.serif, fontSize: 82, fontWeight: 400,
          lineHeight: 0.96, letterSpacing: '-0.03em', margin: 0,
        }}>
          A quiet<br/>
          <span style={{ fontStyle: 'italic' }}>command&nbsp;center</span><br/>
          for rollovers.
        </h1>
        <div style={{
          marginTop: 28, display: 'flex', gap: 12, alignItems: 'center',
          fontFamily: D2.sans,
        }}>
          <button style={{
            background: D2.ink, color: D2.bg, border: 'none',
            padding: '12px 22px', borderRadius: 2, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', letterSpacing: '0.02em',
          }}>Book a 30-minute walkthrough →</button>
          <span style={{
            fontSize: 13, color: D2.muted, borderBottom: `1px solid ${D2.ink2}`,
            paddingBottom: 2,
          }}>Read the founder's product plan</span>
        </div>
      </div>

      <div style={{ borderLeft: `1px solid ${D2.rule}`, paddingLeft: 32 }}>
        <div style={{
          fontFamily: D2.sans, fontSize: 10, color: D2.muted,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        }}>By the editors</div>
        <p style={{
          fontFamily: D2.serif, fontSize: 18, lineHeight: 1.55,
          color: D2.ink2, margin: 0, fontWeight: 400,
        }}>
          Independent RIAs move hundreds of retirement accounts a year through a web
          of providers, custodians, and signed paper. Most firms track it in a
          shared spreadsheet that three people edit at once.
        </p>
        <p style={{
          fontFamily: D2.serif, fontSize: 16, lineHeight: 1.6,
          color: D2.muted, margin: '16px 0 0',
        }}>
          Rift is the opinionated replacement — a rollover case management system
          built for ops-first firms with 2 to 15 advisors. One pipeline. One
          audit trail. No custodial integrations you didn't ask for.
        </p>
        <div style={{
          marginTop: 22, paddingTop: 18, borderTop: `1px solid ${D2.rule}`,
          fontFamily: D2.sans, fontSize: 11, color: D2.muted,
          letterSpacing: '0.04em',
        }}>
          Continued in <span style={{ color: D2.ink }}>Section B</span> · pages 3 – 7
        </div>
      </div>
    </div>
  );
}

// ── Three columns (the pillars) ─────────────────────────────────
function D2Columns() {
  const cols = [
    {
      chapter: 'I',
      kicker: 'The pipeline',
      h: 'A status model you can defend in a compliance review.',
      p: 'Intake, Awaiting client action, Ready to submit, Submitted, Processing, In transit, Completed. Seven stages, written one way, used by every advisor.',
      list: ['Drag-free stage changes', 'Days-in-stage counter', 'Flags: NIGO · Stale · Missing docs'],
    },
    {
      chapter: 'II',
      kicker: 'The checklist',
      h: 'Every required form, requested and tracked to receipt.',
      p: 'Per-rollover-type document lists auto-generate on case creation. Distribution form, LOA, ID, medallion if required — each item walks through Requested · Received · Reviewed · Complete.',
      list: ['Uploads tied to checklist items', 'Missing-doc view at a glance', 'PDF · JPG · PNG'],
    },
    {
      chapter: 'III',
      kicker: 'The audit trail',
      h: 'Append-only. Every action, actor, and timestamp.',
      p: 'Status changes, notes, uploads, owner reassignments — nothing gets silently edited. Export a clean case summary for internal review or examiner requests.',
      list: ['Case summary export (PDF)', 'Keyed by actor + UTC', 'Immutable note history'],
    },
  ];
  return (
    <div style={{
      padding: '56px 56px 40px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
      borderBottom: `1px solid ${D2.rule}`,
    }}>
      {cols.map((c, i) => (
        <div key={c.chapter} style={{
          padding: '0 28px',
          borderLeft: i > 0 ? `1px solid ${D2.rule}` : 'none',
        }}>
          <div style={{
            fontFamily: D2.serif, fontStyle: 'italic', fontSize: 60,
            fontWeight: 400, color: D2.accent2, lineHeight: 1, marginBottom: 4,
          }}>{c.chapter}</div>
          <div style={{
            fontFamily: D2.sans, fontSize: 10, color: D2.muted,
            letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 10,
          }}>{c.kicker}</div>
          <h3 style={{
            fontFamily: D2.serif, fontSize: 24, fontWeight: 400,
            lineHeight: 1.22, letterSpacing: '-0.01em', margin: '0 0 14px',
          }}>{c.h}</h3>
          <p style={{
            fontFamily: D2.serif, fontSize: 15, lineHeight: 1.65,
            color: D2.ink2, margin: 0,
          }}>{c.p}</p>
          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: `1px solid ${D2.ruleSoft}`,
            fontFamily: D2.sans, fontSize: 12, color: D2.muted,
            lineHeight: 1.9,
          }}>
            {c.list.map(x => <div key={x}>· {x}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── By the numbers ──────────────────────────────────────────────
function D2ByTheNumbers() {
  const s = [
    ['6→3', 'weeks', 'Average rollover completion time at pilot firms after moving off spreadsheets.'],
    ['94%', 'documents', 'Of required paperwork received and reviewed before first submission, up from 71%.'],
    ['0', 'integrations', 'No custodian APIs, no CRM sync, no SMS. We build those only when you ask twice.'],
  ];
  return (
    <div style={{
      padding: '56px 56px',
      background: D2.bgAlt,
      borderBottom: `1px solid ${D2.rule}`,
    }}>
      <div style={{
        fontFamily: D2.sans, fontSize: 11, color: D2.accent,
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 8,
      }}>Figures</div>
      <h2 style={{
        fontFamily: D2.serif, fontSize: 34, fontWeight: 400,
        letterSpacing: '-0.02em', margin: '0 0 36px', maxWidth: 700,
      }}>
        <span style={{ fontStyle: 'italic' }}>What pilot firms observe</span> after thirty days.
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40,
      }}>
        {s.map(([n, u, d]) => (
          <div key={n} style={{ borderTop: `2px solid ${D2.ink}`, paddingTop: 16 }}>
            <div style={{
              fontFamily: D2.serif, fontSize: 80, fontWeight: 400,
              letterSpacing: '-0.04em', lineHeight: 0.95,
            }}>{n}</div>
            <div style={{
              fontFamily: D2.sans, fontSize: 10, color: D2.muted,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              margin: '8px 0 14px',
            }}>{u}</div>
            <div style={{
              fontFamily: D2.serif, fontSize: 14.5, lineHeight: 1.6,
              color: D2.ink2,
            }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Case study — a fictional day in ops ─────────────────────────
function D2Case() {
  return (
    <div style={{
      padding: '56px 56px', borderBottom: `1px solid ${D2.rule}`,
      display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 56,
      alignItems: 'start',
    }}>
      <div>
        <div style={{
          fontFamily: D2.sans, fontSize: 11, color: D2.accent,
          letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
          marginBottom: 14,
        }}>A case in motion</div>
        <h2 style={{
          fontFamily: D2.serif, fontSize: 44, fontWeight: 400,
          letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 22px',
        }}>
          From Fidelity to Schwab,<br/>
          <span style={{ fontStyle: 'italic' }}>in nineteen days.</span>
        </h2>
        <p style={{
          fontFamily: D2.serif, fontSize: 16, lineHeight: 1.65,
          color: D2.ink2, margin: '0 0 16px',
        }}>
          Sarah Mitchell opens a 401(k) rollover case for her client on the 6th.
          Rift generates the Fidelity-specific checklist and assigns three starter
          tasks — request LOA, review received documents, submit to custodian.
        </p>
        <p style={{
          fontFamily: D2.serif, fontSize: 16, lineHeight: 1.65,
          color: D2.ink2, margin: 0,
        }}>
          The client uploads the signed LOA on the 9th. Submission goes out the 12th.
          On the 25th, the case closes — with a complete timestamped record any
          compliance officer can open and read.
        </p>
      </div>

      <div style={{
        background: D2.paper, border: `1px solid ${D2.rule}`,
        borderRadius: 2,
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${D2.rule}`,
          display: 'flex', justifyContent: 'space-between',
          fontFamily: D2.sans, fontSize: 11, color: D2.muted,
          letterSpacing: '0.05em',
        }}>
          <span>CASE · RFT-2891 · Mitchell, S.</span>
          <span>CLOSED · March 25, 2026</span>
        </div>
        {[
          ['Mar 06', '10:24', 'Case created',             '401(k) → Traditional IRA'],
          ['Mar 06', '10:24', 'Checklist generated',      '8 required items'],
          ['Mar 09', '14:07', 'LOA received',             'client upload'],
          ['Mar 10', '09:15', 'ID verified',              'ops review'],
          ['Mar 12', '11:42', 'Submitted to custodian',   'Schwab'],
          ['Mar 18', '08:33', 'Processing confirmed',     'Schwab ack #SC-88210'],
          ['Mar 24', '16:02', 'Assets received',          null],
          ['Mar 25', '16:30', 'Case closed',              'audit export generated'],
        ].map(([d, t, e, sub], i, arr) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '52px 48px 1fr',
            gap: 12, padding: '11px 20px',
            borderBottom: i < arr.length - 1 ? `1px solid ${D2.ruleSoft}` : 'none',
            alignItems: 'baseline',
            background: i === arr.length - 1 ? 'rgba(61,79,58,0.05)' : 'transparent',
          }}>
            <span style={{ fontFamily: D2.mono, fontSize: 11, color: D2.muted }}>{d}</span>
            <span style={{ fontFamily: D2.mono, fontSize: 11, color: D2.muted }}>{t}</span>
            <span>
              <span style={{ fontFamily: D2.serif, fontSize: 14.5, color: D2.ink }}>{e}</span>
              {sub && <span style={{ fontFamily: D2.serif, fontStyle: 'italic', fontSize: 13, color: D2.muted, marginLeft: 8 }}>— {sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Testimony column ────────────────────────────────────────────
function D2Testimony() {
  const quotes = [
    {
      q: 'We haven\'t touched the spreadsheet since. The checklist alone pays for it.',
      who: 'Sarah Mitchell',
      role: 'Director of Operations, Apex Wealth Advisors',
    },
    {
      q: 'Our average rollover dropped from six weeks to under three once advisors and ops were working from the same tool.',
      who: 'Priya Sharma',
      role: 'Head of Client Services, Harbor Financial Partners',
    },
    {
      q: 'Compliance got a clean timeline, start to finish. That alone changed the conversation internally.',
      who: 'James Carter',
      role: 'Senior Advisor, Summit Capital Group',
    },
  ];
  return (
    <div style={{
      padding: '56px 56px', borderBottom: `1px solid ${D2.rule}`,
    }}>
      <div style={{
        fontFamily: D2.sans, fontSize: 11, color: D2.accent,
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 14,
      }}>From the field</div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
      }}>
        {quotes.map((q, i) => (
          <div key={i} style={{
            padding: '0 28px',
            borderLeft: i > 0 ? `1px solid ${D2.rule}` : 'none',
          }}>
            <div style={{
              fontFamily: D2.serif, fontSize: 56, lineHeight: 0.6,
              color: D2.accent2, marginBottom: 8, fontStyle: 'italic',
            }}>&ldquo;</div>
            <blockquote style={{
              margin: 0, fontFamily: D2.serif, fontSize: 19,
              lineHeight: 1.45, fontWeight: 400, letterSpacing: '-0.005em',
              color: D2.ink,
            }}>{q.q}</blockquote>
            <div style={{
              marginTop: 18, paddingTop: 12,
              borderTop: `1px solid ${D2.ruleSoft}`,
              fontFamily: D2.sans, fontSize: 12, color: D2.ink2,
            }}>
              <div style={{ fontWeight: 600 }}>{q.who}</div>
              <div style={{ color: D2.muted, marginTop: 2 }}>{q.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────────
function D2CTA() {
  return (
    <div style={{
      padding: '72px 56px',
      background: D2.ink, color: D2.bg,
      fontFamily: D2.serif,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 56,
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: D2.sans, fontSize: 11, color: '#d3c89a',
            letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 14,
          }}>The invitation</div>
          <h2 style={{
            fontFamily: D2.serif, fontSize: 58, fontWeight: 400,
            lineHeight: 1, letterSpacing: '-0.03em', margin: 0,
          }}>
            Run your next five rollovers in Rift,<br/>
            <span style={{ fontStyle: 'italic', color: '#d3c89a' }}>alongside us.</span>
          </h2>
        </div>
        <div>
          <p style={{
            fontFamily: D2.serif, fontSize: 16, lineHeight: 1.6,
            color: 'rgba(247,243,236,0.8)', margin: '0 0 22px',
          }}>
            A two-week pilot, free. We set up your firm and users, and sit
            alongside your ops team on a real rollover. If it doesn't pay for
            itself in the first month, there's nothing to cancel.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              background: D2.bg, color: D2.ink, border: 'none',
              padding: '13px 22px', borderRadius: 2,
              fontFamily: D2.sans, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}>Request a walkthrough →</button>
            <button style={{
              background: 'transparent', color: D2.bg,
              border: `1px solid rgba(247,243,236,0.3)`,
              padding: '13px 22px', borderRadius: 2,
              fontFamily: D2.sans, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}>Read the plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function D2Footer() {
  return (
    <div style={{
      padding: '22px 56px',
      fontFamily: D2.sans, fontSize: 11, color: D2.muted,
      display: 'flex', justifyContent: 'space-between',
      borderTop: `1px solid ${D2.rule}`,
    }}>
      <span>© 2026 Rift Systems, Inc. · Printed in the cloud.</span>
      <span style={{ display: 'flex', gap: 18 }}>
        <span>Privacy</span><span>Terms</span><span>Security</span><span>Status</span>
      </span>
    </div>
  );
}

Object.assign(window, { D2Landing });
