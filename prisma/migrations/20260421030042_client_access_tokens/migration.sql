-- CreateEnum
CREATE TYPE "ClientScope" AS ENUM ('VIEW', 'UPLOAD', 'FULL');

-- DropForeignKey
ALTER TABLE "ActivityEvent" DROP CONSTRAINT "ActivityEvent_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_authorUserId_fkey";

-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN     "clientSessionId" TEXT,
ALTER COLUMN "actorUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "fromClient" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "authorUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClientAccessToken" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "ClientScope" NOT NULL DEFAULT 'FULL',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "issuedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "ClientScope" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccessToken_tokenHash_key" ON "ClientAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientAccessToken_caseId_revokedAt_consumedAt_idx" ON "ClientAccessToken"("caseId", "revokedAt", "consumedAt");

-- CreateIndex
CREATE INDEX "ClientAccessToken_expiresAt_idx" ON "ClientAccessToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSession_tokenHash_key" ON "ClientSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientSession_caseId_revokedAt_idx" ON "ClientSession"("caseId", "revokedAt");

-- CreateIndex
CREATE INDEX "ClientSession_expiresAt_idx" ON "ClientSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_clientSessionId_fkey" FOREIGN KEY ("clientSessionId") REFERENCES "ClientSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessToken" ADD CONSTRAINT "ClientAccessToken_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RolloverCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessToken" ADD CONSTRAINT "ClientAccessToken_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessToken" ADD CONSTRAINT "ClientAccessToken_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ClientAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RolloverCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
