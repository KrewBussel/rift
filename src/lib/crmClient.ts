/**
 * Provider-polymorphic CRM client. Takes a CrmConnection row and exposes
 * a unified interface so routes don't branch on `provider` themselves.
 *
 * Handles Salesforce access-token expiry by pre-emptively refreshing when
 * <60s remain, and retrying once on a 401 response. Wealthbox tokens don't
 * expire, so the retry path is a no-op there.
 */
import { prisma } from "./prisma";
import { sealSecret, openSecret } from "./crypto";
import type { CrmConnection } from "@prisma/client";
import * as wb from "./wealthbox";
import * as sf from "./salesforce";

export interface Stage {
  id: string;     // provider-native id (Wealthbox stage id, Salesforce StageName ApiName)
  name: string;   // human label
}

export interface OpportunitySummary {
  id: string;
  name: string;
  stage: string | null;
}

export interface OpportunityDetail {
  id: string;
  name: string;
  stage: string | null;   // human label ("Closed Won")
  stageId: string | null; // provider-native key that matches CrmStageMapping.crmStageId
}

/**
 * Hydrated opportunity used by inbound case creation: includes the linked
 * primary contact's name/email/phone, the opportunity's metadata (amount,
 * target close date, probability, opp name, createdAt), and any custom-field
 * values keyed by name. `customFields` is case-insensitive at lookup time.
 */
export interface OpportunityHydrated extends OpportunityDetail {
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  customFields: Record<string, string>;
  amount: number | null;
  amountCurrency: string | null;
  targetClose: Date | null;
  probability: number | null;
  oppCreatedAt: Date | null;
}

export interface OpportunityListPage {
  opportunities: OpportunitySummary[];
  /** Provider-native pagination cursor; null when exhausted. */
  nextCursor: string | null;
}

export interface CrmUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface CrmProviderClient {
  provider: "WEALTHBOX" | "SALESFORCE";
  getStages(): Promise<Stage[]>;
  searchOpportunities(query?: string): Promise<OpportunitySummary[]>;
  getOpportunity(id: string): Promise<OpportunityDetail>;
  /** Hydrated read used by inbound polling. Includes contact + custom fields. */
  getOpportunityHydrated(id: string): Promise<OpportunityHydrated>;
  /** List opportunities at a specific stage. Used by the inbound poller. */
  listOpportunitiesByStage(stageId: string): Promise<OpportunitySummary[]>;
  updateOpportunityStage(id: string, stageId: string, stageName: string): Promise<void>;
  createOpportunity(opts: { name: string; stageId?: string; stageName?: string }): Promise<OpportunityDetail>;
  /** List members of the CRM account (firm). Used by the team-invite UI. */
  getOrgUsers(): Promise<CrmUser[]>;
}

/**
 * Build a client bound to a specific firm's connection. Refreshes Salesforce
 * access tokens when they're expired or about to expire; writes the new
 * access token + expiry back to the DB.
 */
export async function getProviderClient(connection: CrmConnection): Promise<CrmProviderClient> {
  if (connection.provider === "WEALTHBOX") {
    const token = openSecret({
      ciphertext: connection.encryptedToken,
      iv: connection.tokenIv,
      tag: connection.tokenTag,
    });
    return {
      provider: "WEALTHBOX",
      async getStages() {
        const raw = await wb.getOpportunityStages(token);
        return raw.map((s) => ({ id: String(s.id), name: s.name }));
      },
      async searchOpportunities(query?: string) {
        const list = await wb.searchOpportunities(token, { query, limit: 25 });
        return list.opportunities.map((o) => {
          const stage = wb.pickStage(o);
          return { id: String(o.id), name: o.name, stage: stage.name };
        });
      },
      async getOpportunity(id) {
        const o = await wb.getOpportunity(token, id);
        const stage = wb.pickStage(o);
        return {
          id: String(o.id),
          name: o.name,
          stage: stage.name,
          stageId: stage.id != null ? String(stage.id) : null,
        };
      },
      async getOpportunityHydrated(id) {
        const o = await wb.getOpportunity(token, id);
        const stage = wb.pickStage(o);
        const customFields: Record<string, string> = {};
        for (const cf of o.custom_fields ?? []) {
          if (cf.name && cf.value !== null && cf.value !== undefined) {
            customFields[cf.name.trim().toLowerCase()] = String(cf.value).trim();
          }
        }
        const contactLink = (o.linked_to ?? []).find((l) => l.type === "Contact");
        let contact: OpportunityHydrated["contact"] = null;
        if (contactLink) {
          try {
            const c = await wb.getContact(token, contactLink.id);
            contact = {
              id: String(c.id),
              firstName: c.first_name?.trim() || null,
              lastName: c.last_name?.trim() || null,
              email: wb.pickPrimaryEmail(c),
              phone: wb.pickPrimaryPhone(c),
            };
          } catch {
            // Contact lookup failure shouldn't poison the hydrate; leave contact null
            // and let the caller surface a needs-review case.
            contact = null;
          }
        }
        const amt = wb.pickOpportunityAmount(o);
        return {
          id: String(o.id),
          name: o.name,
          stage: stage.name,
          stageId: stage.id != null ? String(stage.id) : null,
          contact,
          customFields,
          amount: amt?.amount ?? null,
          amountCurrency: amt?.currency ?? null,
          targetClose: o.target_close ? safeParseDate(o.target_close) : null,
          probability: typeof o.probability === "number" ? o.probability : null,
          oppCreatedAt: o.created_at ? safeParseDate(o.created_at) : null,
        };
      },
      async listOpportunitiesByStage(stageId) {
        // Wealthbox doesn't expose a server-side stage filter, so we walk pages
        // and filter client-side. Hard cap on pages so a runaway pipeline can't
        // wedge the poller — at 100/page that's 5,000 opportunities scanned.
        const PER_PAGE = 100;
        const MAX_PAGES = 50;
        const target = String(stageId);
        const matches: OpportunitySummary[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const list = await wb.searchOpportunities(token, { limit: PER_PAGE, page });
          for (const o of list.opportunities) {
            const s = wb.pickStage(o);
            if (s.id != null && String(s.id) === target) {
              matches.push({ id: String(o.id), name: o.name, stage: s.name });
            }
          }
          // Last page is anything shorter than a full page (Wealthbox doesn't
          // return a reliable nextCursor; meta.total_entries isn't trustworthy
          // either).
          if (list.opportunities.length < PER_PAGE) break;
        }
        return matches;
      },
      async updateOpportunityStage(id, stageId) {
        await wb.updateOpportunityStage(token, id, stageId);
      },
      async createOpportunity({ name, stageId }) {
        const o = await wb.createOpportunity(token, { name, stageId });
        const stage = wb.pickStage(o);
        return {
          id: String(o.id),
          name: o.name,
          stage: stage.name,
          stageId: stage.id != null ? String(stage.id) : null,
        };
      },
      async getOrgUsers() {
        const raw = await wb.getOrgUsers(token);
        return raw
          .filter((u) => u.email)
          .map((u) => {
            // Wealthbox sometimes returns combined `name`, sometimes split. Be defensive.
            let firstName = u.first_name?.trim() || null;
            let lastName = u.last_name?.trim() || null;
            if (!firstName && !lastName && u.name) {
              const parts = u.name.trim().split(/\s+/);
              firstName = parts[0] || null;
              lastName = parts.slice(1).join(" ") || null;
            }
            return {
              id: String(u.id),
              firstName,
              lastName,
              email: u.email.trim().toLowerCase(),
            };
          });
      },
    };
  }

  if (connection.provider === "SALESFORCE") {
    const instanceUrl = connection.instanceUrl;
    if (!instanceUrl) throw new Error("Salesforce connection is missing instanceUrl");

    // Decrypt, with lazy refresh on 401 or near-expiry.
    let accessToken = openSecret({
      ciphertext: connection.encryptedToken,
      iv: connection.tokenIv,
      tag: connection.tokenTag,
    });

    async function ensureFreshToken(): Promise<string> {
      const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
      if (expiresAt && Date.now() > expiresAt - 60_000) {
        accessToken = await refreshSalesforceToken(connection);
      }
      return accessToken;
    }

    async function callWithRetry<T>(fn: (t: string) => Promise<T>): Promise<T> {
      await ensureFreshToken();
      try {
        return await fn(accessToken);
      } catch (err) {
        if (err instanceof sf.SalesforceError && err.status === 401) {
          accessToken = await refreshSalesforceToken(connection);
          return await fn(accessToken);
        }
        throw err;
      }
    }

    return {
      provider: "SALESFORCE",
      async getStages() {
        const raw = await callWithRetry((t) => sf.getOpportunityStages(instanceUrl, t));
        return raw.map((s) => ({ id: s.ApiName, name: s.MasterLabel }));
      },
      async searchOpportunities(query?: string) {
        const list = await callWithRetry((t) => sf.searchOpportunities(instanceUrl, t, { query, limit: 25 }));
        return list.map((o) => ({ id: o.Id, name: o.Name, stage: o.StageName ?? null }));
      },
      async getOpportunity(id) {
        const o = await callWithRetry((t) => sf.getOpportunity(instanceUrl, t, id));
        return {
          id: o.Id,
          name: o.Name,
          stage: o.StageName ?? null,
          // For Salesforce the mapping key is the StageName itself
          stageId: o.StageName ?? null,
        };
      },
      async getOpportunityHydrated(id) {
        const o = await callWithRetry((t) => sf.getOpportunityHydrated(instanceUrl, t, id));

        // Build the case-insensitive customFields map keyed by the same labels
        // the inbound case creator looks up ("Source Provider", etc.). The
        // crmSync layer is provider-agnostic — it only cares about field
        // labels, not API names.
        const customFields: Record<string, string> = {};
        const sourceProvider = (o.Source_Provider__c ?? "").trim();
        const destination = (o.Destination_Custodian__c ?? "").trim();
        const accountType = (o.Account_Type__c ?? "").trim();
        if (sourceProvider) customFields["source provider"] = sourceProvider;
        if (destination) customFields["destination custodian"] = destination;
        if (accountType) customFields["account type"] = accountType;

        // Contact resolution priority:
        //   1. OpportunityContactRoles (primary first) — the textbook setup
        //   2. Account.PersonContact* — Person Account orgs
        //   3. Account.Name as a last-resort label so the case isn't
        //      "Unknown Unknown" when only an Account is linked.
        let contact: OpportunityHydrated["contact"] = null;
        const role = o.OpportunityContactRoles?.records.find((r) => r.Contact);
        if (role?.Contact) {
          const c = role.Contact;
          contact = {
            id: c.Id,
            firstName: c.FirstName?.trim() || null,
            lastName: c.LastName?.trim() || null,
            email: c.Email?.trim().toLowerCase() || null,
            // Prefer a mobile number if the primary phone is empty — many SF
            // orgs default the click-to-call field to MobilePhone.
            phone: (c.Phone?.trim() || c.MobilePhone?.trim() || null) ?? null,
          };
        } else if (o.Account?.IsPersonAccount && (o.Account.FirstName || o.Account.LastName)) {
          // Person Account: the Account itself is effectively the contact.
          contact = {
            id: o.Account.PersonContactId ?? o.Account.Id,
            firstName: o.Account.FirstName?.trim() || null,
            lastName: o.Account.LastName?.trim() || null,
            email: o.Account.PersonEmail?.trim().toLowerCase() || null,
            phone: (o.Account.Phone?.trim() || o.Account.PersonMobilePhone?.trim() || null) ?? null,
          };
        } else if (o.Account?.Name) {
          // Business Account with no Contact Role on the opp — use the Account
          // name so the case is at least identifiable. We split on the last
          // whitespace so "Acme Corp" → ("Acme", "Corp") and "Smith" → ("Smith", "").
          const name = o.Account.Name.trim();
          const lastSpace = name.lastIndexOf(" ");
          const firstName = lastSpace > 0 ? name.slice(0, lastSpace) : name;
          const lastName = lastSpace > 0 ? name.slice(lastSpace + 1) : "";
          contact = {
            id: o.Account.Id,
            firstName,
            lastName: lastName || null,
            email: null,
            phone: o.Account.Phone?.trim() || null,
          };
        }

        return {
          id: o.Id,
          name: o.Name,
          stage: o.StageName ?? null,
          stageId: o.StageName ?? null,
          contact,
          customFields,
          amount: typeof o.Amount === "number" ? o.Amount : null,
          // Salesforce Amount uses the org's CorporateCurrencyIsoCode; not
          // returned in this query. Default to USD which is the most common
          // org default.
          amountCurrency: typeof o.Amount === "number" ? "USD" : null,
          targetClose: o.CloseDate ? safeParseDate(o.CloseDate) : null,
          probability: typeof o.Probability === "number" ? o.Probability : null,
          oppCreatedAt: o.CreatedDate ? safeParseDate(o.CreatedDate) : null,
        };
      },
      async listOpportunitiesByStage(stageId) {
        // Server-side filter via SOQL — much cheaper than pulling 500 and
        // filtering client-side. Cap matches the Wealthbox MAX_PAGES * PER_PAGE.
        const list = await callWithRetry((t) =>
          sf.searchOpportunities(instanceUrl, t, { limit: 500, stageName: stageId }),
        );
        return list.map((o) => ({ id: o.Id, name: o.Name, stage: o.StageName ?? null }));
      },
      async updateOpportunityStage(id, _stageId, stageName) {
        await callWithRetry((t) => sf.updateOpportunityStage(instanceUrl, t, id, stageName));
      },
      async createOpportunity({ name, stageName }) {
        if (!stageName) throw new Error("Salesforce requires a stageName to create an opportunity");
        const closeDate = defaultCloseDate();
        const res = await callWithRetry((t) => sf.createOpportunity(instanceUrl, t, { name, stageName, closeDate }));
        if (!res.success) throw new Error(`Salesforce create failed: ${JSON.stringify(res.errors)}`);
        return { id: res.id, name, stage: stageName, stageId: stageName };
      },
      async getOrgUsers() {
        // Salesforce User API needs `View All Users` permission and a SOQL
        // query against User. Not yet wired. Returning an empty list keeps the
        // team-invite UI usable (admin can still add manually) for SF firms.
        return [];
      },
    };
  }

  throw new Error(`Unsupported CRM provider: ${connection.provider}`);
}

/** Refresh a Salesforce access token and persist the new value + expiry. */
async function refreshSalesforceToken(connection: CrmConnection): Promise<string> {
  if (!connection.refreshTokenCiphertext || !connection.refreshTokenIv || !connection.refreshTokenTag) {
    throw new Error("Salesforce connection is missing a refresh token");
  }
  const refreshToken = openSecret({
    ciphertext: connection.refreshTokenCiphertext,
    iv: connection.refreshTokenIv,
    tag: connection.refreshTokenTag,
  });
  const refreshed = await sf.refreshAccessToken(refreshToken);
  const sealed = sealSecret(refreshed.access_token);
  // Salesforce doesn't document access-token TTL in the refresh response;
  // default to 110 minutes, well under the typical 2-hour session cap.
  const tokenExpiresAt = new Date(Date.now() + 110 * 60 * 1000);
  await prisma.crmConnection.update({
    where: { id: connection.id },
    data: {
      encryptedToken: sealed.ciphertext,
      tokenIv: sealed.iv,
      tokenTag: sealed.tag,
      tokenExpiresAt,
      lastHealthCheckAt: new Date(),
      lastHealthOk: true,
      lastHealthError: null,
      ...(refreshed.instance_url ? { instanceUrl: refreshed.instance_url } : {}),
    },
  });
  // Mutate caller's in-memory row so subsequent calls see the fresh fields.
  connection.encryptedToken = sealed.ciphertext;
  connection.tokenIv = sealed.iv;
  connection.tokenTag = sealed.tag;
  connection.tokenExpiresAt = tokenExpiresAt;
  if (refreshed.instance_url) connection.instanceUrl = refreshed.instance_url;
  return refreshed.access_token;
}

function defaultCloseDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Parse a Wealthbox date string defensively. Wealthbox returns ISO 8601
 * timestamps for `created_at` and `YYYY-MM-DD HH:MM:SS +0000` for
 * `target_close`. Both parse cleanly via Date(); we just return null on
 * anything we can't make sense of so the caller doesn't have to handle
 * NaN dates.
 */
function safeParseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}
