"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ChecklistDoc {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploadedByClient: boolean;
}
interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  status: "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";
  sortOrder: number;
  documents: ChecklistDoc[];
}
interface Note {
  id: string;
  body: string;
  createdAt: string;
  fromClient: boolean;
  author: { firstName: string; lastName: string } | null;
}
interface RolloverCaseSummary {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  statusLabel: string;
  statusUpdatedAt: string;
  createdAt: string;
  firm: { name: string; supportEmail: string | null; supportPhone: string | null; logoUrl: string | null };
  assignedAdvisor: { firstName: string; lastName: string } | null;
}

const STAGE_ORDER = [
  "PROPOSAL_ACCEPTED",
  "AWAITING_CLIENT_ACTION",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "PROCESSING",
  "IN_TRANSIT",
  "WON",
] as const;

const STAGE_LABELS: Record<string, string> = {
  PROPOSAL_ACCEPTED: "Started",
  AWAITING_CLIENT_ACTION: "Your input",
  READY_TO_SUBMIT: "Submitting",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In transit",
  WON: "Complete",
};

const STAGE_COPY: Record<string, { headline: string; sub: string }> = {
  PROPOSAL_ACCEPTED: {
    headline: "Welcome — your rollover is officially underway.",
    sub: "Your team is gathering everything they need to start the transfer.",
  },
  AWAITING_CLIENT_ACTION: {
    headline: "We need a few things from you.",
    sub: "Use the checklist below to upload documents or confirm details.",
  },
  READY_TO_SUBMIT: {
    headline: "Everything is in order.",
    sub: "Your team is preparing to submit your transfer to the receiving custodian.",
  },
  SUBMITTED: {
    headline: "Your transfer is on its way.",
    sub: "We've submitted everything to the receiving custodian.",
  },
  PROCESSING: {
    headline: "The custodian is processing your transfer.",
    sub: "This can take a few business days. We'll let you know if anything is needed.",
  },
  IN_TRANSIT: {
    headline: "Funds are in motion.",
    sub: "The transfer is being completed between custodians.",
  },
  WON: {
    headline: "Your rollover is complete.",
    sub: "Thanks for trusting us with this transfer.",
  },
};

const ITEM_STATUS_THEME: Record<
  ChecklistItem["status"],
  { label: string; bg: string; fg: string; ring: string }
> = {
  NOT_STARTED: { label: "Not started", bg: "rgba(125,133,144,0.12)", fg: "#a4abb7", ring: "rgba(125,133,144,0.3)" },
  REQUESTED:   { label: "Action needed", bg: "rgba(245,158,11,0.12)", fg: "#fbbf24", ring: "rgba(245,158,11,0.4)" },
  RECEIVED:    { label: "Received", bg: "rgba(59,130,246,0.14)", fg: "#7dd3fc", ring: "rgba(59,130,246,0.4)" },
  REVIEWED:    { label: "Reviewed", bg: "rgba(167,139,250,0.14)", fg: "#c4b5fd", ring: "rgba(167,139,250,0.4)" },
  COMPLETE:    { label: "Complete", bg: "rgba(52,211,153,0.14)", fg: "#6ee7b7", ring: "rgba(52,211,153,0.4)" },
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FileIcon({ fileType }: { fileType: string }) {
  const tone = fileType === "application/pdf"
    ? { bg: "rgba(248,113,113,0.12)", fg: "#fca5a5", border: "rgba(248,113,113,0.25)" }
    : fileType.startsWith("image/")
    ? { bg: "rgba(196,181,253,0.12)", fg: "#c4b5fd", border: "rgba(196,181,253,0.25)" }
    : fileType.includes("word")
    ? { bg: "rgba(96,165,250,0.12)", fg: "#93c5fd", border: "rgba(96,165,250,0.25)" }
    : { bg: "rgba(125,133,144,0.12)", fg: "#a4abb7", border: "rgba(125,133,144,0.25)" };
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: tone.fg }}>
        <path
          d="M3.5 1.5h6L13 5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M9.5 1.5V5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ClientPortal({
  rolloverCase,
  checklist: initialChecklist,
  initialNotes,
  scope,
}: {
  rolloverCase: RolloverCaseSummary;
  checklist: ChecklistItem[];
  initialNotes: Note[];
  scope: "VIEW" | "UPLOAD" | "FULL";
}) {
  const router = useRouter();
  const [checklist, setChecklist] = useState(initialChecklist);
  const [notes, setNotes] = useState(initialNotes);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTone, setErrorTone] = useState<"error" | "info">("error");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const canUpload = scope === "UPLOAD" || scope === "FULL";
  const canMessage = scope === "FULL";

  // Pipeline state
  const currentStageIndex = STAGE_ORDER.indexOf(rolloverCase.status as (typeof STAGE_ORDER)[number]);
  const stageCopy = STAGE_COPY[rolloverCase.status] ?? STAGE_COPY.PROPOSAL_ACCEPTED;

  // Checklist progress
  const { completedCount, totalCount, openCount } = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((i) => i.status === "COMPLETE" || i.status === "REVIEWED" || i.status === "RECEIVED").length;
    const open = checklist.filter((i) => i.status === "REQUESTED" || i.status === "NOT_STARTED").length;
    return { completedCount: completed, totalCount: total, openCount: open };
  }, [checklist]);

  // Auto-scroll the messages panel to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: "smooth" });
  }, [notes.length]);

  async function reload() {
    const [cl, nt] = await Promise.all([
      fetch("/api/client/checklist").then((r) => r.json()),
      fetch("/api/client/messages").then((r) => r.json()),
    ]);
    setChecklist(cl);
    setNotes(nt);
  }

  async function reloadChecklist() {
    const cl = await fetch("/api/client/checklist").then((r) => r.json());
    setChecklist(cl);
  }

  function showError(msg: string, tone: "error" | "info" = "error") {
    setError(msg);
    setErrorTone(tone);
    setTimeout(() => setError((curr) => (curr === msg ? null : curr)), 5000);
  }

  async function handleUpload(item: ChecklistItem, file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      showError("Please upload a PDF, JPG, PNG, WEBP, or DOCX file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("File is too large — maximum 20MB.");
      return;
    }
    setUploadingFor(item.id);
    try {
      const qs = new URLSearchParams({
        filename: file.name,
        fileType: file.type,
        fileSize: String(file.size),
        checklistItemId: item.id,
      });
      const presignRes = await fetch(`/api/client/documents/presign?${qs}`);
      if (!presignRes.ok) throw new Error((await presignRes.json()).error ?? "Upload refused");
      const { url, fields, key } = await presignRes.json();

      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v as string));
      form.append("file", file);
      const s3Res = await fetch(url, { method: "POST", body: form });
      if (!s3Res.ok) throw new Error("Upload to storage failed");

      const confirmRes = await fetch("/api/client/documents/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: file.name,
          fileType: file.type,
          fileSize: file.size,
          checklistItemId: item.id,
        }),
      });
      if (!confirmRes.ok) throw new Error((await confirmRes.json()).error ?? "Confirmation failed");
      await reloadChecklist();
      showError("File uploaded. Your team has been notified.", "info");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleAcknowledge(item: ChecklistItem) {
    await fetch(`/api/client/checklist/${item.id}/acknowledge`, { method: "POST" });
    await reloadChecklist();
  }

  async function handleDownload(docId: string) {
    setDownloadingId(docId);
    try {
      const res = await fetch(`/api/client/documents/${docId}`);
      if (!res.ok) throw new Error("Couldn't open this file");
      const { url } = await res.json();
      window.open(url, "_blank", "noopener");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageDraft.trim()) return;
    setSendingMessage(true);
    const draft = messageDraft;
    setMessageDraft(""); // optimistic clear
    const res = await fetch("/api/client/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    setSendingMessage(false);
    if (res.ok) {
      const newNotes = await fetch("/api/client/messages").then((r) => r.json());
      setNotes(newNotes);
    } else {
      setMessageDraft(draft); // restore on failure
      showError("Couldn't send message — please try again.");
    }
  }

  async function handleLogout() {
    await fetch("/api/client/session", { method: "DELETE" });
    router.push("/client/expired");
  }

  const advisorInitials = rolloverCase.assignedAdvisor
    ? `${rolloverCase.assignedAdvisor.firstName[0] ?? ""}${rolloverCase.assignedAdvisor.lastName[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 1200px 600px at top, rgba(59,130,246,0.06), transparent 60%), #0a0d12",
        color: "#e4e6ea",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3 min-w-0">
            {rolloverCase.firm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rolloverCase.firm.logoUrl}
                alt={rolloverCase.firm.name}
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                style={{ border: "1px solid #252b38" }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1px solid #252b38", color: "#93c5fd" }}
              >
                {rolloverCase.firm.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: "#7d8590" }}>
                {rolloverCase.firm.name}
              </p>
              <p className="text-sm font-medium truncate" style={{ color: "#e4e6ea" }}>
                Client portal
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md transition-colors flex-shrink-0"
            style={{ background: "transparent", border: "1px solid #252b38", color: "#9ca3af" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#3b3f49";
              (e.currentTarget as HTMLElement).style.color = "#e4e6ea";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#252b38";
              (e.currentTarget as HTMLElement).style.color = "#9ca3af";
            }}
          >
            Sign out
          </button>
        </header>

        {/* ── Hero / Status card ─────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(59,130,246,0.05), transparent 60%), #141a24",
            border: "1px solid #252b38",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(59,130,246,0.08)", transform: "translate(30%, -40%)" }}
            aria-hidden
          />
          <p className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: "#60a5fa" }}>
            {STAGE_LABELS[rolloverCase.status] ?? rolloverCase.statusLabel}
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold leading-tight"
            style={{ color: "#e4e6ea" }}
          >
            Hi {rolloverCase.clientFirstName}, {stageCopy.headline.toLowerCase()}
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "#9ca3af" }}>
            {stageCopy.sub}
          </p>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6"
            style={{ borderTop: "1px solid #252b38" }}
          >
            <div>
              <p className="text-xs" style={{ color: "#7d8590" }}>From</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "#e4e6ea" }}>
                {rolloverCase.sourceProvider}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#7d8590" }}>To</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "#e4e6ea" }}>
                {rolloverCase.destinationCustodian}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs" style={{ color: "#7d8590" }}>Last update</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "#e4e6ea" }}>
                {formatRelative(rolloverCase.statusUpdatedAt)}
              </p>
            </div>
          </div>
        </section>

        {/* ── Pipeline timeline ─────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-5 sm:p-6 mb-6"
          style={{ background: "#141a24", border: "1px solid #252b38" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Progress</h2>
            <p className="text-xs" style={{ color: "#7d8590" }}>
              Step {Math.max(1, currentStageIndex + 1)} of {STAGE_ORDER.length}
            </p>
          </div>
          {/* Mobile: vertical stepper. Desktop: horizontal. */}
          <div className="hidden sm:flex items-center gap-1.5">
            {STAGE_ORDER.map((stage, idx) => {
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;
              return (
                <div key={stage} className="flex-1 flex flex-col items-center min-w-0">
                  <div className="w-full flex items-center">
                    <div
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background: idx === 0 ? "transparent" : isDone || isCurrent ? "#3b82f6" : "#252b38",
                      }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full mx-1 flex-shrink-0 transition-all"
                      style={{
                        background: isDone ? "#3b82f6" : isCurrent ? "#60a5fa" : "#1f2937",
                        border: isCurrent ? "2px solid rgba(96,165,250,0.4)" : "none",
                        boxShadow: isCurrent ? "0 0 0 4px rgba(96,165,250,0.15)" : "none",
                      }}
                    />
                    <div
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background: idx === STAGE_ORDER.length - 1 ? "transparent" : isDone ? "#3b82f6" : "#252b38",
                      }}
                    />
                  </div>
                  <p
                    className="text-[10px] mt-2 font-medium text-center"
                    style={{
                      color: isCurrent ? "#e4e6ea" : isDone ? "#9ca3af" : isFuture ? "#5b6471" : "#9ca3af",
                    }}
                  >
                    {STAGE_LABELS[stage]}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="sm:hidden space-y-2">
            {STAGE_ORDER.map((stage, idx) => {
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: isDone ? "#3b82f6" : isCurrent ? "#60a5fa" : "#1f2937",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(96,165,250,0.2)" : "none",
                    }}
                  />
                  <p
                    className="text-xs"
                    style={{
                      color: isCurrent ? "#e4e6ea" : isDone ? "#9ca3af" : "#5b6471",
                      fontWeight: isCurrent ? 500 : 400,
                    }}
                  >
                    {STAGE_LABELS[stage]}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Inline notice ──────────────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 mb-6 text-sm flex items-start gap-3"
            style={{
              background: errorTone === "error" ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
              border: `1px solid ${errorTone === "error" ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"}`,
              color: errorTone === "error" ? "#fca5a5" : "#6ee7b7",
            }}
            role={errorTone === "error" ? "alert" : "status"}
          >
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="opacity-60 hover:opacity-100 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Checklist / items needed ──────────────────────────────────── */}
        <section
          className="rounded-2xl p-5 sm:p-6 mb-6"
          style={{ background: "#141a24", border: "1px solid #252b38" }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>
              Your checklist
            </h2>
            {totalCount > 0 && (
              <p className="text-xs" style={{ color: "#7d8590" }}>
                {completedCount} of {totalCount} done
              </p>
            )}
          </div>
          <p className="text-xs mb-5" style={{ color: "#7d8590" }}>
            {openCount > 0
              ? `${openCount} item${openCount === 1 ? "" : "s"} need your attention.`
              : "You're all caught up — nothing needed from you right now."}
          </p>

          {totalCount > 0 && (
            <div
              className="h-1.5 rounded-full mb-5 overflow-hidden"
              style={{ background: "#1c2128" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalCount === 0 ? "0%" : `${(completedCount / totalCount) * 100}%`,
                  background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                }}
              />
            </div>
          )}

          {checklist.length === 0 && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: "#0d1117", border: "1px dashed #252b38" }}
            >
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                Nothing needed right now. Your team will reach out if anything comes up.
              </p>
            </div>
          )}

          <ul className="space-y-2.5">
            {checklist.map((item) => {
              const theme = ITEM_STATUS_THEME[item.status];
              const actionable = item.status === "REQUESTED" || item.status === "NOT_STARTED";
              const isUploading = uploadingFor === item.id;
              const isDragOver = dragOverItem === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-xl transition-colors"
                  style={{
                    background: isDragOver ? "rgba(59,130,246,0.06)" : "#0d1117",
                    border: `1px solid ${isDragOver ? "rgba(96,165,250,0.4)" : "#1c2128"}`,
                  }}
                  onDragOver={(e) => {
                    if (!actionable || !canUpload) return;
                    e.preventDefault();
                    setDragOverItem(item.id);
                  }}
                  onDragLeave={() => setDragOverItem((curr) => (curr === item.id ? null : curr))}
                  onDrop={(e) => {
                    if (!actionable || !canUpload) return;
                    e.preventDefault();
                    setDragOverItem(null);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleUpload(item, f);
                  }}
                >
                  <div className="p-4 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: "#e4e6ea" }}>
                          {item.name}
                        </p>
                        {item.required && (
                          <span
                            className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5" }}
                          >
                            Required
                          </span>
                        )}
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: theme.bg, color: theme.fg, border: `1px solid ${theme.ring}` }}
                        >
                          {theme.label}
                        </span>
                      </div>
                      {actionable && canUpload && (
                        <p className="text-xs mt-1.5" style={{ color: "#7d8590" }}>
                          Drag a file here, or click upload. PDF / image / Word, up to 20 MB.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {actionable && canUpload && (
                        <label
                          className="text-xs px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 font-medium transition-colors"
                          style={{
                            background: isUploading ? "#1f2937" : "#3b82f6",
                            color: "#fff",
                            opacity: isUploading ? 0.6 : 1,
                          }}
                        >
                          {isUploading ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="animate-spin">
                                <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 6" />
                              </svg>
                              Uploading…
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                <path d="M5.5 1.5v8M2 5l3.5-3.5L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Upload
                            </>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept={ALLOWED_MIME.join(",")}
                            disabled={isUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(item, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                      {actionable && !canUpload && (
                        <button
                          onClick={() => handleAcknowledge(item)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium"
                          style={{ background: "#252b38", border: "1px solid #3b3f49", color: "#e4e6ea" }}
                        >
                          Mark as done
                        </button>
                      )}
                    </div>
                  </div>

                  {item.documents.length > 0 && (
                    <ul className="px-4 pb-4 space-y-1.5" style={{ borderTop: "1px solid #1c2128", paddingTop: "12px" }}>
                      {item.documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#161c26")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                        >
                          <FileIcon fileType={d.fileType} />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => handleDownload(d.id)}
                              disabled={downloadingId === d.id}
                              className="text-sm font-medium block text-left truncate w-full transition-colors"
                              style={{ color: "#e4e6ea" }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#93c5fd")}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#e4e6ea")}
                            >
                              {d.name}
                            </button>
                            <p className="text-[11px] mt-0.5" style={{ color: "#7d8590" }}>
                              {formatBytes(d.fileSize)} ·{" "}
                              <span
                                style={{ color: d.uploadedByClient ? "#6ee7b7" : "#93c5fd" }}
                              >
                                {d.uploadedByClient ? "You uploaded" : "Shared by your team"}
                              </span>{" "}
                              · {formatRelative(d.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDownload(d.id)}
                            disabled={downloadingId === d.id}
                            className="text-xs px-2 py-1 rounded transition-colors flex-shrink-0"
                            style={{ color: "#7d8590" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#93c5fd")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7d8590")}
                            aria-label={`Download ${d.name}`}
                          >
                            {downloadingId === d.id ? "Opening…" : "Download"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        {canMessage && (
          <section
            className="rounded-2xl p-5 sm:p-6 mb-6"
            style={{ background: "#141a24", border: "1px solid #252b38" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "#e4e6ea" }}>Messages</h2>
              {rolloverCase.assignedAdvisor && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff" }}
                  >
                    {advisorInitials}
                  </div>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>
                    {rolloverCase.assignedAdvisor.firstName} {rolloverCase.assignedAdvisor.lastName}
                  </p>
                </div>
              )}
            </div>

            <div
              ref={messagesEndRef}
              className="space-y-2.5 mb-4 max-h-96 overflow-y-auto pr-1"
            >
              {notes.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: "#0d1117", border: "1px dashed #252b38" }}
                >
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    Your team will respond here. Send a message any time.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex ${note.fromClient ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                      style={{
                        background: note.fromClient
                          ? "linear-gradient(135deg,#3b82f6,#2563eb)"
                          : "#0d1117",
                        border: note.fromClient ? "none" : "1px solid #252b38",
                        color: note.fromClient ? "#fff" : "#e4e6ea",
                      }}
                    >
                      <p
                        className="text-[11px] mb-1"
                        style={{ color: note.fromClient ? "rgba(255,255,255,0.7)" : "#7d8590" }}
                      >
                        {note.fromClient
                          ? "You"
                          : note.author
                          ? `${note.author.firstName} ${note.author.lastName}`
                          : rolloverCase.firm.name}{" "}
                        · {formatRelative(note.createdAt)}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendMessage(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition-colors"
                style={{
                  background: "#0d1117",
                  border: "1px solid #252b38",
                  color: "#e4e6ea",
                }}
                onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#3b82f680")}
                onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#252b38")}
                rows={2}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageDraft.trim()}
                className="text-sm px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: "#3b82f6", color: "#fff" }}
                aria-label="Send message"
              >
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </form>
            <p className="text-[10px] mt-2" style={{ color: "#5b6471" }}>
              Tip: press ⌘/Ctrl + Enter to send.
            </p>
          </section>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer
          className="rounded-2xl p-5 text-center"
          style={{ background: "#141a24", border: "1px solid #252b38" }}
        >
          <p className="text-sm font-medium" style={{ color: "#e4e6ea" }}>
            Need help?
          </p>
          <p className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>
            Reach out to {rolloverCase.firm.name} directly:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs">
            {rolloverCase.firm.supportEmail && (
              <a
                href={`mailto:${rolloverCase.firm.supportEmail}`}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={{ background: "#0d1117", border: "1px solid #252b38", color: "#93c5fd" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#1c2128";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#0d1117";
                }}
              >
                {rolloverCase.firm.supportEmail}
              </a>
            )}
            {rolloverCase.firm.supportPhone && (
              <a
                href={`tel:${rolloverCase.firm.supportPhone}`}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={{ background: "#0d1117", border: "1px solid #252b38", color: "#93c5fd" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#1c2128";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#0d1117";
                }}
              >
                {rolloverCase.firm.supportPhone}
              </a>
            )}
          </div>
          <p className="text-[10px] mt-4" style={{ color: "#5b6471" }}>
            Secure portal · Your information is private
          </p>
        </footer>
      </div>
    </div>
  );
}
