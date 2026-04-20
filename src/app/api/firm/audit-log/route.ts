import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseQuery } from "@/lib/validation";
import { z } from "zod";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseQuery(req, QuerySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { limit, cursor } = parsed.data;

  const logs = await prisma.auditLog.findMany({
    where: { firmId: session.user.firmId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      resource: true,
      resourceId: true,
      metadata: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
