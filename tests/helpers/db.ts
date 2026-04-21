// Reuse the app's Prisma client so tests hit the DB through the exact same
// adapter/pool configuration the routes use. Vitest loaded .env.test before
// this module was imported, so DATABASE_URL points at the test DB.
import { prisma } from "@/lib/prisma";

export { prisma };

/**
 * Wipe every tenant-scoped table. Runs CASCADE so FK order doesn't matter.
 * Call in `beforeEach` to guarantee isolation between tests.
 *
 * Tables intentionally excluded: `_prisma_migrations`.
 */
export async function truncateAll() {
  const tables = [
    "ActivityEvent",
    "Note",
    "Document",
    "ChecklistItem",
    "Task",
    "ClientSession",
    "ClientAccessToken",
    "CrmStageMapping",
    "CrmConnection",
    "RolloverCase",
    "ReminderLog",
    "AuditLog",
    "AIUsageLog",
    "PasswordResetToken",
    "CustodianNote",
    "CustodianMailingRoute",
    "Custodian",
    "FirmSettings",
    "User",
    "Firm",
  ];
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`,
  );
}
