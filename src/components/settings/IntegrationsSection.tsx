"use client";

import { useEffect, useState } from "react";
import {
  CardSection,
  TextInput,
  SelectInput,
  Btn,
  Pill,
  Icon,
  Modal,
  SETTINGS_TOKENS,
} from "./primitives";
import { SectionHeader } from "./SettingsShell";
import { STATUSES, type StageConfigRow } from "../casesDesignTokens";

const T = SETTINGS_TOKENS;

type CrmProvider = "WEALTHBOX" | "SALESFORCE";
type CrmConnection = {
  id: string;
  provider: CrmProvider;
  instanceUrl: string | null;
  connectedUserName: string | null;
  connectedUserEmail: string | null;
  connectedAt: string;
  lastHealthOk: boolean;
  lastHealthError: string | null;
  lastHealthCheckAt: string | null;
};
type CrmStage = { id: string; name: string };
type CrmMapping = { riftStatus: string; crmStageId: string; crmStageName: string };

const PROVIDER_LABEL: Record<CrmProvider, string> = {
  WEALTHBOX: "Wealthbox",
  SALESFORCE: "Salesforce",
};

const RIFT_BOOKENDS = [
  { value: "PROPOSAL_ACCEPTED", label: "Proposal Accepted" },
  { value: "WON", label: "Won" },
] as const;

/* ─── Catalog of integration tiles, real + placeholder ─────────────────── */

type Category = "Custodian" | "E-sign" | "Data" | "Comms" | "CRM";

type CatalogTile = {
  id: string;
  name: string;
  desc: string;
  category: Category;
  glyph: string;
  color: string;
  /** When false, the tile is decorative ("Available" placeholder, no connect action). */
  realConnector?: boolean;
};

const CATALOG: CatalogTile[] = [
  { id: "wealthbox", name: "Wealthbox",  desc: "CRM — opportunity stage sync & client lookup",   category: "CRM",       glyph: "W", color: "#5b8def", realConnector: true },
  { id: "salesforce",name: "Salesforce", desc: "CRM — opportunity stages via OAuth",             category: "CRM",       glyph: "S", color: "#7e8cf3", realConnector: true },
  { id: "schwab",    name: "Schwab",     desc: "Custodian — account opening & ACATs",            category: "Custodian", glyph: "S", color: "#7e8cf3" },
  { id: "fidelity",  name: "Fidelity",   desc: "Custodian — account opening & ACATs",            category: "Custodian", glyph: "F", color: "#a78bfa" },
  { id: "altruist",  name: "Altruist",   desc: "Custodian — modern API integration",             category: "Custodian", glyph: "A", color: "#d77a3a" },
  { id: "vanguard",  name: "Vanguard",   desc: "Custodian — limited API access",                 category: "Custodian", glyph: "V", color: "#d29922" },
  { id: "docusign",  name: "DocuSign",   desc: "E-signature for transfer paperwork",             category: "E-sign",    glyph: "D", color: "#5b8def" },
  { id: "plaid",     name: "Plaid",      desc: "Account verification & balance checks",          category: "Data",      glyph: "P", color: "#3fb950" },
  { id: "snowflake", name: "Snowflake",  desc: "Data export to your warehouse",                  category: "Data",      glyph: "*", color: "#7e8cf3" },
  { id: "slack",     name: "Slack",      desc: "Notifications & team mentions",                  category: "Comms",     glyph: "#", color: "#a78bfa" },
  { id: "gmail",     name: "Gmail",      desc: "Send case emails from your inbox",               category: "Comms",     glyph: "G", color: "#e5484d" },
];

const CATEGORIES: Array<"All" | Category> = ["All", "CRM", "Custodian", "E-sign", "Data", "Comms"];

export default function IntegrationsSection() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"All" | Category>("All");
  const [connection, setConnection] = useState<CrmConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [configureProvider, setConfigureProvider] = useState<CrmProvider | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function loadConnection() {
    setLoading(true);
    const res = await fetch("/api/integrations/crm");
    if (res.ok) {
      const body = await res.json();
      setConnection(body.connection ?? null);
    }
    setLoading(false);
  }
  useEffect(() => {
    loadConnection();
  }, []);

  const filtered = CATALOG.filter((t) => {
    if (cat !== "All" && t.category !== cat) return false;
    if (!search) return true;
    return (`${t.name} ${t.desc}`).toLowerCase().includes(search.toLowerCase());
  });

  function isConnected(t: CatalogTile): boolean {
    if (!t.realConnector) return false;
    if (!connection) return false;
    return (
      (t.id === "wealthbox" && connection.provider === "WEALTHBOX") ||
      (t.id === "salesforce" && connection.provider === "SALESFORCE")
    );
  }

  const connectedTiles = filtered.filter(isConnected);
  const availableTiles = filtered.filter((t) => !isConnected(t));

  async function handleConnectWealthbox() {
    setConnectErr(null);
    setConnecting(true);
    const res = await fetch("/api/integrations/wealthbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
    setConnecting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setConnectErr(body.error ?? "Failed to connect.");
      return;
    }
    setTokenInput("");
    setConfigureProvider(null);
    await loadConnection();
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect CRM? All case links and stage mappings will be cleared.")) return;
    const res = await fetch("/api/integrations/crm", { method: "DELETE" });
    if (res.ok) {
      setConnection(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Integrations"
        description="Connect Rift to the tools your team already uses."
      />
      <div style={{ padding: "24px 40px 120px", maxWidth: 1180 }}>
        {/* Search + category filter */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <div style={{ flex: 1, maxWidth: 320 }}>
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search integrations…"
              prefix={<Icon name="search" size={14} color={T.textTertiary} />}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 2,
              background: T.input,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
            }}
          >
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "5px 12px",
                  fontSize: 11.5,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: cat === c ? T.text : T.textSecondary,
                  background: cat === c ? T.surface3 : "transparent",
                  border: "none",
                  fontWeight: cat === c ? 600 : 500,
                  transition: "background 120ms ease, color 120ms ease",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: T.textTertiary }}>Loading…</p>
        ) : (
          <>
            {connectedTiles.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <SectionEyebrow>Connected · {connectedTiles.length}</SectionEyebrow>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {connectedTiles.map((t) => (
                    <Tile
                      key={t.id}
                      tile={t}
                      connected
                      onAction={() => {
                        if (t.id === "wealthbox" || t.id === "salesforce") {
                          setConfigureProvider(connection?.provider ?? "WEALTHBOX");
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <SectionEyebrow>Available · {availableTiles.length}</SectionEyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {availableTiles.map((t) => (
                <Tile
                  key={t.id}
                  tile={t}
                  connected={false}
                  onAction={() => {
                    if (t.id === "wealthbox") {
                      setConfigureProvider("WEALTHBOX");
                    } else if (t.id === "salesforce") {
                      window.location.href = "/api/integrations/salesforce/authorize";
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Stage config block (always visible to admins regardless of connection) */}
        <div style={{ marginTop: 28 }}>
          <SectionEyebrow>Pipeline configuration</SectionEyebrow>
          <StagesPanel />
        </div>
      </div>

      {/* Configure / Connect modal */}
      {configureProvider && (
        <Modal
          open
          onClose={() => {
            setConfigureProvider(null);
            setTokenInput("");
            setConnectErr(null);
          }}
          title={
            connection
              ? `Configure ${PROVIDER_LABEL[connection.provider]}`
              : `Connect ${PROVIDER_LABEL[configureProvider]}`
          }
          width={560}
          footer={
            connection ? (
              <>
                <Btn ghost onClick={() => setConfigureProvider(null)}>Done</Btn>
                <Btn danger onClick={handleDisconnect}>Disconnect</Btn>
              </>
            ) : configureProvider === "WEALTHBOX" ? (
              <>
                <Btn ghost onClick={() => setConfigureProvider(null)}>Cancel</Btn>
                <Btn primary onClick={handleConnectWealthbox} disabled={connecting || !tokenInput.trim()}>
                  {connecting ? "Verifying…" : "Connect"}
                </Btn>
              </>
            ) : null
          }
        >
          {connection ? (
            <ConnectedDetail connection={connection} />
          ) : configureProvider === "WEALTHBOX" ? (
            <div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
                In Wealthbox, open <span style={{ color: T.text }}>Settings → API Access → Create Access Token</span>, then paste the token here.
              </div>
              <TextInput
                value={tokenInput}
                onChange={setTokenInput}
                type="password"
                placeholder="Wealthbox access token"
              />
              {connectErr && <div style={{ fontSize: 12, color: T.danger, marginTop: 8 }}>{connectErr}</div>}
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

/* ─── Tile ─────────────────────────────────────────────────────────────── */

function Tile({
  tile,
  connected,
  onAction,
}: {
  tile: CatalogTile;
  connected: boolean;
  onAction: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.surface2,
        border: `1px solid ${hover ? T.borderStrong : T.border}`,
        borderRadius: 10,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 100ms ease",
        minHeight: 132,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${tile.color}22`,
            border: `1px solid ${tile.color}44`,
            display: "grid",
            placeItems: "center",
            color: tile.color,
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {tile.glyph}
        </div>
        {connected ? (
          <Pill hue="green">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
            Connected
          </Pill>
        ) : tile.realConnector ? (
          <Pill hue="slate">Available</Pill>
        ) : (
          <Pill hue="slate">Coming soon</Pill>
        )}
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{tile.name}</div>
        <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{tile.desc}</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10.5, color: T.textTertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {tile.category}
        </div>
        {tile.realConnector ? (
          <Btn small ghost={connected} onClick={onAction}>
            {connected ? "Configure" : "Connect"}
          </Btn>
        ) : (
          <Btn small disabled>
            Connect
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ─── Connected detail (in modal) ──────────────────────────────────────── */

function ConnectedDetail({
  connection,
}: {
  connection: CrmConnection;
}) {
  const [stages, setStages] = useState<CrmStage[] | null>(null);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<CrmMapping[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingMap, setSavingMap] = useState(false);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; scanned: number; skipped: number; errors: Array<{ opportunityId: string; message: string }> } | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);

  async function loadAll() {
    const [stagesRes, mapRes] = await Promise.all([
      fetch("/api/integrations/crm/stages"),
      fetch("/api/integrations/crm"),
    ]);
    if (!stagesRes.ok) {
      const body = await stagesRes.json().catch(() => ({}));
      setStagesError(body.error ?? `Couldn't load stages (HTTP ${stagesRes.status}).`);
    } else {
      const body = await stagesRes.json();
      setStages(body.stages ?? []);
    }
    if (mapRes.ok) {
      const body = await mapRes.json();
      const next: Record<string, string> = {};
      for (const m of body.mappings ?? []) next[m.riftStatus] = m.crmStageId;
      setDraft(next);
      setMappings(body.mappings ?? []);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveMappings() {
    setSavingMap(true);
    setMapMsg(null);
    const payload = RIFT_BOOKENDS.filter((s) => draft[s.value]).map((s) => {
      const stage = stages?.find((st) => st.id === draft[s.value]);
      return {
        riftStatus: s.value,
        crmStageId: draft[s.value],
        crmStageName: stage?.name ?? draft[s.value],
      };
    });
    const res = await fetch("/api/integrations/crm/mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings: payload }),
    });
    setSavingMap(false);
    if (!res.ok) {
      setMapMsg("Failed to save mappings.");
      return;
    }
    const body = await res.json();
    setMappings(body.mappings ?? []);
    setMapMsg("Mappings saved.");
  }

  async function syncFromCrm() {
    setSyncing(true);
    setSyncErr(null);
    setSyncResult(null);
    const res = await fetch("/api/integrations/wealthbox/poll", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSyncErr(body.error ?? `Sync failed (HTTP ${res.status})`);
      return;
    }
    const body = await res.json();
    setSyncResult(body.result ?? null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Status block */}
      <div
        style={{
          background: T.striped,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {connection.lastHealthOk ? (
            <Pill hue="green">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
              Healthy
            </Pill>
          ) : (
            <Pill hue="red">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: T.danger }} />
              Error
            </Pill>
          )}
          <span style={{ fontSize: 12, color: T.text }}>
            Connected as{" "}
            <span style={{ fontWeight: 500 }}>
              {connection.connectedUserName ?? connection.connectedUserEmail ?? `${PROVIDER_LABEL[connection.provider]} user`}
            </span>
          </span>
        </div>
        {connection.instanceUrl && (
          <div style={{ fontSize: 11.5, color: T.textTertiary, fontFamily: "ui-monospace, monospace" }}>
            {connection.instanceUrl}
          </div>
        )}
        {!connection.lastHealthOk && connection.lastHealthError && (
          <div style={{ fontSize: 11.5, color: T.danger }}>{connection.lastHealthError}</div>
        )}
      </div>

      {/* Stage mapping */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Stage mapping</div>
        <div style={{ fontSize: 11.5, color: T.textTertiary, lineHeight: 1.5, marginBottom: 12 }}>
          Pick the {PROVIDER_LABEL[connection.provider]} stage that should be set when a Rift case enters each bookend status.
        </div>
        {stagesError ? (
          <div style={{ fontSize: 12, color: T.danger }}>{stagesError}</div>
        ) : !stages ? (
          <div style={{ fontSize: 12, color: T.textTertiary }}>Loading stages…</div>
        ) : stages.length === 0 ? (
          <div style={{ fontSize: 12, color: T.warning }}>
            No stages found in {PROVIDER_LABEL[connection.provider]}. Add at least one opportunity stage in your CRM first.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RIFT_BOOKENDS.map((s) => (
              <div key={s.value} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: T.text }}>{s.label}</span>
                <SelectInput
                  value={draft[s.value] ?? ""}
                  onChange={(v) => setDraft({ ...draft, [s.value]: v })}
                  options={[
                    { value: "", label: "— none —" },
                    ...stages.map((st) => ({ value: st.id, label: st.name })),
                  ]}
                />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <Btn primary small onClick={saveMappings} disabled={savingMap}>
                {savingMap ? "Saving…" : "Save mapping"}
              </Btn>
              {mapMsg && <span style={{ fontSize: 11.5, color: T.textTertiary }}>{mapMsg}</span>}
              {mappings.length > 0 && (
                <span style={{ fontSize: 11.5, color: T.textTertiary }}>
                  {mappings.length} mapping{mappings.length === 1 ? "" : "s"} saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sync (Wealthbox only) */}
      {connection.provider === "WEALTHBOX" && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Sync from Wealthbox</div>
          <div style={{ fontSize: 11.5, color: T.textTertiary, lineHeight: 1.5, marginBottom: 10 }}>
            Pulls every Wealthbox opportunity at the stage you mapped to <em>Proposal Accepted</em> and creates a Rift case for any not yet linked.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn small onClick={syncFromCrm} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync now"}
            </Btn>
            {syncResult && (
              <span style={{ fontSize: 11.5, color: T.textTertiary }}>
                Scanned {syncResult.scanned} · Created {syncResult.created} · Skipped {syncResult.skipped}
                {syncResult.errors.length > 0 ? ` · ${syncResult.errors.length} errors` : ""}
              </span>
            )}
            {syncErr && <span style={{ fontSize: 11.5, color: T.danger }}>{syncErr}</span>}
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── Stages config panel ─────────────────────────────────────────────── */

function StagesPanel() {
  const [stages, setStages] = useState<StageConfigRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/firm/stages");
      if (!res.ok) {
        setErr("Couldn't load stage configuration.");
        return;
      }
      const body = (await res.json()) as { stages: StageConfigRow[] };
      setStages(
        body.stages.length
          ? body.stages
          : STATUSES.map((s, i) => ({
              status: s.value,
              customLabel: null,
              isEnabled: true,
              sortOrder: i,
            }))
      );
    })();
  }, []);

  function update(status: string, patch: Partial<StageConfigRow>) {
    if (!stages) return;
    setStages(stages.map((r) => (r.status === status ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!stages) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/firm/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages: stages.map((s) => ({
          status: s.status,
          customLabel: s.customLabel?.trim() ? s.customLabel.trim() : null,
          isEnabled: s.isEnabled,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error ?? `Save failed (HTTP ${res.status})`);
      return;
    }
    setMsg("Stage configuration saved.");
  }

  return (
    <CardSection
      title="Rift stages"
      description="Rename stages or hide ones your firm doesn't use. The two bookend stages (Proposal Accepted and Won) are required because the CRM sync depends on them."
      footer={
        <>
          {err && <span style={{ fontSize: 11.5, color: T.danger, marginRight: "auto" }}>{err}</span>}
          {msg && <span style={{ fontSize: 11.5, color: T.textTertiary, marginRight: "auto" }}>{msg}</span>}
          <Btn primary small onClick={save} disabled={saving || !stages}>
            {saving ? "Saving…" : "Save stages"}
          </Btn>
        </>
      }
    >
      {!stages ? (
        <p style={{ fontSize: 12, color: T.textTertiary }}>Loading stage configuration…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stages.map((row) => {
            const def = STATUSES.find((s) => s.value === row.status);
            if (!def) return null;
            const isBookend = row.status === "PROPOSAL_ACCEPTED" || row.status === "WON";
            return (
              <div
                key={row.status}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  background: T.striped,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <Pill hue={isBookend ? "blue" : "slate"}>{isBookend ? "Bookend" : "Internal"}</Pill>
                <div>
                  <TextInput
                    value={row.customLabel ?? ""}
                    onChange={(v) => update(row.status, { customLabel: v })}
                    placeholder={def.label}
                  />
                  <div style={{ fontSize: 10.5, color: T.textTertiary, marginTop: 4 }}>Default: {def.label}</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textSecondary }}>
                  <input
                    type="checkbox"
                    checked={row.isEnabled}
                    disabled={isBookend}
                    onChange={(e) => update(row.status, { isEnabled: e.target.checked })}
                    style={{ accentColor: T.accent }}
                  />
                  <span>{isBookend ? "Required" : "Use stage"}</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </CardSection>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: T.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

