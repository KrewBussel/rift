import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateFirmSettings } from "@/lib/reminders";
import IntelligenceWorkspace from "@/components/IntelligenceWorkspace";

export default async function IntelligencePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const firmId = session.user.firmId;

  const [custodians, firmSettings] = await Promise.all([
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
  ]);

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

  return (
    <>
      <div className="mb-6">
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
      <IntelligenceWorkspace
        custodians={serialized}
        firmOperatingStates={firmSettings.operatingStates}
      />
    </>
  );
}
