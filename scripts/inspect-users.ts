import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, role: true, firmId: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("USERS:");
  console.log(JSON.stringify(users, null, 2));

  const caseCount = await prisma.rolloverCase.count();
  console.log("Total cases:", caseCount);

  const firms = await prisma.firm.findMany({ select: { id: true, name: true } });
  console.log("FIRMS:", JSON.stringify(firms, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
