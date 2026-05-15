"use client";

import { useEffect, useRef, useState } from "react";
import { T, HEADLINE_STACK } from "./tokens";
import { Card, Pill, Btn, Icon, TextInput } from "./primitives";

export type V2Custodian = {
  id: string;
  name: string;
  legalName: string | null;
  tags: string[];
  typicalProcessingDays: number | null;
  minProcessingDays: number | null;
  maxProcessingDays: number | null;
  signatureRequirements: string | null;
  medallionRequired: boolean;
  acceptsElectronic: boolean;
  supportsACATS: boolean;
  overview: string | null;
  quirks: string[];
  noteCount: number;
  notes: Array<{
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    author: { firstName: string; lastName: string };
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ query: string; resultCount: number }>;
};

const SUGGESTIONS = [
  "Which custodians require a Medallion for IRA-to-IRA?",
  "Compare ACATS turnaround across our top 3 destinations",
  "Empower 403(b) spousal consent — what form?",
  "Schwab routing by state",
];

export default function IntelligenceV2({
  custodians,
  aiUsage,
}: {
  custodians: V2Custodian[];
  aiUsage?: { used: number; limit: number };
}) {
  const [activeId, setActiveId] = useState<string | null>(custodians[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = custodians.find((c) => c.id === activeId) ?? custodians[0] ?? null;
  const filtered = filter.trim()
    ? custodians.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : custodians;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
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
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: T.page }}>
      {/* Header */}
      <div
        style={{
          padding: "26px 36px 18px",
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: T.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Tribal knowledge
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              color: T.text,
              letterSpacing: -0.5,
              fontFamily: HEADLINE_STACK,
            }}
          >
            Intelligence
          </h1>
          <div style={{ marginTop: 5, fontSize: 13.5, color: T.textSecondary }}>
            Ask Claude about custodian quirks, paperwork, and your firm&rsquo;s notes.
            {aiUsage && (
              <span style={{ color: T.textTertiary, marginLeft: 8 }}>
                · {aiUsage.used} of {aiUsage.limit} used this month
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "0 36px 28px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* CHAT */}
        <Card style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              padding: "12px 18px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: T.accentSoft,
                border: `1px solid ${T.accentBorder}`,
                display: "grid",
                placeItems: "center",
                color: T.accent,
              }}
            >
              <Icon name="spark" size={14} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>
                Custodian assistant
              </div>
              <div style={{ fontSize: 11, color: T.textTertiary }}>
                claude-sonnet · grounded in your firm notes
              </div>
            </div>
            {messages.length > 0 && (
              <Btn small ghost onClick={() => setMessages([])}>
                <Icon name="refresh" size={12} /> New thread
              </Btn>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: T.textTertiary,
                  fontSize: 13,
                }}
              >
                Ask anything about custodian processes, forms, or routing.
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} m={m} />
            ))}
            {sending && (
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: T.accentSoft,
                    border: `1px solid ${T.accentBorder}`,
                    display: "grid",
                    placeItems: "center",
                    color: T.accent,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="spark" size={14} />
                </div>
                <div style={{ fontSize: 13, color: T.textTertiary }}>Thinking…</div>
              </div>
            )}
            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{
                      height: 28,
                      padding: "0 12px",
                      borderRadius: 999,
                      background: T.surface1,
                      border: `1px solid ${T.border}`,
                      color: T.textSecondary,
                      fontSize: 12,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              padding: "12px 18px 14px",
              borderTop: `1px solid ${T.border}`,
              background: T.surface2,
            }}
          >
            <div
              style={{
                background: T.surface1,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about a custodian, form, or routing rule…"
                style={{
                  width: "100%",
                  minHeight: 48,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  resize: "none",
                  fontFamily: "inherit",
                  fontSize: 13.5,
                  color: T.text,
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 10.5,
                    color: T.textTertiary,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  ⌘ + ↵
                </span>
                <Btn primary small onClick={() => send()} disabled={!input.trim() || sending}>
                  <Icon name="arrowRight" size={12} /> Send
                </Btn>
              </div>
            </div>
          </div>
        </Card>

        {/* DIRECTORY */}
        <Card style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              Custodian directory
            </div>
            <TextInput
              value={filter}
              onChange={setFilter}
              placeholder="Filter custodians…"
              prefix={<Icon name="search" size={14} />}
            />
          </div>

          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <div
              style={{
                width: 220,
                borderRight: `1px solid ${T.border}`,
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "20px 14px",
                    fontSize: 12,
                    color: T.textTertiary,
                    textAlign: "center",
                  }}
                >
                  No matches.
                </div>
              )}
              {filtered.map((c) => {
                const isActive = c.id === active?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      padding: "11px 14px",
                      cursor: "pointer",
                      borderLeft: `2px solid ${isActive ? T.accent : "transparent"}`,
                      background: isActive ? T.surface2 : "transparent",
                      borderBottom: `1px solid ${T.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: T.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10.5,
                        color: T.textTertiary,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="doc" size={10} /> {c.noteCount} notes
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", minWidth: 0 }}>
              {active ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 17,
                        color: T.text,
                        fontFamily: HEADLINE_STACK,
                        fontWeight: 600,
                      }}
                    >
                      {active.name}
                    </h3>
                  </div>
                  {active.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        flexWrap: "wrap",
                        marginBottom: 14,
                      }}
                    >
                      {active.tags.slice(0, 5).map((t) => (
                        <Pill key={t} hue="slate" small>
                          {t}
                        </Pill>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 14,
                    }}
                  >
                    {[
                      [
                        "Processing",
                        active.typicalProcessingDays
                          ? `${active.typicalProcessingDays} biz days`
                          : "—",
                      ],
                      ["Signature", active.signatureRequirements ?? "—"],
                      ["Medallion", active.medallionRequired ? "Required" : "Not required"],
                      ["ACATS", active.supportsACATS ? "Supported" : "Not supported"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", padding: "4px 0", fontSize: 12 }}>
                        <span style={{ width: 100, color: T.textTertiary }}>{k}</span>
                        <span style={{ color: T.text, fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {active.overview && (
                    <>
                      <div
                        style={{
                          marginBottom: 6,
                          fontSize: 11,
                          color: T.textTertiary,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Overview
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          background: T.surface2,
                          border: `1px solid ${T.borderSoft}`,
                          borderRadius: 8,
                          fontSize: 12.5,
                          color: T.text,
                          lineHeight: 1.5,
                          marginBottom: 12,
                        }}
                      >
                        {active.overview}
                      </div>
                    </>
                  )}

                  {active.notes.length > 0 && (
                    <>
                      <div
                        style={{
                          marginBottom: 6,
                          fontSize: 11,
                          color: T.textTertiary,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Firm notes
                      </div>
                      {active.notes.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: "10px 12px",
                            background: n.pinned ? T.accentSoft : T.surface2,
                            border: `1px solid ${n.pinned ? T.accentBorder : T.borderSoft}`,
                            borderRadius: 8,
                            fontSize: 12.5,
                            color: T.text,
                            lineHeight: 1.5,
                            marginBottom: 8,
                          }}
                        >
                          {n.pinned && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <Icon name="star" size={11} color={T.accent} />
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: T.accent }}
                              >
                                Pinned · {n.author.firstName} {n.author.lastName}
                              </span>
                            </div>
                          )}
                          {n.body}
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div style={{ color: T.textTertiary, fontSize: 12.5 }}>No custodian selected.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChatMessage({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "78%",
            background: T.accent,
            color: T.surface1,
            padding: "10px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 13.5,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: T.accentSoft,
          border: `1px solid ${T.accentBorder}`,
          display: "grid",
          placeItems: "center",
          color: T.accent,
          flexShrink: 0,
        }}
      >
        <Icon name="spark" size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {m.toolCalls && m.toolCalls.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {m.toolCalls.map((tc, i) => (
              <div
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: T.surface2,
                  border: `1px solid ${T.border}`,
                  fontSize: 11,
                  color: T.textSecondary,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                <Icon name="bolt" size={11} color={T.textTertiary} />
                <b style={{ color: T.text, fontWeight: 600 }}>search_custodians</b>
                <span style={{ color: T.textTertiary }}>(&quot;{tc.query}&quot;)</span>
                <span style={{ color: T.textTertiary }}>· {tc.resultCount} result{tc.resultCount === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            fontSize: 13.5,
            color: T.text,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {m.content}
        </div>
      </div>
    </div>
  );
}
