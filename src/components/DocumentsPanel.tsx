"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface Document { id: string; name: string; fileType: string; fileSize: number; createdAt: string; uploadedBy: { id: string; firstName: string; lastName: string }; checklistItem: { id: string; name: string } | null; }
interface Props { caseId: string; initialDocuments: Document[]; userRole: string; refreshKey: number; }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === "application/pdf") {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#f87171" }}>
          <rect x="2" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M2 4h8M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  if (fileType.startsWith("image/")) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(196,181,253,0.1)", border: "1px solid rgba(196,181,253,0.2)" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#c4b5fd" }}>
          <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="5" cy="6" r="1" fill="currentColor"/>
          <path d="M1.5 10l3-3 2 2 2-2.5 3 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (fileType.includes("word")) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(121,192,255,0.1)", border: "1px solid rgba(121,192,255,0.2)" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#79c0ff" }}>
          <rect x="2" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d", border: "1px solid #30363d" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
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
    <section className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #21262d" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #21262d" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
              <path d="M2.5 2.5h5.5l3 3v6a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 2.5v3.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Documents</span>
            <span className="ml-2 text-xs" style={{ color: "#7d8590" }}>{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <label className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploading ? "cursor-not-allowed opacity-50" : "bg-blue-600 text-white hover:bg-blue-500"}`}
          style={uploading ? { background: "#21262d", color: "#7d8590" } : {}}>
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
          <input type="file" className="hidden" disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        </label>
      </div>

      <div className="p-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="rounded-lg border-2 border-dashed px-4 py-5 mb-4 text-center transition-all"
          style={{ borderColor: dragOver ? "#388bfd" : "#30363d", background: dragOver ? "rgba(56,139,253,0.06)" : "transparent" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors" style={{ background: dragOver ? "rgba(56,139,253,0.15)" : "#21262d" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: dragOver ? "#388bfd" : "#7d8590" }}>
              <path d="M7 10V4M4 7l3-3 3 3M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-xs font-medium" style={{ color: "#8b949e" }}>Drop files here to upload</p>
          <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>PDF, JPG, PNG, DOCX · max 20MB</p>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <p className="text-sm text-center py-2" style={{ color: "#7d8590" }}>No documents uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg px-2 py-2 group transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2128")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <FileIcon fileType={doc.fileType} />
                <div className="flex-1 min-w-0">
                  <button onClick={() => handleDownload(doc.id)} className="text-sm truncate block text-left max-w-full font-medium transition-colors" style={{ color: "#c9d1d9" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#79c0ff")} onMouseLeave={(e) => (e.currentTarget.style.color = "#c9d1d9")}>
                    {doc.name}
                  </button>
                  <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
                    {formatBytes(doc.fileSize)} · {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                    {doc.checklistItem && (
                      <span className="ml-1.5 font-medium" style={{ color: "#c4b5fd" }}>· {doc.checklistItem.name}</span>
                    )}
                  </p>
                </div>
                {canDelete && (
                  <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
                    style={{ color: "#484f58" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#484f58"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
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
