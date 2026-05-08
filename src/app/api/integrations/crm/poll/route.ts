import { POST as legacyPoll } from "../../wealthbox/poll/route";

/**
 * Provider-agnostic alias for the inbound CRM poller. Forwards to the same
 * handler as /api/integrations/wealthbox/poll (which is itself provider-
 * neutral; the URL is kept for back-compat with existing cron configurations).
 *
 * Both routes accept either a CRON_SECRET bearer token (all-firms mode) or
 * an ADMIN session (own-firm mode).
 */
export const POST = legacyPoll;
