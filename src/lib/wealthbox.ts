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
  pipeline?: number | null; // id of the owning opportunity pipeline
}

export interface WealthboxPipeline {
  id: number;
  name: string;
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
  // Live responses return `amount` as a formatted string ("$689,000") and omit
  // `currency` entirely, even though the API docs show a numeric amount + a
  // `currency` symbol. Both shapes are handled by pickOpportunityAmount below.
  amounts?: Array<{
    id?: number;
    amount: number | string;
    currency?: string | null;
    basis_points?: number | null;
    kind?: string;
  }>;
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

export interface WealthboxUser {
  id: number;
  name?: string;
  /** Wealthbox sometimes returns first/last separately and other times a combined name. */
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  account?: number;
  excluded_from_assignments?: boolean;
}

/**
 * List the users on the same Wealthbox account as the caller's token. The
 * Wealthbox API returns the array under several possible wrapper keys
 * depending on the endpoint version, so we accept all of them.
 */
export async function getOrgUsers(token: string): Promise<WealthboxUser[]> {
  const res = await request<unknown>(token, "/users");
  if (Array.isArray(res)) return res as WealthboxUser[];
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    for (const key of ["users", "data"]) {
      const v = r[key];
      if (Array.isArray(v)) return v as WealthboxUser[];
    }
  }
  return [];
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

/**
 * Opportunity pipelines are a Customizable Category (plural endpoint), same
 * wrapper-key tolerance as stages. Firms on multi-pipeline plans can have
 * several; each stage row carries the id of its owning pipeline.
 */
export async function getOpportunityPipelines(token: string): Promise<WealthboxPipeline[]> {
  const res = await request<unknown>(token, "/categories/opportunity_pipelines");
  if (Array.isArray(res)) return res as WealthboxPipeline[];
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    for (const key of ["opportunity_pipelines", "pipelines", "categories", "data"]) {
      const v = r[key];
      if (Array.isArray(v)) return v as WealthboxPipeline[];
    }
  }
  return [];
}

export async function searchOpportunities(token: string, opts: { query?: string; limit?: number; page?: number } = {}): Promise<WealthboxOpportunityList> {
  const qs = new URLSearchParams();
  if (opts.query) qs.set("name", opts.query);
  if (opts.limit) qs.set("per_page", String(opts.limit));
  if (opts.page && opts.page > 1) qs.set("page", String(opts.page));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<WealthboxOpportunityList>(token, `/opportunities${suffix}`);
}

export async function getOpportunity(token: string, id: number | string): Promise<WealthboxOpportunity> {
  return request<WealthboxOpportunity>(token, `/opportunities/${id}`);
}

export interface WealthboxEmailAddress {
  id?: number;
  address: string;
  principal?: boolean;
  kind?: string;
}

export interface WealthboxPhoneNumber {
  id?: number;
  address: string;     // Wealthbox uses `address` for the phone number string
  principal?: boolean;
  kind?: string;       // "Mobile", "Work", "Home", etc.
  extension?: string | null;
}

export interface WealthboxContact {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: WealthboxEmailAddress[];
  phone_numbers?: WealthboxPhoneNumber[];
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

/** Pick the principal phone if marked, else the first one, else null. */
export function pickPrimaryPhone(contact: WealthboxContact): string | null {
  const phones = contact.phone_numbers ?? [];
  if (phones.length === 0) return null;
  const principal = phones.find((p) => p.principal);
  const chosen = principal ?? phones[0];
  if (!chosen?.address) return null;
  const ext = chosen.extension?.trim();
  return ext ? `${chosen.address} x${ext}` : chosen.address;
}

/** Map a leading currency symbol to an ISO 4217 code (what Intl.NumberFormat wants). */
const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

/**
 * Parse a Wealthbox amount into a real number. The API is inconsistent: the
 * docs show a numeric `amount` (56.76) but live responses return a formatted
 * string like "$689,000" with a symbol and thousands separators. Strip
 * everything except digits, a decimal point, and a leading minus so both shapes
 * yield a number. Unparseable / non-finite → 0.
 */
export function parseWealthboxAmount(raw: number | string | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== "string") return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Resolve a row's currency to an ISO code. Prefer an explicit `currency` field
 * (normalizing a bare symbol like "$" → "USD"); otherwise infer from a leading
 * symbol on a string amount; default USD (this is a US rollover product).
 */
function rowCurrency(a: { amount: number | string; currency?: string | null }): string {
  const explicit = a.currency?.trim();
  if (explicit) return CURRENCY_SYMBOL_TO_CODE[explicit] ?? explicit;
  if (typeof a.amount === "string") {
    for (const [sym, code] of Object.entries(CURRENCY_SYMBOL_TO_CODE)) {
      if (a.amount.includes(sym)) return code;
    }
  }
  return "USD";
}

/** Sum opportunity amounts across the (often single-entry) `amounts` array. */
export function pickOpportunityAmount(opp: WealthboxOpportunity): { amount: number; currency: string } | null {
  const amounts = opp.amounts ?? [];
  if (amounts.length === 0) return null;
  // Wealthbox supports multiple currency rows on one opp; in practice it's one
  // entry. If we ever see mixed currencies, we keep the first row's currency
  // and total only the matching ones to avoid silently mixing units.
  const currency = rowCurrency(amounts[0]);
  const total = amounts
    .filter((a) => rowCurrency(a) === currency)
    .reduce((sum, a) => sum + parseWealthboxAmount(a.amount), 0);
  return { amount: total, currency };
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
    // Wealthbox returns `amount` as a formatted string ("$689,000") on read but
    // expects a number on write, so coerce each row before echoing it back —
    // otherwise the outbound Won-close PUT can be rejected. Other fields
    // (currency, kind, id) pass through untouched.
    amounts: existing.amounts?.length
      ? existing.amounts.map((a) => ({ ...a, amount: parseWealthboxAmount(a.amount) }))
      : DEFAULT_AMOUNTS,
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
