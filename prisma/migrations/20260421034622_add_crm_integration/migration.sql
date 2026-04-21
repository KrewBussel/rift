-- CreateEnum
CREATE TYPE "CrmProvider" AS ENUM ('WEALTHBOX');

-- AlterTable
ALTER TABLE "RolloverCase" ADD COLUMN     "wealthboxLastSyncError" TEXT,
ADD COLUMN     "wealthboxLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "wealthboxLinkedAt" TIMESTAMP(3),
ADD COLUMN     "wealthboxOpportunityId" TEXT;

-- CreateTable
CREATE TABLE "CrmConnection" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "provider" "CrmProvider" NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenTag" TEXT NOT NULL,
    "connectedUserId" TEXT,
    "connectedUserName" TEXT,
    "connectedUserEmail" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthOk" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStageMapping" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "riftStatus" "CaseStatus" NOT NULL,
    "crmStageId" TEXT NOT NULL,
    "crmStageName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmStageMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmConnection_firmId_key" ON "CrmConnection"("firmId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmStageMapping_firmId_riftStatus_key" ON "CrmStageMapping"("firmId", "riftStatus");

-- AddForeignKey
ALTER TABLE "CrmConnection" ADD CONSTRAINT "CrmConnection_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmStageMapping" ADD CONSTRAINT "CrmStageMapping_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
