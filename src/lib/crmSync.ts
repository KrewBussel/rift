import { prisma } from "./prisma";
import { getCrmClient, type OpportunityHydrated } from "./crmClient";
import { Prisma } from "@prisma/client";
import type { CaseStatus, AccountType } from "@prisma/client";

/**
 * The two bookend stages that sync with the CRM. Intermediate Rift-only stages
 * (AWAITING_CLIENT_ACTION, READY_TO_SUBMIT, SUBMITTED, PROCESSING, IN_TRANSIT)
 * never push to or pull from the CRM. This is the single source of truth —
 * the Zod enum in /api/integrations/crm/mapping imports it.
 */
export const MAPPABLE_STATUSES = ["PROPOSAL_ACCEPTED", "WON"] as const;

const MAPPABLE_STATUS_SET: ReadonlySet<CaseStatus> = new Set(MAPPABLE_STATUSES);

/**
 * Wealthbox custom-field names the inbound poller reads off an opportunity.
 * These must match the field names you create in your Wealthbox dashboard
 * (matching is case-insensitive).
 */
export const WEALTHBOX_CUSTOM_FIELDS = {
  sourceProvider: "Source Provider",
  destinationCustodian: "Destination Custodian",
  accountType: "Account Type",
} as const;

/** Map a Wealthbox Account Type dropdown value → Rift's AccountType enum. */
export function mapAccountType(value: string | null): AccountType | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  // Check "403" before roth/traditional: values like "Roth 403(b)" or
  // "Traditional 403(b)" contain "roth"/"traditional" too, and would otherwise
  // be misclassified as ROTH_IRA_401K / TRADITIONAL_IRA_401K. Most-specific wins.
  if (v.includes("403")) return "IRA_403B";
  if (v.includes("traditional")) return "TRADITIONAL_IRA_401K";
  if (v.includes("roth")) return "ROTH_IRA_401K";
  if (v === "other") return "OTHER";
  return null;
}

/**
 * Read the three Rift-required custom fields off a hydrated opportunity.
 * Shared by inbound case creation and the per-case "Refresh from CRM" path so
 * the two can never drift on how fields are looked up or mapped.
 */
function readCustomCaseFields(opp: OpportunityHydrated): {
  sourceProvider: string | null;
  destinationCustodian: string | null;
  accountTypeRaw: string | null;
  accountType: AccountType | null;
} {
  const get = (name: string) => opp.customFields[name.toLowerCase()] ?? null;
  const accountTypeRaw = get(WEALTHBOX_CUSTOM_FIELDS.accountType);
  return {
    sourceProvider: get(WEALTHBOX_CUSTOM_FIELDS.sourceProvider),
    destinationCustodian: get(WEALTHBOX_CUSTOM_FIELDS.destinationCustodian),
    accountTypeRaw,
    accountType: mapAccountType(accountTypeRaw),
  };
}

/**
 * Heuristic: given a firm's Wealthbox opportunity stages, guess which one is the
 * inbound trigger (Proposal Accepted) and which is the Won close stage, matching
 * on stage name. Used to pre-fill the onboarding "confirm your stages" screen so
 * the admin usually just clicks Continue instead of hunting through a list.
 * Returns null for either bookend when no confident match exists.
 *
 * Pipeline-aware: firms whose Wealthbox mixes rollover and non-rollover
 * opportunities keep rollovers in a dedicated pipeline (e.g. "Rollover") so
 * only that pipeline's stages feed Rift. When such a pipeline exists, both
 * bookends are matched ONLY within it — falling back to other pipelines would
 * silently map a stage every non-rollover opportunity flows through, which is
 * exactly the flood this pattern exists to prevent. No match inside the
 * rollover pipeline means the admin picks manually.
 */
export function suggestBookendStages(
  stages: Array<{ id: string; name: string; pipelineName?: string | null }>,
): { trigger: { id: string; name: string } | null; won: { id: string; name: string } | null } {
  const rolloverPipeline = stages.filter((s) => /rollover|rift/i.test(s.pipelineName ?? ""));
  const pool = rolloverPipeline.length > 0 ? rolloverPipeline : stages;

  const norm = (s: string) => s.trim().toLowerCase();
  const findFirst = (preds: Array<(n: string) => boolean>): { id: string; name: string } | null => {
    for (const pred of preds) {
      const hit = pool.find((s) => pred(norm(s.name)));
      if (hit) return { id: hit.id, name: hit.name };
    }
    return null;
  };

  const trigger = findFirst([
    (n) => n.includes("proposal") && n.includes("accept"),
    (n) => n === "proposal accepted",
    (n) => n.includes("proposal"),
    (n) => n.includes("accepted"),
    (n) => n.includes("signed"),
  ]);

  const won = findFirst([
    (n) => n === "won" || n === "closed won" || n === "closed - won" || n === "closed-won",
    (n) => n.includes("closed") && n.includes("won"),
    (n) => n.includes("won"),
  ]);

  // Never suggest the same stage for both bookends — if the heuristics collide,
  // drop the Won suggestion so the admin picks it explicitly.
  if (trigger && won && trigger.id === won.id) {
    return { trigger, won: null };
  }
  return { trigger, won };
}

/**
 * Write the two bookend stage mappings for a firm, replacing any existing
 * bookend rows in one transaction. Intermediate Rift-only stages are never
 * mapped, so this only ever touches PROPOSAL_ACCEPTED and WON. Shared by the
 * connect auto-detect path and the Settings mapping editor.
 */
export async function upsertBookendMappings(
  firmId: string,
  trigger: { id: string; name: string },
  won: { id: string; name: string },
): Promise<void> {
  await prisma.$transaction([
    prisma.crmStageMapping.deleteMany({
      where: { firmId, riftStatus: { in: ["PROPOSAL_ACCEPTED", "WON"] } },
    }),
    prisma.crmStageMapping.create({
      data: { firmId, riftStatus: "PROPOSAL_ACCEPTED", crmStageId: trigger.id, crmStageName: trigger.name },
    }),
    prisma.crmStageMapping.create({
      data: { firmId, riftStatus: "WON", crmStageId: won.id, crmStageName: won.name },
    }),
  ]);
}

export type SyncStageResult =
  | { ok: true; stageId: string; stageName: string }
  | { ok: false; reason: "no_connection" | "not_linked" | "no_mapping" | "api_error" | "rift_only_stage"; error?: string };

/**
 * Sync a case's current status to its linked CRM opportunity.
 * Non-throwing: any failure is captured on the case row and the connection;
 * never blocks the upstream status change. This wrapper guarantees the
 * contract even for the pre-flight DB reads (a transient pool error must not
 * 500 an already-committed PATCH /api/cases/[id]).
 */
export async function syncOpportunityStage(caseId: string): Promise<SyncStageResult> {
  try {
    return await syncOpportunityStageImpl(caseId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, reason: "api_error", error: message };
  }
}

async function syncOpportunityStageImpl(caseId: string): Promise<SyncStageResult> {
  const rolloverCase = await prisma.rolloverCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      firmId: true,
      status: true,
      wealthboxOpportunityId: true,
    },
  });
  if (!rolloverCase) return { ok: false, reason: "not_linked" };
  if (!rolloverCase.wealthboxOpportunityId) return { ok: false, reason: "not_linked" };

  // Intermediate stages are deliberately not synced — silently skip without
  // writing wealthboxLastSyncError so the case doesn't show a fake failure.
  if (!MAPPABLE_STATUS_SET.has(rolloverCase.status)) {
    return { ok: false, reason: "rift_only_stage" };
  }

  const connection = await prisma.crmConnection.findUnique({ where: { firmId: rolloverCase.firmId } });
  if (!connection) {
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncError: "CRM connection missing" },
    });
    return { ok: false, reason: "no_connection" };
  }

  const mapping = await prisma.crmStageMapping.findUnique({
    where: { firmId_riftStatus: { firmId: rolloverCase.firmId, riftStatus: rolloverCase.status } },
  });
  if (!mapping) {
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncError: `No stage mapping for ${rolloverCase.status}` },
    });
    return { ok: false, reason: "no_mapping" };
  }

  try {
    const client = getCrmClient(connection);
    await client.updateOpportunityStage(rolloverCase.wealthboxOpportunityId, mapping.crmStageId);
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncedAt: new Date(), wealthboxLastSyncError: null },
    });
    await prisma.crmConnection.update({
      where: { firmId: rolloverCase.firmId },
      data: { lastHealthCheckAt: new Date(), lastHealthOk: true, lastHealthError: null },
    });
    return { ok: true, stageId: mapping.crmStageId, stageName: mapping.crmStageName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncError: message },
    });
    await prisma.crmConnection.update({
      where: { firmId: rolloverCase.firmId },
      data: { lastHealthCheckAt: new Date(), lastHealthOk: false, lastHealthError: message },
    });
    return { ok: false, reason: "api_error", error: message };
  }
}

/**
 * Reverse sync: read the linked CRM opportunity's current stage and, if the
 * firm has a mapping from that stage to a Rift status, apply it to the case.
 * Triggered by the user from the case panel ("Refresh from CRM").
 */
export async function refreshCaseFromCrm(caseId: string, actorUserId: string): Promise<
  | { ok: true; changed: boolean; oldStatus?: CaseStatus; newStatus?: CaseStatus; stageName?: string }
  | { ok: false; reason: "no_connection" | "not_linked" | "no_mapping" | "api_error" | "opp_no_stage"; error?: string }
> {
  const rolloverCase = await prisma.rolloverCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      firmId: true,
      status: true,
      wealthboxOpportunityId: true,
      clientFirstName: true,
      clientLastName: true,
      clientEmail: true,
      sourceProvider: true,
      destinationCustodian: true,
      accountType: true,
      needsReview: true,
    },
  });
  if (!rolloverCase) return { ok: false, reason: "not_linked" };
  if (!rolloverCase.wealthboxOpportunityId) return { ok: false, reason: "not_linked" };

  const connection = await prisma.crmConnection.findUnique({ where: { firmId: rolloverCase.firmId } });
  if (!connection) return { ok: false, reason: "no_connection" };

  // Hydrate the opp so we can pull metadata + contact details, not just stage.
  // This is what makes the manual "Refresh from CRM" actually update the
  // amount, target close, client phone, etc. when they change in Wealthbox.
  let hydrated;
  try {
    const client = getCrmClient(connection);
    hydrated = await client.getOpportunityHydrated(rolloverCase.wealthboxOpportunityId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncError: message },
    });
    return { ok: false, reason: "api_error", error: message };
  }

  if (!hydrated.stageId) return { ok: false, reason: "opp_no_stage" };

  const mapping = await prisma.crmStageMapping.findFirst({
    where: { firmId: rolloverCase.firmId, crmStageId: hydrated.stageId },
  });
  if (!mapping) return { ok: false, reason: "no_mapping" };

  const oldStatus = rolloverCase.status;
  const newStatus = mapping.riftStatus;

  // Case data (names, email, source, destination, account type) is Rift-owned:
  // once it holds real values, refresh never overwrites it. The one exception
  // is placeholder backfill — a case auto-created before the CRM opportunity
  // was fully populated carries "Unknown"/"" placeholders, and those may fill
  // in from the CRM once. `next` is what each field will be after this refresh.
  const fields = readCustomCaseFields(hydrated);
  const hasPlaceholderName =
    rolloverCase.clientFirstName === "Unknown" && rolloverCase.clientLastName === "Unknown";
  const next = {
    clientFirstName:
      hasPlaceholderName && hydrated.contact?.firstName
        ? hydrated.contact.firstName
        : rolloverCase.clientFirstName,
    clientLastName:
      hasPlaceholderName && hydrated.contact?.lastName
        ? hydrated.contact.lastName
        : rolloverCase.clientLastName,
    clientEmail:
      rolloverCase.clientEmail === "" && hydrated.contact?.email
        ? hydrated.contact.email
        : rolloverCase.clientEmail,
    sourceProvider:
      rolloverCase.sourceProvider === "" && fields.sourceProvider
        ? fields.sourceProvider
        : rolloverCase.sourceProvider,
    destinationCustodian:
      rolloverCase.destinationCustodian === "" && fields.destinationCustodian
        ? fields.destinationCustodian
        : rolloverCase.destinationCustodian,
    accountType:
      rolloverCase.accountType === "OTHER" && fields.accountType
        ? fields.accountType
        : rolloverCase.accountType,
  };

  // If the refresh resolved every reason the case was flagged for review, drop
  // the flag so the user doesn't have to chase it manually.
  const fullyResolved =
    rolloverCase.needsReview &&
    !!next.clientFirstName && next.clientFirstName !== "Unknown" &&
    !!next.clientLastName && next.clientLastName !== "Unknown" &&
    next.clientEmail !== "" &&
    next.sourceProvider !== "" &&
    next.destinationCustodian !== "" &&
    next.accountType !== "OTHER";

  const refreshedFields = {
    // CRM-shadowed metadata always refreshes — that's the point of the button.
    wealthboxOpportunityName: hydrated.name,
    wealthboxAmount: hydrated.amount,
    wealthboxAmountCurrency: hydrated.amountCurrency,
    wealthboxTargetClose: hydrated.targetClose,
    wealthboxProbability: hydrated.probability,
    wealthboxOppCreatedAt: hydrated.oppCreatedAt,
    // Phone is the one client-data field we re-pull, since it changes more
    // often than name/email and isn't typically edited in Rift.
    ...(hydrated.contact ? { clientPhone: hydrated.contact.phone } : {}),
    ...next,
    ...(fullyResolved ? { needsReview: false, reviewReason: null } : {}),
  };

  if (oldStatus === newStatus) {
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: {
        ...refreshedFields,
        wealthboxLastSyncedAt: new Date(),
        wealthboxLastSyncError: null,
      },
    });
    return { ok: true, changed: false, oldStatus, newStatus, stageName: hydrated.stage ?? undefined };
  }

  await prisma.rolloverCase.update({
    where: { id: caseId },
    data: {
      ...refreshedFields,
      status: newStatus,
      statusUpdatedAt: new Date(),
      wealthboxLastSyncedAt: new Date(),
      wealthboxLastSyncError: null,
    },
  });
  await prisma.activityEvent.create({
    data: {
      caseId,
      actorUserId,
      eventType: "STATUS_CHANGED",
      eventDetails: `Status changed from ${oldStatus} to ${newStatus} (pulled from Wealthbox)`,
    },
  });

  return { ok: true, changed: true, oldStatus, newStatus, stageName: hydrated.stage ?? undefined };
}

/**
 * Page-load auto-sync: trigger a Wealthbox poll if (a) the firm has a CRM
 * connection, (b) the last sync was more than PAGE_LOAD_THROTTLE_MS ago, and
 * (c) the poll completes within PAGE_LOAD_TIMEOUT_MS. Designed to be awaited
 * from a server component so newly-created cases appear in the same render.
 *
 * Throttling matters: every refresh would otherwise hit the Wealthbox API.
 * The cron pings the same endpoint every minute, so the throttle just has to
 * cover bursts of manual refreshes — 10s is plenty.
 *
 * Timeout matters: a slow Wealthbox response would block the page from
 * rendering. We race against a hard deadline so the page always loads,
 * even if it means missing the latest sync result.
 *
 * Always non-throwing — failure is silent so it can never break a page load.
 */
const PAGE_LOAD_THROTTLE_MS = 10_000;
const PAGE_LOAD_TIMEOUT_MS = 2_500;

export async function maybePollOnPageLoad(firmId: string): Promise<void> {
  try {
    const connection = await prisma.crmConnection.findUnique({
      where: { firmId },
      select: { lastPolledAt: true },
    });
    if (!connection) return;

    // Throttle on lastPolledAt (written only by an inbound scan), NOT on
    // lastHealthCheckAt — the latter is bumped by outbound stage pushes too, so
    // keying off it would let a recent outbound sync suppress inbound polling.
    if (
      connection.lastPolledAt &&
      Date.now() - connection.lastPolledAt.getTime() < PAGE_LOAD_THROTTLE_MS
    ) {
      return;
    }

    await Promise.race([
      pollFirmForNewOpportunities(firmId).catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, PAGE_LOAD_TIMEOUT_MS)),
    ]);
  } catch {
    // Page load auto-sync is best-effort. Any failure (DB error, etc.) is
    // silently swallowed so the page always renders.
  }
}

export interface PollResult {
  firmId: string;
  scanned: number;
  created: number;
  skipped: number;
  /** Cases auto-closed because their linked opportunity reached the Won stage in the CRM. */
  closed: number;
  errors: Array<{ opportunityId: string; message: string }>;
}

/**
 * Inbound: scan a single firm's Wealthbox opportunities at the
 * Proposal-Accepted-mapped stage and create a Rift case for any opportunity
 * that doesn't already have one. Idempotent — re-running is safe.
 *
 * Cases created with missing custom fields are flagged needsReview=true so
 * the user can fill the gaps from the case detail page.
 *
 * Non-throwing per opportunity: per-opp errors are collected in `errors`
 * and don't abort the run.
 */
export async function pollFirmForNewOpportunities(firmId: string): Promise<PollResult> {
  const result: PollResult = { firmId, scanned: 0, created: 0, skipped: 0, closed: 0, errors: [] };

  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) return result;

  const [proposalMapping, wonMapping] = await Promise.all([
    prisma.crmStageMapping.findUnique({
      where: { firmId_riftStatus: { firmId, riftStatus: "PROPOSAL_ACCEPTED" } },
    }),
    prisma.crmStageMapping.findUnique({
      where: { firmId_riftStatus: { firmId, riftStatus: "WON" } },
    }),
  ]);
  if (!proposalMapping) return result;

  const client = getCrmClient(connection);

  /* Inbound trigger: scan the Proposal Accepted stage. */
  let summaries: Array<{ id: string; name: string; stage: string | null }>;
  try {
    summaries = await client.listOpportunitiesByStage(proposalMapping.crmStageId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.crmConnection.update({
      where: { firmId },
      data: { lastHealthCheckAt: new Date(), lastHealthOk: false, lastHealthError: message },
    });
    result.errors.push({ opportunityId: "*", message });
    return result;
  }

  result.scanned = summaries.length;

  if (summaries.length > 0) {
    // Skip opportunities already linked to a Rift case (idempotency).
    const existing = await prisma.rolloverCase.findMany({
      where: { firmId, wealthboxOpportunityId: { in: summaries.map((s) => s.id) } },
      select: { wealthboxOpportunityId: true },
    });
    const linked = new Set(existing.map((c) => c.wealthboxOpportunityId).filter(Boolean) as string[]);

    for (const summary of summaries) {
      if (linked.has(summary.id)) {
        result.skipped += 1;
        continue;
      }
      try {
        const hydrated = await client.getOpportunityHydrated(summary.id);
        const created = await createCaseFromOpportunity(firmId, hydrated);
        if (created) result.created += 1;
        else result.skipped += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ opportunityId: summary.id, message });
      }
    }
  }

  /* Reverse Won bookend: scan the Won stage and close any linked Rift case
   * that isn't already on WON. This mirrors the outbound push (WON → Wealthbox)
   * so the integration is bidirectional on both bookends. */
  if (wonMapping) {
    try {
      const wonOpps = await client.listOpportunitiesByStage(wonMapping.crmStageId);
      if (wonOpps.length > 0) {
        const linkedToWon = await prisma.rolloverCase.findMany({
          where: {
            firmId,
            wealthboxOpportunityId: { in: wonOpps.map((o) => o.id) },
            status: { not: "WON" },
          },
          select: { id: true, wealthboxOpportunityId: true, status: true },
        });
        for (const c of linkedToWon) {
          try {
            await prisma.rolloverCase.update({
              where: { id: c.id },
              data: {
                status: "WON",
                statusUpdatedAt: new Date(),
                wealthboxLastSyncedAt: new Date(),
                wealthboxLastSyncError: null,
              },
            });
            await prisma.activityEvent.create({
              data: {
                caseId: c.id,
                eventType: "STATUS_CHANGED",
                eventDetails: `Status changed from ${c.status} to WON (pulled from Wealthbox)`,
              },
            });
            result.closed += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            result.errors.push({ opportunityId: c.wealthboxOpportunityId ?? "*", message });
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Don't poison health on reverse-Won errors — the inbound side already
      // succeeded if we got here. Just record the issue.
      result.errors.push({ opportunityId: "won-stage", message });
    }
  }

  await prisma.crmConnection.update({
    where: { firmId },
    data: {
      lastPolledAt: new Date(),
      lastHealthCheckAt: new Date(),
      lastHealthOk: result.errors.length === 0,
      lastHealthError: result.errors.length === 0 ? null : result.errors[0].message,
    },
  });

  return result;
}

/** Insert a Rift case from a hydrated Wealthbox opportunity. */
async function createCaseFromOpportunity(
  firmId: string,
  opp: OpportunityHydrated,
): Promise<boolean> {
  const reasons: string[] = [];

  const fields = readCustomCaseFields(opp);
  const firstName = opp.contact?.firstName ?? null;
  const lastName = opp.contact?.lastName ?? null;
  const email = opp.contact?.email ?? null;

  if (!opp.contact) reasons.push("No linked contact on opportunity");
  if (!firstName) reasons.push("Contact missing first name");
  if (!lastName) reasons.push("Contact missing last name");
  if (!email) reasons.push("Contact missing email");
  if (!fields.sourceProvider) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.sourceProvider}"`);
  if (!fields.destinationCustodian) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.destinationCustodian}"`);
  if (!fields.accountType) {
    if (!fields.accountTypeRaw) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.accountType}"`);
    else reasons.push(`Account type "${fields.accountTypeRaw}" is not recognized`);
  }

  // Fast-path dedup: skip if a case already links this opportunity. This alone
  // is not atomic (check-then-insert), so the unique constraint on
  // (firmId, wealthboxOpportunityId) is the real guard against a concurrent
  // poll racing between this read and the create below — the P2002 catch turns
  // that race into a clean skip.
  const dup = await prisma.rolloverCase.findFirst({
    where: { firmId, wealthboxOpportunityId: opp.id },
    select: { id: true },
  });
  if (dup) return false;

  let newCase;
  try {
    newCase = await prisma.rolloverCase.create({
      data: {
        clientFirstName: firstName ?? "Unknown",
        clientLastName: lastName ?? "Unknown",
        clientEmail: email ?? "",
        clientPhone: opp.contact?.phone ?? null,
        sourceProvider: fields.sourceProvider ?? "",
        destinationCustodian: fields.destinationCustodian ?? "",
        accountType: fields.accountType ?? "OTHER",
        status: "PROPOSAL_ACCEPTED",
        firmId,
        wealthboxOpportunityId: opp.id,
        wealthboxOpportunityName: opp.name ?? null,
        wealthboxAmount: opp.amount,
        wealthboxAmountCurrency: opp.amountCurrency,
        wealthboxTargetClose: opp.targetClose,
        wealthboxProbability: opp.probability,
        wealthboxOppCreatedAt: opp.oppCreatedAt,
        wealthboxLinkedAt: new Date(),
        wealthboxLastSyncedAt: new Date(),
        needsReview: reasons.length > 0,
        reviewReason: reasons.length > 0 ? reasons.join("; ") : null,
      },
    });
  } catch (err) {
    // A concurrent poll inserted the same opportunity first — unique violation
    // on (firmId, wealthboxOpportunityId). Treat as skipped, not an error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }

  await prisma.activityEvent.create({
    data: {
      caseId: newCase.id,
      eventType: "CASE_CREATED",
      eventDetails: `Auto-created from Wealthbox opportunity "${opp.name}"`,
    },
  });

  return true;
}
