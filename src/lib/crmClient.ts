/**
 * Wealthbox CRM client. Takes a CrmConnection row, decrypts the stored
 * personal access token, and exposes a normalized interface over the raw
 * Wealthbox API shapes in ./wealthbox. Wealthbox tokens don't expire, so
 * there is no refresh machinery here.
 */
import { openSecret } from "./crypto";
import type { CrmConnection } from "@prisma/client";
import * as wb from "./wealthbox";

export interface Stage {
  id: string;     // Wealthbox stage id, stringified
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
  stageId: string | null; // key that matches CrmStageMapping.crmStageId
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

export interface CrmUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface CrmClient {
  getStages(): Promise<Stage[]>;
  searchOpportunities(query?: string): Promise<OpportunitySummary[]>;
  getOpportunity(id: string): Promise<OpportunityDetail>;
  /** Hydrated read used by inbound polling. Includes contact + custom fields. */
  getOpportunityHydrated(id: string): Promise<OpportunityHydrated>;
  /** List opportunities at a specific stage. Used by the inbound poller. */
  listOpportunitiesByStage(stageId: string): Promise<OpportunitySummary[]>;
  updateOpportunityStage(id: string, stageId: string): Promise<void>;
  createOpportunity(opts: { name: string; stageId?: string }): Promise<OpportunityDetail>;
  /** List members of the Wealthbox account (firm). Used by the team-invite UI. */
  getOrgUsers(): Promise<CrmUser[]>;
}

/** Build a client bound to a specific firm's connection. */
export function getCrmClient(connection: CrmConnection): CrmClient {
  const token = openSecret({
    ciphertext: connection.encryptedToken,
    iv: connection.tokenIv,
    tag: connection.tokenTag,
  });
  return {
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
