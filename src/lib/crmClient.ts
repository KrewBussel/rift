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

export interface CrmProviderClient {
  provider: "WEALTHBOX" | "SALESFORCE";
  getStages(): Promise<Stage[]>;
  searchOpportunities(query?: string): Promise<OpportunitySummary[]>;
  getOpportunity(id: string): Promise<OpportunityDetail>;
  updateOpportunityStage(id: string, stageId: string, stageName: string): Promise<void>;
  createOpportunity(opts: { name: string; stageId?: string; stageName?: string }): Promise<OpportunityDetail>;
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
