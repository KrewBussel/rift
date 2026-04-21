import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProviderClient } from "@/lib/crmClient";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await prisma.crmConnection.findUnique({
    where: { firmId: session.user.firmId },
  });
  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  try {
    const client = await getProviderClient(connection);
    const stages = await client.getStages();
    return NextResponse.json({ stages, provider: connection.provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch stages";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
