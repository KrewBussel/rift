import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProviderClient } from "@/lib/crmClient";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await prisma.crmConnection.findUnique({
    where: { firmId: session.user.firmId },
  });
  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() || undefined;

  try {
    const client = await getProviderClient(connection);
    const opportunities = await client.searchOpportunities(query);
    return NextResponse.json({ opportunities, provider: connection.provider });
  } catch {
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 502 });
  }
}
