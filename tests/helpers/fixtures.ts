import { prisma } from "./db";
import type { Role } from "@prisma/client";

export type SeededUser = {
  id: string;
  firmId: string;
  email: string;
  role: Role;
};

export type SeededFirm = {
  firmId: string;
  admin: SeededUser;
  ops: SeededUser;
  advisor: SeededUser;
  caseId: string;
  taskId: string;
  noteId: string;
  checklistItemId: string;
  documentId: string;
  custodianNoteId: string;
};

export type SeededWorld = {
  a: SeededFirm;
  b: SeededFirm;
  custodianId: string;
};

/**
 * Seeds two fully-populated firms plus one shared custodian. Every cross-firm
 * isolation test uses this as its starting state: take a user from firm A, try
 * to touch a resource from firm B, assert the API refuses.
 */
export async function seedTwoFirms(): Promise<SeededWorld> {
  const custodian = await prisma.custodian.create({
    data: { name: "Schwab", aliases: ["Charles Schwab"] },
  });

  return {
    a: await seedFirm("A", custodian.id),
    b: await seedFirm("B", custodian.id),
    custodianId: custodian.id,
  };
}

async function seedFirm(label: string, custodianId: string): Promise<SeededFirm> {
  const firm = await prisma.firm.create({
    data: { name: `Firm ${label}`, settings: { create: {} } },
  });

  const [admin, ops, advisor] = await Promise.all([
    mkUser(firm.id, label, "ADMIN"),
    mkUser(firm.id, label, "OPS"),
    mkUser(firm.id, label, "ADVISOR"),
  ]);

  const rollover = await prisma.rolloverCase.create({
    data: {
      firmId: firm.id,
      clientFirstName: `Client${label}`,
      clientLastName: "Test",
      clientEmail: `client.${label.toLowerCase()}@test.local`,
      sourceProvider: "Fidelity",
      destinationCustodian: "Schwab",
      accountType: "TRADITIONAL_IRA_401K",
      assignedAdvisorId: advisor.id,
      assignedOpsId: ops.id,
    },
  });

  const [task, note, checklistItem, document, custodianNote] = await Promise.all([
    prisma.task.create({
      data: {
        caseId: rollover.id,
        title: `Task ${label}`,
        createdById: ops.id,
        assigneeId: ops.id,
      },
    }),
    prisma.note.create({
      data: { caseId: rollover.id, authorUserId: ops.id, body: `Note from ${label}` },
    }),
    prisma.checklistItem.create({
      data: { caseId: rollover.id, name: "Distribution form" },
    }),
    prisma.document.create({
      data: {
        caseId: rollover.id,
        name: `doc-${label}.pdf`,
        storagePath: `${firm.id}/${rollover.id}/doc-${label}.pdf`,
        fileType: "application/pdf",
        fileSize: 1024,
        uploadedById: ops.id,
      },
    }),
    prisma.custodianNote.create({
      data: {
        custodianId,
        firmId: firm.id,
        authorId: ops.id,
        title: `Note ${label}`,
        body: `Custodian note from firm ${label}`,
      },
    }),
  ]);

  return {
    firmId: firm.id,
    admin,
    ops,
    advisor,
    caseId: rollover.id,
    taskId: task.id,
    noteId: note.id,
    checklistItemId: checklistItem.id,
    documentId: document.id,
    custodianNoteId: custodianNote.id,
  };
}

async function mkUser(firmId: string, firmLabel: string, role: Role): Promise<SeededUser> {
  const user = await prisma.user.create({
    data: {
      firmId,
      firstName: role,
      lastName: `Firm${firmLabel}`,
      // Unique email per (firm, role). bcrypt hash is not validated by our
      // tests (we mock auth()), so a placeholder string is fine.
      email: `${role.toLowerCase()}.${firmLabel.toLowerCase()}@test.local`,
      password: "unused-bcrypt-placeholder",
      role,
    },
  });
  return { id: user.id, firmId: user.firmId, email: user.email, role: user.role };
}
