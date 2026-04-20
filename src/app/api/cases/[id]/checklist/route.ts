import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const CreateChecklistItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  required: z.boolean().optional(),
}).strict();

const DEFAULT_CHECKLIST = [
  { name: "Distribution form",                  required: true,  sortOrder: 0 },
  { name: "Letter of authorization",            required: true,  sortOrder: 1 },
  { name: "ID verification",                    required: true,  sortOrder: 2 },
  { name: "Provider-specific form",             required: true,  sortOrder: 3 },
  { name: "Notarization / medallion signature", required: false, sortOrder: 4 },
  { name: "Internal review complete",           required: true,  sortOrder: 5 },
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let items = await prisma.checklistItem.findMany({
    where: { caseId: id },
    include: {
      documents: {
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Auto-seed default checklist on first access
  if (items.length === 0) {
    await prisma.checklistItem.createMany({
      data: DEFAULT_CHECKLIST.map((item) => ({ ...item, caseId: id })),
    });
    items = await prisma.checklistItem.findMany({
      where: { caseId: id },
      include: {
        documents: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  return NextResponse.json(items);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, CreateChecklistItemSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const { id } = await params;
  const firmId = session.user.firmId;

  const rolloverCase = await prisma.rolloverCase.findFirst({ where: { id, firmId } });
  if (!rolloverCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lastItem = await prisma.checklistItem.findFirst({
    where: { caseId: id },
    orderBy: { sortOrder: "desc" },
  });

  const item = await prisma.checklistItem.create({
    data: {
      caseId: id,
      name: body.name,
      required: body.required ?? true,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
    include: { documents: true },
  });

  return NextResponse.json(item, { status: 201 });
}
