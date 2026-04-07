"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
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

interface Props {
  caseId: string;
  initialTasks: Task[];
  users: User[];
}

const DEFAULT_TASKS = [
  "Confirm rollover details with client",
  "Request required forms from provider",
  "Review received documents",
  "Submit paperwork to custodian",
  "Confirm transfer progress",
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-green-100 text-green-700",
  BLOCKED: "bg-red-100 text-red-700",
};

function isOverdue(task: Task) {
  return task.status !== "COMPLETED" && task.dueDate && new Date(task.dueDate) < new Date();
}

export default function TaskList({ caseId, initialTasks, users }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
  });

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
    await fetch(`/api/cases/${caseId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(null);
    setDraft({ title: "", description: "", assigneeId: "", dueDate: "" });
    setShowForm(false);
    await refreshTasks();
  }

  async function handleQuickAdd(title: string) {
    setSaving("quick-" + title);
    await fetch(`/api/cases/${caseId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setSaving(null);
    await refreshTasks();
  }

  async function handleStatusToggle(task: Task) {
    const newStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    setSaving(task.id);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(null);
    await refreshTasks();
  }

  async function handleSetBlocked(task: Task) {
    const newStatus = task.status === "BLOCKED" ? "OPEN" : "BLOCKED";
    setSaving(task.id);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
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
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Tasks</h2>
          {open.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{open.length} open</span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">{overdueCount} overdue</span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showForm ? "Cancel" : "+ Add task"}
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
          <input
            type="text"
            placeholder="Task title *"
            required
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={inputCls}
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className={inputCls}
          />
          <div className="flex gap-2">
            <select
              value={draft.assigneeId}
              onChange={(e) => setDraft((d) => ({ ...d, assigneeId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Assign to…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving === "new"}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving === "new" ? "Adding…" : "Add Task"}
            </button>
          </div>

          {/* Quick-add suggestions */}
          <div className="pt-1 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1.5">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_TASKS.filter((t) => !tasks.some((existing) => existing.title === t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleQuickAdd(t)}
                  disabled={saving === "quick-" + t}
                  className="text-xs bg-white border border-gray-200 text-gray-600 rounded px-2 py-1 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
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
        <p className="text-sm text-gray-400 mb-3">No open tasks.</p>
      )}
      <div className="space-y-1.5 mb-3">
        {open.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            saving={saving === task.id}
            onToggle={() => handleStatusToggle(task)}
            onBlock={() => handleSetBlocked(task)}
            onDelete={() => handleDelete(task.id)}
          />
        ))}
      </div>

      {/* Completed tasks (collapsed) */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2"
          >
            {showCompleted ? "▾" : "▸"} {completed.length} completed
          </button>
          {showCompleted && (
            <div className="space-y-1.5 opacity-60">
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  saving={saving === task.id}
                  onToggle={() => handleStatusToggle(task)}
                  onBlock={() => handleSetBlocked(task)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  task,
  saving,
  onToggle,
  onBlock,
  onDelete,
}: {
  task: Task;
  saving: boolean;
  onToggle: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(task);

  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2 group ${overdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        disabled={saving}
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
          task.status === "COMPLETED"
            ? "bg-green-500 border-green-500"
            : task.status === "BLOCKED"
            ? "bg-red-200 border-red-300"
            : "border-gray-300 hover:border-blue-400"
        } disabled:opacity-50`}
        title={task.status === "COMPLETED" ? "Mark open" : "Mark complete"}
      >
        {task.status === "COMPLETED" && (
          <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-800"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {task.assignee && (
            <span className="text-xs text-gray-400">{task.assignee.firstName} {task.assignee.lastName}</span>
          )}
          {task.dueDate && (
            <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {overdue ? "Overdue · " : "Due "}{formatDate(task.dueDate)}
            </span>
          )}
          {task.status === "BLOCKED" && (
            <span className="text-xs text-red-500 font-medium">Blocked</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {task.status !== "COMPLETED" && (
          <button
            onClick={onBlock}
            title={task.status === "BLOCKED" ? "Unblock" : "Mark blocked"}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
          >
            {task.status === "BLOCKED" ? "Unblock" : "Block"}
          </button>
        )}
        <button
          onClick={onDelete}
          title="Delete task"
          className="text-xs text-gray-400 hover:text-red-500 px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
