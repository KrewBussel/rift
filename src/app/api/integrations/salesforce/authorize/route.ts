import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { buildAuthorizeUrl, generatePkcePair, SalesforceConfigError } from "@/lib/salesforce";

/**
 * Kicks off the Salesforce OAuth flow. Only admins may initiate; we stash a
 * random `state` in a short-lived HttpOnly cookie so the callback can verify
 * the browser that lands back is the same one that started (CSRF guard).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const state = crypto.randomBytes(24).toString("base64url");
  const pkce = generatePkcePair();
  let authorizeUrl: string;
  try {
    authorizeUrl = buildAuthorizeUrl(state, { codeChallenge: pkce.challenge });
  } catch (err) {
    if (err instanceof SalesforceConfigError) {
      return NextResponse.json({ error: "Salesforce is not configured on this server" }, { status: 500 });
    }
    throw err;
  }

  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  res.cookies.set("sf_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/salesforce",
    maxAge: 10 * 60, // 10 minutes
  });
  // Also record which firm initiated, so the callback can resolve firmId
  // without re-querying the session (SF redirect strips our cookies to
  // whatever we set here).
  res.cookies.set("sf_oauth_firm", session.user.firmId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/salesforce",
    maxAge: 10 * 60,
  });
  res.cookies.set("sf_oauth_user", session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/salesforce",
    maxAge: 10 * 60,
  });
  res.cookies.set("sf_oauth_verifier", pkce.verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/salesforce",
    maxAge: 10 * 60,
  });
  return res;
}
