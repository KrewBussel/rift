import { prisma } from "../src/lib/prisma";

const KEEP_EMAILS = ["krewb003@gmail.com", "kbussel821@gmail.com"];

async function main() {
  const keepUsers = await prisma.user.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: { id: true, email: true },
  });
  const keepIds = keepUsers.map((u) => u.id);
  console.log("Keeping:", keepUsers);

  const toDelete = await prisma.user.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true, email: true },
  });
  console.log(`Deleting ${toDelete.length} users:`, toDelete.map((u) => u.email));

  const caseCount = await prisma.rolloverCase.count();
  console.log(`Deleting ${caseCount} cases`);

  // 1. Delete all rollover cases (cascades to Tasks, Notes, ChecklistItems,
  //    Documents, ActivityEvents, ClientAccessToken, ClientSession).
  const casesDeleted = await prisma.rolloverCase.deleteMany({});
  console.log("Cases deleted:", casesDeleted.count);

  // 2. Clean up user-owned records that don't cascade.
  const custodianNotesDeleted = await prisma.custodianNote.deleteMany({
    where: { authorId: { in: toDelete.map((u) => u.id) } },
  });
  console.log("CustodianNotes deleted:", custodianNotesDeleted.count);

  const aiLogsDeleted = await prisma.aIUsageLog.deleteMany({
    where: { userId: { in: toDelete.map((u) => u.id) } },
  });
  console.log("AIUsageLogs deleted:", aiLogsDeleted.count);

  // 3. Null out audit log actor references to non-admins (preserve audit history).
  const auditNulled = await prisma.auditLog.updateMany({
    where: { actorUserId: { in: toDelete.map((u) => u.id) } },
    data: { actorUserId: null },
  });
  console.log("AuditLog actorUserId nulled:", auditNulled.count);

  // 4. Delete non-admin users (PasswordResetToken cascades).
  const usersDeleted = await prisma.user.deleteMany({
    where: { id: { in: toDelete.map((u) => u.id) } },
  });
  console.log("Users deleted:", usersDeleted.count);

  const remaining = await prisma.user.findMany({
    select: { firstName: true, lastName: true, email: true, role: true },
  });
  console.log("Remaining users:", remaining);
  console.log("Remaining cases:", await prisma.rolloverCase.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
