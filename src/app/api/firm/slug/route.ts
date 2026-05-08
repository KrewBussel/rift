import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/validation";
import { recordAudit, extractRequestMeta } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/ratelimit";
import { validateSlug } from "@/lib/firmDomain";

/**
 * Per-firm subdomain slug management.
 *
 *   GET  /api/firm/slug                  → current slug
 *   GET  /api/firm/slug?check=<value>    → availability check (unauthenticated-safe shape, but auth required)
 *   PUT  /api/firm/slug { slug }         → claim/rename (ADMIN only)
 *
 * The slug becomes the firm's subdomain (`<slug>.riftira.com`). Renaming
 * affects the URL of every page in the app and invalidates already-issued
 * client-portal magic links bound to the previous slug, so the API restricts
 * the operation to ADMIN and emits an audit log.
 *
 * The session JWT carries `firmSlug`; renaming doesn't refresh existing
 * tokens. The admin doing the rename will keep working (the proxy uses
 * `firmId` for the mismatch check, not `firmSlug`) but their subdomain
 * `firmSlug` claim updates on next sign-in. Document this in Settings UI.
 */

const PutSchema = z
  .object({
    slug: z.string().min(1).max(63),
  })
  .strict();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const check = url.searchParams.get("check");

  // Availability mode: validate shape, then check uniqueness DB-side. We
  // return the same shape as for the firm's own slug so the wizard can use a
  // single render path.
  if (check !== null) {
    const validation = validateSlug(check);
    if (!validation.ok) {
      return NextResponse.json({ available: false, reason: validation.reason });
    }
    const existing = await prisma.firm.findUnique({
      where: { slug: validation.slug },
      select: { id: true },
    });
    // Treat the firm's own slug as available (so the input doesn't flicker
    // "taken" when the admin loads the page with the current value).
    const isOwn = existing?.id === session.user.firmId;
    return NextResponse.json({
      available: !existing || isOwn,
      reason: existing && !isOwn ? "That slug is already taken." : null,
    });
  }

  const firm = await prisma.firm.findUnique({
    where: { id: session.user.firmId },
    select: { slug: true },
  });
  return NextResponse.json({ slug: firm?.slug ?? null });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Slug renames are rare but high-impact (URL of every link the firm has
  // shared) — rate-limit so a misbehaving client can't spam the unique-index.
  const rlBlocked = await enforceRateLimit("sensitive", `slug:${session.user.firmId}`);
  if (rlBlocked) return rlBlocked;

  const parsed = await parseBody(request, PutSchema);
  if (parsed instanceof NextResponse) return parsed;

  const validation = validateSlug(parsed.data.slug);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }
  const slug = validation.slug;

  // Pre-check for a friendlier error message than a unique-constraint violation.
  const existing = await prisma.firm.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== session.user.firmId) {
    return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
  }

  // No-op when the slug is already the current value — keep the audit log clean.
  const before = await prisma.firm.findUnique({
    where: { id: session.user.firmId },
    select: { slug: true },
  });
  if (before?.slug === slug) {
    return NextResponse.json({ slug });
  }

  const updated = await prisma.firm.update({
    where: { id: session.user.firmId },
    data: { slug },
    select: { slug: true },
  });

  const meta = extractRequestMeta(request);
  await recordAudit({
    firmId: session.user.firmId,
    actorUserId: session.user.id,
    action: "firm.slug_changed",
    resource: "Firm",
    resourceId: session.user.firmId,
    metadata: { previousSlug: before?.slug ?? null, newSlug: updated.slug },
    ...meta,
  });

  return NextResponse.json({ slug: updated.slug });
}
