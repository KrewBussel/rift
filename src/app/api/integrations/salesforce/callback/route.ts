import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sealSecret } from "@/lib/crypto";
import { exchangeCode, fetchIdentity, SalesforceError } from "@/lib/salesforce";
import { recordAudit, extractRequestMeta } from "@/lib/audit";

function readCookie(req: NextRequest | Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Salesforce redirects the user's browser here with ?code=...&state=...
 * We verify state matches the cookie, exchange the code for tokens, and
 * upsert the CrmConnection row. User session isn't available here
 * (SameSite=Lax cookies survive the redirect, but we pre-stashed firmId
 * in a cookie when we kicked off).
 */

function errorRedirect(url: URL, code: string): NextResponse {
  url.pathname = "/dashboard/settings";
  url.search = `?integration=salesforce&error=${code}#integrations`;
  const res = NextResponse.redirect(url.toString(), { status: 302 });
  // Clear OAuth scratch cookies
  res.cookies.set("sf_oauth_state", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_firm", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_user", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_verifier", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const sfError = url.searchParams.get("error");

  const cookieState = readCookie(req, "sf_oauth_state");
  const firmId = readCookie(req, "sf_oauth_firm");
  const userId = readCookie(req, "sf_oauth_user");
  const codeVerifier = readCookie(req, "sf_oauth_verifier");

  if (sfError) return errorRedirect(url, sfError);
  if (!code || !state) return errorRedirect(url, "missing_params");
  if (!cookieState || cookieState !== state) return errorRedirect(url, "state_mismatch");
  if (!firmId || !userId) return errorRedirect(url, "missing_context");

  let tokens;
  try {
    tokens = await exchangeCode(code, { codeVerifier });
  } catch (err) {
    const status = err instanceof SalesforceError ? err.status : 500;
    return errorRedirect(url, `exchange_failed_${status}`);
  }

  // Identity lookup — gives us username/email for UI display.
  let identity;
  try {
    identity = await fetchIdentity(tokens.id, tokens.access_token);
  } catch {
    identity = null;
  }

  const sealedAccess = sealSecret(tokens.access_token);
  const sealedRefresh = tokens.refresh_token ? sealSecret(tokens.refresh_token) : null;
  const tokenExpiresAt = new Date(Date.now() + 110 * 60 * 1000);

  const connection = await prisma.crmConnection.upsert({
    where: { firmId },
    update: {
      provider: "SALESFORCE",
      encryptedToken: sealedAccess.ciphertext,
      tokenIv: sealedAccess.iv,
      tokenTag: sealedAccess.tag,
      refreshTokenCiphertext: sealedRefresh?.ciphertext ?? null,
      refreshTokenIv: sealedRefresh?.iv ?? null,
      refreshTokenTag: sealedRefresh?.tag ?? null,
      tokenExpiresAt,
      instanceUrl: tokens.instance_url,
      connectedUserId: identity?.user_id ?? null,
      connectedUserName: identity?.display_name ?? null,
      connectedUserEmail: identity?.email ?? null,
      connectedAt: new Date(),
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
      lastHealthError: null,
    },
    create: {
      firmId,
      provider: "SALESFORCE",
      encryptedToken: sealedAccess.ciphertext,
      tokenIv: sealedAccess.iv,
      tokenTag: sealedAccess.tag,
      refreshTokenCiphertext: sealedRefresh?.ciphertext ?? null,
      refreshTokenIv: sealedRefresh?.iv ?? null,
      refreshTokenTag: sealedRefresh?.tag ?? null,
      tokenExpiresAt,
      instanceUrl: tokens.instance_url,
      connectedUserId: identity?.user_id ?? null,
      connectedUserName: identity?.display_name ?? null,
      connectedUserEmail: identity?.email ?? null,
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
    },
  });

  const meta = extractRequestMeta(req);
  await recordAudit({
    firmId,
    actorUserId: userId,
    action: "crm.salesforce.connected",
    resource: "CrmConnection",
    resourceId: connection.id,
    metadata: { instanceUrl: tokens.instance_url, connectedUserEmail: identity?.email },
    ...meta,
  });

  // Success: bounce to Settings → Integrations
  url.pathname = "/dashboard/settings";
  url.search = "?integration=salesforce&status=connected#integrations";
  const res = NextResponse.redirect(url.toString(), { status: 302 });
  res.cookies.set("sf_oauth_state", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_firm", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_user", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  res.cookies.set("sf_oauth_verifier", "", { path: "/api/integrations/salesforce", maxAge: 0 });
  return res;
}
