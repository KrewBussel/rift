"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
  checklistItem: { id: string; name: string } | null;
}

interface Props {
  caseId: string;
  initialDocuments: Document[];
  userRole: string;
  refreshKey: number;
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "image/webp": "🖼️",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPanel({ caseId, initialDocuments, userRole, refreshKey }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Re-fetch when checklist uploads trigger refresh
  useState(() => {
    if (refreshKey > 0) refreshDocuments();
  });

  async function refreshDocuments() {
    const res = await fetch(`/api/cases/${caseId}/documents`);
    if (res.ok) setDocuments(await res.json());
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) await refreshDocuments();
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

  async function handleDelete(docId: string) {
    setDeleting(docId);
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    setDeleting(null);
    await refreshDocuments();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  const canDelete = userRole === "ADMIN" || userRole === "OPS";

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">{documents.length} file{documents.length !== 1 ? "s" : ""}</p>
        </div>
        <label className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {uploading ? "Uploading…" : "↑ Upload"}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
        </label>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-4 mb-4 text-center transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}
      >
        <p className="text-xs text-gray-400">Drag & drop files here, or use the upload button</p>
        <p className="text-xs text-gray-300 mt-0.5">PDF, JPG, PNG, DOCX · max 20MB</p>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-2 py-2 group">
              <span className="text-lg flex-shrink-0">{FILE_ICONS[doc.fileType] ?? "📎"}</span>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="text-sm text-blue-600 hover:underline truncate block text-left max-w-full"
                >
                  {doc.name}
                </button>
                <p className="text-xs text-gray-400">
                  {formatBytes(doc.fileSize)} · {doc.uploadedBy.firstName} {doc.uploadedBy.lastName} · {formatDateTime(doc.createdAt)}
                  {doc.checklistItem && (
                    <span className="ml-1 text-purple-500">· {doc.checklistItem.name}</span>
                  )}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity disabled:opacity-50 flex-shrink-0"
                >
                  {deleting === doc.id ? "…" : "✕"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
