"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CardSection,
  FieldRow,
  TextInput,
  Btn,
  Toggle,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";

const T = SETTINGS_TOKENS;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export type WorkspaceFirm = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  businessAddress: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
};

export type WorkspaceFirmSettings = {
  operatingStates: string[];
  allowDataExport: boolean;
  complianceContactEmail: string | null;
};

export default function WorkspaceSection({
  firm,
  firmSettings,
  retentionCaseDataDays,
  retentionAuditLogDays,
  registerSave,
}: {
  firm: WorkspaceFirm;
  firmSettings: WorkspaceFirmSettings;
  retentionCaseDataDays: number;
  retentionAuditLogDays: number;
  registerSave: (id: string, dirty: boolean, save: () => Promise<void> | void, reset: () => void) => void;
}) {
  // Branding + organization fields
  const [name, setName] = useState(firm.name);
  const [legalName, setLegalName] = useState(firm.legalName ?? "");
  const [taxId, setTaxId] = useState(firm.taxId ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(firm.websiteUrl ?? "");
  const [supportEmail, setSupportEmail] = useState(firm.supportEmail ?? "");
  const [supportPhone, setSupportPhone] = useState(firm.supportPhone ?? "");
  const [businessAddress, setBusinessAddress] = useState(firm.businessAddress ?? "");

  // Logo upload state
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(firm.logoUrl);
  const [logoBust, setLogoBust] = useState<number>(() => Date.now());
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setLogoError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/firm/logo", { method: "POST", body: fd });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to upload logo.");
      }
      setLogoUrl("uploaded");
      setLogoBust(Date.now());
      router.refresh();
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Failed to upload logo.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError(null);
    try {
      const r = await fetch("/api/firm/logo", { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove logo.");
      }
      setLogoUrl(null);
      router.refresh();
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Failed to remove logo.");
    } finally {
      setLogoBusy(false);
    }
  }

  // Compliance + operating states
  const [complianceContactEmail, setComplianceContactEmail] = useState(firmSettings.complianceContactEmail ?? "");
  const [allowDataExport, setAllowDataExport] = useState(firmSettings.allowDataExport);
  const [operatingStates, setOperatingStates] = useState<string[]>(firmSettings.operatingStates ?? []);

  const orgDirty =
    name !== firm.name ||
    legalName !== (firm.legalName ?? "") ||
    taxId !== (firm.taxId ?? "") ||
    websiteUrl !== (firm.websiteUrl ?? "") ||
    supportEmail !== (firm.supportEmail ?? "") ||
    supportPhone !== (firm.supportPhone ?? "") ||
    businessAddress !== (firm.businessAddress ?? "");

  const settingsDirty =
    complianceContactEmail !== (firmSettings.complianceContactEmail ?? "") ||
    allowDataExport !== firmSettings.allowDataExport ||
    JSON.stringify([...operatingStates].sort()) !== JSON.stringify([...firmSettings.operatingStates].sort());

  const isDirty = orgDirty || settingsDirty;

  registerSave(
    "workspace",
    isDirty,
    async () => {
      if (orgDirty) {
        const r = await fetch("/api/firm/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            legalName,
            taxId,
            websiteUrl,
            supportEmail,
            supportPhone,
            businessAddress,
          }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save organization profile.");
        }
      }
      if (settingsDirty) {
        const r = await fetch("/api/firm/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatingStates,
            allowDataExport,
            complianceContactEmail: complianceContactEmail.trim() || null,
          }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save firm settings.");
        }
      }
    },
    () => {
      setName(firm.name);
      setLegalName(firm.legalName ?? "");
      setTaxId(firm.taxId ?? "");
      setWebsiteUrl(firm.websiteUrl ?? "");
      setSupportEmail(firm.supportEmail ?? "");
      setSupportPhone(firm.supportPhone ?? "");
      setBusinessAddress(firm.businessAddress ?? "");
      setComplianceContactEmail(firmSettings.complianceContactEmail ?? "");
      setAllowDataExport(firmSettings.allowDataExport);
      setOperatingStates(firmSettings.operatingStates ?? []);
    }
  );

  function toggleState(code: string) {
    setOperatingStates((prev) => (prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code].sort()));
  }

  async function exportAuditLog() {
    const res = await fetch("/api/firm/audit-log?limit=200");
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SectionHeader
        title="Workspace"
        description="Branding, defaults, and configuration that apply to your whole team."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 980 }}>
        <CardSection
          title="Branding"
          description="Your firm name and logo appear on the dashboard and on client-facing emails. They do not replace the Rift mark in the app sidebar."
        >
          <FieldRow label="Firm display name">
            <TextInput value={name} onChange={setName} required />
          </FieldRow>
          <FieldRow label="Legal business name">
            <TextInput value={legalName} onChange={setLegalName} placeholder="Summit Wealth Partners, LLC" />
          </FieldRow>
          <FieldRow label="Firm logo" hint="Square SVG, PNG, JPEG, or WebP — max 2 MB. Shown on the dashboard header and in client emails.">
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/firm/logo?v=${logoBust}`}
                  alt=""
                  style={{ height: 48, width: "auto", maxWidth: 200, objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: T.accent,
                    display: "grid",
                    placeItems: "center",
                    color: T.page,
                    fontWeight: 800,
                    fontSize: 22,
                  }}
                >
                  {name.charAt(0).toUpperCase() || "◆"}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <Btn onClick={() => fileInputRef.current?.click()} disabled={logoBusy}>
                {logoBusy ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
              </Btn>
              {logoUrl && (
                <Btn ghost onClick={removeLogo} disabled={logoBusy}>
                  Remove
                </Btn>
              )}
              {logoError && (
                <span style={{ fontSize: 12, color: T.danger }}>{logoError}</span>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Website" isLast>
            <TextInput value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://yourfirm.com" type="url" />
          </FieldRow>
        </CardSection>

        <CardSection title="Contact" description="How clients and the platform reach your firm.">
          <FieldRow label="Support email">
            <TextInput value={supportEmail} onChange={setSupportEmail} type="email" placeholder="hello@yourfirm.com" />
          </FieldRow>
          <FieldRow label="Support phone">
            <TextInput value={supportPhone} onChange={setSupportPhone} type="tel" />
          </FieldRow>
          <FieldRow label="Business address" hint="Used on signed forms and as the return address for custodian mailings.">
            <textarea
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: T.input,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                color: T.text,
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </FieldRow>
          <FieldRow label="Tax ID (EIN)" isLast>
            <TextInput value={taxId} onChange={setTaxId} placeholder="12-3456789" />
          </FieldRow>
        </CardSection>

        <CardSection title="Defaults" description="Applied automatically to new cases and clients.">
          <FieldRow
            label="Operating states"
            hint="Mailing routes will use the correct custodian address for clients in these states."
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, width: "100%" }}>
              {US_STATES.map((code) => {
                const on = operatingStates.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleState(code)}
                    style={{
                      padding: "5px 0",
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      borderRadius: 4,
                      background: on ? "#0f1a2e" : T.input,
                      border: `1px solid ${on ? "#1f2e4d" : T.border}`,
                      color: on ? T.accent : T.textSecondary,
                      cursor: "pointer",
                      transition: "background 80ms linear, color 80ms linear, border-color 80ms linear",
                    }}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </FieldRow>
          <FieldRow label="Compliance contact" hint="Receives breach notifications and regulatory inquiries.">
            <TextInput
              value={complianceContactEmail}
              onChange={setComplianceContactEmail}
              type="email"
              placeholder="compliance@yourfirm.com"
            />
          </FieldRow>
          <FieldRow label="Data exports" hint="When enabled, admins can export case data and audit logs." isLast>
            <Toggle value={allowDataExport} onChange={setAllowDataExport} />
          </FieldRow>
        </CardSection>

        <CardSection
          title="Retention policy"
          description="Set by Rift to meet FINRA and SEC recordkeeping requirements. Cannot be modified by firms."
        >
          <FieldRow label="Case data">
            <span style={{ fontSize: 13, color: T.textSecondary }}>
              {retentionCaseDataDays} days ({(retentionCaseDataDays / 365).toFixed(1).replace(/\.0$/, "")} yr)
            </span>
          </FieldRow>
          <FieldRow label="Audit log" isLast>
            <span style={{ fontSize: 13, color: T.textSecondary }}>
              {retentionAuditLogDays} days ({(retentionAuditLogDays / 365).toFixed(1).replace(/\.0$/, "")} yr)
            </span>
          </FieldRow>
        </CardSection>

        <CardSection title="Danger zone" description="These actions are irreversible.">
          <FieldRow label="Export all data" hint="Generate a downloadable JSON archive of every case, client, and audit event.">
            <Btn onClick={exportAuditLog} disabled={!allowDataExport}>
              Request export
            </Btn>
          </FieldRow>
          <FieldRow label="Delete workspace" hint="Permanently delete this firm and all of its data. Contact your account manager." isLast>
            <Btn danger disabled>
              Delete workspace
            </Btn>
          </FieldRow>
        </CardSection>
      </div>
    </div>
  );
}

