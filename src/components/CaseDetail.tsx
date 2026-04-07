"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import TaskList from "./TaskList";
import ChecklistPanel from "./ChecklistPanel";
import DocumentsPanel from "./DocumentsPanel";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface ActivityEvent {
  id: string;
  eventType: string;
  eventDetails: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "COMPLETED" | "BLOCKED";
  dueDate: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface RolloverCase {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  highPriority: boolean;
  internalNotes: string | null;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
  notes: Note[];
  activityEvents: ActivityEvent[];
  tasks: Task[];
}

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

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "bg-gray-100 text-gray-700",
  AWAITING_CLIENT_ACTION: "bg-yellow-100 text-yellow-800",
  READY_TO_SUBMIT: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  PROCESSING: "bg-orange-100 text-orange-800",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: "Case created",
  CASE_UPDATED: "Case updated",
  STATUS_CHANGED: "Status changed",
  NOTE_ADDED: "Note added",
  OWNER_CHANGED: "Owner changed",
};

export default function CaseDetail({
  rolloverCase: initial,
  users,
  currentUserId,
  userRole,
  initialChecklist,
  initialDocuments,
}: {
  rolloverCase: RolloverCase;
  users: User[];
  currentUserId: string;
  userRole: string;
  initialChecklist: any[];
  initialDocuments: any[];
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
    const res = await fetch(`/api/cases/${rolloverCase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      // Re-fetch full case to get updated activity + notes
      const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
      setRolloverCase(full);
    }
  }

  async function handleStatusChange(status: string) {
    await patchCase({ status });
  }

  async function handleSaveDetails() {
    await patchCase({
      sourceProvider: detailsDraft.sourceProvider,
      destinationCustodian: detailsDraft.destinationCustodian,
      accountType: detailsDraft.accountType,
      assignedAdvisorId: detailsDraft.assignedAdvisorId,
      assignedOpsId: detailsDraft.assignedOpsId,
      highPriority: detailsDraft.highPriority,
      internalNotes: detailsDraft.internalNotes,
    });
    setEditingDetails(false);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    const res = await fetch(`/api/cases/${rolloverCase.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setSubmittingNote(false);
    if (res.ok) {
      setNoteText("");
      const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
      setRolloverCase(full);
    }
  }

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");
  const statusLabel = STATUSES.find((s) => s.value === rolloverCase.status)?.label ?? rolloverCase.status;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Cases</Link>
        <span>/</span>
        <span className="text-gray-900">{rolloverCase.clientFirstName} {rolloverCase.clientLastName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {rolloverCase.clientFirstName} {rolloverCase.clientLastName}
            </h1>
            {rolloverCase.highPriority && (
              <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">HIGH PRIORITY</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(rolloverCase.createdAt)} · {rolloverCase.clientEmail}
          </p>
        </div>
        {/* Status selector */}
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          <select
            value={rolloverCase.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${STATUS_COLORS[rolloverCase.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details + notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case details */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Case Details</h2>
              {!editingDetails ? (
                <button
                  onClick={() => setEditingDetails(true)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDetails(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editingDetails ? (
              <div className="space-y-3">
                <EditRow label="Source Provider">
                  <input
                    type="text"
                    value={detailsDraft.sourceProvider}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, sourceProvider: e.target.value }))}
                    className={inputCls}
                  />
                </EditRow>
                <EditRow label="Destination Custodian">
                  <input
                    type="text"
                    value={detailsDraft.destinationCustodian}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, destinationCustodian: e.target.value }))}
                    className={inputCls}
                  />
                </EditRow>
                <EditRow label="Account Type">
                  <select
                    value={detailsDraft.accountType}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, accountType: e.target.value }))}
                    className={inputCls}
                  >
                    {Object.entries(ACCOUNT_TYPES).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </EditRow>
                <EditRow label="Assigned Advisor">
                  <select
                    value={detailsDraft.assignedAdvisorId}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, assignedAdvisorId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {advisors.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </EditRow>
                <EditRow label="Assigned Ops">
                  <select
                    value={detailsDraft.assignedOpsId}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, assignedOpsId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— None —</option>
                    {ops.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </EditRow>
                <EditRow label="Internal Notes">
                  <textarea
                    value={detailsDraft.internalNotes}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, internalNotes: e.target.value }))}
                    rows={3}
                    className={inputCls}
                  />
                </EditRow>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailsDraft.highPriority}
                    onChange={(e) => setDetailsDraft((d) => ({ ...d, highPriority: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">High priority</span>
                </label>
              </div>
            ) : (
              <dl className="space-y-3">
                <DetailRow label="Source Provider" value={rolloverCase.sourceProvider} />
                <DetailRow label="Destination Custodian" value={rolloverCase.destinationCustodian} />
                <DetailRow label="Account Type" value={ACCOUNT_TYPES[rolloverCase.accountType] ?? rolloverCase.accountType} />
                <DetailRow
                  label="Assigned Advisor"
                  value={rolloverCase.assignedAdvisor ? `${rolloverCase.assignedAdvisor.firstName} ${rolloverCase.assignedAdvisor.lastName}` : "—"}
                />
                <DetailRow
                  label="Assigned Ops"
                  value={rolloverCase.assignedOps ? `${rolloverCase.assignedOps.firstName} ${rolloverCase.assignedOps.lastName}` : "—"}
                />
                {rolloverCase.internalNotes && (
                  <DetailRow label="Internal Notes" value={rolloverCase.internalNotes} />
                )}
              </dl>
            )}
          </section>

          {/* Tasks */}
          <TaskList caseId={rolloverCase.id} initialTasks={rolloverCase.tasks} users={users} />

          {/* Checklist */}
          <ChecklistPanel
            caseId={rolloverCase.id}
            initialItems={initialChecklist}
            userRole={userRole}
            onDocumentUploaded={() => setDocRefreshKey((k) => k + 1)}
          />

          {/* Notes */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="space-y-4 mb-4">
              {rolloverCase.notes.length === 0 && (
                <p className="text-sm text-gray-400">No notes yet.</p>
              )}
              {rolloverCase.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {note.author.firstName} {note.author.lastName}
                    </span>
                    <span className="text-xs text-gray-400">{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="submit"
                disabled={submittingNote || !noteText.trim()}
                className="self-end rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </form>
          </section>
        </div>

        {/* Right column: documents + activity log */}
        <div className="space-y-6">
          <DocumentsPanel
            caseId={rolloverCase.id}
            initialDocuments={initialDocuments}
            userRole={userRole}
            refreshKey={docRefreshKey}
          />
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity</h2>
            {rolloverCase.activityEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet.</p>
            ) : (
              <ol className="space-y-4">
                {[...rolloverCase.activityEvents].reverse().map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-300" />
                    <div>
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">{event.actor.firstName} {event.actor.lastName}</span>
                        {" — "}
                        {event.eventDetails ?? EVENT_LABELS[event.eventType] ?? event.eventType}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-xs text-gray-900 text-right">{value}</dd>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
