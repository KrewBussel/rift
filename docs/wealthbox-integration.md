# Wealthbox integration — current state

Read this whole file before changing anything in `src/lib/crmSync.ts`,
`src/lib/crmClient.ts`, `src/lib/wealthbox.ts`, the
`/api/integrations/wealthbox/**` routes, the `CrmStageMapping` /
`CaseStageConfig` schemas, or the `/onboarding` wizard.

This document describes how the integration works **today**, not how it
got built. Git history is the phase log; this is the architecture.

---

## The model in one paragraph

Rift is a 7-stage rollover pipeline. Of those 7 stages, only the **bookends**
talk to Wealthbox. `PROPOSAL_ACCEPTED` is the inbound entry point — when a
Wealthbox opportunity reaches the firm-mapped stage, a Rift case is created.
`WON` is the outbound *and* inbound close trigger — moving a case to Won
in Rift pushes the mapped Wealthbox stage; moving an opportunity to the
mapped Won stage in Wealthbox auto-closes the linked Rift case. The five
intermediate stages (`AWAITING_CLIENT_ACTION`, `READY_TO_SUBMIT`,
`SUBMITTED`, `PROCESSING`, `IN_TRANSIT`) are **Rift-only** and never sync.

```
WEALTHBOX                          RIFT
"Proposal Accepted" stage   ──→    PROPOSAL_ACCEPTED  (created via poll)
                                   AWAITING_CLIENT_ACTION
                                   READY_TO_SUBMIT
                                   SUBMITTED              ← intermediate,
                                   PROCESSING              Rift-only,
                                   IN_TRANSIT              no CRM round-trip
"Won" stage (closes opp)   ←─→     WON                 (bidirectional close)
```

Each firm can rename or selectively disable the five intermediate stages
via `CaseStageConfig`. The two bookends are always enabled because the
Wealthbox sync depends on them.

Why bookends only: most rollover work happens off-CRM (paperwork, custodian
ops). Mapping every status would either (a) clutter the firm's Wealthbox
pipeline with internal-process stages or (b) require Rift to fight Wealthbox
when the advisor edits the stage there. Bookends keep the CRM clean and
keep Rift authoritative for the in-progress states.

---

## Inbound: three triggers, one function

Wealthbox doesn't support webhooks. All inbound sync is poll-based. There
are **three independent triggers** that all converge on the same idempotent
`pollFirmForNewOpportunities(firmId)` function in `src/lib/crmSync.ts`:

| Trigger | Where it lives | Cadence | Auth |
|---|---|---|---|
| External cron | cron-job.org → `POST /api/integrations/wealthbox/poll` | Configurable (currently every 1 min, recommended 10–15 min once page-load polling is live) | `Authorization: Bearer ${CRON_SECRET}` |
| Page-load auto-sync | `maybePollOnPageLoad(firmId)` from server components on `/dashboard` and `/dashboard/cases` | Throttled to once per 10 s per firm; 2.5 s timeout | Active session (firm-scoped) |
| Manual button | `WealthboxSyncButton` on cases page; "Sync now" in Settings → Integrations | On click | Active ADMIN session (firm-scoped) |

The poll endpoint dispatches based on auth mode:
- `Bearer ${CRON_SECRET}` → polls **all** firms
- Active ADMIN session → polls **own firm only**

`pollFirmForNewOpportunities` does both bookend scans in one pass:

1. Scan the Proposal Accepted stage → create Rift cases for any opportunity not already linked
2. Scan the Won stage → find any opportunity linked to a Rift case that isn't already on `WON` and auto-close those cases

Per-opp errors are collected in `result.errors` and don't abort the run.
Connection-level failures (e.g., bad token, 5xx) update
`CrmConnection.lastHealthError` and `lastHealthOk = false` so the issue
is visible in Settings → Integrations.

### Why three triggers

| Trigger | Covers |
|---|---|
| Cron | Off-hours sync, reverse-Won timeliness when no one is in Rift, notification accuracy, health monitoring |
| Page-load | Active-user moments — "I just changed something in Wealthbox, refresh to see it" |
| Manual button | Impatient moments mid-session, or debugging |

They're complementary. Lower the cron cadence freely once page-load is in
place; **don't remove it** — the off-hours / reverse-Won safety net depends
on it.

---

## Outbound: the easy direction

When a Rift case status changes via `PATCH /api/cases/[id]`,
`syncOpportunityStage(caseId)` is called fire-and-forget in the same
request handler:

- If the new status is **not** a bookend (`PROPOSAL_ACCEPTED` / `WON`), it
  silently returns `rift_only_stage` without writing any error. Intermediate
  stages are deliberately not pushed.
- If it **is** a bookend and the firm has a `CrmStageMapping` for it, it
  PUTs the mapped Wealthbox stage to the linked opportunity.
- Failures land on `RolloverCase.wealthboxLastSyncError` and
  `CrmConnection.lastHealthError`. They never throw; the user's status
  change always succeeds in Rift even if Wealthbox is down.

Symmetric to the reverse-Won inbound path: changing status to `WON` in
Rift pushes Wealthbox; changing the opp to the Won stage in Wealthbox
pulls the Rift case to `WON` on next poll.

---

## What gets pulled from a Wealthbox opportunity

`getOpportunityHydrated(id)` joins the opportunity, its primary linked
Contact, and its custom fields into a single `OpportunityHydrated` shape.
On case creation, the following land on `RolloverCase`:

**From the opportunity's linked Contact:**
- `clientFirstName`, `clientLastName` — from `first_name`/`last_name`
- `clientEmail` — primary email (the `principal: true` one, else first)
- `clientPhone` — primary phone, includes extension if set
  (rendered as click-to-call in the case header)

**From the opportunity itself:**
- `wealthboxOpportunityId` — link
- `wealthboxOpportunityName` — opp name, shown next to the ID
- `wealthboxAmount` + `wealthboxAmountCurrency` — formatted as currency
- `wealthboxTargetClose` — expected paperwork close date
- `wealthboxProbability` — 0–100
- `wealthboxOppCreatedAt` — when the deal started in Wealthbox
- `sourceProvider` — from the `Source Provider` custom field
- `destinationCustodian` — from the `Destination Custodian` custom field
- `accountType` — from the `Account Type` custom field, mapped via `mapAccountType()`

**Refresh behavior:** The "Refresh from CRM" button on the case detail
panel re-pulls all Wealthbox-shadowed fields (opp metadata + phone) but
deliberately **does not** overwrite user-mutable case fields
(name, email, source provider, custodian, account type). Once the user
edits those in Rift, Rift becomes the source of truth.

### Required Wealthbox-side custom fields

Defined in `src/lib/crmSync.ts` as `WEALTHBOX_CUSTOM_FIELDS` (matching is
case-insensitive, but spell them right):

- `Source Provider` (Text)
- `Destination Custodian` (Text)
- `Account Type` (Single-select dropdown). Recognized via `mapAccountType()`:
  - any value containing "traditional" → `TRADITIONAL_IRA_401K`
  - any value containing "roth" → `ROTH_IRA_401K`
  - any value containing "403" → `IRA_403B`
  - exact "other" → `OTHER`
  - anything else → null → case still created but flagged `needsReview = true`

A case auto-created with any missing custom field gets `needsReview = true`
and `reviewReason` summarizing which fields were missing. The orange
"Review" pill renders on the cases list, and a banner with a "Mark as
reviewed" button shows on the detail page.

### Required Wealthbox-side stage configuration

The firm's Won stage in Wealthbox needs **win type = "won"** so Wealthbox
closes the opportunity natively when our outbound sync pushes it there.
Set in Wealthbox → Settings → Categories → Opportunity Stages.

---

## Per-firm stage configuration

`CaseStageConfig` is a per-firm overlay on the canonical `CaseStatus` enum:

```prisma
model CaseStageConfig {
  firmId      String
  status      CaseStatus
  customLabel String?     // null → use the canonical default label
  isEnabled   Boolean     // bookends always forced true server-side
  sortOrder   Int
  @@unique([firmId, status])
}
```

The migration backfills default rows (`customLabel: null`, `isEnabled: true`)
for every existing firm and for every new firm via `ensureFirmStageConfig`.

**Helpers in `src/components/casesDesignTokens.ts`:**
- `resolveStageLabel(status, overlays)` — returns the firm's custom label or the canonical default
- `resolveEnabledStages(overlays)` — returns the visible-to-this-firm pipeline in canonical order, with custom labels swapped in
- `ALWAYS_ENABLED_STATUSES` — `{ PROPOSAL_ACCEPTED, WON }`, used for the bookend lock

**Server preload in `src/lib/stageConfig.ts`:**
- `getFirmStageConfig(firmId)` — read overlay, called from server components
- `ensureFirmStageConfig(firmId)` — idempotent default-seed, called from `GET /api/firm/stages` and `POST /api/firm/onboarding` as a safety net

**Where labels render through the overlay:**
- Cases list (`CasesView`, `CasesViewBoard`, `CasesViewWorkbench`)
- Case detail status dropdown (`CaseDetail`)
- Dashboard pipeline buckets and "needs attention" feed
  (`STATUS_LABELS` is computed at request time from the overlay)

The status dropdown filters out disabled intermediate stages. Cases sitting
on a now-disabled stage still render (orphan column on the board, label
falls back to canonical default).

---

## Onboarding wizard

A new firm hits `/onboarding` on first ADMIN login, gated by
`Firm.onboardedAt IS NULL`. The dashboard layout redirects ADMIN there;
non-admins see a "setup in progress" screen until completion.

The wizard has 6 steps (see `src/components/OnboardingWizard.tsx`):

1. **Choose CRM** — confirms Wealthbox (the only supported CRM)
2. **Connect** — token paste with inline how-to + an illustrated mock of
   the Wealthbox API Access screen pointing at the Create Access Token
   button. Hits `POST /api/integrations/wealthbox`
3. **Trigger stage** — live-loads the firm's Wealthbox stages, admin
   picks which one creates Rift cases
4. **Won stage** — picks the Wealthbox stage to push to when a case is
   moved to `WON` in Rift. Both mappings save together to
   `PUT /api/integrations/crm/mapping`
5. **Rift stages** — the `CaseStageConfig` editor. Bookends locked on,
   intermediates have rename + enable/disable. Saves to
   `PUT /api/firm/stages`
6. **Invite team** — `GET /api/integrations/crm/users` returns Wealthbox
   account members annotated with `riftStatus: available | in_firm | other_firm`.
   Admin picks Advisor / Ops / Skip per row. Each invite hits the existing
   `POST /api/firm/team`

`POST /api/firm/onboarding` is the completion endpoint. It enforces:
- A CRM must be connected
- Both bookend mappings (`PROPOSAL_ACCEPTED` + `WON`) must exist
- `CaseStageConfig` rows are auto-seeded as a safety net

On success it sets `Firm.onboardedAt = now()` and unlocks the dashboard.

The wizard is idempotent on refresh — `GET /api/firm/onboarding` returns
the current state, and the wizard lands on the first not-yet-done step.

---

## CRM team import (post-onboarding)

The same Wealthbox-team-fetch path used in the wizard's step 6 is also
exposed in **Settings → Team → Import from Wealthbox**:

- Hidden when no CRM is connected
- Lazy-loads on click ("Load list") so opening Settings doesn't ping
  Wealthbox unnecessarily
- Annotates each row with Rift status:
  - `available` — eligible to invite
  - `in_firm` — already on this firm's team (locked, shows green pill with current role)
  - `other_firm` — email is taken by a Rift user at a different firm (locked, shows red pill)
- Bulk-invite button respects `Firm.seatsLimit`
- Each invite fires `POST /api/firm/team` sequentially with per-row outcome status

The connected admin themselves is filtered out client-side by email match
against `CrmConnection.connectedUserEmail`.

---

## Cron setup

Currently using **cron-job.org** (free, sub-minute granularity):

1. Free account at cron-job.org
2. New cronjob:
   - URL: `https://<your-vercel-app>.vercel.app/api/integrations/wealthbox/poll`
   - Method: `POST`
   - Header: `Authorization: Bearer <CRON_SECRET>` — value lives in Vercel's env vars
   - Schedule: every 10–15 min recommended (page-load polling covers active-user moments; cron only needs to cover off-hours and reverse-Won timeliness)

The previous `.github/workflows/wealthbox-poll.yml` GitHub Actions
workflow was removed because running both crons just produced extra noise
without configured GitHub-side secrets. To switch back: restore the file
from git history and add `CRON_SECRET` + `RIFT_BASE_URL` as repo secrets.

---

## Where to look in the codebase

| What | File |
|---|---|
| `CaseStatus` enum + `RolloverCase` Wealthbox fields | `prisma/schema.prisma` |
| `CaseStageConfig` overlay model | `prisma/schema.prisma` |
| Firm onboarding gate (`onboardedAt`) | `prisma/schema.prisma` (Firm model), `src/app/dashboard/layout.tsx` (redirect) |
| Mappable-statuses constant | `src/lib/crmSync.ts` (`MAPPABLE_STATUSES`) |
| Stage mapping API validation | `src/app/api/integrations/crm/mapping/route.ts` |
| Inbound poller (both bookends) | `src/lib/crmSync.ts` (`pollFirmForNewOpportunities`) |
| Page-load auto-sync | `src/lib/crmSync.ts` (`maybePollOnPageLoad`) — called from `src/app/dashboard/page.tsx` and `src/app/dashboard/cases/page.tsx` |
| Outbound sync | `src/lib/crmSync.ts` (`syncOpportunityStage`) — fired from `PATCH /api/cases/[id]` |
| Per-case refresh | `src/lib/crmSync.ts` (`refreshCaseFromCrm`) — called from `/api/cases/[id]/crm/refresh` |
| Polling endpoint | `src/app/api/integrations/crm/poll/route.ts` (legacy alias: `wealthbox/poll`) |
| Wealthbox API client | `src/lib/wealthbox.ts` |
| Normalizing CRM client adapter | `src/lib/crmClient.ts` (`getCrmClient`) |
| CRM org users (team import) | `src/lib/wealthbox.ts` (`getOrgUsers`) → `crmClient.ts` → `/api/integrations/crm/users` |
| Custom field name constants | `src/lib/crmSync.ts` (`WEALTHBOX_CUSTOM_FIELDS`) |
| Account type mapper | `src/lib/crmSync.ts` (`mapAccountType`) |
| Stage config helpers | `src/lib/stageConfig.ts`, `src/components/casesDesignTokens.ts` |
| Onboarding wizard | `src/components/OnboardingWizard.tsx`, `src/app/onboarding/page.tsx` |
| Onboarding completion | `src/app/api/firm/onboarding/route.ts` |
| Stage config API | `src/app/api/firm/stages/route.ts` |
| Settings UI (mapping + sync + stages) | `src/components/SettingsForm.tsx`, `src/components/settings/IntegrationsSection*` |
| CRM team import in Settings | `src/components/settings/TeamSection.tsx` (`CrmTeamImportPanel`) |
| Sync button on cases page | inline in `src/components/CasesView.tsx` (header "Sync Wealthbox" button) |
| Review badge / banner | `src/components/CasesView.tsx`, `src/components/CasesViewWorkbench.tsx`, `src/components/CaseDetail.tsx` |

---

## Tests

| File | Covers |
|---|---|
| `tests/api/wealthbox.test.ts` | crypto seal/open, connect/disconnect, mapping CRUD, per-case link/unlink, `syncOpportunityStage` outbound (200 / 500 / no_mapping / not_linked) |
| `tests/api/wealthbox-poll-isolation.test.ts` | tenant isolation on inbound poll, per-firm token usage, idempotency, `needsReview` flagging, missing-mapping no-op, opportunity metadata + client phone population, reverse Won bookend, `maybePollOnPageLoad` throttle + run-window |
| `tests/api/crm-users.test.ts` | `/api/integrations/crm/users` — ADVISOR rejection, no-CRM rejection, `riftStatus` annotation, name parsing fallback, 502 on Wealthbox errors |
| `tests/api/firm-stages.test.ts` | `CaseStageConfig` API — auto-seed defaults, tenant isolation, bookend `isEnabled` enforcement, label + disable persistence |
| `tests/api/firm-onboarding.test.ts` | `/api/firm/onboarding` — ADVISOR rejection, no-CRM rejection, missing-bookend rejection, success path, tenant isolation |

Run a single file:

```bash
npx vitest run tests/api/wealthbox-poll-isolation.test.ts
```

When changing schema fields used by tests, run **both** dev + test
migrations (see CLAUDE.md "Database").

---

## Verification checklist

End-to-end smoke test for the full integration:

1. `npm run dev` starts cleanly
2. New firm with `onboardedAt = NULL` → ADMIN login → redirected to `/onboarding`
3. Walk all 6 wizard steps. After step 6, redirected to dashboard
4. Settings → Integrations shows Wealthbox connected, both bookend mappings populated
5. Settings → Team shows the "Import from Wealthbox" panel; "Load list" pulls account members
6. In Wealthbox: create a new opportunity, link to a contact, fill the three custom fields, move to your trigger stage
7. Either wait one cron cycle, refresh the cases page, or click "Sync Wealthbox" — case appears
8. Verify the new case has: contact name + email + phone, opportunity name, amount, target close, probability, opp createdAt, source provider, destination custodian, account type
9. Test the missing-field path: create another opp with a custom field blank → case appears flagged with the orange "Review" pill
10. Click "Mark as reviewed" → pill disappears (verify the patch actually persists by refreshing)
11. Test outbound: move a case to `WON` in Rift → linked Wealthbox opp closes within a second
12. Test reverse Won: in Wealthbox, move a different opp to the Won stage → wait for cron / refresh / click sync → linked Rift case auto-closes with an activity event noting "pulled from Wealthbox"
13. Test intermediate skip: move a case to `SUBMITTED` → check `wealthboxLastSyncError` is null (silent skip, not a fake error)
14. Test stage config: rename "Submitted" to "Sent to custodian" in Settings → Integrations → Rift stages → verify the new label renders on the cases board, in the case detail status dropdown, and in the dashboard pipeline counts
15. Disable an intermediate stage → verify it disappears from the status dropdown but cases already on it still render

---

## Repo gotchas (still relevant)

- **`prisma migrate dev` requires TTY.** For CI/scripted use:
  ```
  npx prisma migrate deploy
  ```
- **Pooled URL gives ECONNREFUSED for ad-hoc tsx scripts.** Use `DIRECT_URL`.
- **`@dnd-kit` IDs cause hydration warnings** unless gated by a `mounted` flag.
  See `CasesViewBoard.tsx` for the working pattern.
- **`CardSection` already wraps a `Card`.** Nesting them produces "doubled-up"
  bordered boxes. Use `Card` directly with manual padding when you don't need
  the title/description block.
- **Page-load auto-sync is awaited but time-boxed.** The 2.5s timeout exists
  so a slow Wealthbox never blocks page rendering. Don't remove it.
