-- Add onboarding flag on Firm
ALTER TABLE "Firm" ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- Existing firms are considered already onboarded so nothing breaks for them.
-- New firms (post-deploy) get NULL and will hit the wizard.
UPDATE "Firm" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;

-- Per-firm stage configuration overlay
CREATE TABLE "CaseStageConfig" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "status" "CaseStatus" NOT NULL,
  "customLabel" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CaseStageConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseStageConfig_firmId_status_key" ON "CaseStageConfig"("firmId", "status");
CREATE INDEX "CaseStageConfig_firmId_sortOrder_idx" ON "CaseStageConfig"("firmId", "sortOrder");

ALTER TABLE "CaseStageConfig"
  ADD CONSTRAINT "CaseStageConfig_firmId_fkey"
  FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill default rows for every existing firm so case views keep rendering.
-- The 7 canonical stages in their canonical order; bookends always enabled.
INSERT INTO "CaseStageConfig" ("id", "firmId", "status", "customLabel", "isEnabled", "sortOrder", "updatedAt")
SELECT
  'csc_' || f.id || '_' || s.status,
  f.id,
  s.status::"CaseStatus",
  NULL,
  true,
  s.sort_order,
  NOW()
FROM "Firm" f
CROSS JOIN (VALUES
  ('PROPOSAL_ACCEPTED', 0),
  ('AWAITING_CLIENT_ACTION', 1),
  ('READY_TO_SUBMIT', 2),
  ('SUBMITTED', 3),
  ('PROCESSING', 4),
  ('IN_TRANSIT', 5),
  ('WON', 6)
) AS s(status, sort_order);
