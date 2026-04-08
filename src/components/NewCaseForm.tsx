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
  { value: "TRADITIONAL_IRA_401K", label: "401(k) → Traditional IRA" },
  { value: "ROTH_IRA_401K",        label: "401(k) → Roth IRA"        },
  { value: "IRA_403B",             label: "403(b) → IRA"             },
  { value: "OTHER",                label: "Other"                     },
];

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow";

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
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Section 1: Client */}
      <FormSection step={1} title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input type="text" required value={form.clientFirstName} onChange={(e) => set("clientFirstName", e.target.value)} className={inputCls} placeholder="Jane" />
          </Field>
          <Field label="Last Name" required>
            <input type="text" required value={form.clientLastName} onChange={(e) => set("clientLastName", e.target.value)} className={inputCls} placeholder="Smith" />
          </Field>
        </div>
        <Field label="Client Email" required>
          <input type="email" required value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} className={inputCls} placeholder="client@example.com" />
        </Field>
      </FormSection>

      {/* Section 2: Rollover */}
      <FormSection step={2} title="Rollover Details">
        <Field label="Source Provider (current 401k plan)" required>
          <input type="text" required value={form.sourceProvider} onChange={(e) => set("sourceProvider", e.target.value)} className={inputCls} placeholder="e.g. Fidelity NetBenefits" />
        </Field>
        <Field label="Destination Custodian" required>
          <input type="text" required value={form.destinationCustodian} onChange={(e) => set("destinationCustodian", e.target.value)} className={inputCls} placeholder="e.g. Schwab, Vanguard" />
        </Field>
        <Field label="Account Type" required>
          <select value={form.accountType} onChange={(e) => set("accountType", e.target.value)} className={inputCls}>
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </FormSection>

      {/* Section 3: Assignment */}
      <FormSection step={3} title="Assignment">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Assigned Advisor">
            <select value={form.assignedAdvisorId} onChange={(e) => set("assignedAdvisorId", e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {advisors.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </Field>
          <Field label="Assigned Ops">
            <select value={form.assignedOpsId} onChange={(e) => set("assignedOpsId", e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {ops.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </Field>
        </div>
      </FormSection>

      {/* Section 4: Options */}
      <FormSection step={4} title="Options" last>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={form.highPriority}
              onChange={(e) => set("highPriority", e.target.checked)}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${form.highPriority ? "border-red-500 bg-red-500" : "border-gray-300 group-hover:border-gray-400"}`}>
              {form.highPriority && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-800">High priority</span>
            <p className="text-xs text-gray-400">This case will be highlighted in the case list.</p>
          </div>
        </label>

        <Field label="Internal Notes">
          <textarea
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Any notes for the team…"
          />
        </Field>
      </FormSection>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 mx-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-red-500">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          style={{ boxShadow: "0 1px 2px rgb(37 99 235 / 0.25)" }}
        >
          {loading ? "Creating…" : "Create Case"}
        </button>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 px-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FormSection({
  step,
  title,
  children,
  last = false,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex gap-5 ${!last ? "pb-6 mb-6 border-b border-gray-100" : "pb-6"}`}>
      {/* Step indicator */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{step}</span>
        </div>
        {!last && <div className="w-px flex-1 bg-gray-100 mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pt-0.5">{title}</h2>
        <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: "var(--shadow-xs)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
