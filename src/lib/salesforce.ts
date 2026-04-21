/**
 * Salesforce REST + OAuth 2.0 (Web Server flow).
 * Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
 *
 * Auth: Authorization Code grant. Rift exchanges the `code` returned to the
 * callback URL for an access_token + refresh_token + instance_url. Access
 * tokens expire (~2h); refresh tokens are long-lived. Per-org instance URL
 * is part of the OAuth response and every REST call routes against it.
 *
 * Every API call goes through the crmClient wrapper which handles token
 * refresh on 401; this module only knows how to speak to Salesforce.
 */

const API_VERSION = "v59.0";

export function loginUrl(): string {
  const raw = (process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com").trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

export function clientId(): string {
  const v = process.env.SALESFORCE_CLIENT_ID;
  if (!v) throw new SalesforceConfigError("SALESFORCE_CLIENT_ID not set");
  return v;
}

export function clientSecret(): string {
  const v = process.env.SALESFORCE_CLIENT_SECRET;
  if (!v) throw new SalesforceConfigError("SALESFORCE_CLIENT_SECRET not set");
  return v;
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/salesforce/callback`;
}

export class SalesforceError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message);
    this.name = "SalesforceError";
  }
}

export class SalesforceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesforceConfigError";
  }
}

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;            // identity URL like https://login.salesforce.com/id/<orgId>/<userId>
  token_type: string;
  issued_at: string;     // ms epoch as string
  signature: string;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/**
 * PKCE (RFC 7636) pair. Salesforce Connected Apps increasingly require it.
 * We send the challenge with the authorize URL and the verifier with the
 * token exchange; Salesforce hashes the verifier and compares.
 */
export function generatePkcePair(): PkcePair {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(state: string, opts: { prompt?: "consent" | "login" | "none"; codeChallenge?: string } = {}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: "api refresh_token offline_access",
    state,
  });
  if (opts.prompt) params.set("prompt", opts.prompt);
  if (opts.codeChallenge) {
    params.set("code_challenge", opts.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${loginUrl()}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string, opts: { codeVerifier?: string } = {}): Promise<SalesforceTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    code,
  });
  if (opts.codeVerifier) body.set("code_verifier", opts.codeVerifier);
  const res = await fetch(`${loginUrl()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    throw new SalesforceError(`Salesforce token exchange failed (${res.status})`, res.status, responseBody);
  }
  return (await res.json()) as SalesforceTokenResponse;
}

export interface RefreshedToken {
  access_token: string;
  instance_url?: string;
  issued_at?: string;
  signature?: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshedToken> {
  const res = await fetch(`${loginUrl()}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new SalesforceError(`Salesforce token refresh failed (${res.status})`, res.status, body);
  }
  return (await res.json()) as RefreshedToken;
}

export interface SalesforceIdentity {
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
}

export async function fetchIdentity(idUrl: string, accessToken: string): Promise<SalesforceIdentity> {
  const res = await fetch(idUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new SalesforceError(`Salesforce identity call failed (${res.status})`, res.status);
  }
  return (await res.json()) as SalesforceIdentity;
}

/** Low-level REST request. Caller passes an access_token; 401 handling lives in crmClient. */
export async function request<T>(
  instanceUrl: string,
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${instanceUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    throw new SalesforceError(
      `Salesforce ${res.status} on ${init.method ?? "GET"} ${path}`,
      res.status,
      body,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** SOQL query with URL-escaped statement. */
export async function soql<T = unknown>(instanceUrl: string, accessToken: string, query: string): Promise<{ totalSize: number; done: boolean; records: T[] }> {
  const path = `/services/data/${API_VERSION}/query/?q=${encodeURIComponent(query)}`;
  return request(instanceUrl, accessToken, path);
}

export interface SalesforceOpportunityStage {
  Id: string;
  MasterLabel: string;
  ApiName: string;
  IsActive: boolean;
  SortOrder: number;
}

export async function getOpportunityStages(instanceUrl: string, accessToken: string): Promise<SalesforceOpportunityStage[]> {
  const res = await soql<SalesforceOpportunityStage>(
    instanceUrl,
    accessToken,
    "SELECT Id, MasterLabel, ApiName, IsActive, SortOrder FROM OpportunityStage WHERE IsActive = true ORDER BY SortOrder",
  );
  return res.records;
}

export interface SalesforceOpportunityRecord {
  Id: string;
  Name: string;
  StageName: string | null;
  CloseDate?: string | null;
}

export async function searchOpportunities(
  instanceUrl: string,
  accessToken: string,
  opts: { query?: string; limit?: number } = {},
): Promise<SalesforceOpportunityRecord[]> {
  const limit = Math.min(opts.limit ?? 25, 100);
  const q = opts.query?.replace(/['\\]/g, "").trim();
  const where = q ? ` WHERE Name LIKE '%${q}%'` : "";
  const soqlQ = `SELECT Id, Name, StageName, CloseDate FROM Opportunity${where} ORDER BY LastModifiedDate DESC LIMIT ${limit}`;
  const res = await soql<SalesforceOpportunityRecord>(instanceUrl, accessToken, soqlQ);
  return res.records;
}

export async function getOpportunity(instanceUrl: string, accessToken: string, id: string): Promise<SalesforceOpportunityRecord> {
  return request<SalesforceOpportunityRecord>(
    instanceUrl,
    accessToken,
    `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`,
  );
}

export async function updateOpportunityStage(instanceUrl: string, accessToken: string, id: string, stageName: string): Promise<void> {
  await request<void>(
    instanceUrl,
    accessToken,
    `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`,
    { method: "PATCH", body: JSON.stringify({ StageName: stageName }) },
  );
}

export async function createOpportunity(
  instanceUrl: string,
  accessToken: string,
  opts: { name: string; stageName: string; closeDate: string },
): Promise<{ id: string; success: boolean; errors: unknown[] }> {
  return request(
    instanceUrl,
    accessToken,
    `/services/data/${API_VERSION}/sobjects/Opportunity`,
    {
      method: "POST",
      body: JSON.stringify({
        Name: opts.name,
        StageName: opts.stageName,
        CloseDate: opts.closeDate,
      }),
    },
  );
}
