"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DarkSelect from "./DarkSelect";

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

const STEPS = [
  { title: "Client Information",  description: "Who is this rollover for?"              },
  { title: "Rollover Details",    description: "Where is the money coming from and going?" },
  { title: "Assignment",          description: "Who is handling this case?"              },
  { title: "Options & Review",    description: "Final details before creating the case." },
];

const inputCls = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 transition-colors";
const inputStyle = {
  background: "#0d1117",
  border: "1px solid #30363d",
  color: "#c9d1d9",
};

export default function NewCaseForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [displayedStep, setDisplayedStep] = useState(0);
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

  function transitionTo(newStep: number) {
    setVisible(false);
    setTimeout(() => {
      setDisplayedStep(newStep);
      setStep(newStep);
      setVisible(true);
    }, 160);
  }

  function handleNext() {
    if (step < STEPS.length - 1) transitionTo(step + 1);
  }

  function handleBack() {
    if (step > 0) transitionTo(step - 1);
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

  function canProceed() {
    if (step === 0) return form.clientFirstName.trim() && form.clientLastName.trim() && form.clientEmail.trim();
    if (step === 1) return form.sourceProvider.trim() && form.destinationCustodian.trim();
    return true;
  }

  const advisors = users.filter((u) => u.role === "ADVISOR" || u.role === "ADMIN");
  const ops = users.filter((u) => u.role === "OPS" || u.role === "ADMIN");
  const accountTypeLabel = ACCOUNT_TYPES.find((t) => t.value === form.accountType)?.label ?? form.accountType;
  const advisorLabel = advisors.find((u) => u.id === form.assignedAdvisorId);
  const opsLabel = ops.find((u) => u.id === form.assignedOpsId);

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-56px)] py-10 px-4">
      {/* Card */}
      <div className="w-full max-w-lg">

        {/* Back to cases */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors" style={{ color: "#7d8590" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#c9d1d9")} onMouseLeave={(e) => (e.currentTarget.style.color = "#7d8590")}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to cases
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "#e4e6ea" }}>New Rollover Case</h1>
          <p className="text-sm" style={{ color: "#7d8590" }}>Step {step + 1} of {STEPS.length} — {STEPS[step].description}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
                    style={{
                      background: done ? "#238636" : current ? "#388bfd" : "#21262d",
                      color: done || current ? "#fff" : "#484f58",
                      border: current ? "2px solid #58a6ff" : "2px solid transparent",
                      boxShadow: current ? "0 0 0 3px rgba(56,139,253,0.15)" : "none",
                    }}
                  >
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className="text-[10px] font-medium whitespace-nowrap hidden sm:block transition-colors" style={{ color: current ? "#79c0ff" : done ? "#3fb950" : "#484f58" }}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-2 mt-[-10px] transition-colors duration-300" style={{ background: i < step ? "#238636" : "#21262d" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content card */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-2xl p-8"
            style={{
              background: "#161b22",
              border: "1px solid #21262d",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 160ms ease, transform 160ms ease",
            }}
          >
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#e4e6ea" }}>{STEPS[displayedStep].title}</h2>
            <p className="text-sm mb-6" style={{ color: "#7d8590" }}>{STEPS[displayedStep].description}</p>

            {/* Step 0: Client Information */}
            {displayedStep === 0 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" required>
                    <input type="text" required value={form.clientFirstName} onChange={(e) => set("clientFirstName", e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="Jane" autoFocus />
                  </Field>
                  <Field label="Last Name" required>
                    <input type="text" required value={form.clientLastName} onChange={(e) => set("clientLastName", e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="Smith" />
                  </Field>
                </div>
                <Field label="Email Address" required>
                  <input type="email" required value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="client@example.com" />
                </Field>
              </div>
            )}

            {/* Step 1: Rollover Details */}
            {displayedStep === 1 && (
              <div className="space-y-5">
                <Field label="Source Provider" required hint="The current plan or institution holding the funds">
                  <input type="text" required value={form.sourceProvider} onChange={(e) => set("sourceProvider", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="e.g. Fidelity NetBenefits, Vanguard 401(k)" autoFocus />
                </Field>
                <Field label="Destination Custodian" required hint="Where the funds are being rolled into">
                  <input type="text" required value={form.destinationCustodian} onChange={(e) => set("destinationCustodian", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="e.g. Schwab, Vanguard IRA" />
                </Field>
                <Field label="Account Type" required>
                  <DarkSelect value={form.accountType} onChange={(v) => set("accountType", v)} options={ACCOUNT_TYPES} />
                </Field>
              </div>
            )}

            {/* Step 2: Assignment */}
            {displayedStep === 2 && (
              <div className="space-y-5">
                <Field label="Assigned Advisor" hint="The advisor responsible for this client relationship">
                  <DarkSelect value={form.assignedAdvisorId} onChange={(v) => set("assignedAdvisorId", v)}
                    options={[{ value: "", label: "Unassigned" }, ...advisors.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} />
                </Field>
                <Field label="Assigned Ops" hint="The operations team member processing the paperwork">
                  <DarkSelect value={form.assignedOpsId} onChange={(v) => set("assignedOpsId", v)}
                    options={[{ value: "", label: "Unassigned" }, ...ops.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} />
                </Field>
              </div>
            )}

            {/* Step 3: Options & Review */}
            {displayedStep === 3 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="rounded-xl p-4 space-y-2" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#484f58" }}>Review</p>
                  <SummaryRow label="Client" value={`${form.clientFirstName} ${form.clientLastName}`} />
                  <SummaryRow label="Email" value={form.clientEmail} />
                  <SummaryRow label="Source" value={form.sourceProvider} />
                  <SummaryRow label="Destination" value={form.destinationCustodian} />
                  <SummaryRow label="Account Type" value={accountTypeLabel} />
                  <SummaryRow label="Advisor" value={advisorLabel ? `${advisorLabel.firstName} ${advisorLabel.lastName}` : "Unassigned"} />
                  <SummaryRow label="Ops" value={opsLabel ? `${opsLabel.firstName} ${opsLabel.lastName}` : "Unassigned"} />
                </div>

                {/* High priority toggle */}
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input type="checkbox" checked={form.highPriority} onChange={(e) => set("highPriority", e.target.checked)} className="sr-only" />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.highPriority ? "border-red-500 bg-red-500" : "border-[#30363d] group-hover:border-[#484f58]"}`}>
                      {form.highPriority && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1 4.5l2.5 2.5L8 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#c9d1d9" }}>High Priority</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7d8590" }}>Flag this case for urgent attention in the case list.</p>
                  </div>
                </label>

                {/* Internal notes */}
                <Field label="Internal Notes" hint="Visible only to your team">
                  <textarea value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)}
                    rows={3} className={inputCls} style={{ ...inputStyle, resize: "vertical" }}
                    placeholder="Any context the team should know about this rollover…" />
                </Field>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "#2d1515", border: "1px solid #5a2020" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0" style={{ color: "#f87171" }}>
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                visibility: step === 0 ? "hidden" : "visible",
                background: "#21262d",
                color: "#c9d1d9",
                border: "1px solid #30363d",
              }}
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#388bfd", color: "#fff" }}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 bg-blue-600 text-white hover:bg-blue-500"
              >
                {loading ? "Creating…" : "Create Case"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-1 mb-2">
        <label className="block text-sm font-medium" style={{ color: "#c9d1d9" }}>
          {label}{required && <span className="ml-0.5" style={{ color: "#f87171" }}>*</span>}
        </label>
        {hint && <span className="text-xs" style={{ color: "#7d8590" }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5" style={{ borderBottom: "1px solid #21262d" }}>
      <span className="text-xs flex-shrink-0" style={{ color: "#7d8590" }}>{label}</span>
      <span className="text-xs text-right font-medium truncate" style={{ color: value === "Unassigned" ? "#484f58" : "#c9d1d9" }}>{value}</span>
    </div>
  );
}
