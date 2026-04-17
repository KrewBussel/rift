import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: custodianId } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

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
      title: body.title.slice(0, 200),
      body: body.body.slice(0, 4000),
      category: typeof body.category === "string" ? body.category.slice(0, 40) : null,
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
