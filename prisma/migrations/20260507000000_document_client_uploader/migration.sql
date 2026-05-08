-- Document.uploadedById becomes nullable; new uploadedByClientSessionId for client-portal uploads.
-- The API enforces XOR (exactly one is set). Existing rows already have uploadedById set,
-- so the existing data is untouched.

ALTER TABLE "Document" ALTER COLUMN "uploadedById" DROP NOT NULL;

ALTER TABLE "Document" ADD COLUMN "uploadedByClientSessionId" TEXT;

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_uploadedByClientSessionId_fkey"
  FOREIGN KEY ("uploadedByClientSessionId")
  REFERENCES "ClientSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop and re-add the existing FK with ON DELETE SET NULL to match the new nullable column.
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_uploadedById_fkey";
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_uploadedById_fkey"
  FOREIGN KEY ("uploadedById")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
