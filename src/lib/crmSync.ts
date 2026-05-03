import { prisma } from "./prisma";
import { getProviderClient, type OpportunityHydrated } from "./crmClient";
import type { CaseStatus, AccountType } from "@prisma/client";

/**
 * Stages that have a CRM mapping. Intermediate Rift-only stages
 * (AWAITING_CLIENT_ACTION, READY_TO_SUBMIT, SUBMITTED, PROCESSING, IN_TRANSIT)
 * never push to or pull from the CRM. Keep this in sync with the API
 * validation in /api/integrations/crm/mapping.
 */
const MAPPABLE_STATUSES: ReadonlySet<CaseStatus> = new Set(["PROPOSAL_ACCEPTED", "WON"]);

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
  if (v.includes("traditional")) return "TRADITIONAL_IRA_401K";
  if (v.includes("roth")) return "ROTH_IRA_401K";
  if (v.includes("403")) return "IRA_403B";
  if (v === "other") return "OTHER";
  return null;
}

/**
 * Sync a case's current status to its linked CRM opportunity.
 * Non-throwing: any failure is captured on the case row and the connection;
 * never blocks the upstream status change.
 */
export async function syncOpportunityStage(caseId: string): Promise<
  | { ok: true; stageId: string; stageName: string }
  | { ok: false; reason: "no_connection" | "not_linked" | "no_mapping" | "api_error" | "rift_only_stage"; error?: string }
> {
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
  if (!MAPPABLE_STATUSES.has(rolloverCase.status)) {
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
    const client = await getProviderClient(connection);
    await client.updateOpportunityStage(rolloverCase.wealthboxOpportunityId, mapping.crmStageId, mapping.crmStageName);
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
    select: { id: true, firmId: true, status: true, wealthboxOpportunityId: true },
  });
  if (!rolloverCase) return { ok: false, reason: "not_linked" };
  if (!rolloverCase.wealthboxOpportunityId) return { ok: false, reason: "not_linked" };

  const connection = await prisma.crmConnection.findUnique({ where: { firmId: rolloverCase.firmId } });
  if (!connection) return { ok: false, reason: "no_connection" };

  let opp;
  try {
    const client = await getProviderClient(connection);
    opp = await client.getOpportunity(rolloverCase.wealthboxOpportunityId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncError: message },
    });
    return { ok: false, reason: "api_error", error: message };
  }

  if (!opp.stageId) return { ok: false, reason: "opp_no_stage" };

  const mapping = await prisma.crmStageMapping.findFirst({
    where: { firmId: rolloverCase.firmId, crmStageId: opp.stageId },
  });
  if (!mapping) return { ok: false, reason: "no_mapping" };

  const oldStatus = rolloverCase.status;
  const newStatus = mapping.riftStatus;

  if (oldStatus === newStatus) {
    await prisma.rolloverCase.update({
      where: { id: caseId },
      data: { wealthboxLastSyncedAt: new Date(), wealthboxLastSyncError: null },
    });
    return { ok: true, changed: false, oldStatus, newStatus, stageName: opp.stage ?? undefined };
  }

  await prisma.rolloverCase.update({
    where: { id: caseId },
    data: {
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
      eventDetails: `Status changed from ${oldStatus} to ${newStatus} (pulled from CRM)`,
    },
  });

  return { ok: true, changed: true, oldStatus, newStatus, stageName: opp.stage ?? undefined };
}

export type RiftStatus = CaseStatus;

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

  const client = await getProviderClient(connection);

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

  const sourceProviderRaw = opp.customFields[WEALTHBOX_CUSTOM_FIELDS.sourceProvider.toLowerCase()] ?? null;
  const destinationRaw = opp.customFields[WEALTHBOX_CUSTOM_FIELDS.destinationCustodian.toLowerCase()] ?? null;
  const accountTypeRaw = opp.customFields[WEALTHBOX_CUSTOM_FIELDS.accountType.toLowerCase()] ?? null;
  const accountType = mapAccountType(accountTypeRaw);

  const firstName = opp.contact?.firstName ?? null;
  const lastName = opp.contact?.lastName ?? null;
  const email = opp.contact?.email ?? null;

  if (!opp.contact) reasons.push("No linked contact on opportunity");
  if (!firstName) reasons.push("Contact missing first name");
  if (!lastName) reasons.push("Contact missing last name");
  if (!email) reasons.push("Contact missing email");
  if (!sourceProviderRaw) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.sourceProvider}"`);
  if (!destinationRaw) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.destinationCustodian}"`);
  if (!accountType) {
    if (!accountTypeRaw) reasons.push(`Missing custom field "${WEALTHBOX_CUSTOM_FIELDS.accountType}"`);
    else reasons.push(`Account type "${accountTypeRaw}" is not recognized`);
  }

  // Atomic guard against a parallel poll inserting the same opp.
  const dup = await prisma.rolloverCase.findFirst({
    where: { firmId, wealthboxOpportunityId: opp.id },
    select: { id: true },
  });
  if (dup) return false;

  const newCase = await prisma.rolloverCase.create({
    data: {
      clientFirstName: firstName ?? "Unknown",
      clientLastName: lastName ?? "Unknown",
      clientEmail: email ?? "",
      sourceProvider: sourceProviderRaw ?? "",
      destinationCustodian: destinationRaw ?? "",
      accountType: accountType ?? "OTHER",
      status: "PROPOSAL_ACCEPTED",
      firmId,
      wealthboxOpportunityId: opp.id,
      wealthboxLinkedAt: new Date(),
      wealthboxLastSyncedAt: new Date(),
      needsReview: reasons.length > 0,
      reviewReason: reasons.length > 0 ? reasons.join("; ") : null,
    },
  });

  await prisma.activityEvent.create({
    data: {
      caseId: newCase.id,
      eventType: "CASE_CREATED",
      eventDetails: `Auto-created from Wealthbox opportunity "${opp.name}"`,
    },
  });

  return true;
}
