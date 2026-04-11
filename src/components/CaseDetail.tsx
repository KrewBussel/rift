"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import TaskList from "./TaskList";
import ChecklistPanel from "./ChecklistPanel";
import DocumentsPanel from "./DocumentsPanel";
import DarkSelect from "./DarkSelect";

interface User { id: string; firstName: string; lastName: string; role: string; }
interface Note { id: string; body: string; createdAt: string; author: { id: string; firstName: string; lastName: string }; }
interface ActivityEvent { id: string; eventType: string; eventDetails: string | null; createdAt: string; actor: { id: string; firstName: string; lastName: string }; }
interface Task { id: string; title: string; description: string | null; status: "OPEN" | "COMPLETED" | "BLOCKED"; dueDate: string | null; assignee: { id: string; firstName: string; lastName: string } | null; createdBy: { id: string; firstName: string; lastName: string }; createdAt: string; }
interface RolloverCase { id: string; clientFirstName: string; clientLastName: string; clientEmail: string; sourceProvider: string; destinationCustodian: string; accountType: string; status: string; highPriority: boolean; internalNotes: string | null; statusUpdatedAt: string; createdAt: string; updatedAt: string; assignedAdvisor: { id: string; firstName: string; lastName: string } | null; assignedOps: { id: string; firstName: string; lastName: string } | null; notes: Note[]; activityEvents: ActivityEvent[]; tasks: Task[]; }

const STATUSES = [
  { value: "INTAKE", label: "Intake" },
  { value: "AWAITING_CLIENT_ACTION", label: "Awaiting Client Action" },
  { value: "READY_TO_SUBMIT", label: "Ready to Submit" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
];

const ACCOUNT_TYPES: Record<string, string> = {
  TRADITIONAL_IRA_401K: "401(k) to Traditional IRA",
  ROTH_IRA_401K: "401(k) to Roth IRA",
  IRA_403B: "403(b) to IRA",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INTAKE:                 { bg: "#21262d",         text: "#8b949e",   dot: "#6e7681"   },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208",         text: "#e09937",   dot: "#d29922"   },
  READY_TO_SUBMIT:        { bg: "#0d1f38",         text: "#79c0ff",   dot: "#388bfd"   },
  SUBMITTED:              { bg: "#1d1535",         text: "#c4b5fd",   dot: "#a78bfa"   },
  PROCESSING:             { bg: "#2d1f0e",         text: "#fdba74",   dot: "#fb923c"   },
  IN_TRANSIT:             { bg: "#0d1535",         text: "#a5b4fc",   dot: "#818cf8"   },
  COMPLETED:              { bg: "#0d2318",         text: "#6ee7b7",   dot: "#3fb950"   },
};

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: "Case created",
  CASE_UPDATED: "Case updated",
  STATUS_CHANGED: "Status changed",
  NOTE_ADDED: "Note added",
  OWNER_CHANGED: "Owner changed",
};

const inputCls = "w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const inputStyle = { background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" };

const CARD = { background: "#161b22", border: "1px solid #21262d" };
const CARD_HEADER_BORDER = { borderBottom: "1px solid #21262d" };
const ICON_BOX = { background: "#21262d", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 as const };

export default function CaseDetail({ rolloverCase: initial, users, currentUserId, userRole, initialChecklist, initialDocuments }: {
  rolloverCase: RolloverCase; users: User[]; currentUserId: string; userRole: string; initialChecklist: any[]; initialDocuments: any[];
}) {
  const [docRefreshKey, setDocRefreshKey] = useState(0);
  const router = useRouter();
  const [rolloverCase, setRolloverCase] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    sourceProvider: initial.sourceProvider,
    destinationCustodian: initial.destinationCustodian,
    accountType: initial.accountType,
    assignedAdvisorId: initial.assignedAdvisor?.id ?? "",
    assignedOpsId: initial.assignedOps?.id ?? "",
    highPriority: initial.highPriority,
    internalNotes: initial.internalNotes ?? "",
  });

  async function patchCase(body: object) {
    setSaving(true);
    const res = await fetch(`/api/cases/${rolloverCase.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
      setRolloverCase(full);
    }
  }

  async function handleStatusChange(status: string) { await patchCase({ status }); }

  async function handleSaveDetails() {
    await patchCase({ sourceProvider: detailsDraft.sourceProvider, destinationCustodian: detailsDraft.destinationCustodian, accountType: detailsDraft.accountType, assignedAdvisorId: detailsDraft.assignedAdvisorId, assignedOpsId: detailsDraft.assignedOpsId, highPriority: detailsDraft.highPriority, internalNotes: detailsDraft.internalNotes });
    setEditingDetails(false);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    const res = await fetch(`/api/cases/${rolloverCase.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: noteText }) });
    setSubmittingNote(false);
    if (res.ok) {
      setNoteText("");
      const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
      setRolloverCase(full);
    }
  }

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");
  const statusColors = STATUS_COLORS[rolloverCase.status] ?? STATUS_COLORS["INTAKE"];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-5" style={{ color: "#7d8590" }}>
        <Link href="/dashboard" className="transition-colors hover:text-[#c9d1d9]">Cases</Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#484f58" }}>
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ color: "#c9d1d9" }}>{rolloverCase.clientFirstName} {rolloverCase.clientLastName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#e4e6ea" }}>
              {rolloverCase.clientFirstName} {rolloverCase.clientLastName}
            </h1>
            {rolloverCase.highPriority && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: "#3d1f1f", color: "#f87171", border: "1px solid #5a2020" }}>
                High Priority
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            {rolloverCase.clientEmail}
            <span className="mx-1.5" style={{ color: "#30363d" }}>·</span>
            Opened {formatDate(rolloverCase.createdAt)}
          </p>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <span className="text-xs flex items-center gap-1" style={{ color: "#7d8590" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="animate-spin">
                <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="10 6"/>
              </svg>
              Saving
            </span>
          )}
          <DarkSelect
            value={rolloverCase.status}
            onChange={handleStatusChange}
            options={STATUSES}
            renderTrigger={(selected) => (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColors.dot }} />
                <span className="text-xs font-semibold" style={{ color: statusColors.text }}>{selected?.label}</span>
              </span>
            )}
            className="w-52"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Case details */}
          <section className="rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3" style={CARD_HEADER_BORDER}>
              <div className="flex items-center gap-2.5">
                <div style={ICON_BOX}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                    <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4 5h6M4 7.5h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Case Details</h2>
              </div>
              {!editingDetails ? (
                <button onClick={() => setEditingDetails(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSaveDetails} disabled={saving} className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors">Save</button>
                  <button onClick={() => setEditingDetails(false)} className="text-xs transition-colors" style={{ color: "#7d8590" }}>Cancel</button>
                </div>
              )}
            </div>

            {editingDetails ? (
              <div className="space-y-3 p-5">
                {[
                  { label: "Source Provider", key: "sourceProvider", type: "input" },
                  { label: "Destination Custodian", key: "destinationCustodian", type: "input" },
                ].map(({ label, key, type }) => (
                  <EditRow key={key} label={label}>
                    <input type="text" value={(detailsDraft as any)[key]} onChange={(e) => setDetailsDraft((d) => ({ ...d, [key]: e.target.value }))} className={inputCls} style={inputStyle} />
                  </EditRow>
                ))}
                <EditRow label="Account Type">
                  <DarkSelect value={detailsDraft.accountType} onChange={(v) => setDetailsDraft((d) => ({ ...d, accountType: v }))}
                    options={Object.entries(ACCOUNT_TYPES).map(([value, label]) => ({ value, label }))} />
                </EditRow>
                <EditRow label="Assigned Advisor">
                  <DarkSelect value={detailsDraft.assignedAdvisorId} onChange={(v) => setDetailsDraft((d) => ({ ...d, assignedAdvisorId: v }))}
                    options={[{ value: "", label: "— None —" }, ...advisors.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} />
                </EditRow>
                <EditRow label="Assigned Ops">
                  <DarkSelect value={detailsDraft.assignedOpsId} onChange={(v) => setDetailsDraft((d) => ({ ...d, assignedOpsId: v }))}
                    options={[{ value: "", label: "— None —" }, ...ops.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} />
                </EditRow>
                <EditRow label="Internal Notes">
                  <textarea value={detailsDraft.internalNotes} onChange={(e) => setDetailsDraft((d) => ({ ...d, internalNotes: e.target.value }))} rows={3} className={inputCls} style={{ ...inputStyle, resize: "vertical" }} />
                </EditRow>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={detailsDraft.highPriority} onChange={(e) => setDetailsDraft((d) => ({ ...d, highPriority: e.target.checked }))} className="rounded" style={{ accentColor: "#f87171" }} />
                  <span className="text-sm" style={{ color: "#c9d1d9" }}>High priority</span>
                </label>
              </div>
            ) : (
              <dl className="px-5">
                <DetailRow label="Source Provider" value={rolloverCase.sourceProvider} />
                <DetailRow label="Destination Custodian" value={rolloverCase.destinationCustodian} />
                <DetailRow label="Account Type" value={ACCOUNT_TYPES[rolloverCase.accountType] ?? rolloverCase.accountType} />
                <DetailRow label="Assigned Advisor" value={rolloverCase.assignedAdvisor ? `${rolloverCase.assignedAdvisor.firstName} ${rolloverCase.assignedAdvisor.lastName}` : "—"} />
                <DetailRow label="Assigned Ops" value={rolloverCase.assignedOps ? `${rolloverCase.assignedOps.firstName} ${rolloverCase.assignedOps.lastName}` : "—"} />
                {rolloverCase.internalNotes && <DetailRow label="Internal Notes" value={rolloverCase.internalNotes} />}
              </dl>
            )}
          </section>

          {/* Tasks */}
          <TaskList caseId={rolloverCase.id} initialTasks={rolloverCase.tasks} users={users} />

          {/* Checklist */}
          <ChecklistPanel caseId={rolloverCase.id} initialItems={initialChecklist} userRole={userRole} onDocumentUploaded={() => setDocRefreshKey((k) => k + 1)} />

        </div>

        {/* Right column */}
        <div className="space-y-5">
          <DocumentsPanel caseId={rolloverCase.id} initialDocuments={initialDocuments} userRole={userRole} refreshKey={docRefreshKey} />

          {/* Activity */}
          <section className="rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3" style={CARD_HEADER_BORDER}>
              <div style={ICON_BOX}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Activity</h2>
            </div>
            <div className="p-5">
              {rolloverCase.activityEvents.length === 0 ? (
                <p className="text-sm" style={{ color: "#7d8590" }}>No activity yet.</p>
              ) : (
                <ol className="space-y-0">
                  {[...rolloverCase.activityEvents].reverse().map((event, i, arr) => (
                    <li key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#30363d" }} />
                        {i < arr.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "#21262d" }} />}
                      </div>
                      <div className={i < arr.length - 1 ? "pb-4" : ""}>
                        <p className="text-xs leading-relaxed" style={{ color: "#8b949e" }}>
                          <span className="font-medium" style={{ color: "#c9d1d9" }}>{event.actor.firstName} {event.actor.lastName}</span>
                          {" "}
                          {event.eventDetails ?? EVENT_LABELS[event.eventType] ?? event.eventType}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>{formatDateTime(event.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl overflow-hidden" style={CARD}>
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3" style={CARD_HEADER_BORDER}>
              <div style={ICON_BOX}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                  <path d="M2 2.5h10v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7z" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M2 5h10" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 2v3M9 2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Notes</h2>
              <span className="text-xs rounded-full px-2 py-0.5 ml-auto" style={{ background: "#21262d", color: "#7d8590" }}>{rolloverCase.notes.length}</span>
            </div>
            <div className="p-5">
              <div className="space-y-3 mb-4">
                {rolloverCase.notes.length === 0 && (
                  <p className="text-sm py-1" style={{ color: "#7d8590" }}>No notes yet.</p>
                )}
                {rolloverCase.notes.map((note) => (
                  <div key={note.id} className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#2d333b" }}>
                          <span className="text-[9px] font-semibold" style={{ color: "#8b949e" }}>{note.author.firstName.charAt(0)}</span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: "#c9d1d9" }}>{note.author.firstName} {note.author.lastName}</span>
                      </div>
                      <span className="text-xs" style={{ color: "#7d8590" }}>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#c9d1d9" }}>{note.body}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddNote} className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note…"
                  rows={2}
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
                />
                <button
                  type="submit"
                  disabled={submittingNote || !noteText.trim()}
                  className="self-end rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
      <dt className="text-xs font-medium flex-shrink-0" style={{ color: "#7d8590" }}>{label}</dt>
      <dd className="text-xs text-right font-medium" style={{ color: "#c9d1d9" }}>{value}</dd>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: "#7d8590" }}>{label}</label>
      {children}
    </div>
  );
}
