-- Drop the ApiKey table (backend-only feature deferred, UI removed).
DROP TABLE IF EXISTS "ApiKey";

-- Drop the duplicate AiUsage table; AIUsageLog is the canonical log.
DROP TABLE IF EXISTS "AiUsage";

-- Remove FirmSettings columns that are now enforced platform-wide or unused.
ALTER TABLE "FirmSettings"
  DROP COLUMN IF EXISTS "aiMonthlyLimit",
  DROP COLUMN IF EXISTS "sessionTimeoutMinutes",
  DROP COLUMN IF EXISTS "passwordMinLength",
  DROP COLUMN IF EXISTS "passwordRequireSymbol",
  DROP COLUMN IF EXISTS "passwordRequireNumber",
  DROP COLUMN IF EXISTS "passwordRotationDays",
  DROP COLUMN IF EXISTS "passwordReusePrevention",
  DROP COLUMN IF EXISTS "ipAllowlist",
  DROP COLUMN IF EXISTS "dataRetentionDays",
  DROP COLUMN IF EXISTS "auditLogRetentionDays";
