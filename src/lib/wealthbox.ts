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

export interface WealthboxOpportunity {
  id: number;
  name: string;
  stage?: string | null;
  stage_id?: number | null;
  probability?: number | null;
  amount?: { amount: number; currency: string } | null;
  close_date?: string | null;
  contacts?: Array<{ id: number; name: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface WealthboxOpportunityList {
  opportunities: WealthboxOpportunity[];
  meta?: { total_entries?: number };
}

export interface WealthboxCategoryList {
  stages?: WealthboxStage[]; // /categories/opportunity_stage returns {stages:[...]}
  categories?: WealthboxStage[];
}

export async function getMe(token: string): Promise<WealthboxMe> {
  return request<WealthboxMe>(token, "/me");
}

export async function getOpportunityStages(token: string): Promise<WealthboxStage[]> {
  // Wealthbox exposes category lists at /categories/<category_type>
  // The opportunity_stage category returns { stages: [...] } or { categories: [...] }
  const res = await request<WealthboxCategoryList>(token, "/categories/opportunity_stage");
  return res.stages ?? res.categories ?? [];
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

export async function updateOpportunityStage(token: string, id: number | string, stageId: number | string): Promise<WealthboxOpportunity> {
  return request<WealthboxOpportunity>(token, `/opportunities/${id}`, {
    method: "PUT",
    body: JSON.stringify({ stage_id: Number(stageId) }),
  });
}

export async function createOpportunity(token: string, opts: { name: string; stageId?: number | string; contactIds?: number[] }): Promise<WealthboxOpportunity> {
  const body: Record<string, unknown> = { name: opts.name };
  if (opts.stageId !== undefined) body.stage_id = Number(opts.stageId);
  if (opts.contactIds?.length) body.linked_to = opts.contactIds.map((id) => ({ id, type: "Contact" }));
  return request<WealthboxOpportunity>(token, "/opportunities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
