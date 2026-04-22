"use client";

import { useState } from "react";
import DarkSelect from "./DarkSelect";

interface Document { id: string; name: string; fileType: string; fileSize: number; createdAt: string; uploadedBy: { id: string; firstName: string; lastName: string }; checklistItem: { id: string; name: string } | null; }
interface ChecklistItem { id: string; name: string; required: boolean; status: ChecklistStatus; notes: string | null; sortOrder: number; documents: Document[]; }
type ChecklistStatus = "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";
interface Props { caseId: string; initialItems: ChecklistItem[]; userRole: string; onDocumentUploaded: () => void; }

const STATUS_OPTIONS: { value: ChecklistStatus; label: string; bg: string; text: string; dot: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", bg: "#21262d",  text: "#8b949e",  dot: "#6e7681"  },
  { value: "REQUESTED",   label: "Requested",   bg: "#2d2208",  text: "#e09937",  dot: "#d29922"  },
  { value: "RECEIVED",    label: "Received",    bg: "#0d1f38",  text: "#79c0ff",  dot: "#388bfd"  },
  { value: "REVIEWED",    label: "Reviewed",    bg: "#1d1535",  text: "#c4b5fd",  dot: "#a78bfa"  },
  { value: "COMPLETE",    label: "Complete",    bg: "#0d2318",  text: "#6ee7b7",  dot: "#3fb950"  },
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
  const allRequiredDone = required.length > 0 && completedRequired === required.length;

  // Status bucket counts (non-zero only, for pills)
  const statusBuckets = STATUS_OPTIONS
    .map((s) => ({ ...s, count: items.filter((i) => i.status === s.value).length }))
    .filter((s) => s.count > 0);

  async function refreshItems() {
    const res = await fetch(`/api/cases/${caseId}/checklist`);
    if (res.ok) setItems(await res.json());
  }

  async function handleStatusChange(itemId: string, status: ChecklistStatus) {
    setSaving(itemId);
    await fetch(`/api/checklist/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSaving(null);
    await refreshItems();
  }

  async function handleSaveNotes(itemId: string) {
    setSaving(itemId + "-notes");
    await fetch(`/api/checklist/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: notesDraft[itemId] ?? "" }) });
    setSaving(null);
    setExpandedNotes((prev) => { const s = new Set(prev); s.delete(itemId); return s; });
    await refreshItems();
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setSaving("new");
    await fetch(`/api/cases/${caseId}/checklist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newItemName.trim(), required: false }) });
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
    setExpandedNotes((prev) => { const s = new Set(prev); s.has(itemId) ? s.delete(itemId) : s.add(itemId); return s; });
  }

  function renderItems(list: ChecklistItem[]) {
    return list.map((item) => {
      const style = getStatusStyle(item.status);
      const isComplete = item.status === "COMPLETE";

      return (
        <div key={item.id} className="rounded-lg transition-colors" style={{ border: `1px solid ${isComplete ? "#1a3a26" : "#21262d"}`, background: isComplete ? "rgba(13,35,24,0.5)" : "#0d1117" }}>
          <div className="flex items-start gap-3 p-3">
            {/* Status icon */}
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
              style={{ borderColor: isComplete ? "#238636" : item.status === "NOT_STARTED" ? "#30363d" : "#388bfd", background: isComplete ? "#238636" : "transparent" }}>
              {isComplete && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {!isComplete && item.status !== "NOT_STARTED" && (
                <div className="w-2 h-2 rounded-full" style={{ background: style.dot }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm" style={{ color: isComplete ? "#484f58" : "#c9d1d9", textDecoration: isComplete ? "line-through" : "none" }}>
                  {item.name}
                </span>
                {item.required && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "#3d1f1f", color: "#f87171" }}>
                    Required
                  </span>
                )}
              </div>

              {/* Linked documents */}
              {item.documents.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {item.documents.map((doc) => (
                    <button key={doc.id} onClick={() => handleDownload(doc.id)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group/doc">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="flex-shrink-0">
                        <path d="M2 2.5h4.5l2.5 2.5V9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6.5 2.5v2.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      <span className="group-hover/doc:underline truncate max-w-48">{doc.name}</span>
                      <span style={{ color: "#7d8590" }}>({formatBytes(doc.fileSize)})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Notes */}
              {expandedNotes.has(item.id) ? (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    className="w-full text-xs rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-0"
                    style={{ background: "#161b22", border: "1px solid #30363d", color: "#c9d1d9" }}
                    rows={2}
                    value={notesDraft[item.id] ?? ""}
                    onChange={(e) => setNotesDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Add notes…"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveNotes(item.id)} disabled={saving === item.id + "-notes"} className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 font-medium transition-colors">Save</button>
                    <button onClick={() => setExpandedNotes((s) => { const n = new Set(s); n.delete(item.id); return n; })} className="text-xs transition-colors" style={{ color: "#7d8590" }}>Cancel</button>
                  </div>
                </div>
              ) : item.notes ? (
                <p className="text-xs mt-1 cursor-pointer italic transition-colors" style={{ color: "#7d8590" }} onClick={() => toggleNotes(item.id, item.notes)}>
                  {item.notes}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <DarkSelect
                value={item.status}
                onChange={(v) => handleStatusChange(item.id, v as ChecklistStatus)}
                disabled={saving === item.id}
                options={STATUS_OPTIONS}
                renderTrigger={(selected) => (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
                    <span style={{ color: style.text }}>{selected?.label}</span>
                  </span>
                )}
                className="w-36"
              />

              {/* Upload */}
              <label className="cursor-pointer w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ color: "#7d8590" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#79c0ff"; (e.currentTarget as HTMLElement).style.background = "rgba(56,139,253,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#7d8590"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title="Attach file">
                {uploadingFor === item.id ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 9V3M4 5.5L6.5 3 9 5.5M2 11h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.id, f); e.target.value = ""; }} />
              </label>

              {/* Note toggle */}
              <button onClick={() => toggleNotes(item.id, item.notes)} className="w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ color: "#7d8590" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#79c0ff"; (e.currentTarget as HTMLElement).style.background = "rgba(56,139,253,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#7d8590"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title="Notes">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 9.5V11h1.5L10 4.5 8.5 3 2 9.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Delete */}
              {(userRole === "ADMIN" || userRole === "OPS") && (
                <button onClick={() => handleDelete(item.id)} disabled={saving === item.id + "-del"} className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-50" style={{ color: "#484f58" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#484f58"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  title="Delete">
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
    <section className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #21262d" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #21262d" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
              <path d="M1.5 4h2v2h-2zM1.5 8h2v2h-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M5.5 5h7M5.5 9h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Checklist</span>
            {required.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: allRequiredDone ? "#0d2318" : "#21262d", color: allRequiredDone ? "#3fb950" : "#7d8590" }}>
                {completedRequired}/{required.length} required
              </span>
            )}
            {items.length > 0 && (
              <span className="text-xs" style={{ color: "#484f58" }}>{items.length} total</span>
            )}
          </div>
        </div>
        <button onClick={() => setAddingItem((v) => !v)} className="text-xs font-medium flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
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
        {/* Progress visualization */}
        {items.length > 0 && (
          <div className="mb-5 rounded-xl p-4" style={{ background: "#0d1117", border: "1px solid #21262d" }}>

            {/* All required complete banner */}
            {allRequiredDone ? (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#238636" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#3fb950" }}>All required items complete</span>
                <span className="text-xs ml-auto font-medium" style={{ color: "#3fb950" }}>{progress}%</span>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "#7d8590" }}>Progress</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: "#8b949e" }}>{progress}%</span>
              </div>
            )}

            {/* Segmented item bar — one segment per item, colored by status */}
            <div className="flex gap-0.5 h-2 mb-3">
              {items.map((item) => {
                const st = getStatusStyle(item.status);
                return (
                  <div
                    key={item.id}
                    title={`${item.name} — ${st.label}`}
                    className="flex-1 rounded-sm transition-colors duration-300"
                    style={{ background: st.dot, opacity: item.status === "NOT_STARTED" ? 0.35 : 1 }}
                  />
                );
              })}
            </div>

            {/* Status bucket pills */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {statusBuckets.map((s) => (
                <span key={s.value} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                  <span style={{ color: s.text }}>{s.count}</span>
                  <span style={{ color: "#484f58" }}>{s.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add item form */}
        {addingItem && (
          <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
            <input autoFocus type="text" placeholder="New checklist item…" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-0"
              style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }} />
            <button type="submit" disabled={saving === "new"} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
              {saving === "new" ? "Adding…" : "Add"}
            </button>
          </form>
        )}

        {/* Required items */}
        {required.length === 0 && optional.length === 0 ? (
          <p className="text-sm py-2" style={{ color: "#7d8590" }}>No checklist items.</p>
        ) : (
          <div className="space-y-1.5 mb-4">{renderItems(required)}</div>
        )}

        {/* Optional items */}
        {optional.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#484f58" }}>Optional</p>
            <div className="space-y-1.5">{renderItems(optional)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
