import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshCaseFromCrm } from "@/lib/crmSync";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Pull the current stage from the linked CRM opportunity and, if the firm's
 * stage mapping maps it to a Rift status, apply that status to the case.
 * ADMIN/OPS only. The "reverse" leg of the sync; the Rift→CRM leg fires
 * automatically on status change via PATCH /api/cases/[id].
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: caseId } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id: caseId, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await refreshCaseFromCrm(caseId, session.user.id);

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: session.user.id,
    action: "crm.case.refreshed",
    resource: "RolloverCase",
    resourceId: caseId,
    metadata: result as never,
    ...meta,
  });

  return NextResponse.json(result);
}
