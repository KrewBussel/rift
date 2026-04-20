import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export interface AuditInput {
  firmId: string;
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        firmId: input.firmId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}

export function extractRequestMeta(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const headers = req.headers;
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null;
  const userAgent = headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}
