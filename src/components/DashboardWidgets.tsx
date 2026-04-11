"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  case: { id: string; clientFirstName: string; clientLastName: string };
}

interface StaleCase {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  status: string;
  updatedAt: string;
  daysSinceActivity: number;
}

interface Props {
  myTasks: Task[];
  staleCases: StaleCase[];
}

const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Intake",
  AWAITING_CLIENT_ACTION: "Awaiting Client Action",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
};

export default function DashboardWidgets({ myTasks, staleCases }: Props) {
  const overdue = myTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* My Open Tasks */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#161b22", border: "1px solid #21262d" }}
      >
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid #21262d" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>My Open Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            {overdue.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: "#3d1f1f", color: "#f87171" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {overdue.length} overdue
              </span>
            )}
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "#21262d", color: "#7d8590" }}>
              {myTasks.length}
            </span>
          </div>
        </div>

        <div className="px-5 py-3">
          {myTasks.length === 0 ? (
            <div className="py-5 text-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: "#21262d" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#3fb950" }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#e4e6ea" }}>All caught up</p>
              <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>No open tasks assigned to you.</p>
            </div>
          ) : (
            <ul>
              {myTasks.slice(0, 5).map((task, i) => {
                const pastDue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <li key={task.id} style={i !== 0 ? { borderTop: "1px solid #21262d" } : {}}>
                    <Link href={`/dashboard/cases/${task.case.id}`} className="flex items-start justify-between gap-3 py-2.5 group">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0"
                          style={{ border: pastDue ? "1px solid #f87171" : "1px solid #30363d" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm truncate group-hover:text-blue-400 transition-colors" style={{ color: "#c9d1d9" }}>
                            {task.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>
                            {task.case.clientFirstName} {task.case.clientLastName}
                          </p>
                        </div>
                      </div>
                      {task.dueDate && (
                        <span className="text-xs flex-shrink-0 font-medium" style={{ color: pastDue ? "#f87171" : "#7d8590" }}>
                          {pastDue ? "Overdue" : formatDate(task.dueDate)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {myTasks.length > 5 && (
                <li style={{ borderTop: "1px solid #21262d", paddingTop: "10px" }}>
                  <p className="text-xs" style={{ color: "#7d8590" }}>+{myTasks.length - 5} more task{myTasks.length - 5 !== 1 ? "s" : ""}</p>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Stale Cases */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#161b22", border: "1px solid #21262d" }}
      >
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid #21262d" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#21262d" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#7d8590" }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#e4e6ea" }}>No Activity (7+ days)</span>
          </div>
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "#21262d", color: "#7d8590" }}>
            {staleCases.length}
          </span>
        </div>

        <div className="px-5 py-3">
          {staleCases.length === 0 ? (
            <div className="py-5 text-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: "#21262d" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#3fb950" }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#e4e6ea" }}>All cases active</p>
              <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>No cases idle for 7+ days.</p>
            </div>
          ) : (
            <ul>
              {staleCases.slice(0, 5).map((c, i) => (
                <li key={c.id} style={i !== 0 ? { borderTop: "1px solid #21262d" } : {}}>
                  <Link href={`/dashboard/cases/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 group">
                    <div className="min-w-0">
                      <p className="text-sm truncate group-hover:text-blue-400 transition-colors" style={{ color: "#c9d1d9" }}>
                        {c.clientFirstName} {c.clientLastName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>{STATUS_LABELS[c.status] ?? c.status}</p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background: "#2d1f0e", color: "#e09937" }}>
                      {c.daysSinceActivity}d idle
                    </span>
                  </Link>
                </li>
              ))}
              {staleCases.length > 5 && (
                <li style={{ borderTop: "1px solid #21262d", paddingTop: "10px" }}>
                  <p className="text-xs" style={{ color: "#7d8590" }}>+{staleCases.length - 5} more</p>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
