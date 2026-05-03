"use client";

import { useState } from "react";
import {
  Card,
  CardSection,
  FieldRow,
  TextInput,
  Pill,
  Icon,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

export type BillingFirm = {
  id: string;
  planTier: "STARTER" | "PRO" | "ENTERPRISE";
  seatsLimit: number;
  billingEmail: string | null;
  renewalDate: string | null;
};

export type BillingAIUsage = {
  planName: string;
  percentUsed: number;
  periodResetsAt: string;
};

export default function BillingSection({
  firm,
  seatsUsed,
  pendingSeats,
  aiUsage,
  registerSave,
}: {
  firm: BillingFirm;
  seatsUsed: number;
  pendingSeats: number;
  aiUsage: BillingAIUsage;
  registerSave: (id: string, dirty: boolean, save: () => Promise<void> | void, reset: () => void) => void;
}) {
  const [billingEmail, setBillingEmail] = useState(firm.billingEmail ?? "");
  const isDirty = billingEmail !== (firm.billingEmail ?? "");

  registerSave(
    "billing",
    isDirty,
    async () => {
      const res = await fetch("/api/firm/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingEmail: billingEmail.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save billing email.");
      }
    },
    () => setBillingEmail(firm.billingEmail ?? "")
  );

  const renewalLabel = firm.renewalDate
    ? new Date(firm.renewalDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const aiPct = Math.min(100, aiUsage.percentUsed);
  const aiBarColor = aiPct >= 90 ? T.danger : aiPct >= 75 ? T.warning : T.accent;
  const aiResetLabel = new Date(aiUsage.periodResetsAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div>
      <SectionHeader
        title="Billing"
        description="Seats and invoice details. Pricing is set per firm in your contract — contact your account manager to adjust."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 1100 }}>
        {/* Summary */}
        <Card style={{ marginBottom: 20 }}>
          <div
            style={{
              padding: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            <SummaryStat
              label="Active seats"
              value={`${seatsUsed} / ${firm.seatsLimit}`}
              hint={
                pendingSeats > 0
                  ? `${seatsUsed - pendingSeats} active · ${pendingSeats} pending`
                  : `${firm.seatsLimit - seatsUsed} remaining`
              }
            />
            <SummaryStat
              label="Plan tier"
              value={firm.planTier}
              hint="Set per contract"
              isPlan
            />
            <SummaryStat label="Renews" value={renewalLabel} hint="Annual contract date" />
          </div>
        </Card>

        {/* AI usage */}
        <CardSection
          title="AI assistant usage"
          description={`${aiUsage.planName} · period resets ${aiResetLabel}`}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Current period
            </span>
            <span style={{ fontSize: 22, fontWeight: 600, color: T.text, fontFamily: "ui-monospace, monospace" }}>
              {aiUsage.percentUsed}
              <span style={{ fontSize: 13, color: T.textTertiary, fontWeight: 500 }}>%</span>
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              overflow: "hidden",
              background: T.input,
              border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ width: `${aiPct}%`, height: "100%", background: aiBarColor, transition: "width 200ms ease" }} />
          </div>
          <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 8 }}>
            {aiPct >= 100
              ? "You've reached your plan limit. The AI assistant is paused until the period resets."
              : aiPct >= 90
              ? "You're nearing your plan limit."
              : "Plenty of headroom remaining."}
          </div>
        </CardSection>

        {/* Billing contact */}
        <CardSection title="Billing contact" description="Where invoices and billing notices are sent.">
          <FieldRow label="Contact email" isLast>
            <TextInput
              value={billingEmail}
              onChange={setBillingEmail}
              type="email"
              placeholder="billing@yourfirm.com"
            />
          </FieldRow>
        </CardSection>

        {/* Invoices placeholder */}
        <CardSection title="Invoices" description="Recent invoices appear here once the first billing cycle closes.">
          <div
            style={{
              fontSize: 12,
              color: T.textTertiary,
              padding: "20px 0",
              textAlign: "center",
              border: `1px dashed ${T.border}`,
              borderRadius: 8,
              background: T.striped,
            }}
          >
            <Icon name="card" size={20} color={T.textDisabled} />
            <div style={{ marginTop: 8 }}>
              No invoices yet. Contact <span style={{ color: T.text }}>{billingEmail || "your account manager"}</span> for billing questions.
            </div>
          </div>
        </CardSection>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  isPlan,
}: {
  label: string;
  value: string;
  hint: string;
  isPlan?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: T.text,
          marginTop: 8,
          fontFamily: isPlan ? "inherit" : "ui-monospace, monospace",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isPlan ? <Pill hue="violet">{value}</Pill> : value}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 6 }}>{hint}</div>
    </div>
  );
}

