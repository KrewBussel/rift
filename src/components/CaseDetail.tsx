"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, STAGE_HUE, STAGE_COLOR, fmtMoney, timeAgo, HEADLINE_STACK, TAB_NUM_STYLE } from "./tokens";
import { Card, Pill, Btn, Icon, Avatar, TextInput, SelectInput } from "./primitives";
import {
  resolveStageLabel,
  resolveEnabledStages,
  type StageConfigRow,
} from "@/components/casesDesignTokens";

type RoleStr = "ADMIN" | "ADVISOR" | "OPS";

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
  fromClient: boolean;
  author: { id: string; firstName: string; lastName: string } | null;
}
interface ActivityEvent {
  id: string;
  eventType: string;
  eventDetails: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "COMPLETED" | "BLOCKED";
  dueDate: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}
interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  status: "NOT_STARTED" | "REQUESTED" | "RECEIVED" | "REVIEWED" | "COMPLETE";
  notes: string | null;
  sortOrder: number;
}
interface CaseShape {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string | null;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  highPriority: boolean;
  needsReview: boolean;
  reviewReason: string | null;
  internalNotes: string | null;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  wealthboxOpportunityName: string | null;
  wealthboxAmount: number | null;
  wealthboxTargetClose: string | null;
  wealthboxProbability: number | null;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
  notes: Note[];
  activityEvents: ActivityEvent[];
  tasks: Task[];
}

const ACCOUNT_TYPES: Record<string, string> = {
  TRADITIONAL_IRA_401K: "401(k) → Traditional IRA",
  ROTH_IRA_401K: "401(k) → Roth IRA",
  IRA_403B: "403(b) → IRA",
  OTHER: "Other",
};

const CHECKLIST_PILL: Record<string, { hue: "slate" | "amber" | "blue" | "violet" | "green"; label: string }> = {
  NOT_STARTED: { hue: "slate", label: "Not started" },
  REQUESTED:   { hue: "amber", label: "Requested" },
  RECEIVED:    { hue: "blue", label: "Received" },
  REVIEWED:    { hue: "violet", label: "Reviewed" },
  COMPLETE:    { hue: "green", label: "Complete" },
};

const EVENT_VERB: Record<string, string> = {
  CASE_CREATED: "created the case",
  CASE_UPDATED: "updated the case",
  STATUS_CHANGED: "changed status",
  NOTE_ADDED: "added a note",
  OWNER_CHANGED: "reassigned the case",
  TASK_CREATED: "added a task",
  TASK_COMPLETED: "completed a task",
  TASK_REOPENED: "reopened a task",
  FILE_UPLOADED: "uploaded a file",
  FILE_DELETED: "deleted a file",
  CHECKLIST_ITEM_UPDATED: "updated the checklist",
};

export default function CaseDetailV2({
  rolloverCase: initial,
  users,
  userRole,
  initialChecklist,
  stageConfig,
  clientLinkActive: clientLinkActiveInitial = false,
}: {
  rolloverCase: CaseShape;
  users: User[];
  currentUserId: string;
  userRole: RoleStr;
  initialChecklist: ChecklistItem[];
  stageConfig: StageConfigRow[] | null;
  clientLinkActive?: boolean;
}) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const canManageClientLink = userRole === "ADMIN" || userRole === "OPS";
  const [clientLinkActive, setClientLinkActive] = useState(clientLinkActiveInitial);
  const [clientLinkBusy, setClientLinkBusy] = useState<"idle" | "issuing" | "revoking">("idle");
  const [clientLinkMsg, setClientLinkMsg] = useState<string | null>(null);
  const [clientLinkFallback, setClientLinkFallback] = useState<{ url: string; reason: string } | null>(null);

  const [edit, setEdit] = useState({
    sourceProvider: c.sourceProvider,
    destinationCustodian: c.destinationCustodian,
    accountType: c.accountType,
    advisorId: c.assignedAdvisor?.id ?? "",
    opsId: c.assignedOps?.id ?? "",
    internalNotes: c.internalNotes ?? "",
  });

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");

  const allStages = resolveEnabledStages(stageConfig);
  const currentStageIdx = allStages.findIndex((s) => s.value === c.status);
  const stageHue = STAGE_HUE[c.status] ?? "slate";
  const stageLabel = resolveStageLabel(c.status, stageConfig);

  async function refresh() {
    try {
      const fresh = (await fetch(`/api/cases/${c.id}`).then((r) => r.json())) as CaseShape;
      setC(fresh);
    } catch {
      router.refresh();
    }
  }

  async function patchCase(body: Record<string, unknown>) {
    const res = await fetch(`/api/cases/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await refresh();
  }

  async function setStatus(status: string) {
    setStageOpen(false);
    setC((p) => ({ ...p, status }));
    await patchCase({ status });
  }

  async function togglePriority() {
    const next = !c.highPriority;
    setC((p) => ({ ...p, highPriority: next }));
    await patchCase({ highPriority: next });
  }

  async function saveEdits() {
    await patchCase({
      sourceProvider: edit.sourceProvider,
      destinationCustodian: edit.destinationCustodian,
      accountType: edit.accountType,
      assignedAdvisorId: edit.advisorId || null,
      assignedOpsId: edit.opsId || null,
      internalNotes: edit.internalNotes,
    });
    setEditing(false);
  }

  async function addTask() {
    if (!taskInput.trim()) return;
    const title = taskInput.trim();
    setTaskInput("");
    await fetch(`/api/cases/${c.id}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await refresh();
  }

  async function toggleTask(t: Task) {
    const next = t.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await refresh();
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    const body = noteInput.trim();
    setNoteInput("");
    await fetch(`/api/cases/${c.id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await refresh();
  }

  async function setChecklistStatus(itemId: string, status: string) {
    await fetch(`/api/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function handleIssueClientLink() {
    if (!canManageClientLink) return;
    setClientLinkBusy("issuing");
    setClientLinkMsg(null);
    setClientLinkFallback(null);
    const res = await fetch(`/api/cases/${c.id}/client-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setClientLinkBusy("idle");
    if (!res.ok) {
      setClientLinkMsg("Failed to send portal invite.");
      return;
    }
    const body = (await res.json()) as { emailSent: boolean; emailError: string | null; portalUrl: string };
    setClientLinkActive(true);
    if (body.emailSent) {
      setClientLinkMsg(`Portal invite sent to ${c.clientEmail}.`);
    } else {
      setClientLinkMsg(`Link issued — couldn't send email: ${body.emailError ?? "unknown error"}.`);
      setClientLinkFallback({ url: body.portalUrl, reason: body.emailError ?? "" });
    }
  }

  async function handleCopyClientLink() {
    if (!clientLinkFallback) return;
    try {
      await navigator.clipboard.writeText(clientLinkFallback.url);
      setClientLinkMsg("Portal link copied to clipboard.");
    } catch {
      setClientLinkMsg("Couldn't copy — select and copy manually.");
    }
  }

  async function handleRevokeClientAccess() {
    if (!canManageClientLink) return;
    if (!confirm("Revoke all active client portal access for this case?")) return;
    setClientLinkBusy("revoking");
    setClientLinkMsg(null);
    setClientLinkFallback(null);
    const res = await fetch(`/api/cases/${c.id}/client-link`, { method: "DELETE" });
    setClientLinkBusy("idle");
    if (res.ok) {
      setClientLinkActive(false);
      setClientLinkMsg("Client access revoked.");
    } else {
      setClientLinkMsg("Failed to revoke.");
    }
  }

  const openTasks = c.tasks.filter((t) => t.status !== "COMPLETED");
  const doneTasks = c.tasks.filter((t) => t.status === "COMPLETED");
  const checklistDone = initialChecklist.filter((k) => k.status === "COMPLETE").length;
  const checklistPct =
    initialChecklist.length === 0 ? 0 : Math.round((checklistDone / initialChecklist.length) * 100);

  const fullName = (u: { firstName: string; lastName: string } | null) =>
    u ? `${u.firstName} ${u.lastName}`.trim() : "Unassigned";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: T.page }}>
      {/* Breadcrumb */}
      <div
        style={{
          padding: "16px 36px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Link href="/dashboard/cases" style={{ textDecoration: "none" }}>
          <button
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid transparent",
              color: T.textSecondary,
              fontSize: 12.5,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="left" size={13} /> Cases
          </button>
        </Link>
        <span style={{ color: T.textDisabled }}>/</span>
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>{stageLabel}</span>
        <span style={{ color: T.textDisabled }}>/</span>
        <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>
          {c.clientFirstName} {c.clientLastName}
        </span>
        <div style={{ flex: 1 }} />
      </div>

      {/* Header */}
      <div style={{ padding: "18px 36px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <Avatar name={`${c.clientFirstName} ${c.clientLastName}`} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 600,
                  color: T.text,
                  letterSpacing: -0.5,
                  fontFamily: HEADLINE_STACK,
                }}
              >
                {c.clientFirstName} {c.clientLastName}
              </h1>
              <button
                onClick={togglePriority}
                title="Priority"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: c.highPriority ? T.accent : T.textTertiary,
                  display: "inline-flex",
                }}
              >
                <Icon name="flag" size={17} />
              </button>
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 13,
                color: T.textSecondary,
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="mail" size={12} color={T.textTertiary} /> {c.clientEmail}
              </span>
              {c.clientPhone && (
                <>
                  <span style={{ color: T.textDisabled }}>·</span>
                  <span>{c.clientPhone}</span>
                </>
              )}
              <span style={{ color: T.textDisabled }}>·</span>
              <span>Opened {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            {c.wealthboxAmount && (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: T.text,
                  letterSpacing: -0.4,
                  fontFamily: HEADLINE_STACK,
                  ...TAB_NUM_STYLE,
                }}
              >
                {fmtMoney(c.wealthboxAmount)}
              </div>
            )}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setStageOpen((o) => !o)}
                style={{
                  height: 32,
                  padding: "0 12px",
                  background: T.surface1,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: T.text,
                  fontWeight: 500,
                }}
              >
                <Pill hue={stageHue} dot small>
                  {stageLabel}
                </Pill>
                <Icon name="down" size={13} color={T.textTertiary} />
              </button>
              {stageOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 38,
                    zIndex: 30,
                    minWidth: 240,
                    background: T.surface1,
                    border: `1px solid ${T.borderStrong}`,
                    borderRadius: 10,
                    padding: 6,
                    boxShadow: "0 8px 24px rgba(60,55,40,0.12)",
                  }}
                >
                  {allStages.map((s) => {
                    const h = STAGE_HUE[s.value] ?? "slate";
                    return (
                      <div
                        key={s.value}
                        onClick={() => setStatus(s.value)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: s.value === c.status ? T.surface2 : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = T.surface3;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            s.value === c.status ? T.surface2 : "transparent";
                        }}
                      >
                        <Pill hue={h} dot small>
                          {s.label}
                        </Pill>
                        {s.value === c.status && (
                          <Icon
                            name="check"
                            size={13}
                            color={T.textSecondary}
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage progress strip */}
        {currentStageIdx >= 0 && (
          <div style={{ marginTop: 16, display: "flex", gap: 4 }}>
            {allStages.map((s, i) => {
              const past = i < currentStageIdx;
              const now = i === currentStageIdx;
              const color = STAGE_COLOR[s.value] ?? T.textTertiary;
              return (
                <div key={s.value} style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: past || now ? color : T.surface3,
                      opacity: past ? 0.55 : 1,
                      border: now ? `1px solid ${color}` : "none",
                      boxShadow: now ? `0 0 0 3px ${T.accentSoft}` : "none",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10.5,
                      color: now ? T.text : past ? T.textSecondary : T.textTertiary,
                      fontWeight: now ? 600 : 400,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "20px 36px 28px",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 16,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Case details */}
          <Card>
            <div
              style={{
                padding: "16px 22px 12px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>Case details</div>
              {!editing ? (
                <Btn small ghost onClick={() => setEditing(true)}>
                  <Icon name="key" size={12} /> Edit
                </Btn>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small ghost onClick={() => setEditing(false)}>
                    Cancel
                  </Btn>
                  <Btn small primary onClick={saveEdits}>
                    <Icon name="check" size={12} /> Save
                  </Btn>
                </div>
              )}
            </div>
            <div style={{ padding: "8px 22px 14px" }}>
              <DetailField label="Source provider" hint="Where the assets are coming from.">
                {editing ? (
                  <TextInput
                    value={edit.sourceProvider}
                    onChange={(v) => setEdit((p) => ({ ...p, sourceProvider: v }))}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                    {c.sourceProvider}
                  </span>
                )}
              </DetailField>
              <DetailField label="Destination custodian">
                {editing ? (
                  <TextInput
                    value={edit.destinationCustodian}
                    onChange={(v) => setEdit((p) => ({ ...p, destinationCustodian: v }))}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                    {c.destinationCustodian}
                  </span>
                )}
              </DetailField>
              <DetailField label="Account type">
                {editing ? (
                  <SelectInput
                    value={edit.accountType}
                    onChange={(v) => setEdit((p) => ({ ...p, accountType: v }))}
                    options={Object.entries(ACCOUNT_TYPES).map(([value, label]) => ({ value, label }))}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                    {ACCOUNT_TYPES[c.accountType] ?? c.accountType}
                  </span>
                )}
              </DetailField>
              <DetailField label="Assigned advisor">
                {editing ? (
                  <SelectInput
                    value={edit.advisorId}
                    onChange={(v) => setEdit((p) => ({ ...p, advisorId: v }))}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...advisors.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
                    ]}
                  />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {c.assignedAdvisor && <Avatar name={fullName(c.assignedAdvisor)} size={22} />}
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                      {fullName(c.assignedAdvisor)}
                    </span>
                  </span>
                )}
              </DetailField>
              <DetailField label="Assigned ops">
                {editing ? (
                  <SelectInput
                    value={edit.opsId}
                    onChange={(v) => setEdit((p) => ({ ...p, opsId: v }))}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...ops.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
                    ]}
                  />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {c.assignedOps && <Avatar name={fullName(c.assignedOps)} size={22} />}
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                      {fullName(c.assignedOps)}
                    </span>
                  </span>
                )}
              </DetailField>
              <DetailField label="Internal notes" full last>
                {editing ? (
                  <textarea
                    value={edit.internalNotes}
                    onChange={(e) => setEdit((p) => ({ ...p, internalNotes: e.target.value }))}
                    style={{
                      width: "100%",
                      minHeight: 72,
                      background: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: 7,
                      padding: "8px 10px",
                      color: T.text,
                      fontSize: 13,
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                ) : c.internalNotes ? (
                  <div
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: T.surface2,
                      border: `1px solid ${T.borderSoft}`,
                      borderRadius: 7,
                      fontSize: 12.5,
                      color: T.text,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {c.internalNotes}
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, color: T.textTertiary }}>—</span>
                )}
              </DetailField>
            </div>
          </Card>

          {/* Tasks */}
          <Card>
            <div
              style={{
                padding: "16px 22px 12px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Tasks</div>
                <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2 }}>
                  {openTasks.length} open · {doneTasks.length} completed
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 22px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <TextInput
                  value={taskInput}
                  onChange={setTaskInput}
                  placeholder="Add a task…"
                  prefix={<Icon name="plus" size={13} color={T.textTertiary} />}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                  }}
                />
                <Btn small primary onClick={addTask}>
                  Add
                </Btn>
              </div>
              {openTasks.length === 0 && doneTasks.length === 0 && (
                <div
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    fontSize: 12.5,
                    color: T.textTertiary,
                  }}
                >
                  No tasks yet.
                </div>
              )}
              {openTasks.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderTop: i === 0 ? `1px solid ${T.border}` : `1px solid ${T.borderSoft}`,
                  }}
                >
                  <button
                    onClick={() => toggleTask(t)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${T.borderStrong}`,
                      background: T.surface1,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label="Mark complete"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{t.title}</div>
                    {t.dueDate && (
                      <div
                        style={{
                          fontSize: 11.5,
                          marginTop: 2,
                          color:
                            new Date(t.dueDate) < new Date() ? T.danger : T.textTertiary,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon name="bell" size={10} />
                        Due {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                  {t.assignee && <Avatar name={fullName(t.assignee)} size={20} />}
                </div>
              ))}
              {doneTasks.length > 0 && (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: T.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      padding: "10px 0 4px",
                    }}
                  >
                    Completed
                  </div>
                  {doneTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderTop: `1px solid ${T.borderSoft}`,
                      }}
                    >
                      <button
                        onClick={() => toggleTask(t)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          background: T.success,
                          border: "none",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          padding: 0,
                        }}
                        aria-label="Reopen"
                      >
                        <Icon name="check" size={12} color={T.surface1} />
                      </button>
                      <div
                        style={{
                          flex: 1,
                          fontSize: 12.5,
                          color: T.textSecondary,
                          textDecoration: "line-through",
                        }}
                      >
                        {t.title}
                      </div>
                      {t.assignee && <Avatar name={fullName(t.assignee)} size={18} />}
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          {/* Checklist */}
          {initialChecklist.length > 0 && (
            <Card>
              <div style={{ padding: "16px 22px 12px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      Document checklist
                    </div>
                    <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2 }}>
                      {checklistDone} of {initialChecklist.length} complete
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: T.text,
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    {checklistPct}%
                  </span>
                </div>
                <div style={{ marginTop: 10, display: "flex", height: 5, gap: 2 }}>
                  {initialChecklist.map((k) => {
                    const map: Record<string, string> = {
                      COMPLETE: T.success,
                      REVIEWED: T.violet,
                      RECEIVED: T.info,
                      REQUESTED: T.warning,
                      NOT_STARTED: T.surface3,
                    };
                    return (
                      <div
                        key={k.id}
                        style={{ flex: 1, background: map[k.status], borderRadius: 99 }}
                      />
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "6px 22px 14px" }}>
                {initialChecklist.map((k, i) => {
                  return (
                    <div
                      key={k.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 10,
                        padding: "12px 0",
                        borderBottom:
                          i === initialChecklist.length - 1 ? "none" : `1px solid ${T.borderSoft}`,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: T.text,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {k.name}
                          {k.required && (
                            <span style={{ fontSize: 10, color: T.danger }}>· required</span>
                          )}
                        </div>
                        {k.notes && (
                          <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 3 }}>
                            {k.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 160 }}>
                        <SelectInput
                          value={k.status}
                          onChange={(v) => setChecklistStatus(k.id, v)}
                          options={Object.entries(CHECKLIST_PILL).map(([value, p]) => ({
                            value,
                            label: p.label,
                          }))}
                          style={{ width: 160 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Quick actions */}
          <Card padded>
            <div
              style={{
                fontSize: 11,
                color: T.textTertiary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              Quick actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <a
                href={`mailto:${c.clientEmail}`}
                style={{ textDecoration: "none" }}
              >
                <Btn small>
                  <Icon name="mail" size={12} /> Email client
                </Btn>
              </a>
              {canManageClientLink ? (
                <Btn
                  small
                  onClick={handleIssueClientLink}
                  disabled={clientLinkBusy !== "idle"}
                  title={clientLinkActive ? "Resend the client portal magic link" : "Send a magic link giving the client access to the portal"}
                >
                  <Icon name="link" size={12} />{" "}
                  {clientLinkBusy === "issuing"
                    ? "Sending…"
                    : clientLinkActive
                    ? "Resend portal link"
                    : "Send portal link"}
                </Btn>
              ) : (
                <Btn small disabled>
                  <Icon name="link" size={12} /> Send portal link
                </Btn>
              )}
              <Link href={`/dashboard/intelligence`} style={{ textDecoration: "none" }}>
                <Btn small>
                  <Icon name="spark" size={12} /> Ask Claude
                </Btn>
              </Link>
              {canManageClientLink && clientLinkActive ? (
                <Btn
                  small
                  danger
                  onClick={handleRevokeClientAccess}
                  disabled={clientLinkBusy !== "idle"}
                  title="Revoke all active client portal access"
                >
                  <Icon name="x" size={12} />{" "}
                  {clientLinkBusy === "revoking" ? "Revoking…" : "Revoke access"}
                </Btn>
              ) : (
                <Btn small disabled>
                  <Icon name="ext" size={12} /> Open in CRM
                </Btn>
              )}
            </div>

            {clientLinkMsg && !clientLinkFallback && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  color: T.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {clientLinkMsg}
              </div>
            )}

            {clientLinkFallback && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: T.warningSoft,
                  border: `1px solid ${T.warningBorder}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: T.warning }}>
                  {clientLinkMsg}
                </div>
                <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 3, lineHeight: 1.5 }}>
                  The link below works — copy it and send it to the client manually.
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    readOnly
                    value={clientLinkFallback.url}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 28,
                      padding: "0 8px",
                      background: T.surface1,
                      border: `1px solid ${T.warningBorder}`,
                      borderRadius: 6,
                      color: T.text,
                      fontSize: 11.5,
                      fontFamily: "ui-monospace, monospace",
                      outline: "none",
                    }}
                  />
                  <Btn small onClick={handleCopyClientLink}>
                    <Icon name="copy" size={12} /> Copy
                  </Btn>
                </div>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <div
              style={{
                padding: "16px 20px 12px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>Notes</div>
              <span style={{ fontSize: 11, color: T.textTertiary }}>{c.notes.length}</span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <TextInput
                  value={noteInput}
                  onChange={setNoteInput}
                  placeholder="Add a note…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNote();
                  }}
                />
                <Btn small primary onClick={addNote}>
                  Add
                </Btn>
              </div>
              {c.notes.length === 0 && (
                <div
                  style={{
                    padding: "12px 0",
                    textAlign: "center",
                    fontSize: 12.5,
                    color: T.textTertiary,
                  }}
                >
                  No notes yet.
                </div>
              )}
              {c.notes
                .slice()
                .reverse()
                .map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 9,
                      background: i === 0 ? T.accentSoft : T.surface2,
                      border: `1px solid ${i === 0 ? T.accentBorder : T.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <Avatar name={n.author ? fullName(n.author) : "Client"} size={20} />
                      <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
                        {n.author ? fullName(n.author) : "Client"}
                      </span>
                      <span style={{ fontSize: 11, color: T.textTertiary }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.text,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {n.body}
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Activity</div>
            </div>
            <div style={{ padding: "10px 20px 16px" }}>
              {c.activityEvents.length === 0 && (
                <div
                  style={{
                    padding: "12px 0",
                    textAlign: "center",
                    fontSize: 12.5,
                    color: T.textTertiary,
                  }}
                >
                  No activity yet.
                </div>
              )}
              {c.activityEvents
                .slice()
                .reverse()
                .slice(0, 15)
                .map((a, i, arr) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flexShrink: 0,
                        width: 18,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: T.surface1,
                          border: `1.5px solid ${i === 0 ? T.accent : T.borderStrong}`,
                          zIndex: 1,
                        }}
                      />
                      {i < arr.length - 1 && (
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            bottom: -4,
                            left: 9,
                            width: 1,
                            background: T.border,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12.5,
                        color: T.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      <b style={{ color: T.text, fontWeight: 600 }}>
                        {a.actor ? fullName(a.actor) : "System"}
                      </b>{" "}
                      {EVENT_VERB[a.eventType] ?? "updated the case"}
                      {a.eventDetails && (
                        <span style={{ color: T.textTertiary }}> · {a.eventDetails}</span>
                      )}
                      <div
                        style={{
                          fontSize: 10.5,
                          color: T.textTertiary,
                          marginTop: 1,
                          fontFamily: "ui-monospace, monospace",
                        }}
                      >
                        {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  hint,
  full,
  last,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: full ? "1fr" : "180px 1fr",
        gap: full ? 8 : 24,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && (
          <div
            style={{
              fontSize: 11,
              color: T.textTertiary,
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 32,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}
