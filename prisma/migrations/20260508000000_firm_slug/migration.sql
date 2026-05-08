-- Add Firm.slug for tenant subdomain routing (<slug>.riftira.com).
--
-- Strategy: add nullable, backfill by slugifying Firm.name with row-number
-- de-duplication, then enforce NOT NULL + UNIQUE. Reserved-slug filtering
-- (www, api, admin, etc.) happens at the validation layer for new edits;
-- the backfill is best-effort and admins can change their slug in Settings.

ALTER TABLE "Firm" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    -- Slugify: lowercase, non-alphanumeric → '-', collapse runs, trim '-'
    NULLIF(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          REGEXP_REPLACE(LOWER(COALESCE(name, '')), '[^a-z0-9]+', '-', 'g'),
          '-+', '-', 'g'
        )
      ),
      ''
    ) AS base_slug
  FROM "Firm"
),
candidate AS (
  SELECT
    id,
    -- Enforce min length 3; fall back to "firm-<8 of id>" for empty/too-short
    CASE
      WHEN base_slug IS NULL OR LENGTH(base_slug) < 3
        THEN 'firm-' || SUBSTRING(id FROM 1 FOR 8)
      ELSE SUBSTRING(base_slug FROM 1 FOR 63)
    END AS slug_candidate
  FROM base
),
numbered AS (
  SELECT
    id,
    slug_candidate,
    ROW_NUMBER() OVER (PARTITION BY slug_candidate ORDER BY id) AS rn
  FROM candidate
)
UPDATE "Firm" f
SET slug = CASE
  WHEN n.rn = 1 THEN n.slug_candidate
  ELSE SUBSTRING(n.slug_candidate FROM 1 FOR 60) || '-' || n.rn::text
END
FROM numbered n
WHERE n.id = f.id;

ALTER TABLE "Firm" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");
