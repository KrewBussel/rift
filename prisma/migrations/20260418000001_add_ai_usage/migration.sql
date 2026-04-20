-- Reconstructed from raw-SQL changes applied out-of-band.
-- Creates AiUsage table and FirmSettings.aiMonthlyLimit.

ALTER TABLE "FirmSettings"
  ADD COLUMN "aiMonthlyLimit" INTEGER NOT NULL DEFAULT 500;

CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "cacheHitTokens" INTEGER NOT NULL DEFAULT 0,
  "turnCount" INTEGER NOT NULL DEFAULT 1,
  "toolCallCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsage_firmId_createdAt_idx" ON "AiUsage"("firmId", "createdAt");
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
