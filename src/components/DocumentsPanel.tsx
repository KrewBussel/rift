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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === "application/pdf") {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-500">
          <rect x="2" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M2 4h8M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  if (fileType.startsWith("image/")) {
    return (
      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-500">
          <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="5" cy="6" r="1" fill="currentColor"/>
          <path d="M1.5 10l3-3 2 2 2-2.5 3 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (fileType.includes("word")) {
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-500">
          <rect x="2" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-500">
        <rect x="2" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

export default function DocumentsPanel({ caseId, initialDocuments, userRole, refreshKey }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
      a.href = url; a.download = name; a.target = "_blank"; a.click();
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
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: "var(--shadow-xs)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-500">
              <path d="M2.5 2.5h5.5l3 3v6a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 2.5v3.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">Documents</span>
            <span className="ml-2 text-xs text-gray-400">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <label className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {uploading ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8"/>
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 8V2M3 5l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload
            </>
          )}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
        </label>
      </div>

      <div className="p-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed px-4 py-5 mb-4 text-center transition-all ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors ${dragOver ? "bg-blue-100" : "bg-gray-100"}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={dragOver ? "text-blue-500" : "text-gray-400"}>
              <path d="M7 10V4M4 7l3-3 3 3M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500">Drop files here to upload</p>
          <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG, DOCX · max 20MB</p>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg hover:bg-gray-50 px-2 py-2 group transition-colors">
                <FileIcon fileType={doc.fileType} />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="text-sm text-gray-800 hover:text-blue-600 truncate block text-left max-w-full font-medium transition-colors"
                  >
                    {doc.name}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatBytes(doc.fileSize)} · {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                    {doc.checklistItem && (
                      <span className="ml-1.5 text-violet-500 font-medium">· {doc.checklistItem.name}</span>
                    )}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    {deleting === doc.id ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="animate-spin">
                        <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 6"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
