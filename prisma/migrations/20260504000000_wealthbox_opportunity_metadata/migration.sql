-- Wealthbox-shadowed opportunity metadata + client phone on RolloverCase
ALTER TABLE "RolloverCase"
  ADD COLUMN "clientPhone"             TEXT,
  ADD COLUMN "wealthboxOpportunityName" TEXT,
  ADD COLUMN "wealthboxAmount"         DOUBLE PRECISION,
  ADD COLUMN "wealthboxAmountCurrency" TEXT,
  ADD COLUMN "wealthboxTargetClose"    TIMESTAMP(3),
  ADD COLUMN "wealthboxProbability"    INTEGER,
  ADD COLUMN "wealthboxOppCreatedAt"   TIMESTAMP(3);
