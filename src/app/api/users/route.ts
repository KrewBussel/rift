import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const firmId = session.user.firmId;

  const users = await prisma.user.findMany({
    where: { firmId },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(users);
}
