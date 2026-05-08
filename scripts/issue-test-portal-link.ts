import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";

loadEnv();

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  max: 1,
} as never);

const prisma = new PrismaClient({ adapter });

async function main() {
  const rolloverCase = await prisma.rolloverCase.findFirst({
    include: {
      firm: { select: { name: true, supportEmail: true, supportPhone: true } },
      checklistItems: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!rolloverCase) {
    console.log("No cases found in database. Create one first via the dashboard.");
    process.exit(1);
  }
  const issuer = await prisma.user.findFirst({
    where: { firmId: rolloverCase.firmId, role: { in: ["ADMIN", "OPS"] } },
  });
  if (!issuer) {
    console.log("No ADMIN/OPS user on this firm to attribute the link to.");
    process.exit(1);
  }

  // Ensure there's at least one REQUESTED checklist item to exercise upload flow.
  if (rolloverCase.checklistItems.length === 0) {
    await prisma.checklistItem.createMany({
      data: [
        { caseId: rolloverCase.id, name: "Distribution form", required: true, status: "REQUESTED", sortOrder: 0 },
        { caseId: rolloverCase.id, name: "ID verification", required: true, status: "REQUESTED", sortOrder: 1 },
        { caseId: rolloverCase.id, name: "Letter of authorization", required: false, status: "NOT_STARTED", sortOrder: 2 },
      ],
    });
  } else {
    // Set the first item to REQUESTED so it shows the upload affordance.
    await prisma.checklistItem.update({
      where: { id: rolloverCase.checklistItems[0].id },
      data: { status: "REQUESTED" },
    });
  }

  const plaintext = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Revoke any prior unused links for this case
  await prisma.clientAccessToken.updateMany({
    where: { caseId: rolloverCase.id, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { revokedAt: new Date() },
  });

  await prisma.clientAccessToken.create({
    data: {
      caseId: rolloverCase.id,
      firmId: rolloverCase.firmId,
      tokenHash,
      scope: "FULL",
      expiresAt,
      issuedByUserId: issuer.id,
    },
  });

  const url = `http://localhost:3000/client/enter?token=${plaintext}`;
  console.log("Case:", rolloverCase.clientFirstName, rolloverCase.clientLastName, "(" + rolloverCase.id + ")");
  console.log("Firm:", rolloverCase.firm.name);
  console.log("Status:", rolloverCase.status);
  console.log("");
  console.log("Portal URL:");
  console.log(url);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
