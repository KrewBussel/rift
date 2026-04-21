import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/client-auth";

/**
 * GET /api/client/documents — documents on the case. Client sees name, size,
 * type, when they were added, and which checklist item they satisfy.
 */
export async function GET() {
  const guard = await requireClientSession();
  if (!guard.ok) return guard.res;

  const docs = await prisma.document.findMany({
    where: { caseId: guard.session.caseId, case: { firmId: guard.session.firmId } },
    select: {
      id: true,
      name: true,
      fileType: true,
      fileSize: true,
      createdAt: true,
      checklistItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(docs);
}
