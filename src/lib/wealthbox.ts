/**
 * Wealthbox API client.
 * Docs: https://dev.wealthbox.com/
 * Base URL: https://api.crmworkspace.com/v1
 * Auth header: ACCESS_TOKEN: <personal access token>
 */

const BASE_URL = "https://api.crmworkspace.com/v1";

export class WealthboxError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message);
    this.name = "WealthboxError";
  }
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ACCESS_TOKEN: token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    throw new WealthboxError(
      `Wealthbox ${res.status} on ${init.method ?? "GET"} ${path}`,
      res.status,
      body,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface WealthboxMe {
  id: number;
  name: string;
  email: string;
  account: number;
}

export interface WealthboxStage {
  id: number;
  name: string;
  document_type: string; // "Opportunity" for opportunity stages
}

/**
 * Raw Wealthbox opportunity as returned by the API. Fields are defensively typed
 * because Wealthbox's response shape isn't fully documented — the stage may come
 * back as a number (id) or an object, and we normalize via `pickStage` below.
 */
export interface WealthboxCustomField {
  id: number;
  name: string;
  value: string | number | boolean | null;
  document_type?: string;
  field_type?: string;
}

export interface WealthboxOpportunity {
  id: number;
  name: string;
  stage?: number | string | { id?: number; name?: string } | null;
  stage_id?: number | null;
  stage_name?: string | null;
  probability?: number | null;
  amounts?: Array<{ amount: number; currency: string; kind?: string }>;
  target_close?: string | null;
  linked_to?: Array<{ id: number; name?: string; type?: string }>;
  custom_fields?: WealthboxCustomField[];
  created_at?: string;
  updated_at?: string;
}

/** Normalized {id, name} for the opportunity's current stage. */
export function pickStage(opp: WealthboxOpportunity): { id: number | null; name: string | null } {
  if (opp.stage && typeof opp.stage === "object") {
    return { id: opp.stage.id ?? null, name: opp.stage.name ?? opp.stage_name ?? null };
  }
  if (typeof opp.stage === "number") return { id: opp.stage, name: opp.stage_name ?? null };
  if (typeof opp.stage === "string") return { id: opp.stage_id ?? null, name: opp.stage };
  return { id: opp.stage_id ?? null, name: opp.stage_name ?? null };
}

export interface WealthboxOpportunityList {
  opportunities: WealthboxOpportunity[];
  meta?: { total_entries?: number };
}

export async function getMe(token: string): Promise<WealthboxMe> {
  return request<WealthboxMe>(token, "/me");
}

/**
 * Opportunity stages are a Customizable Category. The endpoint is plural
 * (`opportunity_stages`). Response shape isn't fully documented; we accept
 * several wrapper keys and also a bare array.
 */
export async function getOpportunityStages(token: string): Promise<WealthboxStage[]> {
  const res = await request<unknown>(token, "/categories/opportunity_stages");
  if (Array.isArray(res)) return res as WealthboxStage[];
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    for (const key of ["opportunity_stages", "stages", "categories", "data"]) {
      const v = r[key];
      if (Array.isArray(v)) return v as WealthboxStage[];
    }
  }
  return [];
}

export async function searchOpportunities(token: string, opts: { query?: string; limit?: number } = {}): Promise<WealthboxOpportunityList> {
  const qs = new URLSearchParams();
  if (opts.query) qs.set("name", opts.query);
  if (opts.limit) qs.set("per_page", String(opts.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<WealthboxOpportunityList>(token, `/opportunities${suffix}`);
}

export async function getOpportunity(token: string, id: number | string): Promise<WealthboxOpportunity> {
  return request<WealthboxOpportunity>(token, `/opportunities/${id}`);
}

/**
 * Read a single custom field from an opportunity by its display name.
 * Wealthbox custom-field names are case-sensitive in the dashboard but
 * users sometimes type them inconsistently — match case-insensitively.
 */
export function readCustomField(opp: WealthboxOpportunity, name: string): string | null {
  const target = name.trim().toLowerCase();
  const cf = opp.custom_fields?.find((f) => (f.name ?? "").trim().toLowerCase() === target);
  if (!cf) return null;
  if (cf.value === null || cf.value === undefined) return null;
  const s = String(cf.value).trim();
  return s.length > 0 ? s : null;
}

export interface WealthboxEmailAddress {
  id?: number;
  address: string;
  principal?: boolean;
  kind?: string;
}

export interface WealthboxContact {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: WealthboxEmailAddress[];
}

export async function getContact(token: string, id: number | string): Promise<WealthboxContact> {
  return request<WealthboxContact>(token, `/contacts/${id}`);
}

/** Pick the principal email if marked, else the first one, else null. */
export function pickPrimaryEmail(contact: WealthboxContact): string | null {
  const emails = contact.email_addresses ?? [];
  if (emails.length === 0) return null;
  const principal = emails.find((e) => e.principal);
  return (principal ?? emails[0]).address ?? null;
}

/** Wealthbox minimum payload for POST /opportunities and PUT /opportunities/:id. */
function defaultTargetClose(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  // Wealthbox accepts ISO-ish datetime strings. Use YYYY-MM-DD HH:MM:SS -0000.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} 00:00:00 +0000`;
}

const DEFAULT_AMOUNTS = [{ amount: 0, currency: "USD", kind: "Fee" }];

/**
 * Update an opportunity's stage. Wealthbox's PUT requires the full required
 * field set, not a partial patch — so we fetch current state, mutate the
 * stage, then PUT the whole thing back.
 */
export async function updateOpportunityStage(token: string, id: number | string, stageId: number | string): Promise<WealthboxOpportunity> {
  const existing = await getOpportunity(token, id);
  const body = {
    name: existing.name,
    target_close: existing.target_close ?? defaultTargetClose(),
    probability: existing.probability ?? 50,
    stage: Number(stageId),
    amounts: existing.amounts?.length ? existing.amounts : DEFAULT_AMOUNTS,
  };
  return request<WealthboxOpportunity>(token, `/opportunities/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function createOpportunity(token: string, opts: {
  name: string;
  stageId?: number | string;
  contactIds?: number[];
  targetClose?: string;
  probability?: number;
  amounts?: Array<{ amount: number; currency: string; kind?: string }>;
}): Promise<WealthboxOpportunity> {
  const body: Record<string, unknown> = {
    name: opts.name,
    target_close: opts.targetClose ?? defaultTargetClose(),
    probability: opts.probability ?? 50,
    amounts: opts.amounts ?? DEFAULT_AMOUNTS,
  };
  if (opts.stageId !== undefined) body.stage = Number(opts.stageId);
  if (opts.contactIds?.length) body.linked_to = opts.contactIds.map((id) => ({ id, type: "Contact" }));
  return request<WealthboxOpportunity>(token, "/opportunities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
