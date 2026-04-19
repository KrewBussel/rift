import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: custodianId } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const custodian = await prisma.custodian.findUnique({ where: { id: custodianId }, select: { id: true } });
  if (!custodian) return NextResponse.json({ error: "Custodian not found" }, { status: 404 });

  const route = await prisma.custodianMailingRoute.create({
    data: {
      custodianId,
      label: body.label.trim().slice(0, 200),
      states: Array.isArray(body.states) ? body.states.map((s: unknown) => String(s).toUpperCase()) : [],
      mailingAddress: typeof body.mailingAddress === "string" ? body.mailingAddress.trim() || null : null,
      overnightAddress: typeof body.overnightAddress === "string" ? body.overnightAddress.trim() || null : null,
    },
  });

  return NextResponse.json({
    id: route.id,
    label: route.label,
    states: route.states,
    mailingAddress: route.mailingAddress,
    overnightAddress: route.overnightAddress,
  });
}
