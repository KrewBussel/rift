"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES } from "./casesDesignTokens";
import { getRootDomain, slugify, validateSlug } from "@/lib/firmDomain";
import { stageOptions, type CrmStage } from "./crmStageOptions";

type WizardStep = "workspace" | "connect" | "confirm" | "done";

const STEP_ORDER: WizardStep[] = ["workspace", "connect", "confirm", "done"];

const STEP_LABEL: Record<WizardStep, string> = {
  workspace: "Workspace URL",
  connect: "Connect Wealthbox",
  confirm: "Confirm stages",
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
  const [step, setStep] = useState<WizardStep>("workspace");

  // Step "workspace" — firm picks the slug for <slug>.riftira.com.
  const [slug, setSlug] = useState<string>(slugify(firmName));
  const [slugLoaded, setSlugLoaded] = useState(false);
  const [slugCheck, setSlugCheck] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugSaveErr, setSlugSaveErr] = useState<string | null>(null);

  // Step "connect"
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [connection, setConnection] = useState<{ connectedUserEmail: string | null; connectedUserName: string | null } | null>(null);

  // Stages + auto-detected bookends
  const [crmStages, setCrmStages] = useState<CrmStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stagesErr, setStagesErr] = useState<string | null>(null);
  const [autoMapped, setAutoMapped] = useState(false);

  // Step "confirm" — bookend mappings
  const [triggerStageId, setTriggerStageId] = useState<string>("");
  const [wonStageId, setWonStageId] = useState<string>("");
  const [savingMappings, setSavingMappings] = useState(false);
  const [mappingErr, setMappingErr] = useState<string | null>(null);

  // Final completion
  const [finishing, setFinishing] = useState(false);
  const [finishErr, setFinishErr] = useState<string | null>(null);

  // Used only on the resume path — a fresh connect returns stages inline.
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

  /* Load existing onboarding state once on mount, so a refresh mid-wizard
   * lands the admin back on the right step. */
  useEffect(() => {
    void (async () => {
      const slugRes = await fetch("/api/firm/slug");
      if (slugRes.ok) {
        const sb = (await slugRes.json()) as { slug: string | null };
        if (sb.slug) setSlug(sb.slug);
      }
      setSlugLoaded(true);

      const res = await fetch("/api/firm/onboarding");
      if (!res.ok) return;
      const body = (await res.json()) as {
        crm: { provider: "WEALTHBOX"; connectedUserEmail: string | null; connectedUserName?: string | null } | null;
        mappings: Array<{ riftStatus: string; crmStageId: string; crmStageName: string }>;
      };
      if (body.crm) {
        setConnection({
          connectedUserEmail: body.crm.connectedUserEmail,
          connectedUserName: body.crm.connectedUserName ?? null,
        });
        const trigger = body.mappings.find((m) => m.riftStatus === "PROPOSAL_ACCEPTED");
        const won = body.mappings.find((m) => m.riftStatus === "WON");
        if (trigger) setTriggerStageId(trigger.crmStageId);
        if (won) setWonStageId(won.crmStageId);
        // Already connected — resume on the confirm step (stages loaded below).
        setStep("confirm");
        void loadStages();
      }
    })();
  }, []);

  // Live availability check on the slug input, debounced.
  useEffect(() => {
    if (!slugLoaded) return;
    if (step !== "workspace") return;
    const validation = validateSlug(slug);
    if (!validation.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlugCheck({ available: false, reason: validation.reason });
      return;
    }
    setSlugCheck(null);
    const timer = setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/firm/slug?check=${encodeURIComponent(validation.slug)}`);
        if (!res.ok) return;
        const body = (await res.json()) as { available: boolean; reason: string | null };
        setSlugCheck(body);
      })();
    }, 300);
    return () => clearTimeout(timer);
  }, [slug, slugLoaded, step]);

  async function saveSlug(): Promise<boolean> {
    setSlugSaveErr(null);
    const validation = validateSlug(slug);
    if (!validation.ok) {
      setSlugSaveErr(validation.reason);
      return false;
    }
    setSavingSlug(true);
    const res = await fetch("/api/firm/slug", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: validation.slug }),
    });
    setSavingSlug(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSlugSaveErr(body.error ?? `Save failed (HTTP ${res.status}).`);
      return false;
    }
    return true;
  }

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
    const body = (await res.json()) as {
      connectedUserEmail?: string;
      connectedUserName?: string;
      connection?: { connectedUserEmail: string | null; connectedUserName: string | null };
      stages?: CrmStage[];
      suggested?: { triggerStageId: string | null; wonStageId: string | null };
      autoMapped?: boolean;
    };
    setConnection({
      connectedUserEmail: body.connection?.connectedUserEmail ?? null,
      connectedUserName: body.connection?.connectedUserName ?? null,
    });
    setCrmStages(body.stages ?? []);
    if (body.suggested?.triggerStageId) setTriggerStageId(body.suggested.triggerStageId);
    if (body.suggested?.wonStageId) setWonStageId(body.suggested.wonStageId);
    setAutoMapped(!!body.autoMapped);
    setToken("");
    setStep("confirm");
  }

  async function saveMappings(): Promise<boolean> {
    setMappingErr(null);
    const triggerStage = crmStages.find((s) => s.id === triggerStageId);
    const wonStage = crmStages.find((s) => s.id === wonStageId);
    if (!triggerStage || !wonStage) {
      setMappingErr("Pick a Wealthbox stage for both the trigger and the Won bookend.");
      return false;
    }
    if (triggerStage.id === wonStage.id) {
      setMappingErr("The trigger and Won stages must be different.");
      return false;
    }
    setSavingMappings(true);
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0d12", color: "#e4e6ea" }}>
      <Header firmName={firmName} adminName={adminName} />

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <Stepper current={step} />

        {step === "workspace" && (
          <StepWorkspace
            slug={slug}
            setSlug={setSlug}
            check={slugCheck}
            saving={savingSlug}
            error={slugSaveErr}
            rootDomain={getRootDomain()}
            onContinue={async () => {
              const ok = await saveSlug();
              if (ok) setStep("connect");
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
              setStep("confirm");
            }}
            onBack={() => setStep("workspace")}
          />
        )}

        {step === "confirm" && (
          <StepConfirm
            connection={connection}
            stages={crmStages}
            stagesLoading={stagesLoading}
            stagesErr={stagesErr}
            autoMapped={autoMapped}
            triggerStageId={triggerStageId}
            wonStageId={wonStageId}
            setTriggerStageId={setTriggerStageId}
            setWonStageId={setWonStageId}
            saving={savingMappings}
            error={mappingErr}
            onContinue={async () => {
              const ok = await saveMappings();
              if (ok) setStep("done");
            }}
            onBack={() => setStep("connect")}
          />
        )}

        {step === "done" && (
          <StepDone
            firmName={firmName}
            finishing={finishing}
            error={finishErr}
            onFinish={finishOnboarding}
            onBack={() => setStep("confirm")}
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

/* ───────────────────────── Step: workspace URL (slug) ───────────────────────── */

function StepWorkspace({
  slug,
  setSlug,
  check,
  saving,
  error,
  rootDomain,
  onContinue,
}: {
  slug: string;
  setSlug: (s: string) => void;
  check: { available: boolean; reason: string | null } | null;
  saving: boolean;
  error: string | null;
  rootDomain: string;
  onContinue: () => void | Promise<void>;
}) {
  const trimmed = slug.trim().toLowerCase();
  const blocked = !!check && !check.available;
  const message = error ?? (blocked ? check?.reason ?? null : null);

  return (
    <Card>
      <CardTitle>Pick your workspace URL</CardTitle>
      <CardLead>
        Your team will sign in at this address. It shows up in everyone&rsquo;s
        browser bar and on the magic-link emails you send to clients. You can
        change it later in Settings, but every link you&rsquo;ve shared from the
        old URL will stop working — pick something you&rsquo;re happy with.
      </CardLead>

      <div className="mt-6 flex items-stretch gap-0 rounded-lg overflow-hidden" style={{ border: "1px solid #1d2330" }}>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          autoComplete="off"
          spellCheck={false}
          placeholder="acme"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
          style={{ background: "#0a0d12", color: "#e4e6ea" }}
        />
        <span
          className="px-3 py-2.5 text-sm flex items-center"
          style={{ background: "#0f131b", color: "#7d8590", borderLeft: "1px solid #1d2330" }}
        >
          .{rootDomain}
        </span>
      </div>

      <div className="mt-2 text-xs" style={{ color: blocked || error ? "#fca5a5" : "#7d8590" }}>
        {message
          ? message
          : check?.available
            ? `✓ ${trimmed}.${rootDomain} is available`
            : "Lowercase letters, numbers, and hyphens. 3–63 characters."}
      </div>

      <Footer
        primaryLabel={saving ? "Saving…" : "Continue"}
        primaryDisabled={saving || blocked || !check?.available}
        onPrimary={onContinue}
      />
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
          We verified your token. Next we&rsquo;ll confirm which stages start and
          close a Rift case.
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
        Rift mirrors Wealthbox as the source of truth for opportunities — new
        deals flow in, won cases flow back out. All it needs is a personal access
        token, which you can revoke any time from Wealthbox.
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

/* ───────────────────────── Step: confirm bookend stages ───────────────────────── */

function StepConfirm({
  connection,
  stages,
  stagesLoading,
  stagesErr,
  autoMapped,
  triggerStageId,
  wonStageId,
  setTriggerStageId,
  setWonStageId,
  saving,
  error,
  onContinue,
  onBack,
}: {
  connection: { connectedUserEmail: string | null; connectedUserName: string | null } | null;
  stages: CrmStage[];
  stagesLoading: boolean;
  stagesErr: string | null;
  autoMapped: boolean;
  triggerStageId: string;
  wonStageId: string;
  setTriggerStageId: (id: string) => void;
  setWonStageId: (id: string) => void;
  saving: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  const ready = !!triggerStageId && !!wonStageId && triggerStageId !== wonStageId;
  const detected = autoMapped && !!triggerStageId && !!wonStageId;

  return (
    <Card>
      <CardTitle>Confirm your Wealthbox stages</CardTitle>
      <CardLead>
        These two stages are the only ones Rift syncs with Wealthbox. Everything
        in between stays inside Rift. {detected
          ? "We detected them from your pipeline — change either if it's not right."
          : "Pick the stage that starts a case and the one that closes it."}
      </CardLead>

      {connection && (
        <div className="mt-4 text-xs" style={{ color: "#7d8590" }}>
          Connected as{" "}
          <span style={{ color: "#c9d1d9" }}>
            {connection.connectedUserName ?? connection.connectedUserEmail ?? "Wealthbox user"}
          </span>
        </div>
      )}

      {detected && (
        <div
          className="mt-3 rounded-lg p-3 text-xs"
          style={{ background: "#0d2318", border: "1px solid #163a26", color: "#6ee7b7" }}
        >
          ✓ We matched your stages automatically. Confirm below or adjust.
        </div>
      )}

      {stagesLoading ? (
        <p className="text-sm mt-4" style={{ color: "#7d8590" }}>Loading stages from Wealthbox…</p>
      ) : stagesErr ? (
        <p className="text-sm mt-4" style={{ color: "#f87171" }}>{stagesErr}</p>
      ) : stages.length === 0 ? (
        <p className="text-sm mt-4" style={{ color: "#f59e0b" }}>
          We didn&rsquo;t see any opportunity stages in Wealthbox. Open{" "}
          <Kbd>Settings → Categories → Opportunity Stages</Kbd> in Wealthbox and
          add at least one stage, then go back and reconnect.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {new Set(stages.map((s) => s.pipelineId).filter(Boolean)).size > 1 && (
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: "#1a1206", border: "1px solid #3a2a10", color: "#f0c674" }}
            >
              Your Wealthbox has more than one pipeline. Pick the stages from your
              rollover pipeline (shown as “Pipeline · Stage”) so only rollover
              opportunities sync into Rift — not every opportunity.
            </div>
          )}
          <div>
            <label className="text-xs font-medium" style={{ color: "#c9d1d9" }}>
              Trigger stage — creates a Rift case
            </label>
            <p className="text-[11px] mt-0.5 mb-1.5" style={{ color: "#7d8590" }}>
              When an opportunity reaches this stage, Rift pulls it in. Most firms use “Proposal Accepted”.
            </p>
            <StageSelect value={triggerStageId} onChange={setTriggerStageId} stages={stages} disabled={saving} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "#c9d1d9" }}>
              Won stage — closes the opportunity
            </label>
            <p className="text-[11px] mt-0.5 mb-1.5" style={{ color: "#7d8590" }}>
              When you mark a case Won in Rift, we set the opportunity to this stage. Its win type in
              Wealthbox should be “won” so the opportunity closes.
            </p>
            <StageSelect value={wonStageId} onChange={setWonStageId} stages={stages} disabled={saving} />
          </div>
        </div>
      )}

      {error && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>}

      <Footer
        onBack={onBack}
        primaryLabel={saving ? "Saving…" : "Continue"}
        primaryDisabled={!ready || saving}
        onPrimary={onContinue}
      />
    </Card>
  );
}

function StageSelect({
  value,
  onChange,
  stages,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  stages: CrmStage[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md px-2.5 py-2 text-sm focus:outline-none disabled:opacity-50"
      style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
    >
      <option value="">Select a stage…</option>
      {stageOptions(stages).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ───────────────────────── Step: review + finish ───────────────────────── */

function StepDone({
  firmName,
  finishing,
  error,
  onFinish,
  onBack,
}: {
  firmName: string;
  finishing: boolean;
  error: string | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <CardTitle>You&rsquo;re ready to roll</CardTitle>
      <CardLead>
        {firmName}&rsquo;s Wealthbox is connected and your bookends are set. Here&rsquo;s
        the pipeline your cases will move through — you can rename or turn off the
        internal stages any time in Settings → Integrations.
      </CardLead>

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUSES.map((s, i) => (
          <div key={s.value} className="flex items-center gap-2">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: "#0f131b", border: "1px solid #1d2330", color: "#c9d1d9" }}
            >
              {s.label}
            </span>
            {i < STATUSES.length - 1 && <span style={{ color: "#2b3346" }}>›</span>}
          </div>
        ))}
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
          <li>• Invite your team and customize stages from Settings once you&rsquo;re in.</li>
        </ul>
      </div>

      <div
        className="mt-3 rounded-lg p-4 text-xs"
        style={{ background: "#0f131b", border: "1px solid #1d2330", color: "#9ca3af" }}
      >
        <p className="font-medium mb-1" style={{ color: "#c9d1d9" }}>One thing to check in Wealthbox</p>
        For cases to auto-create with full detail, each opportunity needs three custom fields —{" "}
        <em>Source Provider</em>, <em>Destination Custodian</em>, and <em>Account Type</em>. Cases still
        get created without them, just flagged for review.
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
          app.wealthbox.com / settings / api_access
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
