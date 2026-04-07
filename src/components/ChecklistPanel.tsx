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

const STATUS_OPTIONS: { value: ChecklistStatus; label: string; color: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-gray-100 text-gray-600" },
  { value: "REQUESTED",   label: "Requested",   color: "bg-yellow-100 text-yellow-700" },
  { value: "RECEIVED",    label: "Received",     color: "bg-blue-100 text-blue-700" },
  { value: "REVIEWED",    label: "Reviewed",     color: "bg-purple-100 text-purple-700" },
  { value: "COMPLETE",    label: "Complete",     color: "bg-green-100 text-green-700" },
];

function statusStyle(status: ChecklistStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-600";
}

function statusLabel(status: ChecklistStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
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
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.click();
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
    return list.map((item) => (
      <div key={item.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${item.status === "COMPLETE" ? "bg-green-500" : item.status === "NOT_STARTED" ? "bg-gray-300" : "bg-blue-400"}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-800">{item.name}</span>
              {item.required && <span className="text-xs text-red-400">required</span>}
            </div>

            {/* Documents linked to this item */}
            {item.documents.length > 0 && (
              <div className="mt-1 space-y-1">
                {item.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1.5">
                    <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => handleDownload(doc.id)}>
                      📎 {doc.name}
                    </span>
                    <span className="text-xs text-gray-400">({formatBytes(doc.fileSize)})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {expandedNotes.has(item.id) ? (
              <div className="mt-2 space-y-1">
                <textarea
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={2}
                  value={notesDraft[item.id] ?? ""}
                  onChange={(e) => setNotesDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                  placeholder="Add notes…"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveNotes(item.id)} disabled={saving === item.id + "-notes"} className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50">Save</button>
                  <button onClick={() => setExpandedNotes((s) => { const n = new Set(s); n.delete(item.id); return n; })} className="text-xs text-gray-400">Cancel</button>
                </div>
              </div>
            ) : item.notes ? (
              <p className="text-xs text-gray-400 mt-0.5 cursor-pointer hover:text-gray-600" onClick={() => toggleNotes(item.id, item.notes)}>
                {item.notes}
              </p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Status selector */}
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(item.id, e.target.value as ChecklistStatus)}
              disabled={saving === item.id}
              className={`text-xs rounded-full px-2 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer ${statusStyle(item.status)}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Upload button */}
            <label className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" title="Upload file">
              {uploadingFor === item.id ? (
                <span className="text-xs text-gray-400">Uploading…</span>
              ) : (
                <span className="text-sm">↑</span>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(item.id, f); e.target.value = ""; }}
              />
            </label>

            {/* Notes toggle */}
            <button onClick={() => toggleNotes(item.id, item.notes)} className="text-gray-400 hover:text-blue-500 text-xs" title="Notes">✎</button>

            {/* Delete (admin/ops) */}
            {(userRole === "ADMIN" || userRole === "OPS") && (
              <button onClick={() => handleDelete(item.id)} disabled={saving === item.id + "-del"} className="text-gray-300 hover:text-red-400 text-xs" title="Delete">✕</button>
            )}
          </div>
        </div>
      </div>
    ));
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Checklist</h2>
          <p className="text-xs text-gray-400 mt-0.5">{completedRequired}/{required.length} required items complete</p>
        </div>
        <button onClick={() => setAddingItem((v) => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          {addingItem ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {/* Progress bar */}
      {required.length > 0 && (
        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
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
            placeholder="Item name…"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={saving === "new"} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving === "new" ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {/* Required items */}
      <div className="space-y-2 mb-4">
        {required.length === 0 && optional.length === 0 && (
          <p className="text-sm text-gray-400">No checklist items.</p>
        )}
        {renderItems(required)}
      </div>

      {/* Optional items */}
      {optional.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Optional</p>
          <div className="space-y-2">{renderItems(optional)}</div>
        </div>
      )}
    </section>
  );
}
