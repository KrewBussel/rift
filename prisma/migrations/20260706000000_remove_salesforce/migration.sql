-- Salesforce support removed: Wealthbox is the only CRM provider.

-- Any SALESFORCE connection would block the enum swap below. None should
-- exist (the UI never offered Salesforce), but guard anyway.
DELETE FROM "CrmConnection" WHERE "provider" = 'SALESFORCE';

-- Drop the Salesforce-only OAuth columns.
ALTER TABLE "CrmConnection"
  DROP COLUMN "instanceUrl",
  DROP COLUMN "refreshTokenCiphertext",
  DROP COLUMN "refreshTokenIv",
  DROP COLUMN "refreshTokenTag",
  DROP COLUMN "tokenExpiresAt";

-- Remove SALESFORCE from the CrmProvider enum (Postgres can't drop an enum
-- value in place — swap the type).
CREATE TYPE "CrmProvider_new" AS ENUM ('WEALTHBOX');
ALTER TABLE "CrmConnection"
  ALTER COLUMN "provider" TYPE "CrmProvider_new" USING ("provider"::text::"CrmProvider_new");
DROP TYPE "CrmProvider";
ALTER TYPE "CrmProvider_new" RENAME TO "CrmProvider";
