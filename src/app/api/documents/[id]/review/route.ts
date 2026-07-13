import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { caseVisibilityFilter } from "@/lib/caseVisibility";
import { reviewDocument } from "@/lib/documentReview";

/**
 * POST — run (or re-run) the paperwork QA scan on a document. ADMIN/OPS only.
 * Synchronous: waits for the scan so the UI can refresh with the result.
 * Uploads trigger scans automatically; this is the manual retry/first-run
 * button in the case checklist.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OPS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const firmId = session.user.firmId;

  const doc = await prisma.document.findFirst({
    where: { id, case: { firmId, ...caseVisibilityFilter(session.user.role, session.user.id) } },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await reviewDocument(id);
  if (!result.ok && result.reason === "unsupported_type") {
    return NextResponse.json({ error: "This file type can't be scanned" }, { status: 400 });
  }

  const review = await prisma.documentReview.findUnique({ where: { documentId: id } });
  return NextResponse.json({ result, review });
}
