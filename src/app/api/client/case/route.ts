import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/client-auth";

/**
 * GET /api/client/case — summary of the case scoped to the current client session.
 * Returns a narrowed view: no internal notes, no assignee contact details beyond names.
 */
export async function GET() {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;
  const { session } = guard;

  const rolloverCase = await prisma.rolloverCase.findFirst({
    where: { id: session.caseId, firmId: session.firmId },
    select: {
      id: true,
      clientFirstName: true,
      clientLastName: true,
      sourceProvider: true,
      destinationCustodian: true,
      accountType: true,
      status: true,
      statusUpdatedAt: true,
      createdAt: true,
      firm: { select: { name: true, supportEmail: true, supportPhone: true } },
      assignedAdvisor: { select: { firstName: true, lastName: true } },
      assignedOps: { select: { firstName: true, lastName: true } },
    },
  });

  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(rolloverCase);
}
