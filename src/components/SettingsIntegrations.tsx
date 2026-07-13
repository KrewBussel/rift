"use client";

/**
 * Settings → Integrations: the Wealthbox connector UI.
 *
 * Everything the admin does with the connection after onboarding lives here:
 *   - ConnectCard      first-time token paste (when no connection exists)
 *   - ConnectionCard   health status, manual sync, token rotation, disconnect
 *   - BookendCard      remap the two synced stages (trigger + Won)
 *   - RiftStagesCard   rename/disable the Rift-only intermediate stages
 *   - CustomFieldsCard reference card for the required Wealthbox custom fields
 *
 * Server side: /api/integrations/wealthbox (connect), /api/integrations/crm/*
 * (state, stages, mapping, poll), /api/firm/stages (stage overlay). The sync
 * engine itself is src/lib/crmSync.ts.
 */

import { useState, useEffect } from "react";
import { T } from "./tokens";
import { STATUSES, type StageConfigRow } from "./casesDesignTokens";
import {
  CardSection,
  FieldRow,
  Pill,
  Btn,
  TextInput,
  SelectInput,
  Toggle,
  SectionHeader,
} from "./primitives";

type CrmMapping = { riftStatus: string; crmStageId: string; crmStageName: string };
type CrmConnectionInfo = {
  id: string;
  provider: string;
  connectedUserName: string | null;
  connectedUserEmail: string | null;
  connectedAt: string | null;
  lastHealthOk: boolean;
  lastHealthError: string | null;
  lastHealthCheckAt: string | null;
};
type CrmState = { connection: CrmConnectionInfo | null; mappings: CrmMapping[] };

/**
 * What POST /api/integrations/wealthbox returns alongside the connection:
 * the firm's live opportunity stages (their names, straight from Wealthbox)
 * and the bookends it auto-detected by name. When both bookends match
 * confidently and the firm had no mappings, the server already saved them
 * (autoMapped) — otherwise we keep the suggestions to pre-fill the pickers.
 */
type ConnectResult = {
  stages: Array<{ id: string; name: string }>;
  suggested: { triggerStageId: string | null; wonStageId: string | null };
  autoMapped: boolean;
};

export default function SettingsIntegrations() {
  const [state, setState] = useState<CrmState | null>(null);
  const [loading, setLoading] = useState(true);
  // Kept from the most recent connect in this session, so the Stage sync card
  // can pre-select the detected stages even when they weren't auto-saved.
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/integrations/crm");
      if (res.ok) setState(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <SectionHeader
        eyebrow="Settings"
        title="Integrations"
        description="Connect Rift to Wealthbox and control how your cases sync."
      />
      <div style={{ padding: "24px 0 0" }}>
        <div style={{ padding: "0 36px 80px", maxWidth: 920 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: T.textSecondary, padding: "8px 0" }}>Loading…</div>
          ) : state?.connection ? (
            <>
              <ConnectionCard connection={state.connection} onChanged={load} />
              <BookendCard
                mappings={state.mappings}
                suggested={connectResult?.suggested ?? null}
                initialStages={connectResult?.stages}
                autoMapped={connectResult?.autoMapped ?? false}
                onSaved={load}
              />
              <RiftStagesCard />
              <CustomFieldsCard />
            </>
          ) : (
            <ConnectCard
              onConnected={(result) => {
                setConnectResult(result ?? null);
                void load();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Wealthbox token paste → POST /api/integrations/wealthbox.
 * On success, passes the connect result (live stages + detected bookends)
 * up so the caller can pre-fill the stage pickers.
 */
function TokenForm({ ctaLabel, onDone }: { ctaLabel: string; onDone: (result?: ConnectResult) => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/wealthbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "We couldn't verify that token. Check it in Wealthbox and try again.");
        return;
      }
      const body = (await res.json().catch(() => null)) as ConnectResult | null;
      setToken("");
      onDone(body ?? undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 }}>
      <input
        type="password"
        autoComplete="off"
        placeholder="Paste your Wealthbox access token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{
          width: "100%",
          height: 32,
          background: T.input,
          border: `1px solid ${T.border}`,
          borderRadius: 7,
          padding: "0 10px",
          color: T.text,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {error && <div style={{ fontSize: 12, color: T.danger }}>{error}</div>}
      <div>
        <Btn primary onClick={submit} disabled={busy || !token.trim()}>
          {busy ? "Verifying…" : ctaLabel}
        </Btn>
      </div>
      <div style={{ fontSize: 11.5, color: T.textTertiary }}>
        In Wealthbox: your name → My Settings → API Access → Create Access Token.
      </div>
    </div>
  );
}

function ConnectCard({ onConnected }: { onConnected: (result?: ConnectResult) => void }) {
  return (
    <CardSection
      title="Wealthbox"
      description="Connect your Wealthbox account so opportunities flow in and won cases flow back out."
    >
      <FieldRow label="Access token" hint="Personal access token from Wealthbox. Revocable any time." isLast>
        <TokenForm ctaLabel="Connect Wealthbox" onDone={onConnected} />
      </FieldRow>
    </CardSection>
  );
}

function ConnectionCard({ connection, onChanged }: { connection: CrmConnectionInfo; onChanged: () => void }) {
  const [reconnecting, setReconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const who = connection.connectedUserName ?? connection.connectedUserEmail ?? "Wealthbox user";
  const connectedAt = connection.connectedAt
    ? new Date(connection.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/integrations/crm/poll", { method: "POST" });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { result?: { created: number; closed: number } };
        const created = body.result?.created ?? 0;
        const closed = body.result?.closed ?? 0;
        setSyncMsg(`Synced — ${created} new, ${closed} closed.`);
        onChanged();
      } else {
        setSyncMsg("Sync failed. Check the connection health below.");
        onChanged();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Wealthbox? This clears the stored token, stage mappings, and unlinks cases from their opportunities. Case data stays.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/crm", { method: "DELETE" });
      onChanged();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <CardSection title="Wealthbox" description="Your connected CRM.">
      <FieldRow label="Status">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {connection.lastHealthOk ? (
            <Pill hue="green" dot>Healthy</Pill>
          ) : (
            <Pill hue="red" dot>Sync error</Pill>
          )}
          <span style={{ fontSize: 13, color: T.text }}>{who}</span>
          {connectedAt && <span style={{ fontSize: 12, color: T.textTertiary }}>· connected {connectedAt}</span>}
        </div>
      </FieldRow>

      {!connection.lastHealthOk && connection.lastHealthError && (
        <FieldRow label="Last error">
          <span style={{ fontSize: 12.5, color: T.danger }}>{connection.lastHealthError}</span>
        </FieldRow>
      )}

      <FieldRow label="Actions" isLast={!reconnecting}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Btn onClick={syncNow} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</Btn>
            <Btn onClick={() => setReconnecting((v) => !v)}>{reconnecting ? "Cancel" : "Rotate token"}</Btn>
            <Btn danger onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Btn>
            {syncMsg && <span style={{ fontSize: 12, color: T.textSecondary }}>{syncMsg}</span>}
          </div>
          {reconnecting && (
            <div style={{ paddingTop: 6 }}>
              <TokenForm
                ctaLabel="Save new token"
                onDone={() => {
                  setReconnecting(false);
                  onChanged();
                }}
              />
              <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 6 }}>
                Rotating the token won&rsquo;t change your stage mappings.
              </div>
            </div>
          )}
        </div>
      </FieldRow>
    </CardSection>
  );
}

function BookendCard({
  mappings,
  suggested,
  initialStages,
  autoMapped,
  onSaved,
}: {
  mappings: CrmMapping[];
  /** Bookends detected by name at connect time; used to pre-select when not auto-saved. */
  suggested?: { triggerStageId: string | null; wonStageId: string | null } | null;
  /** Stages returned by the connect call, so a fresh connect skips the extra fetch. */
  initialStages?: Array<{ id: string; name: string }>;
  autoMapped?: boolean;
  onSaved: () => void;
}) {
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>(initialStages ?? []);
  const [stagesErr, setStagesErr] = useState<string | null>(null);
  // Saved mappings win; otherwise fall back to what connect-time detection suggested.
  const [triggerId, setTriggerId] = useState(
    mappings.find((m) => m.riftStatus === "PROPOSAL_ACCEPTED")?.crmStageId ?? suggested?.triggerStageId ?? "",
  );
  const [wonId, setWonId] = useState(
    mappings.find((m) => m.riftStatus === "WON")?.crmStageId ?? suggested?.wonStageId ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSavedMappings = mappings.length > 0;
  const hasSuggestion = !!(suggested?.triggerStageId || suggested?.wonStageId);

  useEffect(() => {
    if (initialStages?.length) return; // fresh connect already delivered them
    void (async () => {
      const res = await fetch("/api/integrations/crm/stages");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStagesErr(body.error ?? "Couldn't load Wealthbox stages.");
        return;
      }
      const body = (await res.json()) as { stages: Array<{ id: string; name: string }> };
      setStages(body.stages ?? []);
    })();
    // Mount-only: initialStages never changes without this card remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = [{ value: "", label: "Select a stage…" }, ...stages.map((s) => ({ value: s.id, label: s.name }))];

  async function save() {
    setError(null);
    const trigger = stages.find((s) => s.id === triggerId);
    const won = stages.find((s) => s.id === wonId);
    if (!trigger || !won) return setError("Pick a stage for both bookends.");
    if (trigger.id === won.id) return setError("The trigger and Won stages must be different.");
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/crm/mapping", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mappings: [
            { riftStatus: "PROPOSAL_ACCEPTED", crmStageId: trigger.id, crmStageName: trigger.name },
            { riftStatus: "WON", crmStageId: won.id, crmStageName: won.name },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection
      title="Stage sync"
      description="The two stages Rift syncs with Wealthbox. Everything in between stays inside Rift."
    >
      {stagesErr ? (
        <FieldRow label="Stages" isLast>
          <span style={{ fontSize: 12.5, color: T.danger }}>{stagesErr}</span>
        </FieldRow>
      ) : (
        <>
          {autoMapped && (
            <FieldRow label="Detected">
              <Pill hue="green" dot>Matched from your Wealthbox stage names — saved automatically</Pill>
            </FieldRow>
          )}
          {!autoMapped && !hasSavedMappings && hasSuggestion && (
            <FieldRow label="Detected">
              <span style={{ fontSize: 12.5, color: T.textSecondary }}>
                We pre-selected the stages that look right below — review and hit Save to confirm.
              </span>
            </FieldRow>
          )}
          <FieldRow label="Trigger stage" hint="An opportunity here creates a Rift case.">
            <SelectInput value={triggerId} onChange={setTriggerId} options={options} />
          </FieldRow>
          <FieldRow label="Won stage" hint="Marking a case Won moves the opportunity here.">
            <SelectInput value={wonId} onChange={setWonId} options={options} />
          </FieldRow>
          <FieldRow label="" isLast>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn primary onClick={save} disabled={saving}>
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save mapping"}
              </Btn>
              {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
            </div>
          </FieldRow>
        </>
      )}
    </CardSection>
  );
}

function RiftStagesCard() {
  const [rows, setRows] = useState<StageConfigRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/firm/stages");
      if (res.ok) {
        const body = (await res.json()) as { stages: StageConfigRow[] };
        setRows(body.stages ?? null);
      }
    })();
  }, []);

  function update(status: string, patch: Partial<StageConfigRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.status === status ? { ...r, ...patch } : r)) : prev));
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    try {
      const res = await fetch("/api/firm/stages", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stages: rows.map((r) => ({
            status: r.status,
            customLabel: r.customLabel?.trim() ? r.customLabel.trim() : null,
            isEnabled: r.isEnabled,
          })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection
      title="Rift stages"
      description="Rename the internal stages to match your team, or turn off ones you don't use. The two bookends stay on."
    >
      {!rows ? (
        <FieldRow label="Stages" isLast>
          <span style={{ fontSize: 13, color: T.textSecondary }}>Loading…</span>
        </FieldRow>
      ) : (
        <>
          {rows.map((row) => {
            const def = STATUSES.find((s) => s.value === row.status);
            const isBookend = row.status === "PROPOSAL_ACCEPTED" || row.status === "WON";
            return (
              <FieldRow
                key={row.status}
                label={def?.label ?? row.status}
                hint={isBookend ? "Bookend — always on (Wealthbox sync)." : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <TextInput
                    value={row.customLabel ?? ""}
                    onChange={(v) => update(row.status, { customLabel: v })}
                    placeholder={def?.label ?? row.status}
                  />
                  <Toggle
                    value={row.isEnabled}
                    disabled={isBookend}
                    onChange={(v) => update(row.status, { isEnabled: v })}
                  />
                </div>
              </FieldRow>
            );
          })}
          <FieldRow label="" isLast>
            <Btn primary onClick={save} disabled={saving}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save stages"}
            </Btn>
          </FieldRow>
        </>
      )}
    </CardSection>
  );
}

function CustomFieldsCard() {
  return (
    <CardSection
      title="Required Wealthbox fields"
      description="For cases to auto-create with full detail, add these custom fields to your Wealthbox opportunities (Settings → Custom Fields → Opportunities)."
    >
      <FieldRow label="Source Provider" hint="Text field.">
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>Where the funds come from.</span>
      </FieldRow>
      <FieldRow label="Destination Custodian" hint="Text field.">
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>Where the funds are going.</span>
      </FieldRow>
      <FieldRow label="Account Type" hint="Single-select dropdown." isLast>
        <span style={{ fontSize: 12.5, color: T.textSecondary }}>
          Values containing “traditional”, “roth”, or “403” map automatically; others flag for review.
        </span>
      </FieldRow>
    </CardSection>
  );
}
