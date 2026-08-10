import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCrmClient } from "@/lib/crmClient";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await prisma.crmConnection.findUnique({
    where: { firmId: session.user.firmId },
  });
  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  try {
    const client = getCrmClient(connection);
    const stages = await client.getStages();

    // Derive the pipeline list from the stages rather than making a second API
    // call. A pipeline with no stages can't hold a bookend mapping anyway, so
    // its absence here costs nothing.
    const pipelines: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();
    for (const s of stages) {
      if (!s.pipelineId || seen.has(s.pipelineId)) continue;
      seen.add(s.pipelineId);
      pipelines.push({ id: s.pipelineId, name: s.pipelineName ?? "Unnamed pipeline" });
    }

    return NextResponse.json({
      stages,
      pipelines,
      selectedPipelineId: connection.pipelineId,
      requireRolloverFields: connection.requireRolloverFields,
      provider: connection.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch stages";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
