"use client";

import { useState } from "react";

interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
  checklistItem: { id: string; name: string } | null;
}

interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  status: ChecklistStatus;
  notes: string | null;
  sortOrder: number;
  documents: Document[];
}

type ChecklistStatus = "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";

interface Props {
  caseId: string;
  initialItems: ChecklistItem[];
  userRole: string;
  onDocumentUploaded: () => void;
}

const STATUS_OPTIONS: { value: ChecklistStatus; label: string; bg: string; text: string; dot: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400"   },
  { value: "REQUESTED",   label: "Requested",   bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-400"  },
  { value: "RECEIVED",    label: "Received",    bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500"   },
  { value: "REVIEWED",    label: "Reviewed",    bg: "bg-violet-50",   text: "text-violet-700", dot: "bg-violet-500" },
  { value: "COMPLETE",    label: "Complete",    bg: "bg-emerald-50",  text: "text-emerald-700",dot: "bg-emerald-500"},
];

function getStatusStyle(status: ChecklistStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChecklistPanel({ caseId, initialItems, userRole, onDocumentUploaded }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const completedRequired = required.filter((i) => i.status === "COMPLETE").length;
  const progress = required.length > 0 ? Math.round((completedRequired / required.length) * 100) : 0;

  async function refreshItems() {
    const res = await fetch(`/api/cases/${caseId}/checklist`);
    if (res.ok) setItems(await res.json());
  }

  async function handleStatusChange(itemId: string, status: ChecklistStatus) {
    setSaving(itemId);
    await fetch(`/api/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    await refreshItems();
  }

  async function handleSaveNotes(itemId: string) {
    setSaving(itemId + "-notes");
    await fetch(`/api/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft[itemId] ?? "" }),
    });
    setSaving(null);
    setExpandedNotes((prev) => { const s = new Set(prev); s.delete(itemId); return s; });
    await refreshItems();
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setSaving("new");
    await fetch(`/api/cases/${caseId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newItemName.trim(), required: false }),
    });
    setSaving(null);
    setNewItemName("");
    setAddingItem(false);
    await refreshItems();
  }

  async function handleDelete(itemId: string) {
    setSaving(itemId + "-del");
    await fetch(`/api/checklist/${itemId}`, { method: "DELETE" });
    setSaving(null);
    await refreshItems();
  }

  async function handleUpload(itemId: string, file: File) {
    setUploadingFor(itemId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("checklistItemId", itemId);
    await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
    setUploadingFor(null);
    await refreshItems();
    onDocumentUploaded();
  }

  async function handleDownload(docId: string) {
    const res = await fetch(`/api/documents/${docId}`);
    if (res.ok) {
      const { url, name } = await res.json();
      const a = document.createElement("a");
      a.href = url; a.download = name; a.target = "_blank"; a.click();
    }
  }

  function toggleNotes(itemId: string, currentNotes: string | null) {
    setNotesDraft((d) => ({ ...d, [itemId]: currentNotes ?? "" }));
    setExpandedNotes((prev) => {
      const s = new Set(prev);
      s.has(itemId) ? s.delete(itemId) : s.add(itemId);
      return s;
    });
  }

  function renderItems(list: ChecklistItem[]) {
    return list.map((item) => {
      const style = getStatusStyle(item.status);
      const isComplete = item.status === "COMPLETE";

      return (
        <div
          key={item.id}
          className={`rounded-lg border transition-colors ${
            isComplete ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <div className="flex items-start gap-3 p-3">
            {/* Status icon */}
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isComplete
                ? "border-emerald-500 bg-emerald-500"
                : item.status === "NOT_STARTED"
                ? "border-gray-200"
                : "border-blue-400"
            }`}>
              {isComplete && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {!isComplete && item.status !== "NOT_STARTED" && (
                <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm ${isComplete ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {item.name}
                </span>
                {item.required && (
                  <span className="text-[10px] font-medium text-red-400 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    Required
                  </span>
                )}
              </div>

              {/* Linked documents */}
              {item.documents.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {item.documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDownload(doc.id)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 group/doc"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="flex-shrink-0">
                        <path d="M2 2.5h4.5l2.5 2.5V9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6.5 2.5v2.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      <span className="group-hover/doc:underline truncate max-w-48">{doc.name}</span>
                      <span className="text-gray-400">({formatBytes(doc.fileSize)})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Notes */}
              {expandedNotes.has(item.id) ? (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={notesDraft[item.id] ?? ""}
                    onChange={(e) => setNotesDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Add notes…"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNotes(item.id)}
                      disabled={saving === item.id + "-notes"}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setExpandedNotes((s) => { const n = new Set(s); n.delete(item.id); return n; })}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : item.notes ? (
                <p
                  className="text-xs text-gray-400 mt-1 cursor-pointer hover:text-gray-600 italic"
                  onClick={() => toggleNotes(item.id, item.notes)}
                >
                  {item.notes}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Status selector */}
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.id, e.target.value as ChecklistStatus)}
                disabled={saving === item.id}
                className={`text-xs rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer font-medium ${style.bg} ${style.text} disabled:opacity-60`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Upload */}
              <label className="cursor-pointer w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Attach file">
                {uploadingFor === item.id ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 9V3M4 5.5L6.5 3 9 5.5M2 11h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.id, f); e.target.value = ""; }}
                />
              </label>

              {/* Note toggle */}
              <button
                onClick={() => toggleNotes(item.id, item.notes)}
                className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Notes"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 9.5V11h1.5L10 4.5 8.5 3 2 9.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Delete */}
              {(userRole === "ADMIN" || userRole === "OPS") && (
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={saving === item.id + "-del"}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "var(--shadow-xs)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-500">
              <path d="M1.5 4h2v2h-2zM1.5 8h2v2h-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M5.5 5h7M5.5 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">Checklist</span>
            <span className="ml-2 text-xs text-gray-400">{completedRequired}/{required.length} required</span>
          </div>
        </div>
        <button
          onClick={() => setAddingItem((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          {addingItem ? "Cancel" : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Add item
            </>
          )}
        </button>
      </div>

      <div className="p-5">
        {/* Progress bar */}
        {required.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Progress</span>
              <span className={`text-xs font-semibold ${progress === 100 ? "text-emerald-600" : "text-gray-600"}`}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Add item form */}
        {addingItem && (
          <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
            <input
              autoFocus
              type="text"
              placeholder="New checklist item…"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={saving === "new"}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving === "new" ? "Adding…" : "Add"}
            </button>
          </form>
        )}

        {/* Required items */}
        {required.length === 0 && optional.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No checklist items.</p>
        ) : (
          <div className="space-y-1.5 mb-4">{renderItems(required)}</div>
        )}

        {/* Optional items */}
        {optional.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Optional</p>
            <div className="space-y-1.5">{renderItems(optional)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
