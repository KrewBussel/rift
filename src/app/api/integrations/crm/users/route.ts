import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProviderClient } from "@/lib/crmClient";

/**
 * List the users on the firm's connected CRM account, annotated with whether
 * each is already a Rift user. The onboarding wizard / team settings panel
 * use this to render a checklist where the admin assigns Rift roles.
 *
 * The CRM is NEVER the source of truth for Rift access — auto-importing
 * everyone would blow past Firm.seatsLimit, and the CRM doesn't know about
 * the ADVISOR/OPS distinction. So we just surface the candidates; the admin
 * decides who gets a seat and what role.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const firmId = session.user.firmId;
  const connection = await prisma.crmConnection.findUnique({ where: { firmId } });
  if (!connection) {
    return NextResponse.json({ error: "No CRM connection" }, { status: 400 });
  }

  let crmUsers;
  try {
    const client = await getProviderClient(connection);
    crmUsers = await client.getOrgUsers();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Annotate with Rift state so the UI can disable / pre-fill rows.
  const emails = crmUsers.map((u) => u.email).filter(Boolean);
  const existing = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { email: true, firmId: true, role: true, deactivatedAt: true },
      })
    : [];
  const existingByEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

  const annotated = crmUsers.map((u) => {
    const ex = existingByEmail.get(u.email.toLowerCase());
    return {
      ...u,
      // Rift status of this email:
      //  - "in_firm": already a user on this firm (skip / show as imported)
      //  - "other_firm": user exists on a different firm — cannot invite
      //  - "available": not in Rift yet, eligible for invite
      riftStatus: !ex
        ? ("available" as const)
        : ex.firmId === firmId
        ? ("in_firm" as const)
        : ("other_firm" as const),
      existingRole: ex?.firmId === firmId ? ex.role : null,
    };
  });

  return NextResponse.json({ users: annotated });
}
