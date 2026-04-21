"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: { firstName: string; lastName: string };
};

export type MailingRoute = {
  id: string;
  label: string;
  states: string[];
  mailingAddress: string | null;
  overnightAddress: string | null;
};

export type Custodian = {
  id: string;
  name: string;
  legalName: string | null;
  aliases: string[];
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  mailingAddress: string | null;
  overnightAddress: string | null;
  wireInstructions: string | null;
  typicalProcessingDays: number | null;
  minProcessingDays: number | null;
  maxProcessingDays: number | null;
  signatureRequirements: string | null;
  medallionRequired: boolean;
  medallionThreshold: number | null;
  notarizationRequired: boolean;
  acceptsElectronic: boolean;
  acceptsDigitalSignature: boolean;
  supportsACATS: boolean;
  overview: string | null;
  quirks: string[];
  commonForms: string[];
  tags: string[];
  lastVerifiedAt: string | null;
  mailingRoutes: MailingRoute[];
  notes: Note[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ query: string; resultCount: number }>;
};

const SUGGESTIONS = [
  "What's Fidelity's Medallion threshold?",
  "Who takes the longest to process a 401(k) rollover?",
  "Which custodians accept DocuSign?",
  "Summarize TIAA's annuity quirks",
];

export default function IntelligenceWorkspace({
  custodians: initialCustodians,
  firmOperatingStates,
}: {
  custodians: Custodian[];
  firmOperatingStates: string[];
}) {
  const [custodians, setCustodians] = useState<Custodian[]>(initialCustodians);
  const [selected, setSelected] = useState<Custodian | null>(null);
  const [filter, setFilter] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return custodians;
    return custodians.filter((c) => {
      const hay = [c.name, c.legalName ?? "", ...c.aliases, ...c.tags, c.overview ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filter, custodians]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setError(null);
    setSending(true);

    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        message: string;
        toolCalls: Array<{ query: string; resultCount: number }>;
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, toolCalls: data.toolCalls },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  function updateCustodian(updated: Custodian) {
    setCustodians((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
      {/* Chat panel */}
      <div
        className="rounded-lg overflow-hidden flex flex-col"
        style={{ background: "#0d1117", border: "1px solid #21262d", height: "calc(100vh - 160px)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid #21262d" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8a5 5 0 1 1 10 0 5 5 0 0 1-10 0ZM8 5v3l2 1"
              stroke="#388bfd"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>
            Ask Rift
          </span>
          <span
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "#161b22", border: "1px solid #21262d", color: "#7d8590" }}
          >
            claude-opus-4-7
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#7d8590" }}>
                Ask about any custodian — contact info, processing times, signature requirements, or quirks your team has noted. Try:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-md transition-colors"
                    style={{
                      background: "#161b22",
                      border: "1px solid #21262d",
                      color: "#c9d1d9",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                style={{
                  background: m.role === "user" ? "#21262d" : "#0f2c4d",
                  color: m.role === "user" ? "#e4e6ea" : "#79c0ff",
                  border: "1px solid #21262d",
                }}
              >
                {m.role === "user" ? "You" : "R"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs mb-1" style={{ color: "#7d8590" }}>
                  {m.role === "user" ? "You" : "Rift Intelligence"}
                </div>
                {m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.toolCalls.map((t, j) => (
                      <span
                        key={j}
                        className="text-[11px] px-2 py-0.5 rounded inline-flex items-center gap-1"
                        style={{
                          background: "#161b22",
                          border: "1px solid #21262d",
                          color: "#7d8590",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <circle cx="4" cy="4" r="2.5" stroke="#7d8590" strokeWidth="1" />
                          <path d="M6 6l2 2" stroke="#7d8590" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                        {t.query ? `"${t.query}"` : "list all"} · {t.resultCount} result{t.resultCount === 1 ? "" : "s"}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#c9d1d9" }}
                >
                  {renderMarkdown(m.content)}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                style={{ background: "#0f2c4d", color: "#79c0ff", border: "1px solid #21262d" }}
              >
                R
              </div>
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: "#7d8590" }}>
                  Rift Intelligence
                </div>
                <div className="flex gap-1 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#388bfd" }} />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#388bfd", animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#388bfd", animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              background: "#2d1b1e",
              borderTop: "1px solid #3b1f22",
              color: "#ff7b72",
            }}
          >
            {error}
          </div>
        )}

        <div className="px-4 py-3" style={{ borderTop: "1px solid #21262d" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a custodian…"
              disabled={sending}
              className="flex-1 px-3 py-2 rounded-md text-sm outline-none transition-colors"
              style={{
                background: "#161b22",
                border: "1px solid #21262d",
                color: "#e4e6ea",
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: "#388bfd", color: "#fff" }}
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* Custodian directory */}
      <div
        className="rounded-lg overflow-hidden flex flex-col"
        style={{ background: "#0d1117", border: "1px solid #21262d", height: "calc(100vh - 160px)" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #21262d" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>
              Custodians
            </span>
            <span className="text-xs" style={{ color: "#7d8590" }}>
              {filtered.length}/{custodians.length}
            </span>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, tag, alias…"
            className="w-full px-3 py-1.5 rounded-md text-sm outline-none"
            style={{
              background: "#161b22",
              border: "1px solid #21262d",
              color: "#e4e6ea",
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left px-4 py-2.5 transition-colors hover:bg-[#161b22]"
              style={{ borderBottom: "1px solid #161b22" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#e4e6ea" }}>
                    {c.name}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "#161b22", border: "1px solid #21262d", color: "#7d8590" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {c.notes.length > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1"
                    style={{ background: "#0f2c4d", color: "#79c0ff" }}
                    title={`${c.notes.length} firm note${c.notes.length === 1 ? "" : "s"}`}
                  >
                    {c.notes.length}
                  </span>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "#7d8590" }}>
              No custodians match.
            </div>
          )}
        </div>
      </div>

      {selected && (
        <CustodianDetail
          custodian={selected}
          firmOperatingStates={firmOperatingStates}
          onClose={() => setSelected(null)}
          onUpdate={updateCustodian}
        />
      )}
    </div>
  );
}

function CustodianDetail({
  custodian,
  firmOperatingStates,
  onClose,
  onUpdate,
}: {
  custodian: Custodian;
  firmOperatingStates: string[];
  onClose: () => void;
  onUpdate: (c: Custodian) => void;
}) {
  const [tab, setTab] = useState<"overview" | "notes">("overview");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim() || !noteBody.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/custodians/${custodian.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle.trim(),
          body: noteBody.trim(),
          pinned: notePinned,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to save note");
      }
      const note = (await res.json()) as Note;
      onUpdate({ ...custodian, notes: [note, ...custodian.notes] });
      setNoteTitle("");
      setNoteBody("");
      setNotePinned(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/custodians/${custodian.id}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onUpdate({ ...custodian, notes: custodian.notes.filter((n) => n.id !== noteId) });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        style={{
          background: "#0d1117",
          border: "1px solid #30363d",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid #21262d" }}>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate" style={{ color: "#e4e6ea" }}>
              {custodian.name}
            </h2>
            {custodian.legalName && (
              <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
                {custodian.legalName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {custodian.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "#161b22", border: "1px solid #21262d", color: "#7d8590" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#21262d] transition-colors"
            style={{ color: "#7d8590" }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex gap-4 px-5 pt-3" style={{ borderBottom: "1px solid #21262d" }}>
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabButton>
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
            Firm Notes ({custodian.notes.length})
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "overview" ? (
            <OverviewTab c={custodian} firmOperatingStates={firmOperatingStates} onUpdate={onUpdate} />
          ) : (
            <div className="space-y-4">
              <form onSubmit={addNote} className="space-y-2 p-3 rounded-lg" style={{ background: "#161b22", border: "1px solid #21262d" }}>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  className="w-full px-3 py-1.5 rounded-md text-sm outline-none"
                  style={{ background: "#0d1117", border: "1px solid #21262d", color: "#e4e6ea" }}
                />
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="What did you learn?"
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-md text-sm outline-none resize-none"
                  style={{ background: "#0d1117", border: "1px solid #21262d", color: "#e4e6ea" }}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs" style={{ color: "#7d8590" }}>
                    <input
                      type="checkbox"
                      checked={notePinned}
                      onChange={(e) => setNotePinned(e.target.checked)}
                    />
                    Pin to top
                  </label>
                  <button
                    type="submit"
                    disabled={saving || !noteTitle.trim() || !noteBody.trim()}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40"
                    style={{ background: "#388bfd", color: "#fff" }}
                  >
                    {saving ? "Saving…" : "Add note"}
                  </button>
                </div>
                {err && (
                  <p className="text-xs" style={{ color: "#ff7b72" }}>
                    {err}
                  </p>
                )}
              </form>

              {custodian.notes.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "#7d8590" }}>
                  No firm notes yet. Capture what your team has learned about {custodian.name}.
                </p>
              ) : (
                custodian.notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg"
                    style={{ background: "#161b22", border: "1px solid #21262d" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {n.pinned && (
                          <span title="Pinned">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="#e3b341">
                              <path d="M4 1h4l-1 4 3 2-4 1v3l-1 1-1-1V8L0 7l3-2z" />
                            </svg>
                          </span>
                        )}
                        <h4 className="text-sm font-semibold truncate" style={{ color: "#e4e6ea" }}>
                          {n.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="text-xs opacity-60 hover:opacity-100"
                        style={{ color: "#ff7b72" }}
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2" style={{ color: "#c9d1d9" }}>
                      {n.body}
                    </p>
                    <p className="text-xs" style={{ color: "#7d8590" }}>
                      {n.author.firstName} {n.author.lastName} · {new Date(n.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-sm pb-2 font-medium transition-colors"
      style={{
        color: active ? "#e4e6ea" : "#7d8590",
        borderBottom: active ? "2px solid #388bfd" : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function OverviewTab({
  c,
  firmOperatingStates,
  onUpdate,
}: {
  c: Custodian;
  firmOperatingStates: string[];
  onUpdate: (c: Custodian) => void;
}) {
  return (
    <div className="space-y-5">
      {c.overview && (
        <p className="text-sm leading-relaxed" style={{ color: "#c9d1d9" }}>
          {c.overview}
        </p>
      )}

      <Section title="Contact">
        <Field label="Phone" value={c.phone} mono />
        <Field label="Fax" value={c.fax} mono />
        <Field label="Email" value={c.email} />
        <Field label="Website" value={c.website} link />
      </Section>

      <Section title="Mailing">
        <MailingSection c={c} firmOperatingStates={firmOperatingStates} />
      </Section>

      <Section title="Processing">
        <Field
          label="Typical"
          value={c.typicalProcessingDays != null ? `${c.typicalProcessingDays} days` : null}
        />
        <Field
          label="Range"
          value={
            c.minProcessingDays != null && c.maxProcessingDays != null
              ? `${c.minProcessingDays}–${c.maxProcessingDays} days`
              : null
          }
        />
        <Field label="ACATS" value={c.supportsACATS ? "Supported" : "Not supported"} />
      </Section>

      <Section title="Signatures">
        {c.signatureRequirements && (
          <p className="text-sm mb-3" style={{ color: "#c9d1d9" }}>
            {c.signatureRequirements}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Chip on={c.medallionRequired} label={
            c.medallionRequired && c.medallionThreshold
              ? `Medallion ≥ $${c.medallionThreshold.toLocaleString()}`
              : c.medallionRequired
              ? "Medallion required"
              : "No Medallion"
          } />
          <Chip on={c.notarizationRequired} label={c.notarizationRequired ? "Notarization" : "No notary"} />
          <Chip on={c.acceptsElectronic} label={c.acceptsElectronic ? "Electronic accepted" : "Paper only"} />
          <Chip on={c.acceptsDigitalSignature} label={c.acceptsDigitalSignature ? "DocuSign ok" : "No DocuSign"} />
        </div>
      </Section>

      {c.quirks.length > 0 && (
        <Section title="Quirks">
          <ul className="space-y-1.5">
            {c.quirks.map((q, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "#c9d1d9" }}>
                <span style={{ color: "#7d8590" }}>•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {c.commonForms.length > 0 && (
        <Section title="Common forms">
          <div className="flex flex-wrap gap-1.5">
            {c.commonForms.map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#161b22", border: "1px solid #21262d", color: "#c9d1d9" }}
              >
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}

      {c.aliases.length > 0 && (
        <Section title="Also known as">
          <div className="flex flex-wrap gap-1.5">
            {c.aliases.map((a) => (
              <span
                key={a}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#161b22", border: "1px solid #21262d", color: "#7d8590" }}
              >
                {a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {c.lastVerifiedAt && (
        <p className="text-xs" style={{ color: "#7d8590" }}>
          Last verified {new Date(c.lastVerifiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function MailingSection({
  c,
  firmOperatingStates,
}: {
  c: Custodian;
  firmOperatingStates: string[];
}) {
  const hasRoutes = c.mailingRoutes.length > 0;
  const firmStates = firmOperatingStates.map((s) => s.toUpperCase());
  const matchedRoute =
    hasRoutes && firmStates.length > 0
      ? c.mailingRoutes.find((r) => r.states.some((s) => firmStates.includes(s.toUpperCase()))) ?? null
      : null;

  return (
    <div className="space-y-3">
      {hasRoutes && (
        firmStates.length > 0 ? (
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
            style={{ background: "#0f2c4d", border: "1px solid #1f6feb", color: "#79c0ff" }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#79c0ff" strokeWidth="1.2" />
              <path d="M6 5v3M6 3.5v.5" stroke="#79c0ff" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Showing address for your firm&apos;s state{firmStates.length > 1 ? "s" : ""}:{" "}
            <span className="font-semibold">{firmStates.join(", ")}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
            style={{ background: "#1c1408", border: "1px solid #3a2a00", color: "#e3b341" }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 10H1L6 1Z" stroke="#e3b341" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 5v2.5M6 9v.5" stroke="#e3b341" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Set your firm&apos;s operating states in{" "}
            <a href="/dashboard/settings" className="underline font-semibold" style={{ color: "#e3b341" }}>
              Settings → Firm
            </a>{" "}
            to see the right address automatically.
          </div>
        )
      )}

      {hasRoutes ? (
        <>
          {matchedRoute && <MailingRouteCard route={matchedRoute} matched />}
          {firmStates.length > 0 && !matchedRoute && (
            <p className="text-xs italic" style={{ color: "#7d8590" }}>
              No routing match for your state{firmStates.length > 1 ? "s" : ""}. All routes shown below.
            </p>
          )}
          {c.mailingRoutes
            .filter((r) => r !== matchedRoute)
            .map((r) => (
              <MailingRouteCard key={r.id} route={r} matched={false} />
            ))}
        </>
      ) : (c.mailingAddress || c.overnightAddress) ? (
        <>
          <Field label="Mailing" value={c.mailingAddress} multiline />
          <Field label="Overnight" value={c.overnightAddress} multiline />
        </>
      ) : (
        <p className="text-xs" style={{ color: "#484f58" }}>
          No mailing information on file.
        </p>
      )}

      {c.wireInstructions && <Field label="Wire" value={c.wireInstructions} multiline />}
    </div>
  );
}

function MailingRouteCard({
  route,
  matched,
}: {
  route: MailingRoute;
  matched: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        background: matched ? "#0a1f0a" : "#161b22",
        border: `1px solid ${matched ? "#1a4a1a" : "#21262d"}`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold truncate" style={{ color: matched ? "#3fb950" : "#8b949e" }}>
          {route.label}
        </span>
        {matched && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{ background: "#0d3a0d", color: "#3fb950", border: "1px solid #1a4a1a" }}
          >
            ✓ Your match
          </span>
        )}
      </div>

      {route.states.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {route.states.map((s) => (
            <span
              key={s}
              className="text-[10px] px-1 py-0.5 rounded font-mono"
              style={{ background: "#0d1117", border: "1px solid #21262d", color: "#7d8590" }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {route.mailingAddress && (
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "#484f58" }}>Standard</p>
          <p className="text-sm whitespace-pre-line" style={{ color: "#c9d1d9" }}>{route.mailingAddress}</p>
        </div>
      )}
      {route.overnightAddress && (
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "#484f58" }}>Overnight</p>
          <p className="text-sm whitespace-pre-line" style={{ color: "#c9d1d9" }}>{route.overnightAddress}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#7d8590" }}>
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  link,
  multiline,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  link?: boolean;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={multiline ? "flex flex-col gap-0.5" : "grid grid-cols-[100px_1fr] gap-2"}>
      <span className="text-xs" style={{ color: "#7d8590" }}>
        {label}
      </span>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-sm hover:underline truncate"
          style={{ color: "#79c0ff" }}
        >
          {value}
        </a>
      ) : (
        <span
          className={`text-sm ${mono ? "font-mono" : ""} ${multiline ? "" : "truncate"}`}
          style={{ color: "#c9d1d9" }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded inline-flex items-center gap-1.5"
      style={{
        background: on ? "#0f2c4d" : "#161b22",
        border: `1px solid ${on ? "#1f6feb" : "#21262d"}`,
        color: on ? "#79c0ff" : "#7d8590",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: on ? "#3fb950" : "#484f58" }}
      />
      {label}
    </span>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex gap-2" style={{ paddingLeft: bulletMatch[1].length * 8 }}>
          <span style={{ color: "#7d8590" }}>•</span>
          <span>{inline(bulletMatch[2])}</span>
        </div>
      );
    }
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
    return <div key={i}>{inline(line)}</div>;
  });
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={idx++} style={{ color: "#e4e6ea" }}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={idx++}
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ background: "#161b22", color: "#79c0ff" }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
