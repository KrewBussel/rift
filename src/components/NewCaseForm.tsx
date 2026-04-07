"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ACCOUNT_TYPES = [
  { value: "TRADITIONAL_IRA_401K", label: "401(k) to Traditional IRA" },
  { value: "ROTH_IRA_401K", label: "401(k) to Roth IRA" },
  { value: "IRA_403B", label: "403(b) to IRA" },
  { value: "OTHER", label: "Other" },
];

export default function NewCaseForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientFirstName: "",
    clientLastName: "",
    clientEmail: "",
    sourceProvider: "",
    destinationCustodian: "",
    accountType: "TRADITIONAL_IRA_401K",
    assignedAdvisorId: "",
    assignedOpsId: "",
    highPriority: false,
    internalNotes: "",
  });

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to create case. Please try again.");
      return;
    }

    const created = await res.json();
    router.push(`/dashboard/cases/${created.id}`);
  }

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      {/* Client info */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Client Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input
              type="text"
              required
              value={form.clientFirstName}
              onChange={(e) => set("clientFirstName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Last Name" required>
            <input
              type="text"
              required
              value={form.clientLastName}
              onChange={(e) => set("clientLastName", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Client Email" required>
            <input
              type="email"
              required
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              className={inputCls}
              placeholder="client@example.com"
            />
          </Field>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Rollover details */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Rollover Details</h2>
        <div className="space-y-4">
          <Field label="Source Provider (401k Plan)" required>
            <input
              type="text"
              required
              value={form.sourceProvider}
              onChange={(e) => set("sourceProvider", e.target.value)}
              className={inputCls}
              placeholder="e.g. Fidelity NetBenefits"
            />
          </Field>
          <Field label="Destination Custodian" required>
            <input
              type="text"
              required
              value={form.destinationCustodian}
              onChange={(e) => set("destinationCustodian", e.target.value)}
              className={inputCls}
              placeholder="e.g. Schwab"
            />
          </Field>
          <Field label="Account Type" required>
            <select
              value={form.accountType}
              onChange={(e) => set("accountType", e.target.value)}
              className={inputCls}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Assignment */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Assignment</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Assigned Advisor">
            <select
              value={form.assignedAdvisorId}
              onChange={(e) => set("assignedAdvisorId", e.target.value)}
              className={inputCls}
            >
              <option value="">— None —</option>
              {advisors.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Ops">
            <select
              value={form.assignedOpsId}
              onChange={(e) => set("assignedOpsId", e.target.value)}
              className={inputCls}
            >
              <option value="">— None —</option>
              {ops.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Options */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.highPriority}
            onChange={(e) => set("highPriority", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">High priority</span>
        </label>
        <Field label="Internal Notes">
          <textarea
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Optional notes for the team…"
          />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Creating…" : "Create Case"}
        </button>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
