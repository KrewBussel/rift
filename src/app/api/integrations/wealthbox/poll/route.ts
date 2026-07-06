import { POST as pollHandler } from "../../crm/poll/route";

/**
 * Legacy alias for the inbound poller, kept for back-compat with existing
 * cron configurations pointing at /api/integrations/wealthbox/poll.
 * The canonical route is /api/integrations/crm/poll.
 */
export const POST = pollHandler;
