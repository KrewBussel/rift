"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import TaskList from "./TaskList";
import ChecklistPanel from "./ChecklistPanel";
import DocumentsPanel from "./DocumentsPanel";
import DarkSelect from "./DarkSelect";
import Avatar from "./Avatar";
import {
  resolveEnabledStages,
  resolveStageLabel,
  type StageConfigRow,
} from "./casesDesignTokens";

interface User { id: string; firstName: string; lastName: string; role: string; }
interface Note { id: string; body: string; createdAt: string; fromClient: boolean; author: { id: string; firstName: string; lastName: string } | null; }
interface ActivityEvent { id: string; eventType: string; eventDetails: string | null; createdAt: string; clientSessionId: string | null; actor: { id: string; firstName: string; lastName: string } | null; }
interface Task { id: string; title: string; description: string | null; status: "OPEN" | "COMPLETED" | "BLOCKED"; dueDate: string | null; assignee: { id: string; firstName: string; lastName: string } | null; createdBy: { id: string; firstName: string; lastName: string }; createdAt: string; }
interface RolloverCase { id: string; clientFirstName: string; clientLastName: string; clientEmail: string; sourceProvider: string; destinationCustodian: string; accountType: string; status: string; highPriority: boolean; needsReview: boolean; reviewReason: string | null; internalNotes: string | null; statusUpdatedAt: string; createdAt: string; updatedAt: string; wealthboxOpportunityId: string | null; wealthboxLinkedAt: string | null; wealthboxLastSyncedAt: string | null; wealthboxLastSyncError: string | null; assignedAdvisor: { id: string; firstName: string; lastName: string } | null; assignedOps: { id: string; firstName: string; lastName: string } | null; notes: Note[]; activityEvents: ActivityEvent[]; tasks: Task[]; }
interface ChecklistDocument { id: string; name: string; fileType: string; fileSize: number; createdAt: string; uploadedBy: { id: string; firstName: string; lastName: string }; checklistItem: { id: string; name: string } | null; }
type ChecklistStatus = "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";
interface ChecklistItem { id: string; name: string; required: boolean; status: ChecklistStatus; notes: string | null; sortOrder: number; documents: ChecklistDocument[]; }

const ACCOUNT_TYPES: Record<string, string> = {
  TRADITIONAL_IRA_401K: "401(k) to Traditional IRA",
  ROTH_IRA_401K: "401(k) to Roth IRA",
  IRA_403B: "403(b) to IRA",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PROPOSAL_ACCEPTED:      { bg: "#21262d",         text: "#8b949e",   dot: "#6e7681"   },
  AWAITING_CLIENT_ACTION: { bg: "#2d2208",         text: "#e09937",   dot: "#d29922"   },
  READY_TO_SUBMIT:        { bg: "#0d1f38",         text: "#79c0ff",   dot: "#388bfd"   },
  SUBMITTED:              { bg: "#1d1535",         text: "#c4b5fd",   dot: "#a78bfa"   },
  PROCESSING:             { bg: "#2d1f0e",         text: "#fdba74",   dot: "#fb923c"   },
  IN_TRANSIT:             { bg: "#0d1535",         text: "#a5b4fc",   dot: "#818cf8"   },
  WON:                    { bg: "#0d2318",         text: "#6ee7b7",   dot: "#3fb950"   },
};

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: "Case created",
  CASE_UPDATED: "Case updated",
  STATUS_CHANGED: "Status changed",
  NOTE_ADDED: "Note added",
  OWNER_CHANGED: "Owner changed",
};

const inputCls = "w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-0 focus:border-transparent";
const inputStyle = { background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" };

const CARD = { background: "#161b22", border: "1px solid #21262d" };
const CARD_HEADER_BORDER = { borderBottom: "1px solid #21262d" };
const ICON_BOX = { background: "#21262d", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 as const };

export default function CaseDetail({ rolloverCase: initial, users, currentUserId, userRole, initialChecklist, initialDocuments, crmConnected = false, crmProviderLabel = null, stageConfig = null }: {
  rolloverCase: RolloverCase; users: User[]; currentUserId: string; userRole: string; initialChecklist: ChecklistItem[]; initialDocuments: ChecklistDocument[]; crmConnected?: boolean; crmProviderLabel?: string | null; stageConfig?: StageConfigRow[] | null;
}) {
  // Visible options in the status dropdown: enabled stages from the firm's
  // overlay, with custom labels swapped in. If the case is currently sitting
  // on a now-disabled stage, we still include it (with its canonical label) so
  // the dropdown can show "current" without an empty cell.
  const enabledStages = resolveEnabledStages(stageConfig);
  const statusOptions = enabledStages.some((s) => s.value === initial.status)
    ? enabledStages
    : [
        ...enabledStages,
        { value: initial.status, label: resolveStageLabel(initial.status, stageConfig), short: "", hue: "slate" as const },
      ];
  const [docRefreshKey, setDocRefreshKey] = useState(0);
  const router = useRouter();
  const [rolloverCase, setRolloverCase] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [clientLinkBusy, setClientLinkBusy] = useState<"idle" | "issuing" | "revoking">("idle");
  const [clientLinkMsg, setClientLinkMsg] = useState<string | null>(null);
  const canManageClientLink = userRole === "ADMIN" || userRole === "OPS";

  async function handleIssueClientLink() {
    if (!canManageClientLink) return;
    setClientLinkBusy("issuing");
    setClientLinkMsg(null);
    const res = await fetch(`/api/cases/${rolloverCase.id}/client-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setClientLinkBusy("idle");
    if (!res.ok) {
      setClientLinkMsg("Failed to send portal invite.");
      return;
    }
    const body = await res.json();
    setClientLinkMsg(body.emailSent ? "Portal invite sent." : "Link issued (email not sent — check config).");
  }

  async function handleRevokeClientAccess() {
    if (!canManageClientLink) return;
    if (!confirm("Revoke all active client portal access for this case?")) return;
    setClientLinkBusy("revoking");
    setClientLinkMsg(null);
    const res = await fetch(`/api/cases/${rolloverCase.id}/client-link`, { method: "DELETE" });
    setClientLinkBusy("idle");
    setClientLinkMsg(res.ok ? "Client access revoked." : "Failed to revoke.");
  }
  const [wbBusy, setWbBusy] = useState<"idle" | "search" | "linking" | "creating" | "unlinking" | "refreshing">("idle");
  const [wbSearch, setWbSearch] = useState("");
  const [wbResults, setWbResults] = useState<Array<{ id: string; name: string; stage: string | null }>>([]);
  const [wbMsg, setWbMsg] = useState<string | null>(null);
  const canManageWealthbox = userRole === "ADMIN" || userRole === "OPS";

  async function wbRefresh() {
    setWbBusy("refreshing");
    setWbMsg(null);
    const res = await fetch(`/api/cases/${rolloverCase.id}/crm/refresh`, { method: "POST" });
    setWbBusy("idle");
    if (!res.ok) {
      setWbMsg("Refresh failed.");
      return;
    }
    const body = await res.json();
    if (body.ok === false) {
      const reasonLabel: Record<string, string> = {
        no_connection: "CRM not connected.",
        not_linked: "Case isn't linked to a CRM opportunity.",
        no_mapping: `Stage "${body.error ?? ""}" isn't mapped to a Rift status.`,
        opp_no_stage: "Opportunity has no stage in CRM yet.",
        api_error: `CRM error: ${body.error ?? "unknown"}`,
      };
      setWbMsg(reasonLabel[body.reason] ?? "Refresh failed.");
    } else if (body.changed) {
      setWbMsg(`Updated to ${body.newStatus.replace(/_/g, " ").toLowerCase()} (from CRM stage "${body.stageName ?? ""}").`);
    } else {
      setWbMsg("Already in sync.");
    }
    const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
    setRolloverCase(full);
  }

  async function wbSearchOpportunities() {
    setWbBusy("search");
    setWbMsg(null);
    const qs = wbSearch.trim() ? `?q=${encodeURIComponent(wbSearch.trim())}` : "";
    const res = await fetch(`/api/integrations/crm/opportunities${qs}`);
    setWbBusy("idle");
    if (!res.ok) { setWbMsg("Couldn't fetch opportunities."); return; }
    const body = await res.json();
    setWbResults(body.opportunities ?? []);
  }

  async function wbLink(opportunityId: string) {
    setWbBusy("linking");
    setWbMsg(null);
    const res = await fetch(`/api/cases/${rolloverCase.id}/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "link", opportunityId }),
    });
    setWbBusy("idle");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setWbMsg(body.error ?? "Link failed.");
      return;
    }
    const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
    setRolloverCase(full);
    setWbResults([]);
    setWbSearch("");
  }

  async function wbCreate() {
    setWbBusy("creating");
    setWbMsg(null);
    const res = await fetch(`/api/cases/${rolloverCase.id}/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create" }),
    });
    setWbBusy("idle");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setWbMsg(body.error ?? "Create failed.");
      return;
    }
    const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
    setRolloverCase(full);
  }

  async function wbUnlink() {
    if (!confirm("Unlink this case from its CRM opportunity?")) return;
    setWbBusy("unlinking");
    const res = await fetch(`/api/cases/${rolloverCase.id}/crm`, { method: "DELETE" });
    setWbBusy("idle");
    if (res.ok) {
      const full = await fetch(`/api/cases/${rolloverCase.id}`).then((r) => r.json());
      setRolloverCase(full);
    }
  }

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
  const statusColors = STATUS_COLORS[rolloverCase.status] ?? STATUS_COLORS["PROPOSAL_ACCEPTED"];

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

      {rolloverCase.needsReview && (
        <div className="mb-5 rounded-lg p-3" style={{ background: "#2d2208", border: "1px solid #5c4419" }}>
          <p className="text-sm font-semibold" style={{ color: "#e09937" }}>Auto-created from Wealthbox — needs review</p>
          {rolloverCase.reviewReason && (
            <p className="text-xs mt-1" style={{ color: "#d4a05c" }}>{rolloverCase.reviewReason}</p>
          )}
          <p className="text-xs mt-2" style={{ color: "#9d7c3a" }}>
            Fill in the missing case details below, then click <em>Mark as reviewed</em>.
          </p>
          <button
            type="button"
            onClick={() => patchCase({ needsReview: false, reviewReason: null })}
            className="mt-2 text-xs px-3 py-1 rounded-md"
            style={{ background: "#3a2d12", color: "#e09937", border: "1px solid #5c4419" }}
          >
            Mark as reviewed
          </button>
        </div>
      )}

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
          {canManageClientLink && (
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleIssueClientLink}
                disabled={clientLinkBusy !== "idle"}
                className="text-xs px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                style={{ background: "#1f2937", color: "#c9d1d9", border: "1px solid #30363d" }}
              >
                {clientLinkBusy === "issuing" ? "Sending…" : "Send client portal link"}
              </button>
              <button
                type="button"
                onClick={handleRevokeClientAccess}
                disabled={clientLinkBusy !== "idle"}
                className="text-xs px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                style={{ background: "transparent", color: "#9ca3af", border: "1px solid #30363d" }}
              >
                {clientLinkBusy === "revoking" ? "Revoking…" : "Revoke access"}
              </button>
              {clientLinkMsg && (
                <span className="text-xs" style={{ color: "#7d8590" }}>{clientLinkMsg}</span>
              )}
            </div>
          )}
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
            options={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
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
                    <input type="text" value={detailsDraft[key as keyof typeof detailsDraft] as string} onChange={(e) => setDetailsDraft((d) => ({ ...d, [key]: e.target.value }))} className={inputCls} style={inputStyle} />
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

          {/* CRM (Wealthbox / Salesforce) */}
          {crmConnected && (
            <section className="rounded-xl overflow-hidden" style={CARD}>
              <div className="flex items-center justify-between gap-2.5 px-5 pt-4 pb-3" style={CARD_HEADER_BORDER}>
                <div className="flex items-center gap-2.5">
                  <div style={ICON_BOX}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                      <path d="M2 4.5A2.5 2.5 0 014.5 2h5A2.5 2.5 0 0112 4.5v5A2.5 2.5 0 019.5 12h-5A2.5 2.5 0 012 9.5v-5z" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>{crmProviderLabel ?? "CRM"}</h2>
                </div>
                {rolloverCase.wealthboxLastSyncedAt && (
                  <span className="text-xs" style={{ color: rolloverCase.wealthboxLastSyncError ? "#f87171" : "#6ee7b7" }}>
                    {rolloverCase.wealthboxLastSyncError ? "Sync error" : `Synced ${formatDateTime(rolloverCase.wealthboxLastSyncedAt)}`}
                  </span>
                )}
              </div>
              <div className="px-5 py-4 space-y-3">
                {rolloverCase.wealthboxOpportunityId ? (
                  <>
                    <p className="text-sm" style={{ color: "#c9d1d9" }}>
                      Linked to opportunity <span style={{ fontFamily: "monospace", color: "#79c0ff" }}>#{rolloverCase.wealthboxOpportunityId}</span>
                    </p>
                    {rolloverCase.wealthboxLastSyncError && (
                      <p className="text-xs" style={{ color: "#f87171" }}>{rolloverCase.wealthboxLastSyncError}</p>
                    )}
                    {canManageWealthbox && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={wbRefresh}
                          disabled={wbBusy === "refreshing"}
                          className="text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
                        >
                          {wbBusy === "refreshing" ? "Refreshing…" : "Refresh from CRM"}
                        </button>
                        <button
                          onClick={wbUnlink}
                          disabled={wbBusy === "unlinking"}
                          className="text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                          style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
                        >
                          {wbBusy === "unlinking" ? "Unlinking…" : "Unlink"}
                        </button>
                      </div>
                    )}
                    {wbMsg && <p className="text-xs" style={{ color: "#7d8590" }}>{wbMsg}</p>}
                  </>
                ) : canManageWealthbox ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={wbSearch}
                        onChange={(e) => setWbSearch(e.target.value)}
                        placeholder="Search opportunities by name"
                        className={inputCls}
                        style={inputStyle}
                      />
                      <button
                        onClick={wbSearchOpportunities}
                        disabled={wbBusy === "search"}
                        className="text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                        style={{ background: "#1f2937", border: "1px solid #30363d", color: "#c9d1d9" }}
                      >
                        {wbBusy === "search" ? "Searching…" : "Search"}
                      </button>
                    </div>
                    {wbResults.length > 0 && (
                      <ul className="space-y-1">
                        {wbResults.map((o) => (
                          <li key={o.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-md" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                            <span style={{ color: "#c9d1d9" }}>
                              {o.name}
                              {o.stage && <span style={{ color: "#7d8590" }}> · {o.stage}</span>}
                            </span>
                            <button
                              onClick={() => wbLink(o.id)}
                              disabled={wbBusy === "linking"}
                              className="text-xs px-2 py-1 rounded-md disabled:opacity-50"
                              style={{ background: "#2563eb", color: "#fff" }}
                            >
                              Link
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="text-xs" style={{ color: "#7d8590" }}>Or</div>
                    <button
                      onClick={wbCreate}
                      disabled={wbBusy === "creating"}
                      className="text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                      style={{ background: "#2563eb", color: "#fff" }}
                    >
                      {wbBusy === "creating" ? "Creating…" : "Create new opportunity"}
                    </button>
                    {wbMsg && <p className="text-xs" style={{ color: "#f87171" }}>{wbMsg}</p>}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "#7d8590" }}>Not linked to a CRM opportunity.</p>
                )}
              </div>
            </section>
          )}

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
                          <span className="font-medium" style={{ color: "#c9d1d9" }}>
                            {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : event.clientSessionId ? "Client" : "System"}
                          </span>
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
                        {note.author ? (
                          <Avatar userId={note.author.id} firstName={note.author.firstName} lastName={note.author.lastName} size={20} />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#2d333b" }}>
                            <span className="text-[9px] font-semibold" style={{ color: "#8b949e" }}>
                              {note.fromClient ? "C" : "S"}
                            </span>
                          </div>
                        )}
                        <span className="text-xs font-medium" style={{ color: "#c9d1d9" }}>
                          {note.author ? `${note.author.firstName} ${note.author.lastName}` : note.fromClient ? "Client" : "System"}
                        </span>
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
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0 resize-none"
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
