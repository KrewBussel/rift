import { prisma } from "./prisma";
import { getProviderClient } from "./crmClient";
import type { CaseStatus } from "@prisma/client";

/**
 * Sync a case's current status to its linked CRM opportunity.
 * Non-throwing: any failure is captured on the case row and the connection;
 * never blocks the upstream status change.
 */
export async function syncOpportunityStage(caseId: string): Promise<
  | { ok: true; stageId: string; stageName: string }
  | { ok: false; reason: "no_connection" | "not_linked" | "no_mapping" | "api_error"; error?: string }
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
