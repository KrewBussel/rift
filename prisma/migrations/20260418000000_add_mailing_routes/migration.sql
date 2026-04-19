-- Add operatingStates to FirmSettings
ALTER TABLE "FirmSettings" ADD COLUMN "operatingStates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Create CustodianMailingRoute table
CREATE TABLE "CustodianMailingRoute" (
    "id" TEXT NOT NULL,
    "custodianId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "states" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mailingAddress" TEXT,
    "overnightAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodianMailingRoute_pkey" PRIMARY KEY ("id")
);

-- Index for lookups by custodian
CREATE INDEX "CustodianMailingRoute_custodianId_idx" ON "CustodianMailingRoute"("custodianId");

-- Foreign key to Custodian
ALTER TABLE "CustodianMailingRoute" ADD CONSTRAINT "CustodianMailingRoute_custodianId_fkey"
    FOREIGN KEY ("custodianId") REFERENCES "Custodian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
