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
  const overdue = myTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* My Open Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">My Open Tasks</h2>
          <div className="flex items-center gap-2">
            {overdue.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
                {overdue.length} overdue
              </span>
            )}
            <span className="text-xs text-gray-400">{myTasks.length} total</span>
          </div>
        </div>

        {myTasks.length === 0 ? (
          <p className="text-sm text-gray-400">No open tasks assigned to you.</p>
        ) : (
          <ul className="space-y-2">
            {myTasks.slice(0, 5).map((task) => {
              const pastDue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <li key={task.id}>
                  <Link
                    href={`/dashboard/cases/${task.case.id}`}
                    className="flex items-start justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate group-hover:text-blue-600">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {task.case.clientFirstName} {task.case.clientLastName}
                      </p>
                    </div>
                    {task.dueDate && (
                      <span className={`text-xs flex-shrink-0 ${pastDue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        {pastDue ? "Overdue · " : ""}{formatDate(task.dueDate)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            {myTasks.length > 5 && (
              <li className="text-xs text-gray-400 pt-1">+{myTasks.length - 5} more tasks</li>
            )}
          </ul>
        )}
      </div>

      {/* Stale Cases */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">No Activity (7+ days)</h2>
          <span className="text-xs text-gray-400">{staleCases.length} case{staleCases.length !== 1 ? "s" : ""}</span>
        </div>

        {staleCases.length === 0 ? (
          <p className="text-sm text-gray-400">All cases have recent activity.</p>
        ) : (
          <ul className="space-y-2">
            {staleCases.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate group-hover:text-blue-600">
                      {c.clientFirstName} {c.clientLastName}
                    </p>
                    <p className="text-xs text-gray-400">{STATUS_LABELS[c.status] ?? c.status}</p>
                  </div>
                  <span className="text-xs text-orange-500 font-medium flex-shrink-0">
                    {c.daysSinceActivity}d idle
                  </span>
                </Link>
              </li>
            ))}
            {staleCases.length > 5 && (
              <li className="text-xs text-gray-400 pt-1">+{staleCases.length - 5} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
