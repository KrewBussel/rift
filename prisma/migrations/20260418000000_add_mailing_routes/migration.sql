-- Reconstructed from raw-SQL changes applied out-of-band.
-- Creates Custodian, CustodianNote, CustodianMailingRoute, and FirmSettings.operatingStates.

ALTER TABLE "FirmSettings"
  ADD COLUMN "operatingStates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "Custodian" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "phone" TEXT,
  "fax" TEXT,
  "email" TEXT,
  "website" TEXT,
  "mailingAddress" TEXT,
  "overnightAddress" TEXT,
  "wireInstructions" TEXT,
  "typicalProcessingDays" INTEGER,
  "minProcessingDays" INTEGER,
  "maxProcessingDays" INTEGER,
  "signatureRequirements" TEXT,
  "medallionRequired" BOOLEAN NOT NULL DEFAULT false,
  "medallionThreshold" INTEGER,
  "notarizationRequired" BOOLEAN NOT NULL DEFAULT false,
  "acceptsElectronic" BOOLEAN NOT NULL DEFAULT false,
  "acceptsDigitalSignature" BOOLEAN NOT NULL DEFAULT false,
  "supportsACATS" BOOLEAN NOT NULL DEFAULT true,
  "overview" TEXT,
  "quirks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "commonForms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Custodian_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Custodian_name_key" ON "Custodian"("name");
CREATE INDEX "Custodian_name_idx" ON "Custodian"("name");

CREATE TABLE "CustodianNote" (
  "id" TEXT NOT NULL,
  "custodianId" TEXT NOT NULL,
  "firmId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" TEXT,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustodianNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustodianNote_custodianId_firmId_idx" ON "CustodianNote"("custodianId", "firmId");
ALTER TABLE "CustodianNote" ADD CONSTRAINT "CustodianNote_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "Custodian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodianNote" ADD CONSTRAINT "CustodianNote_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodianNote" ADD CONSTRAINT "CustodianNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CustodianMailingRoute" (
  "id" TEXT NOT NULL,
  "custodianId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "states" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mailingAddress" TEXT,
  "overnightAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustodianMailingRoute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustodianMailingRoute_custodianId_idx" ON "CustodianMailingRoute"("custodianId");
ALTER TABLE "CustodianMailingRoute" ADD CONSTRAINT "CustodianMailingRoute_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "Custodian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
