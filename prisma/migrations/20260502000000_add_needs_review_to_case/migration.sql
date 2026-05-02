-- Adds the review flag for cases auto-created from Wealthbox with missing
-- custom-field values. The user clears the flag once they've filled the gaps.

ALTER TABLE "RolloverCase"
  ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT;
