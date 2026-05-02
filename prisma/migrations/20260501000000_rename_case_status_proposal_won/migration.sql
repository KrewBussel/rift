-- Rename CaseStatus enum values: INTAKE -> PROPOSAL_ACCEPTED, COMPLETED -> WON
-- The middle 5 values stay unchanged.

ALTER TYPE "CaseStatus" RENAME VALUE 'INTAKE' TO 'PROPOSAL_ACCEPTED';
ALTER TYPE "CaseStatus" RENAME VALUE 'COMPLETED' TO 'WON';

-- Update the default on RolloverCase.status to match the renamed initial value.
ALTER TABLE "RolloverCase" ALTER COLUMN "status" SET DEFAULT 'PROPOSAL_ACCEPTED';
