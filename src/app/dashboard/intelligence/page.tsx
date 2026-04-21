import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import IntelligenceWorkspace from "@/components/IntelligenceWorkspace";
import type { CustodianActivity } from "@/components/CustodianActivityTab";

export default async function IntelligencePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const firmId = session.user.firmId;

  const [custodians, firmSettings, firmCases] = await Promise.all([
    prisma.custodian.findMany({
      orderBy: { name: "asc" },
      include: {
        mailingRoutes: { orderBy: { label: "asc" } },
        notes: {
          where: { firmId },
          orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
          include: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    getOrCreateFirmSettings(firmId),
    prisma.rolloverCase.findMany({
      where: { firmId },
      select: {
        id: true,
        clientFirstName: true,
        clientLastName: true,
        status: true,
        sourceProvider: true,
        destinationCustodian: true,
        createdAt: true,
        updatedAt: true,
        statusUpdatedAt: true,
        assignedAdvisor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // Build per-custodian activity stats from firm case data. Matching is by
  // custodian.name against `destinationCustodian` (inbound) and `sourceProvider`
  // (outbound). Names are compared case-insensitively since free-text entries vary.
  const norm = (s: string) => s.trim().toLowerCase();
  const activityByCustodian: Record<string, CustodianActivity> = {};
  for (const custodian of custodians) {
    const key = norm(custodian.name);
    const aliases = new Set<string>([key, ...(custodian.aliases ?? []).map(norm)]);

    const asDest = firmCases.filter((c) => aliases.has(norm(c.destinationCustodian)));
    const asSource = firmCases.filter((c) => aliases.has(norm(c.sourceProvider)));
    const completed = asDest.filter((c) => c.status === "COMPLETED");

    let avgDays: number | null = null;
    let medianDays: number | null = null;
    if (completed.length > 0) {
      const times = completed.map(
        (c) => (c.statusUpdatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      avgDays = times.reduce((a, b) => a + b, 0) / times.length;
      const sorted = [...times].sort((a, b) => a - b);
      medianDays = sorted[Math.floor(sorted.length / 2)];
    }

    const recentCases = [
      ...asDest.map((c) => ({ c, direction: "to" as const })),
      ...asSource.map((c) => ({ c, direction: "from" as const })),
    ]
      .sort((a, b) => b.c.updatedAt.getTime() - a.c.updatedAt.getTime())
      .slice(0, 10)
      .map(({ c, direction }) => ({
        id: c.id,
        clientFirstName: c.clientFirstName,
        clientLastName: c.clientLastName,
        status: c.status,
        direction,
        updatedAt: c.updatedAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
        advisor: c.assignedAdvisor
          ? `${c.assignedAdvisor.firstName} ${c.assignedAdvisor.lastName}`
          : null,
      }));

    activityByCustodian[custodian.id] = {
      destinationCount: asDest.length,
      sourceCount: asSource.length,
      completedCount: completed.length,
      avgDaysToComplete: avgDays,
      medianDaysToComplete: medianDays,
      recentCases,
    };
  }

  const serialized = custodians.map((c) => ({
    id: c.id,
    name: c.name,
    legalName: c.legalName,
    aliases: c.aliases,
    phone: c.phone,
    fax: c.fax,
    email: c.email,
    website: c.website,
    mailingAddress: c.mailingAddress,
    overnightAddress: c.overnightAddress,
    wireInstructions: c.wireInstructions,
    typicalProcessingDays: c.typicalProcessingDays,
    minProcessingDays: c.minProcessingDays,
    maxProcessingDays: c.maxProcessingDays,
    signatureRequirements: c.signatureRequirements,
    medallionRequired: c.medallionRequired,
    medallionThreshold: c.medallionThreshold,
    notarizationRequired: c.notarizationRequired,
    acceptsElectronic: c.acceptsElectronic,
    acceptsDigitalSignature: c.acceptsDigitalSignature,
    supportsACATS: c.supportsACATS,
    overview: c.overview,
    quirks: c.quirks,
    commonForms: c.commonForms,
    tags: c.tags,
    lastVerifiedAt: c.lastVerifiedAt?.toISOString() ?? null,
    mailingRoutes: c.mailingRoutes.map((r) => ({
      id: r.id,
      label: r.label,
      states: r.states,
      mailingAddress: r.mailingAddress,
      overnightAddress: r.overnightAddress,
    })),
    notes: c.notes.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      pinned: n.pinned,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      author: {
        firstName: n.author.firstName,
        lastName: n.author.lastName,
      },
    })),
  }));

  // Per-user search history from preferences.intelligenceSearches
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs: Record<string, unknown> =
    userRecord?.preferences !== null && typeof userRecord?.preferences === "object" && !Array.isArray(userRecord?.preferences)
      ? (userRecord.preferences as Record<string, unknown>)
      : {};
  const historyRaw = Array.isArray(prefs.intelligenceSearches) ? prefs.intelligenceSearches : [];
  const initialHistory: Array<{ query: string; ts: string }> = historyRaw
    .filter((h): h is { query: string; ts: string } =>
      typeof h === "object" && h !== null && typeof (h as { query?: unknown }).query === "string" && typeof (h as { ts?: unknown }).ts === "string"
    )
    .slice(0, 20);

  const pinnedRaw = Array.isArray(prefs.pinnedCustodians) ? prefs.pinnedCustodians : [];
  const initialPinnedIds: string[] = pinnedRaw
    .filter((p): p is string => typeof p === "string")
    .slice(0, 3);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="mb-5 flex-shrink-0">
        <h1
          className="text-2xl font-semibold tracking-tight mb-1"
          style={{ color: "#e4e6ea" }}
        >
          Custodian Intelligence
        </h1>
        <p className="text-sm" style={{ color: "#7d8590" }}>
          Ask anything about a custodian, or browse the full directory. Firm-specific notes are tracked alongside industry facts.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <IntelligenceWorkspace
          custodians={serialized}
          firmOperatingStates={firmSettings.operatingStates}
          activityByCustodian={activityByCustodian}
          initialHistory={initialHistory}
          initialPinnedIds={initialPinnedIds}
        />
      </div>
    </div>
  );
}
