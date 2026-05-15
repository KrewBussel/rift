"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, HEADLINE_STACK } from "./tokens";
import { Btn, Card, Icon, SelectInput, TextInput, Toggle } from "./primitives";

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
  { title: "Client information",  description: "Who is this rollover for?"                 },
  { title: "Rollover details",    description: "Where is the money coming from and going?" },
  { title: "Assignment",          description: "Who is handling this case?"                },
  { title: "Options & review",    description: "Final details before creating the case."   },
];

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
    }, 140);
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px 60px" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        {/* Back link */}
        <Link
          href="/dashboard/cases"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: T.textSecondary,
            marginBottom: 20,
          }}
        >
          <Icon name="left" size={13} /> Back to cases
        </Link>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              color: T.text,
              letterSpacing: -0.4,
              fontFamily: HEADLINE_STACK,
            }}
          >
            New rollover case
          </h1>
          <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 6 }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step].description}
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const dot = done ? T.success : current ? T.accent : T.surface3;
            const ring = current ? `0 0 0 3px ${T.accentSoft}` : "none";
            const fg = done || current ? T.surface1 : T.textTertiary;
            return (
              <div key={s.title} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: dot,
                      color: fg,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11.5,
                      fontWeight: 600,
                      transition: "background 160ms, box-shadow 160ms",
                      boxShadow: ring,
                      border: current ? `1px solid ${T.accentBorder}` : "1px solid transparent",
                    }}
                  >
                    {done ? <Icon name="check" size={13} color={T.surface1} /> : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      color: current ? T.accent : done ? T.success : T.textTertiary,
                    }}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      margin: "0 10px",
                      marginTop: -14,
                      background: done ? T.success : T.border,
                      transition: "background 200ms",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit}>
          <Card
            padded
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 140ms ease, transform 140ms ease",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text }}>{STEPS[displayedStep].title}</h2>
            <p style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 4, marginBottom: 18 }}>
              {STEPS[displayedStep].description}
            </p>

            {displayedStep === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="First name" required>
                    <TextInput value={form.clientFirstName} onChange={(v) => set("clientFirstName", v)} placeholder="Jane" autoFocus />
                  </Field>
                  <Field label="Last name" required>
                    <TextInput value={form.clientLastName} onChange={(v) => set("clientLastName", v)} placeholder="Smith" />
                  </Field>
                </div>
                <Field label="Email address" required>
                  <TextInput type="email" value={form.clientEmail} onChange={(v) => set("clientEmail", v)} placeholder="client@example.com" />
                </Field>
              </div>
            )}

            {displayedStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Source provider" required hint="The current plan or institution holding the funds">
                  <TextInput value={form.sourceProvider} onChange={(v) => set("sourceProvider", v)} placeholder="e.g. Fidelity NetBenefits" autoFocus />
                </Field>
                <Field label="Destination custodian" required hint="Where the funds are being rolled into">
                  <TextInput value={form.destinationCustodian} onChange={(v) => set("destinationCustodian", v)} placeholder="e.g. Schwab" />
                </Field>
                <Field label="Account type" required>
                  <SelectInput value={form.accountType} onChange={(v) => set("accountType", v)} options={ACCOUNT_TYPES} />
                </Field>
              </div>
            )}

            {displayedStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Assigned advisor" hint="Responsible for the client relationship">
                  <SelectInput
                    value={form.assignedAdvisorId}
                    onChange={(v) => set("assignedAdvisorId", v)}
                    options={[{ value: "", label: "Unassigned" }, ...advisors.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]}
                  />
                </Field>
                <Field label="Assigned ops" hint="Processes the paperwork">
                  <SelectInput
                    value={form.assignedOpsId}
                    onChange={(v) => set("assignedOpsId", v)}
                    options={[{ value: "", label: "Unassigned" }, ...ops.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]}
                  />
                </Field>
              </div>
            )}

            {displayedStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Summary */}
                <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: 10,
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: T.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Review
                  </p>
                  <SummaryRow label="Client" value={`${form.clientFirstName} ${form.clientLastName}`.trim() || "—"} />
                  <SummaryRow label="Email" value={form.clientEmail || "—"} />
                  <SummaryRow label="Source" value={form.sourceProvider || "—"} />
                  <SummaryRow label="Destination" value={form.destinationCustodian || "—"} />
                  <SummaryRow label="Account type" value={accountTypeLabel} />
                  <SummaryRow label="Advisor" value={advisorLabel ? `${advisorLabel.firstName} ${advisorLabel.lastName}` : "Unassigned"} />
                  <SummaryRow label="Ops" value={opsLabel ? `${opsLabel.firstName} ${opsLabel.lastName}` : "Unassigned"} isLast />
                </div>

                {/* Priority */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>High priority</div>
                    <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 3 }}>
                      Flag this case for urgent attention in the case list.
                    </div>
                  </div>
                  <Toggle value={form.highPriority} onChange={(v) => set("highPriority", v)} />
                </div>

                {/* Internal notes */}
                <Field label="Internal notes" hint="Visible only to your team">
                  <textarea
                    value={form.internalNotes}
                    onChange={(e) => set("internalNotes", e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      background: T.input,
                      border: `1px solid ${T.border}`,
                      borderRadius: 7,
                      padding: "8px 10px",
                      fontSize: 13,
                      color: T.text,
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                    }}
                    placeholder="Any context the team should know about this rollover…"
                  />
                </Field>

                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: T.dangerSoft,
                      border: `1px solid ${T.dangerBorder}`,
                      color: T.danger,
                      padding: "8px 12px",
                      borderRadius: 7,
                      fontSize: 12.5,
                    }}
                  >
                    <Icon name="warn" size={14} /> {error}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Btn onClick={handleBack} style={{ visibility: step === 0 ? "hidden" : "visible" }}>
              <Icon name="left" size={13} /> Back
            </Btn>
            {step < STEPS.length - 1 ? (
              <Btn primary onClick={handleNext} disabled={!canProceed()}>
                Continue <Icon name="chev" size={13} />
              </Btn>
            ) : (
              <Btn primary type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create case"}
              </Btn>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 5 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>
          {label}
          {required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 11.5, color: T.textTertiary }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "6px 0",
        borderBottom: isLast ? "none" : `1px solid ${T.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 11.5, color: T.textTertiary, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 11.5,
          color: value === "Unassigned" || value === "—" ? T.textDisabled : T.text,
          fontWeight: 500,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
