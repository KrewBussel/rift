-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- AlterTable: Firm
ALTER TABLE "Firm"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "taxId" TEXT,
  ADD COLUMN "businessAddress" TEXT,
  ADD COLUMN "supportEmail" TEXT,
  ADD COLUMN "supportPhone" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN "seatsLimit" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "billingEmail" TEXT,
  ADD COLUMN "renewalDate" TIMESTAMP(3),
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "aiMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 500000,
  ADD COLUMN "aiPlanName" TEXT NOT NULL DEFAULT 'Starter';

-- AlterTable: FirmSettings
ALTER TABLE "FirmSettings"
  ADD COLUMN "require2FA" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "passwordRequireSymbol" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "passwordRotationDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passwordReusePrevention" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ipAllowlist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "dataRetentionDays" INTEGER NOT NULL DEFAULT 2555,
  ADD COLUMN "complianceContactEmail" TEXT,
  ADD COLUMN "allowDataExport" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 365;

-- AlterTable: User
ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- CreateTable: ApiKey
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hashedKey" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");
CREATE INDEX "ApiKey_firmId_idx" ON "ApiKey"("firmId");
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_firmId_createdAt_idx" ON "AuditLog"("firmId", "createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AIUsageLog
CREATE TABLE "AIUsageLog" (
  "id" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
  "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIUsageLog_firmId_createdAt_idx" ON "AIUsageLog"("firmId", "createdAt");
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
