-- Dedicated inbound-poll timestamp so the page-load auto-sync throttle no longer
-- keys off lastHealthCheckAt (which outbound stage pushes also bump).
-- AlterTable
ALTER TABLE "CrmConnection" ADD COLUMN     "lastPolledAt" TIMESTAMP(3);

-- Reverse lookup used by refreshCaseFromCrm: firmId + crmStageId -> riftStatus.
-- CreateIndex
CREATE INDEX "CrmStageMapping_firmId_crmStageId_idx" ON "CrmStageMapping"("firmId", "crmStageId");

-- Firm-scoped, status-filtered case scans (dashboard, cases list).
-- CreateIndex
CREATE INDEX "RolloverCase_firmId_status_idx" ON "RolloverCase"("firmId", "status");

-- One Rift case per Wealthbox opportunity per firm. NULLs are distinct in
-- Postgres, so unlinked/manual cases are unaffected. Backs the inbound poller's
-- idempotency under concurrent triggers, and its index serves every firmId-
-- prefixed scan + the poll dedup.
-- CreateIndex
CREATE UNIQUE INDEX "RolloverCase_firmId_wealthboxOpportunityId_key" ON "RolloverCase"("firmId", "wealthboxOpportunityId");
