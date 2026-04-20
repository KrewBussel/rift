import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { z } from "zod";

const CreateCustodianNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(40).nullish(),
  pinned: z.boolean().optional(),
}).strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(req, CreateCustodianNoteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const { id: custodianId } = await params;

  const custodian = await prisma.custodian.findUnique({
    where: { id: custodianId },
    select: { id: true },
  });
  if (!custodian) {
    return NextResponse.json({ error: "Custodian not found" }, { status: 404 });
  }

  const note = await prisma.custodianNote.create({
    data: {
      custodianId,
      firmId: session.user.firmId,
      authorId: session.user.id,
      title: body.title,
      body: body.body,
      category: body.category ?? null,
      pinned: body.pinned === true,
    },
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    id: note.id,
    title: note.title,
    body: note.body,
    category: note.category,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    author: {
      firstName: note.author.firstName,
      lastName: note.author.lastName,
    },
  });
}
