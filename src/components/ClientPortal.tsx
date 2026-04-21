"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChecklistDoc { id: string; name: string; createdAt: string; }
interface ChecklistItem {
  id: string; name: string; required: boolean;
  status: "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";
  sortOrder: number; documents: ChecklistDoc[];
}
interface Note {
  id: string; body: string; createdAt: string; fromClient: boolean;
  author: { firstName: string; lastName: string } | null;
}
interface RolloverCaseSummary {
  id: string; clientFirstName: string; clientLastName: string;
  sourceProvider: string; destinationCustodian: string; accountType: string;
  status: string; statusLabel: string; statusUpdatedAt: string; createdAt: string;
  firm: { name: string; supportEmail: string | null; supportPhone: string | null };
  assignedAdvisor: { firstName: string; lastName: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  NOT_STARTED: "#6b7280",
  REQUESTED: "#f59e0b",
  RECEIVED: "#3b82f6",
  REVIEWED: "#8b5cf6",
  COMPLETE: "#10b981",
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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
  const [error, setError] = useState<string | null>(null);

  const canUpload = scope === "UPLOAD" || scope === "FULL";
  const canMessage = scope === "FULL";

  async function reload() {
    const [cl, nt] = await Promise.all([
      fetch("/api/client/checklist").then((r) => r.json()),
      fetch("/api/client/messages").then((r) => r.json()),
    ]);
    setChecklist(cl);
    setNotes(nt);
  }

  async function handleUpload(item: ChecklistItem, file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Please upload a PDF, JPG, PNG, WEBP, or DOCX file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File is too large — maximum 20MB.");
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
          key, name: file.name, fileType: file.type, fileSize: file.size, checklistItemId: item.id,
        }),
      });
      if (!confirmRes.ok) throw new Error((await confirmRes.json()).error ?? "Confirmation failed");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleAcknowledge(item: ChecklistItem) {
    await fetch(`/api/client/checklist/${item.id}/acknowledge`, { method: "POST" });
    await reload();
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageDraft.trim()) return;
    setSendingMessage(true);
    const res = await fetch("/api/client/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: messageDraft }),
    });
    setSendingMessage(false);
    if (res.ok) {
      setMessageDraft("");
      await reload();
    }
  }

  async function handleLogout() {
    await fetch("/api/client/session", { method: "DELETE" });
    router.push("/client/expired");
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#0d1117", color: "#c9d1d9" }}>
      <div className="max-w-3xl mx-auto">
        <header className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: "#7d8590" }}>{rolloverCase.firm.name}</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: "#e4e6ea" }}>
              Welcome, {rolloverCase.clientFirstName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
              Rollover from {rolloverCase.sourceProvider} to {rolloverCase.destinationCustodian}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
          >
            Sign out
          </button>
        </header>

        <section className="rounded-xl p-5 mb-6" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "#7d8590" }}>Current status</p>
          <p className="text-lg font-medium mt-1" style={{ color: "#e4e6ea" }}>{rolloverCase.statusLabel}</p>
          {rolloverCase.assignedAdvisor && (
            <p className="text-sm mt-2" style={{ color: "#9ca3af" }}>
              Your advisor: {rolloverCase.assignedAdvisor.firstName} {rolloverCase.assignedAdvisor.lastName}
            </p>
          )}
        </section>

        <section className="rounded-xl p-5 mb-6" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#e4e6ea" }}>Items needed from you</h2>
          {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
          {checklist.length === 0 && <p className="text-sm" style={{ color: "#9ca3af" }}>Nothing needed right now.</p>}
          <ul className="space-y-3">
            {checklist.map((item) => {
              const color = STATUS_COLOR[item.status] ?? "#6b7280";
              const actionable = item.status === "REQUESTED" || item.status === "NOT_STARTED";
              return (
                <li key={item.id} className="p-3 rounded-lg" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#e4e6ea" }}>
                        {item.name}
                        {item.required && <span className="text-xs ml-2" style={{ color: "#f87171" }}>required</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color }}>{item.status.replace("_", " ").toLowerCase()}</p>
                    </div>
                    {actionable && canUpload && (
                      <label
                        className="text-xs px-3 py-1.5 rounded-md cursor-pointer"
                        style={{ background: "#2563eb", color: "#fff" }}
                      >
                        {uploadingFor === item.id ? "Uploading…" : "Upload file"}
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingFor === item.id}
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
                        className="text-xs px-3 py-1.5 rounded-md"
                        style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
                      >
                        Mark as done
                      </button>
                    )}
                  </div>
                  {item.documents.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {item.documents.map((d) => (
                        <li key={d.id} className="text-xs" style={{ color: "#7d8590" }}>{d.name}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {canMessage && (
          <section className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#e4e6ea" }}>Messages</h2>
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {notes.length === 0 && <p className="text-sm" style={{ color: "#9ca3af" }}>No messages yet.</p>}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded-lg"
                  style={{
                    background: note.fromClient ? "#0d1f38" : "#0d1117",
                    border: "1px solid #21262d",
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: "#7d8590" }}>
                    {note.fromClient ? "You" : note.author ? `${note.author.firstName} ${note.author.lastName}` : "Firm"}
                    {" · "}
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "#c9d1d9" }}>{note.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="Send a message to your team…"
                className="flex-1 rounded-md px-3 py-2 text-sm resize-none"
                style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
                rows={2}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageDraft.trim()}
                className="text-sm px-4 py-2 rounded-md disabled:opacity-50"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                {sendingMessage ? "Sending…" : "Send"}
              </button>
            </form>
          </section>
        )}

        <footer className="mt-8 text-xs text-center" style={{ color: "#7d8590" }}>
          Questions? Contact {rolloverCase.firm.name}
          {rolloverCase.firm.supportEmail && ` at ${rolloverCase.firm.supportEmail}`}
          {rolloverCase.firm.supportPhone && ` · ${rolloverCase.firm.supportPhone}`}
        </footer>
      </div>
    </div>
  );
}
