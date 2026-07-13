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
| External cron | cron-job.org → `POST /api/integrations/crm/poll` (legacy alias: `/api/integrations/wealthbox/poll`) | Configurable (recommended 10–15 min once page-load polling is live) | `Authorization: Bearer ${CRON_SECRET}` |
| Page-load auto-sync | `maybePollOnPageLoad(firmId)` from server components on `/dashboard` and `/dashboard/cases` | Throttled to once per 10 s per firm (keyed on `CrmConnection.lastPolledAt`); 2.5 s timeout | Active session (firm-scoped) |
| Manual button | "Sync Wealthbox" button on the cases page (inline in `CasesView.tsx`); "Sync now" in Settings → Integrations | On click | Active ADMIN session (firm-scoped) |

The poll endpoint dispatches based on auth mode:
- `Bearer ${CRON_SECRET}` → polls **all** firms. Response includes `totalCreated`, `totalClosed`, and `totalErrors` aggregated across firms, plus the per-firm `results`.
- Active ADMIN session → polls **own firm only**, returning `{ mode: "manual", result }`.

The page-load throttle keys off `lastPolledAt` — a column written *only* by an inbound scan — rather than `lastHealthCheckAt`, which outbound stage pushes also bump. Keying off the health timestamp would let a recent outbound sync suppress inbound polling.

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
- `Account Type` (Single-select dropdown). Recognized via `mapAccountType()`. Order matters — **"403" is checked first** (most-specific wins), so "Roth 403(b)" and "Traditional 403(b)" resolve to `IRA_403B` rather than being misclassified:
  - any value containing "403" → `IRA_403B`
  - any value containing "traditional" → `TRADITIONAL_IRA_401K`
  - any value containing "roth" → `ROTH_IRA_401K`
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
- Cases list (`CasesView`)
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

The wizard has **4 steps** (see `src/components/OnboardingWizard.tsx`):

1. **Workspace URL** — the firm picks its slug for `<slug>.riftira.com`,
   with a live availability check. Saves via `PUT /api/firm/slug`.
2. **Connect Wealthbox** — token paste with inline how-to + an illustrated
   mock of the Wealthbox API Access screen pointing at the Create Access
   Token button. Hits `POST /api/integrations/wealthbox`, which does more
   than just store the token (see below).
3. **Confirm stages** — the connect response pre-fills the trigger
   (Proposal Accepted) and Won bookends; the admin usually just clicks
   Continue. Either can be overridden from the stage list. Saves via
   `PUT /api/integrations/crm/mapping`.
4. **Finish** — pipeline overview + "what happens next" summary, then
   `POST /api/firm/onboarding` marks completion.

### Connect-time auto-detection

The heavy lifting happens in step 2. `POST /api/integrations/wealthbox`:

1. Validates the pasted token against Wealthbox `/me` and persists the
   encrypted connection.
2. Pulls the firm's opportunity stages and runs `suggestBookendStages()`
   (in `crmSync.ts`) — a name-matching heuristic. Trigger candidates:
   stages matching "proposal" + "accept", then "proposal", "accepted",
   "signed". Won candidates: exact "won"/"closed won"/"closed - won", then
   "closed"+"won", then "won". If both heuristics collide on the same
   stage, the Won suggestion is dropped so the admin picks it explicitly.
3. If **both** bookends are confidently detected **and** the firm has no
   existing bookend mappings, it auto-saves them via
   `upsertBookendMappings()` and returns `autoMapped: true`. A token
   *rotation* never overwrites a firm's hand-tuned mappings (the "no
   existing mappings" guard).

The response shape is `{ connection, stages, suggested: { triggerStageId,
wonStageId }, autoMapped }`. A stage-fetch failure never fails the connect —
the token is valid and saved; the confirm step just falls back to the
manual picker with an empty list.

`POST /api/firm/onboarding` is the completion endpoint. It enforces:
- A CRM must be connected
- Both bookend mappings (`PROPOSAL_ACCEPTED` + `WON`) must exist
- `CaseStageConfig` rows are auto-seeded as a safety net

On success it sets `Firm.onboardedAt = now()` and unlocks the dashboard.

The wizard is idempotent on refresh — `GET /api/firm/onboarding` returns
the current state, and if a connection already exists the wizard resumes on
the confirm step with the mappings pre-filled.

---

## Post-onboarding: Settings → Integrations

CRM connection management and Rift-stage configuration moved out of the
wizard into **Settings → Integrations**
(`src/components/SettingsIntegrations.tsx`, rendered by `Settings.tsx`).
The settings page honors `?tab=` deep-links
(`src/app/dashboard/settings/page.tsx` reads `searchParams` and passes
`initialTab`), so the wizard's exit redirect to
`/dashboard/settings?tab=integrations` lands directly on this panel.

When a CRM is connected, the panel shows four cards:

- **Connection** — health status (`Healthy` / `Sync error` from
  `lastHealthOk`), the connected Wealthbox user, and the last error if any.
  Actions:
  - **Sync now** → `POST /api/integrations/crm/poll` (own-firm manual poll)
  - **Rotate token** → re-paste flow hitting `POST /api/integrations/wealthbox`
    (leaves stage mappings untouched)
  - **Disconnect** → `DELETE /api/integrations/crm` (clears the token + stage
    mappings and unlinks cases; case data stays)
- **Stage sync** — edit the two bookend mappings. Loads stages via
  `GET /api/integrations/crm/stages`, saves via `PUT /api/integrations/crm/mapping`.
- **Rift stages** — the `CaseStageConfig` editor: rename or disable the five
  intermediate stages (bookends locked on). Loads/saves via
  `GET`/`PUT /api/firm/stages`.
- **Custom fields** — a reference card listing the three required Wealthbox
  opportunity custom fields.

When no CRM is connected, the panel shows a single connect card.

### Team invites

Team invites live in **Settings → Team** (`/dashboard/team`,
`src/components/TeamPage.tsx`), separate from Integrations. Invites go
through `POST /api/firm/team` (single, seat-gated by `Firm.seatsLimit`).

The `GET /api/integrations/crm/users` endpoint — which returns Wealthbox
account members annotated with `riftStatus: available | in_firm |
other_firm` — still exists and is covered by tests, but **no UI currently
consumes it**. The old bulk "Import from Wealthbox" panel was removed along
with the wizard's team step; the endpoint remains for future/API use.

---

## Cron setup

Currently using **cron-job.org** (free, sub-minute granularity):

1. Free account at cron-job.org
2. New cronjob:
   - URL: `https://<your-vercel-app>.vercel.app/api/integrations/crm/poll` (the legacy `/api/integrations/wealthbox/poll` alias still forwards here)
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
| Mappable-statuses constant | `src/lib/crmSync.ts` (`MAPPABLE_STATUSES`) — the mapping route's Zod enum imports it |
| Stage mapping API validation | `src/app/api/integrations/crm/mapping/route.ts` |
| Inbound poller (both bookends) | `src/lib/crmSync.ts` (`pollFirmForNewOpportunities`) |
| Page-load auto-sync | `src/lib/crmSync.ts` (`maybePollOnPageLoad`) — called from `src/app/dashboard/page.tsx` and `src/app/dashboard/cases/page.tsx` |
| Outbound sync | `src/lib/crmSync.ts` (`syncOpportunityStage`) — fired from `PATCH /api/cases/[id]` |
| Per-case refresh | `src/lib/crmSync.ts` (`refreshCaseFromCrm`) — called from `/api/cases/[id]/crm/refresh` |
| Polling endpoint | `src/app/api/integrations/crm/poll/route.ts` (legacy alias: `wealthbox/poll`) |
| Wealthbox API client | `src/lib/wealthbox.ts` |
| Normalizing CRM client adapter | `src/lib/crmClient.ts` (`getCrmClient`) |
| CRM org users (unused by UI) | `src/lib/wealthbox.ts` (`getOrgUsers`) → `crmClient.ts` → `/api/integrations/crm/users` |
| Bookend auto-detect + auto-save | `src/lib/crmSync.ts` (`suggestBookendStages`, `upsertBookendMappings`); called from `src/app/api/integrations/wealthbox/route.ts` |
| Custom field name constants | `src/lib/crmSync.ts` (`WEALTHBOX_CUSTOM_FIELDS`) |
| Account type mapper | `src/lib/crmSync.ts` (`mapAccountType`) |
| Stage config helpers | `src/lib/stageConfig.ts`, `src/components/casesDesignTokens.ts` |
| Onboarding wizard | `src/components/OnboardingWizard.tsx`, `src/app/onboarding/page.tsx` |
| Onboarding completion | `src/app/api/firm/onboarding/route.ts` |
| Stage config API | `src/app/api/firm/stages/route.ts` |
| Settings → Integrations UI (connection + mapping + sync + Rift stages) | `src/components/SettingsIntegrations.tsx`; rendered by `Settings.tsx`, deep-linked via `src/app/dashboard/settings/page.tsx` (`initialTab`) |
| Team invites | `src/components/TeamPage.tsx`, `src/app/dashboard/team/page.tsx` |
| Sync button on cases page | inline in `src/components/CasesView.tsx` (header "Sync Wealthbox" button) |
| Review badge / banner | `src/components/CasesView.tsx`, `src/components/CaseDetail.tsx` |

---

## Tests

| File | Covers |
|---|---|
| `tests/api/wealthbox.test.ts` | crypto seal/open, connect/disconnect, mapping CRUD, per-case link/unlink, `syncOpportunityStage` outbound (200 / 500 / no_mapping / not_linked) |
| `tests/api/wealthbox-poll-isolation.test.ts` | tenant isolation on inbound poll, per-firm token usage, idempotency, `needsReview` flagging, missing-mapping no-op, opportunity metadata + client phone population, reverse Won bookend, `maybePollOnPageLoad` throttle + run-window |
| `tests/api/crm-users.test.ts` | `/api/integrations/crm/users` — ADVISOR rejection, no-CRM rejection, `riftStatus` annotation, name parsing fallback, 502 on Wealthbox errors |
| `tests/api/crm-mapping-unit.test.ts` | Pure-unit coverage of `mapAccountType` (incl. the "403" ordering — "Roth 403(b)" → `IRA_403B`) and `suggestBookendStages` (name heuristics + same-stage collision handling) |
| `tests/api/case-visibility.test.ts` | Intra-firm assignment gate — non-admins can't read/mutate an unassigned same-firm case; assignment IDs validated same-firm (`caseVisibilityFilter` + `isSameFirmUser`) |
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
3. Walk all 4 wizard steps (workspace → connect → confirm → finish). On the connect step, confirm the bookends come back pre-filled and `autoMapped` is set; after finish, redirected to dashboard
4. Settings → Integrations shows Wealthbox connected (Healthy), both bookend mappings populated, and the Rift-stages editor
5. Settings → Team lists the firm's users; invite a teammate via `POST /api/firm/team`
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
- **`CardSection` already wraps a `Card`.** Nesting them produces "doubled-up"
  bordered boxes. Use `Card` directly with manual padding when you don't need
  the title/description block.
- **Page-load auto-sync is awaited but time-boxed.** The 2.5s timeout exists
  so a slow Wealthbox never blocks page rendering. Don't remove it.
