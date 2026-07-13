"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T, HEADLINE_STACK, PILL_HUES, type Hue } from "./tokens";

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

const ITEM_STATUS: Record<ChecklistItem["status"], { label: string; hue: Hue }> = {
  NOT_STARTED: { label: "Not started", hue: "slate" },
  REQUESTED:   { label: "Action needed", hue: "amber" },
  RECEIVED:    { label: "Received", hue: "blue" },
  REVIEWED:    { label: "Reviewed", hue: "violet" },
  COMPLETE:    { label: "Complete", hue: "green" },
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const CARD: React.CSSProperties = {
  background: T.surface1,
  border: `1px solid ${T.border}`,
  boxShadow: T.cardShadow,
};

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
  const hue: Hue = fileType === "application/pdf"
    ? "red"
    : fileType.startsWith("image/")
    ? "violet"
    : fileType.includes("word")
    ? "blue"
    : "slate";
  const tone = PILL_HUES[hue];
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: tone.bg, border: `1px solid ${tone.line}` }}
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

function StatusPill({ status }: { status: ChecklistItem["status"] }) {
  const cfg = ITEM_STATUS[status];
  const tone = PILL_HUES[cfg.hue];
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5"
      style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.line}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
      {cfg.label}
    </span>
  );
}

function FirmLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [broken, setBroken] = useState(false);
  if (logoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        onError={() => setBroken(true)}
        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
        style={{ border: `1px solid ${T.border}`, background: T.surface1 }}
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
      style={{ background: T.accentSoft, border: `1px solid ${T.accentBorder}`, color: T.accent }}
    >
      {name.charAt(0)}
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

  const currentStageIndex = STAGE_ORDER.indexOf(rolloverCase.status as (typeof STAGE_ORDER)[number]);
  const stageCopy = STAGE_COPY[rolloverCase.status] ?? STAGE_COPY.PROPOSAL_ACCEPTED;

  const { completedCount, totalCount, openCount } = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((i) => i.status === "COMPLETE" || i.status === "REVIEWED" || i.status === "RECEIVED").length;
    const open = checklist.filter((i) => i.status === "REQUESTED" || i.status === "NOT_STARTED").length;
    return { completedCount: completed, totalCount: total, openCount: open };
  }, [checklist]);

  useEffect(() => {
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: "smooth" });
  }, [notes.length]);

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
    setMessageDraft("");
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
      setMessageDraft(draft);
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
    <div className="min-h-screen" style={{ background: T.page, color: T.text }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3 min-w-0">
            <FirmLogo name={rolloverCase.firm.name} logoUrl={rolloverCase.firm.logoUrl} />
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: T.textTertiary }}>
                {rolloverCase.firm.name}
              </p>
              <p className="text-sm font-medium truncate" style={{ color: T.text }}>
                Client portal
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md transition-colors flex-shrink-0"
            style={{ background: T.surface1, border: `1px solid ${T.border}`, color: T.textSecondary }}
          >
            Sign out
          </button>
        </header>

        {/* ── Hero / Status card ─────────────────────────────────────────── */}
        <section className="rounded-2xl p-6 sm:p-8 mb-6" style={CARD}>
          <p className="text-xs uppercase tracking-wider mb-3 font-semibold" style={{ color: T.accent }}>
            {STAGE_LABELS[rolloverCase.status] ?? rolloverCase.statusLabel}
          </p>
          <h1
            className="text-2xl sm:text-3xl leading-tight"
            style={{ color: T.text, fontFamily: HEADLINE_STACK, fontWeight: 600, letterSpacing: -0.4 }}
          >
            Hi {rolloverCase.clientFirstName}, {stageCopy.headline.toLowerCase()}
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: T.textSecondary }}>
            {stageCopy.sub}
          </p>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6"
            style={{ borderTop: `1px solid ${T.borderSoft}` }}
          >
            <div>
              <p className="text-xs" style={{ color: T.textTertiary }}>From</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: T.text }}>
                {rolloverCase.sourceProvider}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: T.textTertiary }}>To</p>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: T.text }}>
                {rolloverCase.destinationCustodian}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs" style={{ color: T.textTertiary }}>Last update</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: T.text }}>
                {formatRelative(rolloverCase.statusUpdatedAt)}
              </p>
            </div>
          </div>
        </section>

        {/* ── Pipeline timeline ─────────────────────────────────────────── */}
        <section className="rounded-2xl p-5 sm:p-6 mb-6" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: T.text }}>Progress</h2>
            <p className="text-xs" style={{ color: T.textTertiary }}>
              Step {Math.max(1, currentStageIndex + 1)} of {STAGE_ORDER.length}
            </p>
          </div>
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
                        background: idx === 0 ? "transparent" : isDone || isCurrent ? T.accent : T.borderSoft,
                      }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full mx-1 flex-shrink-0 transition-all"
                      style={{
                        background: isDone ? T.accent : isCurrent ? T.accent : T.surface3,
                        boxShadow: isCurrent ? `0 0 0 4px ${T.accentSoft}` : "none",
                      }}
                    />
                    <div
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        background: idx === STAGE_ORDER.length - 1 ? "transparent" : isDone ? T.accent : T.borderSoft,
                      }}
                    />
                  </div>
                  <p
                    className="text-[10px] mt-2 font-medium text-center"
                    style={{
                      color: isCurrent ? T.text : isDone ? T.textSecondary : isFuture ? T.textDisabled : T.textSecondary,
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
                      background: isDone || isCurrent ? T.accent : T.surface3,
                      boxShadow: isCurrent ? `0 0 0 3px ${T.accentSoft}` : "none",
                    }}
                  />
                  <p
                    className="text-xs"
                    style={{
                      color: isCurrent ? T.text : isDone ? T.textSecondary : T.textDisabled,
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
              background: errorTone === "error" ? T.dangerSoft : T.successSoft,
              border: `1px solid ${errorTone === "error" ? T.dangerBorder : T.successBorder}`,
              color: errorTone === "error" ? T.danger : T.success,
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
        <section className="rounded-2xl p-5 sm:p-6 mb-6" style={CARD}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold" style={{ color: T.text }}>
              Your checklist
            </h2>
            {totalCount > 0 && (
              <p className="text-xs" style={{ color: T.textTertiary }}>
                {completedCount} of {totalCount} done
              </p>
            )}
          </div>
          <p className="text-xs mb-5" style={{ color: T.textTertiary }}>
            {openCount > 0
              ? `${openCount} item${openCount === 1 ? "" : "s"} need your attention.`
              : "You're all caught up — nothing needed from you right now."}
          </p>

          {totalCount > 0 && (
            <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: T.surface2 }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: totalCount === 0 ? "0%" : `${(completedCount / totalCount) * 100}%`,
                  background: T.accent,
                }}
              />
            </div>
          )}

          {checklist.length === 0 && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: T.surface2, border: `1px dashed ${T.border}` }}
            >
              <p className="text-sm" style={{ color: T.textSecondary }}>
                Nothing needed right now. Your team will reach out if anything comes up.
              </p>
            </div>
          )}

          <ul className="space-y-2.5">
            {checklist.map((item) => {
              // Clients can upload until ops signs off on the item — this
              // includes RECEIVED so corrected versions can be re-submitted.
              const uploadable = item.status !== "REVIEWED" && item.status !== "COMPLETE";
              const actionable = item.status === "REQUESTED" || item.status === "NOT_STARTED";
              const isUploading = uploadingFor === item.id;
              const isDragOver = dragOverItem === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-xl transition-colors"
                  style={{
                    background: isDragOver ? T.accentSoft : T.surface2,
                    border: `1px solid ${isDragOver ? T.accentBorder : T.borderSoft}`,
                  }}
                  onDragOver={(e) => {
                    if (!uploadable || !canUpload) return;
                    e.preventDefault();
                    setDragOverItem(item.id);
                  }}
                  onDragLeave={() => setDragOverItem((curr) => (curr === item.id ? null : curr))}
                  onDrop={(e) => {
                    if (!uploadable || !canUpload) return;
                    e.preventDefault();
                    setDragOverItem(null);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleUpload(item, f);
                  }}
                >
                  <div className="p-4 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: T.text }}>
                          {item.name}
                        </p>
                        {item.required && (
                          <span
                            className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: T.dangerSoft, color: T.danger }}
                          >
                            Required
                          </span>
                        )}
                        <StatusPill status={item.status} />
                      </div>
                      {uploadable && canUpload && (
                        <p className="text-xs mt-1.5" style={{ color: T.textTertiary }}>
                          Drag a file here, or click upload. PDF / image / Word, up to 20 MB.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {uploadable && canUpload && (
                        <label
                          className="text-xs px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 font-semibold transition-colors"
                          style={{
                            background: T.accent,
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
                          style={{ background: T.surface1, border: `1px solid ${T.borderStrong}`, color: T.text }}
                        >
                          Mark as done
                        </button>
                      )}
                    </div>
                  </div>

                  {item.documents.length > 0 && (
                    <ul
                      className="px-4 pb-4 space-y-1.5"
                      style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: "12px" }}
                    >
                      {item.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                          <FileIcon fileType={d.fileType} />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => handleDownload(d.id)}
                              disabled={downloadingId === d.id}
                              className="text-sm font-medium block text-left truncate w-full hover:underline"
                              style={{ color: T.text }}
                            >
                              {d.name}
                            </button>
                            <p className="text-[11px] mt-0.5" style={{ color: T.textTertiary }}>
                              {formatBytes(d.fileSize)} ·{" "}
                              <span style={{ color: d.uploadedByClient ? T.success : T.info }}>
                                {d.uploadedByClient ? "You uploaded" : "Shared by your team"}
                              </span>{" "}
                              · {formatRelative(d.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDownload(d.id)}
                            disabled={downloadingId === d.id}
                            className="text-xs px-2 py-1 rounded flex-shrink-0 hover:underline"
                            style={{ color: T.textSecondary }}
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
          <section className="rounded-2xl p-5 sm:p-6 mb-6" style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: T.text }}>Messages</h2>
              {rolloverCase.assignedAdvisor && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: T.accent, color: "#fff" }}
                  >
                    {advisorInitials}
                  </div>
                  <p className="text-xs" style={{ color: T.textSecondary }}>
                    {rolloverCase.assignedAdvisor.firstName} {rolloverCase.assignedAdvisor.lastName}
                  </p>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} className="space-y-2.5 mb-4 max-h-96 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: T.surface2, border: `1px dashed ${T.border}` }}
                >
                  <p className="text-sm" style={{ color: T.textSecondary }}>
                    Your team will respond here. Send a message any time.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className={`flex ${note.fromClient ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                      style={{
                        background: note.fromClient ? T.accent : T.surface2,
                        border: note.fromClient ? "none" : `1px solid ${T.borderSoft}`,
                        color: note.fromClient ? "#fff" : T.text,
                      }}
                    >
                      <p
                        className="text-[11px] mb-1"
                        style={{ color: note.fromClient ? "rgba(255,255,255,0.75)" : T.textTertiary }}
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
                style={{ background: T.input, border: `1px solid ${T.border}`, color: T.text }}
                onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = T.borderFocus)}
                onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = T.border)}
                rows={2}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageDraft.trim()}
                className="text-sm px-4 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: T.accent, color: "#fff" }}
                aria-label="Send message"
              >
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </form>
            <p className="text-[10px] mt-2" style={{ color: T.textDisabled }}>
              Tip: press ⌘/Ctrl + Enter to send.
            </p>
          </section>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="rounded-2xl p-5 text-center" style={CARD}>
          <p className="text-sm font-medium" style={{ color: T.text }}>
            Need help?
          </p>
          <p className="text-xs mt-1.5" style={{ color: T.textSecondary }}>
            Reach out to {rolloverCase.firm.name} directly:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs">
            {rolloverCase.firm.supportEmail && (
              <a
                href={`mailto:${rolloverCase.firm.supportEmail}`}
                className="px-3 py-1.5 rounded-md"
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.accent }}
              >
                {rolloverCase.firm.supportEmail}
              </a>
            )}
            {rolloverCase.firm.supportPhone && (
              <a
                href={`tel:${rolloverCase.firm.supportPhone}`}
                className="px-3 py-1.5 rounded-md"
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.accent }}
              >
                {rolloverCase.firm.supportPhone}
              </a>
            )}
          </div>
          <p className="text-[10px] mt-4" style={{ color: T.textDisabled }}>
            Secure portal · Your information is private
          </p>
        </footer>
      </div>
    </div>
  );
}
