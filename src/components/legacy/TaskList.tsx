"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import DarkSelect from "./DarkSelect";

interface User { id: string; firstName: string; lastName: string; role: string; }
interface Task { id: string; title: string; description: string | null; status: "OPEN" | "COMPLETED" | "BLOCKED"; dueDate: string | null; assignee: { id: string; firstName: string; lastName: string } | null; createdBy: { id: string; firstName: string; lastName: string }; createdAt: string; }
interface Props { caseId: string; initialTasks: Task[]; users: User[]; }

const DEFAULT_TASKS = [
  "Confirm rollover details with client",
  "Request required forms from provider",
  "Review received documents",
  "Submit paperwork to custodian",
  "Confirm transfer progress",
];

const inputCls = "w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-0 focus:border-transparent";
const inputStyle = { background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" };

function isOverdue(task: Task) {
  return task.status !== "COMPLETED" && task.dueDate && new Date(task.dueDate) < new Date();
}

export default function TaskList({ caseId, initialTasks, users }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", assigneeId: "", dueDate: "" });

  const open = tasks.filter((t) => t.status !== "COMPLETED");
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const overdueCount = open.filter(isOverdue).length;

  async function refreshTasks() {
    const res = await fetch(`/api/cases/${caseId}/tasks`);
    if (res.ok) setTasks(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving("new");
    await fetch(`/api/cases/${caseId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    setSaving(null);
    setDraft({ title: "", description: "", assigneeId: "", dueDate: "" });
    setShowForm(false);
    await refreshTasks();
  }

  async function handleQuickAdd(title: string) {
    setSaving("quick-" + title);
    await fetch(`/api/cases/${caseId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    setSaving(null);
    await refreshTasks();
  }

  async function handleStatusToggle(task: Task) {
    const newStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    setSaving(task.id);
    await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setSaving(null);
    await refreshTasks();
  }

  async function handleSetBlocked(task: Task) {
    const newStatus = task.status === "BLOCKED" ? "OPEN" : "BLOCKED";
    setSaving(task.id);
    await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setSaving(null);
    await refreshTasks();
  }

  async function handleDelete(taskId: string) {
    setSaving(taskId);
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setSaving(null);
    await refreshTasks();
  }

  return (
    <section className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #21262d" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #21262d" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
              <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>Tasks</h2>
          {open.length > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "#21262d", color: "#7d8590" }}>{open.length} open</span>
          )}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ background: "#3d1f1f", color: "#f87171" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showForm ? "Cancel" : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Add task
            </>
          )}
        </button>
      </div>

      <div className="p-5">
        {/* New task form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-4 rounded-lg p-3 space-y-2" style={{ background: "#0d1117", border: "1px solid #30363d" }}>
            <input type="text" placeholder="Task title *" required value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputCls} style={inputStyle} autoFocus />
            <input type="text" placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className={inputCls} style={inputStyle} />
            <div className="flex gap-2">
              <DarkSelect value={draft.assigneeId} onChange={(v) => setDraft((d) => ({ ...d, assigneeId: v }))}
                options={[{ value: "", label: "Assign to…" }, ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} />
              <input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving === "new"} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {saving === "new" ? "Adding…" : "Add Task"}
              </button>
            </div>
            {/* Quick-add suggestions */}
            <div className="pt-1" style={{ borderTop: "1px solid #21262d" }}>
              <p className="text-xs mb-1.5" style={{ color: "#7d8590" }}>Quick add:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TASKS.filter((t) => !tasks.some((existing) => existing.title === t)).map((t) => (
                  <button key={t} type="button" onClick={() => handleQuickAdd(t)} disabled={saving === "quick-" + t}
                    className="text-xs rounded px-2 py-1 transition-colors disabled:opacity-50"
                    style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#388bfd"; (e.currentTarget as HTMLElement).style.color = "#79c0ff"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#30363d"; (e.currentTarget as HTMLElement).style.color = "#8b949e"; }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* Open tasks */}
        {open.length === 0 && !showForm && (
          <p className="text-sm mb-3" style={{ color: "#7d8590" }}>No open tasks.</p>
        )}
        <div className="space-y-1.5 mb-3">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} saving={saving === task.id} onToggle={() => handleStatusToggle(task)} onBlock={() => handleSetBlocked(task)} onDelete={() => handleDelete(task.id)} />
          ))}
        </div>

        {/* Completed tasks */}
        {completed.length > 0 && (
          <div>
            <button onClick={() => setShowCompleted((v) => !v)} className="flex items-center gap-1 text-xs mb-2 transition-colors" style={{ color: "#7d8590" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${showCompleted ? "rotate-90" : ""}`}>
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {completed.length} completed
            </button>
            {showCompleted && (
              <div className="space-y-1.5 opacity-60">
                {completed.map((task) => (
                  <TaskRow key={task.id} task={task} saving={saving === task.id} onToggle={() => handleStatusToggle(task)} onBlock={() => handleSetBlocked(task)} onDelete={() => handleDelete(task.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TaskRow({ task, saving, onToggle, onBlock, onDelete }: { task: Task; saving: boolean; onToggle: () => void; onBlock: () => void; onDelete: () => void; }) {
  const overdue = isOverdue(task);

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2 group transition-colors"
      style={{ background: overdue ? "rgba(248,113,113,0.06)" : "transparent" }}
      onMouseEnter={(e) => { if (!overdue) (e.currentTarget as HTMLElement).style.background = "#1c2128"; }}
      onMouseLeave={(e) => { if (!overdue) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        disabled={saving}
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded transition-colors disabled:opacity-50 flex items-center justify-center`}
        style={{
          background: task.status === "COMPLETED" ? "#238636" : task.status === "BLOCKED" ? "rgba(248,113,113,0.2)" : "transparent",
          border: task.status === "COMPLETED" ? "1px solid #238636" : task.status === "BLOCKED" ? "1px solid #f87171" : "1px solid #30363d",
        }}
        title={task.status === "COMPLETED" ? "Mark open" : "Mark complete"}
      >
        {task.status === "COMPLETED" && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: task.status === "COMPLETED" ? "#484f58" : "#c9d1d9", textDecoration: task.status === "COMPLETED" ? "line-through" : "none" }}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "#7d8590" }}>{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {task.assignee && (
            <span className="text-xs" style={{ color: "#7d8590" }}>{task.assignee.firstName} {task.assignee.lastName}</span>
          )}
          {task.dueDate && (
            <span className="text-xs" style={{ color: overdue ? "#f87171" : "#7d8590", fontWeight: overdue ? 500 : 400 }}>
              {overdue ? "Overdue · " : "Due "}{formatDate(task.dueDate)}
            </span>
          )}
          {task.status === "BLOCKED" && (
            <span className="text-xs font-medium" style={{ color: "#f87171" }}>Blocked</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {task.status !== "COMPLETED" && (
          <button onClick={onBlock} title={task.status === "BLOCKED" ? "Unblock" : "Mark blocked"} className="text-xs px-1 transition-colors" style={{ color: "#7d8590" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")} onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8590")}>
            {task.status === "BLOCKED" ? "Unblock" : "Block"}
          </button>
        )}
        <button onClick={onDelete} title="Delete task" className="text-xs px-1 transition-colors" style={{ color: "#7d8590" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")} onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8590")}>
          ✕
        </button>
      </div>
    </div>
  );
}
