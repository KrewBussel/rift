"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, type StageConfigRow } from "./casesDesignTokens";

type CrmStage = { id: string; name: string };

type WizardStep = "crm" | "connect" | "trigger" | "won" | "stages" | "done";

const STEP_ORDER: WizardStep[] = ["crm", "connect", "trigger", "won", "stages", "done"];

const STEP_LABEL: Record<WizardStep, string> = {
  crm: "Choose CRM",
  connect: "Connect",
  trigger: "Trigger stage",
  won: "Won stage",
  stages: "Rift stages",
  done: "Finish",
};

export default function OnboardingWizard({
  firmName,
  adminName,
}: {
  firmName: string;
  adminName: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("crm");
  const [provider, setProvider] = useState<"WEALTHBOX" | null>(null);

  // Step "connect"
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [connection, setConnection] = useState<{ connectedUserEmail: string | null; connectedUserName: string | null } | null>(null);

  // Stages from Wealthbox
  const [crmStages, setCrmStages] = useState<CrmStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stagesErr, setStagesErr] = useState<string | null>(null);

  // Trigger + Won mappings
  const [triggerStageId, setTriggerStageId] = useState<string>("");
  const [wonStageId, setWonStageId] = useState<string>("");
  const [savingMappings, setSavingMappings] = useState(false);
  const [mappingErr, setMappingErr] = useState<string | null>(null);

  // Rift stage configuration
  const [stageConfig, setStageConfig] = useState<StageConfigRow[]>(
    STATUSES.map((s, i) => ({
      status: s.value,
      customLabel: null,
      isEnabled: true,
      sortOrder: i,
    })),
  );
  const [savingStages, setSavingStages] = useState(false);
  const [stagesSaveErr, setStagesSaveErr] = useState<string | null>(null);

  // Final completion
  const [finishing, setFinishing] = useState(false);
  const [finishErr, setFinishErr] = useState<string | null>(null);

  /* Load existing onboarding state once on mount, so a refresh mid-wizard
   * lands the admin back on the right step. */
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/firm/onboarding");
      if (!res.ok) return;
      const body = (await res.json()) as {
        crm: { provider: "WEALTHBOX" | "SALESFORCE"; connectedUserEmail: string | null; connectedUserName?: string | null } | null;
        mappings: Array<{ riftStatus: string; crmStageId: string; crmStageName: string }>;
      };
      if (body.crm?.provider === "WEALTHBOX") {
        setProvider("WEALTHBOX");
        setConnection({
          connectedUserEmail: body.crm.connectedUserEmail,
          connectedUserName: body.crm.connectedUserName ?? null,
        });
        const trigger = body.mappings.find((m) => m.riftStatus === "PROPOSAL_ACCEPTED");
        const won = body.mappings.find((m) => m.riftStatus === "WON");
        if (trigger) setTriggerStageId(trigger.crmStageId);
        if (won) setWonStageId(won.crmStageId);
        // Land on the first step that isn't yet done.
        if (!trigger) setStep("trigger");
        else if (!won) setStep("won");
        else setStep("stages");
      }
      const stagesRes = await fetch("/api/firm/stages");
      if (stagesRes.ok) {
        const sb = (await stagesRes.json()) as { stages: StageConfigRow[] };
        if (sb.stages?.length) setStageConfig(sb.stages);
      }
    })();
  }, []);

  async function loadStages() {
    setStagesLoading(true);
    setStagesErr(null);
    const res = await fetch("/api/integrations/crm/stages");
    setStagesLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStagesErr(body.error ?? `Couldn't load Wealthbox stages (HTTP ${res.status}).`);
      return;
    }
    const body = (await res.json()) as { stages: CrmStage[] };
    setCrmStages(body.stages ?? []);
  }

  // Pull Wealthbox stages once we have a connection and we're past the
  // "connect" step. The synchronous setState inside loadStages is a normal
  // fetch-on-mount pattern that React's lint rule mistakenly flags here.
  useEffect(() => {
    if (!connection) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStages();
  }, [connection]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnectErr(null);
    setConnecting(true);
    const res = await fetch("/api/integrations/wealthbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    setConnecting(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setConnectErr(body.error ?? "We couldn't verify that token. Double-check it in Wealthbox and try again.");
      return;
    }
    const body = (await res.json()) as { connectedUserEmail?: string; connectedUserName?: string };
    setConnection({
      connectedUserEmail: body.connectedUserEmail ?? null,
      connectedUserName: body.connectedUserName ?? null,
    });
    setToken("");
    setStep("trigger");
  }

  async function saveMappings() {
    setMappingErr(null);
    setSavingMappings(true);
    const triggerStage = crmStages.find((s) => s.id === triggerStageId);
    const wonStage = crmStages.find((s) => s.id === wonStageId);
    if (!triggerStage || !wonStage) {
      setSavingMappings(false);
      setMappingErr("Pick a Wealthbox stage for both the trigger and the won bookend.");
      return;
    }
    const res = await fetch("/api/integrations/crm/mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mappings: [
          { riftStatus: "PROPOSAL_ACCEPTED", crmStageId: triggerStage.id, crmStageName: triggerStage.name },
          { riftStatus: "WON", crmStageId: wonStage.id, crmStageName: wonStage.name },
        ],
      }),
    });
    setSavingMappings(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMappingErr(body.error ?? `Save failed (HTTP ${res.status}).`);
      return false;
    }
    return true;
  }

  async function saveStageConfig() {
    setStagesSaveErr(null);
    setSavingStages(true);
    const res = await fetch("/api/firm/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages: stageConfig.map((s) => ({
          status: s.status,
          customLabel: s.customLabel?.trim() ? s.customLabel.trim() : null,
          isEnabled: s.isEnabled,
        })),
      }),
    });
    setSavingStages(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStagesSaveErr(body.error ?? `Save failed (HTTP ${res.status}).`);
      return false;
    }
    return true;
  }

  async function finishOnboarding() {
    setFinishing(true);
    setFinishErr(null);
    const res = await fetch("/api/firm/onboarding", { method: "POST" });
    setFinishing(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setFinishErr(body.error ?? "We couldn't finish onboarding. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const sampleStageNames = useMemo(() => crmStages.map((s) => s.name).slice(0, 6), [crmStages]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0d12", color: "#e4e6ea" }}>
      <Header firmName={firmName} adminName={adminName} />

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <Stepper current={step} />

        {step === "crm" && (
          <StepCrm
            provider={provider}
            onPick={(p) => {
              setProvider(p);
              setStep("connect");
            }}
          />
        )}

        {step === "connect" && (
          <StepConnect
            connection={connection}
            token={token}
            setToken={setToken}
            connecting={connecting}
            error={connectErr}
            onConnect={handleConnect}
            onContinue={() => {
              setConnectErr(null);
              setStep("trigger");
            }}
            onBack={() => setStep("crm")}
          />
        )}

        {step === "trigger" && (
          <StepStagePick
            title="Which Wealthbox stage starts a Rift case?"
            description={
              <>
                When an opportunity hits this stage in Wealthbox, Rift will pull
                it in and create a case automatically. Most firms use{" "}
                <em>&ldquo;Proposal Accepted&rdquo;</em>, but pick whatever marks
                the moment your team starts the rollover paperwork.
              </>
            }
            crmStages={crmStages}
            stagesLoading={stagesLoading}
            stagesErr={stagesErr}
            value={triggerStageId}
            onChange={setTriggerStageId}
            sampleStageNames={sampleStageNames}
            primaryLabel={savingMappings ? "Saving…" : "Continue"}
            primaryDisabled={!triggerStageId}
            onPrimary={async () => {
              // We don't write yet — the trigger and won are saved together
              // at the end of step "won" because the API expects both.
              if (triggerStageId) setStep("won");
            }}
            onBack={() => setStep("connect")}
          />
        )}

        {step === "won" && (
          <StepStagePick
            title="Which Wealthbox stage closes a case?"
            description={
              <>
                When a Rift case is moved to <em>Won</em>, we&rsquo;ll set the
                Wealthbox opportunity to this stage. Wealthbox closes the
                opportunity automatically as long as the stage&rsquo;s win type
                is set to <em>&ldquo;won&rdquo;</em>.
              </>
            }
            crmStages={crmStages}
            stagesLoading={stagesLoading}
            stagesErr={stagesErr}
            value={wonStageId}
            onChange={setWonStageId}
            sampleStageNames={sampleStageNames}
            primaryLabel={savingMappings ? "Saving…" : "Continue"}
            primaryDisabled={!wonStageId || savingMappings}
            error={mappingErr}
            onPrimary={async () => {
              const ok = await saveMappings();
              if (ok) setStep("stages");
            }}
            onBack={() => setStep("trigger")}
          />
        )}

        {step === "stages" && (
          <StepStages
            stageConfig={stageConfig}
            setStageConfig={setStageConfig}
            saving={savingStages}
            error={stagesSaveErr}
            onContinue={async () => {
              const ok = await saveStageConfig();
              if (ok) setStep("done");
            }}
            onBack={() => setStep("won")}
          />
        )}

        {step === "done" && (
          <StepDone
            firmName={firmName}
            stageConfig={stageConfig}
            finishing={finishing}
            error={finishErr}
            onFinish={finishOnboarding}
            onBack={() => setStep("stages")}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Header + stepper ───────────────────────── */

function Header({ firmName, adminName }: { firmName: string; adminName: string | null }) {
  const greeting = adminName ? `Welcome, ${adminName.split(" ")[0]}` : "Welcome";
  return (
    <header
      className="border-b px-6 py-4"
      style={{ borderColor: "#1d2330", background: "#0d1119" }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: "#7d8590" }}>
            Set up {firmName}
          </p>
          <h1 className="text-base font-semibold mt-0.5" style={{ color: "#e4e6ea" }}>
            {greeting}
          </h1>
        </div>
        <span className="text-xs" style={{ color: "#7d8590" }}>
          One-time setup
        </span>
      </div>
    </header>
  );
}

function Stepper({ current }: { current: WizardStep }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-6 text-xs">
      {STEP_ORDER.map((s, i) => {
        const isActive = s === current;
        const isDone = i < idx;
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{
                background: isActive ? "#5b8def" : isDone ? "#1f3a2a" : "#1d2330",
                color: isActive ? "#fff" : isDone ? "#3fb950" : "#7d8590",
              }}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span style={{ color: isActive ? "#e4e6ea" : "#7d8590" }}>{STEP_LABEL[s]}</span>
            {i < STEP_ORDER.length - 1 && (
              <span className="mx-1" style={{ color: "#2b3346" }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Step: choose CRM ───────────────────────── */

function StepCrm({
  provider,
  onPick,
}: {
  provider: "WEALTHBOX" | null;
  onPick: (p: "WEALTHBOX") => void;
}) {
  return (
    <Card>
      <CardTitle>Which CRM are you connecting?</CardTitle>
      <CardLead>
        Rift mirrors a single CRM as the source of truth for opportunities. New
        opportunities flow in and won cases flow back out — you&rsquo;ll choose
        which stages do that on the next steps.
      </CardLead>

      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <button
          onClick={() => onPick("WEALTHBOX")}
          className={`text-left rounded-xl p-4 border transition`}
          style={{
            background: provider === "WEALTHBOX" ? "#152130" : "#0f131b",
            borderColor: provider === "WEALTHBOX" ? "#5b8def" : "#1d2330",
          }}
        >
          <div className="flex items-center gap-2">
            <WealthboxGlyph />
            <span className="font-medium" style={{ color: "#e4e6ea" }}>Wealthbox</span>
          </div>
          <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
            Personal access token. Set up in 30 seconds.
          </p>
        </button>

        <div
          className="rounded-xl p-4 border opacity-60 cursor-not-allowed"
          style={{ background: "#0f131b", borderColor: "#1d2330" }}
          aria-disabled
        >
          <div className="flex items-center gap-2">
            <SalesforceGlyph />
            <span className="font-medium" style={{ color: "#9ca3af" }}>Salesforce</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1d2330", color: "#7d8590" }}>
              Coming soon
            </span>
          </div>
          <p className="text-xs mt-2" style={{ color: "#7d8590" }}>
            OAuth app. Available once we finish the inbound poll path.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── Step: connect Wealthbox ───────────────────────── */

function StepConnect({
  connection,
  token,
  setToken,
  connecting,
  error,
  onConnect,
  onContinue,
  onBack,
}: {
  connection: { connectedUserEmail: string | null; connectedUserName: string | null } | null;
  token: string;
  setToken: (s: string) => void;
  connecting: boolean;
  error: string | null;
  onConnect: (e: React.FormEvent) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  if (connection) {
    return (
      <Card>
        <CardTitle>Connected to Wealthbox</CardTitle>
        <CardLead>
          We verified the token and pulled your stages. You&rsquo;re ready to
          map the bookends.
        </CardLead>
        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{ background: "#0d2318", border: "1px solid #163a26", color: "#6ee7b7" }}
        >
          ✓ Connected as{" "}
          <strong>
            {connection.connectedUserName ?? connection.connectedUserEmail ?? "Wealthbox user"}
          </strong>
        </div>
        <Footer onBack={onBack} primaryLabel="Continue" onPrimary={onContinue} />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Connect your Wealthbox account</CardTitle>
      <CardLead>
        Rift authenticates using a personal access token. It only takes a
        minute, and you can revoke it at any time from Wealthbox.
      </CardLead>

      <ol className="mt-5 space-y-3" style={{ color: "#c9d1d9" }}>
        <NumberedStep n={1}>
          In Wealthbox, click your name in the top-right and choose{" "}
          <Kbd>My Settings</Kbd>.
        </NumberedStep>
        <NumberedStep n={2}>
          On the left, click <Kbd>API Access</Kbd>.
        </NumberedStep>
        <NumberedStep n={3}>
          Click <Kbd>Create Access Token</Kbd>, give it a name like{" "}
          <em>&ldquo;Rift&rdquo;</em>, and copy the token that appears.
        </NumberedStep>
        <NumberedStep n={4}>Paste it below and click Connect.</NumberedStep>
      </ol>

      <WealthboxTokenIllustration />

      <form onSubmit={onConnect} className="mt-5 space-y-3">
        <input
          type="password"
          autoComplete="off"
          placeholder="Paste your Wealthbox access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
        />
        {error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
      </form>

      <Footer
        onBack={onBack}
        primaryLabel={connecting ? "Verifying…" : "Connect Wealthbox"}
        primaryDisabled={connecting || !token.trim()}
        onPrimary={(e) => onConnect(e as unknown as React.FormEvent)}
      />
    </Card>
  );
}

/* ───────────────────────── Step: pick a Wealthbox stage ───────────────────────── */

function StepStagePick({
  title,
  description,
  crmStages,
  stagesLoading,
  stagesErr,
  value,
  onChange,
  sampleStageNames,
  primaryLabel,
  primaryDisabled,
  error,
  onPrimary,
  onBack,
}: {
  title: string;
  description: React.ReactNode;
  crmStages: CrmStage[];
  stagesLoading: boolean;
  stagesErr: string | null;
  value: string;
  onChange: (id: string) => void;
  sampleStageNames: string[];
  primaryLabel: string;
  primaryDisabled?: boolean;
  error?: string | null;
  onPrimary: () => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardLead>{description}</CardLead>

      {stagesLoading ? (
        <p className="text-sm mt-4" style={{ color: "#7d8590" }}>
          Loading stages from Wealthbox…
        </p>
      ) : stagesErr ? (
        <p className="text-sm mt-4" style={{ color: "#f87171" }}>{stagesErr}</p>
      ) : crmStages.length === 0 ? (
        <p className="text-sm mt-4" style={{ color: "#f59e0b" }}>
          We didn&rsquo;t see any opportunity stages in Wealthbox. Open{" "}
          <Kbd>Settings → Categories → Opportunity Stages</Kbd> in Wealthbox and
          add at least one stage, then refresh.
        </p>
      ) : (
        <div className="mt-5 grid sm:grid-cols-2 gap-2">
          {crmStages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className="text-left rounded-lg border px-3 py-2 text-sm transition"
              style={{
                background: value === s.id ? "#152130" : "#0f131b",
                borderColor: value === s.id ? "#5b8def" : "#1d2330",
                color: "#c9d1d9",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {sampleStageNames.length > 0 && (
        <p className="text-xs mt-4" style={{ color: "#7d8590" }}>
          Tip: most firms use the stage that sits right after the proposal is
          signed but before paperwork starts.
        </p>
      )}

      {error && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>}

      <Footer
        onBack={onBack}
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        onPrimary={onPrimary}
      />
    </Card>
  );
}

/* ───────────────────────── Step: configure Rift stages ───────────────────────── */

function StepStages({
  stageConfig,
  setStageConfig,
  saving,
  error,
  onContinue,
  onBack,
}: {
  stageConfig: StageConfigRow[];
  setStageConfig: (rows: StageConfigRow[]) => void;
  saving: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  const update = (status: string, patch: Partial<StageConfigRow>) => {
    setStageConfig(stageConfig.map((r) => (r.status === status ? { ...r, ...patch } : r)));
  };

  return (
    <Card>
      <CardTitle>Customize your Rift stages</CardTitle>
      <CardLead>
        Rename stages to match how your team talks about cases, and turn off any
        you don&rsquo;t use. The two bookend stages (the trigger and Won) stay
        on — those are how Wealthbox and Rift sync.
      </CardLead>

      <div className="mt-5 space-y-2">
        {stageConfig.map((row) => {
          const def = STATUSES.find((s) => s.value === row.status)!;
          const isBookend = row.status === "PROPOSAL_ACCEPTED" || row.status === "WON";
          return (
            <div
              key={row.status}
              className="rounded-lg border p-3 grid grid-cols-[auto_1fr_auto] gap-3 items-center"
              style={{ background: "#0f131b", borderColor: "#1d2330" }}
            >
              <span
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: isBookend ? "#152130" : "#1d2330",
                  color: isBookend ? "#5b8def" : "#7d8590",
                }}
                title={isBookend ? "Always enabled — Wealthbox sync depends on this stage." : undefined}
              >
                {isBookend ? "Bookend" : "Internal"}
              </span>
              <div>
                <input
                  type="text"
                  value={row.customLabel ?? ""}
                  placeholder={def.label}
                  onChange={(e) => update(row.status, { customLabel: e.target.value })}
                  maxLength={60}
                  className="w-full rounded-md px-2.5 py-1.5 text-sm focus:outline-none"
                  style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "#7d8590" }}>
                  Default: {def.label}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs" style={{ color: "#9ca3af" }}>
                <input
                  type="checkbox"
                  checked={row.isEnabled}
                  disabled={isBookend}
                  onChange={(e) => update(row.status, { isEnabled: e.target.checked })}
                />
                <span>{isBookend ? "Required" : "Use this stage"}</span>
              </label>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>}

      <Footer
        onBack={onBack}
        primaryLabel={saving ? "Saving…" : "Continue"}
        primaryDisabled={saving}
        onPrimary={onContinue}
      />
    </Card>
  );
}

/* ───────────────────────── Step: review + finish ───────────────────────── */

function StepDone({
  firmName,
  stageConfig,
  finishing,
  error,
  onFinish,
  onBack,
}: {
  firmName: string;
  stageConfig: StageConfigRow[];
  finishing: boolean;
  error: string | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  const enabled = stageConfig.filter((r) => r.isEnabled);
  return (
    <Card>
      <CardTitle>You&rsquo;re ready to roll</CardTitle>
      <CardLead>
        {firmName}&rsquo;s Wealthbox is connected and your Rift pipeline looks
        like this. You can change any of it later from Settings → Integrations.
      </CardLead>

      <div className="mt-5 flex flex-wrap gap-2">
        {enabled.map((r, i) => {
          const def = STATUSES.find((s) => s.value === r.status)!;
          const label = r.customLabel?.trim() || def.label;
          return (
            <div key={r.status} className="flex items-center gap-2">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "#0f131b",
                  border: "1px solid #1d2330",
                  color: "#c9d1d9",
                }}
              >
                {label}
              </span>
              {i < enabled.length - 1 && <span style={{ color: "#2b3346" }}>›</span>}
            </div>
          );
        })}
      </div>

      <div
        className="mt-6 rounded-lg p-4 text-sm"
        style={{ background: "#0f131b", border: "1px solid #1d2330", color: "#9ca3af" }}
      >
        <p className="font-medium mb-1" style={{ color: "#e4e6ea" }}>What happens next</p>
        <ul className="space-y-1.5 text-xs">
          <li>• When a Wealthbox opportunity reaches your trigger stage, Rift creates a case automatically.</li>
          <li>• Move cases through Rift&rsquo;s internal stages — Wealthbox stays out of the way.</li>
          <li>• When you mark a case Won, Rift closes the Wealthbox opportunity for you.</li>
          <li>• You can invite your team from Settings → Team.</li>
        </ul>
      </div>

      {error && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>}

      <Footer
        onBack={onBack}
        primaryLabel={finishing ? "Finishing…" : "Take me to Rift"}
        primaryDisabled={finishing}
        onPrimary={onFinish}
      />
    </Card>
  );
}

/* ───────────────────────── Reusable bits ───────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#141923", border: "1px solid #1d2330" }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold" style={{ color: "#e4e6ea" }}>{children}</h2>;
}

function CardLead({ children }: { children: React.ReactNode }) {
  return <p className="text-sm mt-1.5" style={{ color: "#9ca3af" }}>{children}</p>;
}

function Footer({
  onBack,
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: {
  onBack?: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: (e?: React.MouseEvent) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-sm px-3 py-1.5 rounded-md"
          style={{ background: "#1d2330", color: "#c9d1d9" }}
        >
          ← Back
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="text-sm px-4 py-2 rounded-md disabled:opacity-50"
        style={{ background: "#2563eb", color: "#fff" }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function NumberedStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm">
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
        style={{ background: "#1d2330", color: "#9ca3af" }}
      >
        {n}
      </span>
      <span style={{ color: "#c9d1d9" }}>{children}</span>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-[12px]"
      style={{ background: "#1d2330", color: "#c9d1d9", border: "1px solid #2b3346" }}
    >
      {children}
    </code>
  );
}

/* ───────────────────────── Visuals ───────────────────────── */

function WealthboxGlyph() {
  return (
    <span
      className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold"
      style={{ background: "#152130", color: "#5b8def" }}
      aria-hidden
    >
      WB
    </span>
  );
}

function SalesforceGlyph() {
  return (
    <span
      className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold"
      style={{ background: "#1d2330", color: "#7d8590" }}
      aria-hidden
    >
      SF
    </span>
  );
}

/**
 * Stylized illustration of the Wealthbox API Access screen. Not a screenshot —
 * a clean, brand-neutral mock that points at the Create Access Token button so
 * the admin knows what they're looking for once they navigate there.
 */
function WealthboxTokenIllustration() {
  return (
    <div
      className="mt-5 rounded-xl overflow-hidden"
      style={{ background: "#0d1117", border: "1px solid #1d2330" }}
    >
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ background: "#0f131b", borderBottom: "1px solid #1d2330" }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
        <span className="ml-3 text-[11px]" style={{ color: "#7d8590" }}>
          app.crmworkspace.com / settings / api_access
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#7d8590" }}>
          API Access
        </p>
        <p className="text-sm mb-3" style={{ color: "#c9d1d9" }}>
          Create access tokens to integrate Wealthbox with other tools.
        </p>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 rounded-md px-3 py-2 text-xs"
            style={{ background: "#0a0d12", border: "1px dashed #30363d", color: "#7d8590" }}
          >
            Rift &nbsp;·&nbsp; created just now
          </div>
          <div
            className="rounded-md px-3 py-2 text-xs font-medium relative"
            style={{ background: "#2563eb", color: "#fff" }}
          >
            Create Access Token
            <span
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: "#5b8def", color: "#fff" }}
              aria-hidden
            >
              ↘
            </span>
          </div>
        </div>
        <p className="text-[11px] mt-3" style={{ color: "#7d8590" }}>
          The token is shown once. Copy it and paste it below — you can revoke
          it from Wealthbox at any time.
        </p>
      </div>
    </div>
  );
}
