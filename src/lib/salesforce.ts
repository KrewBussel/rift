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

/**
 * Salesforce custom-field API names that mirror the Wealthbox setup. Match
 * the docs in wealthbox-integration.md but Salesforce-style: spaces → underscores
 * and the `__c` custom-field suffix that every user-defined field carries.
 *
 * The user creates these fields under Setup → Object Manager → Opportunity →
 * Fields & Relationships. Source / Destination are Text fields; Account Type is
 * a Picklist whose values match the Wealthbox-style mapping (Traditional / Roth
 * / 403(b) / Other).
 */
export const SALESFORCE_OPPORTUNITY_CUSTOM_FIELDS = {
  sourceProvider: "Source_Provider__c",
  destinationCustodian: "Destination_Custodian__c",
  accountType: "Account_Type__c",
} as const;

export async function searchOpportunities(
  instanceUrl: string,
  accessToken: string,
  opts: { query?: string; limit?: number; stageName?: string } = {},
): Promise<SalesforceOpportunityRecord[]> {
  const limit = Math.min(opts.limit ?? 25, 500);
  const filters: string[] = [];
  const q = opts.query?.replace(/['\\]/g, "").trim();
  if (q) filters.push(`Name LIKE '%${q}%'`);
  if (opts.stageName) {
    // Single-quote literal; SOQL escapes are backslash-style so reject any
    // backslashes/quotes the caller might have slipped in.
    const safe = opts.stageName.replace(/['\\]/g, "");
    filters.push(`StageName = '${safe}'`);
  }
  const where = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";
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

export interface SalesforceHydratedOpportunityRecord {
  Id: string;
  Name: string;
  StageName: string | null;
  Amount: number | null;
  CloseDate: string | null;
  Probability: number | null;
  CreatedDate: string;
  // Custom fields by API name. Optional because they may not exist on every org.
  Source_Provider__c?: string | null;
  Destination_Custodian__c?: string | null;
  Account_Type__c?: string | null;
  AccountId: string | null;
  // Account snapshot — used as a fallback when the opportunity has no
  // OpportunityContactRoles. Person Account orgs surface the contact via
  // PersonContactId; non-person orgs at least surface the Account name.
  Account: {
    Id: string;
    Name: string | null;
    Phone?: string | null;
    IsPersonAccount?: boolean;
    PersonContactId?: string | null;
    PersonEmail?: string | null;
    PersonMobilePhone?: string | null;
    FirstName?: string | null;
    LastName?: string | null;
  } | null;
  // Nested subquery — Salesforce returns null when there are no related rows.
  OpportunityContactRoles: {
    done: boolean;
    totalSize: number;
    records: Array<{
      ContactId: string;
      IsPrimary: boolean;
      Contact: {
        Id: string;
        FirstName: string | null;
        LastName: string | null;
        Email: string | null;
        Phone: string | null;
        MobilePhone: string | null;
      } | null;
    }>;
  } | null;
}

/**
 * Pull everything needed for inbound case creation in a single SOQL hit:
 * scalar opportunity fields, the three Rift custom fields, the related
 * Account (used as a fallback when no Contact Role exists), and the primary
 * contact via the OpportunityContactRoles subquery.
 *
 * SF has no equivalent of Wealthbox's free-form `custom_fields` array. Custom
 * fields are first-class columns on Opportunity, so we name them explicitly.
 *
 * Person Account fields (Account.PersonContactId, IsPersonAccount, etc.) only
 * exist on orgs with Person Accounts enabled. We retry without them on
 * INVALID_FIELD so non-Person-Account orgs still hydrate cleanly.
 */
export async function getOpportunityHydrated(
  instanceUrl: string,
  accessToken: string,
  id: string,
): Promise<SalesforceHydratedOpportunityRecord> {
  // SOQL doesn't give a way to "select * including custom fields", so we list
  // the three fields by API name. SF will hard-error if a field doesn't exist
  // on the user's org — we catch that one case below and re-issue without the
  // custom fields, so a misconfigured org returns a needs-review case rather
  // than failing the whole poll.
  const escapedId = id.replace(/['\\]/g, "");
  const customFieldsClause = `, ${SALESFORCE_OPPORTUNITY_CUSTOM_FIELDS.sourceProvider}, ${SALESFORCE_OPPORTUNITY_CUSTOM_FIELDS.destinationCustodian}, ${SALESFORCE_OPPORTUNITY_CUSTOM_FIELDS.accountType}`;
  const personAccountFields = ", Account.IsPersonAccount, Account.PersonContactId, Account.PersonEmail, Account.PersonMobilePhone, Account.FirstName, Account.LastName";
  const buildQuery = (custom: boolean, personAccount: boolean) =>
    `SELECT Id, Name, StageName, Amount, CloseDate, Probability, CreatedDate, AccountId, Account.Id, Account.Name, Account.Phone${personAccount ? personAccountFields : ""}${custom ? customFieldsClause : ""}, (SELECT ContactId, IsPrimary, Contact.Id, Contact.FirstName, Contact.LastName, Contact.Email, Contact.Phone, Contact.MobilePhone FROM OpportunityContactRoles ORDER BY IsPrimary DESC NULLS LAST LIMIT 5) FROM Opportunity WHERE Id = '${escapedId}' LIMIT 1`;

  // Progressively degrade the SELECT clause on INVALID_FIELD: full → drop
  // custom fields → drop person-account fields → drop both. This lets a
  // standard org (no Person Accounts enabled, no Rift custom fields yet) still
  // hydrate cleanly with just the basic Account snapshot.
  const attempts: Array<{ custom: boolean; personAccount: boolean }> = [
    { custom: true, personAccount: true },
    { custom: false, personAccount: true },
    { custom: true, personAccount: false },
    { custom: false, personAccount: false },
  ];

  let lastErr: unknown;
  for (const a of attempts) {
    try {
      const res = await soql<SalesforceHydratedOpportunityRecord>(
        instanceUrl,
        accessToken,
        buildQuery(a.custom, a.personAccount),
      );
      if (res.records.length === 0) {
        throw new SalesforceError(`Opportunity ${id} not found`, 404);
      }
      return res.records[0];
    } catch (err) {
      lastErr = err;
      const isInvalidField =
        err instanceof SalesforceError &&
        err.status === 400 &&
        Array.isArray(err.body) &&
        err.body.some((e: { errorCode?: string }) => e.errorCode === "INVALID_FIELD");
      if (!isInvalidField) throw err;
      // else: try the next, less-ambitious SELECT
    }
  }
  throw lastErr ?? new SalesforceError(`Opportunity ${id} hydrate failed`, 500);
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
