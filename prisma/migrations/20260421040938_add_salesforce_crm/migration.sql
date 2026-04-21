-- AlterEnum
ALTER TYPE "CrmProvider" ADD VALUE 'SALESFORCE';

-- AlterTable
ALTER TABLE "CrmConnection" ADD COLUMN     "instanceUrl" TEXT,
ADD COLUMN     "refreshTokenCiphertext" TEXT,
ADD COLUMN     "refreshTokenIv" TEXT,
ADD COLUMN     "refreshTokenTag" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
