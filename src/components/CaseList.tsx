"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Case {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  sourceProvider: string;
  destinationCustodian: string;
  accountType: string;
  status: string;
  highPriority: boolean;
  statusUpdatedAt: string;
  updatedAt: string;
  assignedAdvisor: { id: string; firstName: string; lastName: string } | null;
  assignedOps: { id: string; firstName: string; lastName: string } | null;
}

interface Props {
  cases: Case[];
  users: User[];
  statusLabels: Record<string, string>;
  filters: { search: string; status: string; advisorId: string };
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "bg-gray-100 text-gray-700",
  AWAITING_CLIENT_ACTION: "bg-yellow-100 text-yellow-800",
  READY_TO_SUBMIT: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  PROCESSING: "bg-orange-100 text-orange-800",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function CaseList({ cases, users, statusLabels, filters, compact = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams({
      search: filters.search,
      status: filters.status,
      advisorId: filters.advisorId,
      [key]: value,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cases.length} case{cases.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <span>+ New Case</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by client name or email…"
          defaultValue={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          defaultValue={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          defaultValue={filters.advisorId}
          onChange={(e) => updateFilter("advisorId", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All advisors</option>
          {users.filter(u => u.role === "ADVISOR" || u.role === "ADMIN").map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No cases found</p>
          <p className="text-sm mt-1">Create a new case to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/cases/${c.id}`}
              className={`flex items-center justify-between px-5 hover:bg-gray-50 transition-colors ${compact ? "py-2.5" : "py-4"}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {c.highPriority && (
                  <span className="text-red-500 text-xs font-bold flex-shrink-0">HIGH</span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.clientFirstName} {c.clientLastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {c.sourceProvider} → {c.destinationCustodian}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">
                    {c.assignedAdvisor ? `${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}` : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(c.statusUpdatedAt)}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {statusLabels[c.status] ?? c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
