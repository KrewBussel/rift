# Wealthbox integration — handoff notes

Read this whole file before changing anything in `src/lib/crmSync.ts`,
`src/lib/crmClient.ts`, `src/lib/wealthbox.ts`, the
`/api/integrations/wealthbox/**` routes, or the `CrmStageMapping` schema.

It captures the design conversation that produced commit `7b7d366` so a new
Claude Code session (or human) can pick up without re-deriving it.

---

## The model in one paragraph

Rift is a 7-stage rollover pipeline. Of those 7 stages, only the **bookends**
talk to Wealthbox. `PROPOSAL_ACCEPTED` is the inbound entry point — when a
Wealthbox opportunity reaches the firm-mapped stage, a Rift case is created.
`WON` is the outbound close trigger — moving a case to Won pushes the mapped
stage to Wealthbox, which closes the opp natively via its winning-stage flag.
The five intermediate stages (`AWAITING_CLIENT_ACTION`, `READY_TO_SUBMIT`,
`SUBMITTED`, `PROCESSING`, `IN_TRANSIT`) are **Rift-only** and never sync.

```
WEALTHBOX                          RIFT
"Proposal Accepted" stage   ──→    PROPOSAL_ACCEPTED   (created via poll)
                                   AWAITING_CLIENT_ACTION
                                   READY_TO_SUBMIT
                                   SUBMITTED               ← intermediate,
                                   PROCESSING                Rift-only,
                                   IN_TRANSIT                no CRM round-trip
"Won" stage (closes opp)   ←──     WON                  (push on status change)
```

Why bookends only: most rollover work happens off-CRM (paperwork, custodian
ops). Mapping every status would either (a) clutter the firm's Wealthbox
pipeline with internal-process stages or (b) require Rift to fight Wealthbox
when the advisor edits the stage there. Bookends keep the CRM clean and
keep Rift authoritative for the in-progress states.

---

## Phase 1 + 2 are done and pushed (`origin/main`)

Commit: `7b7d366 Wealthbox stage workflow: Proposal Accepted ↔ Won bookend sync`

### Phase 1 — schema + UI rename
- `CaseStatus` enum: `INTAKE` → `PROPOSAL_ACCEPTED`, `COMPLETED` → `WON`
- Migration: `prisma/migrations/20260501000000_rename_case_status_proposal_won`
- Default on `RolloverCase.status` updated to `PROPOSAL_ACCEPTED`
- `CrmStageMapping` API restricted to `PROPOSAL_ACCEPTED` + `WON` only (`max(2)`)
- Settings UI (`SettingsForm.tsx`) shows just two mapping rows, not seven
- All 17 label/color/dropdown maps across the app updated
- All `status === "COMPLETED"` filters on `RolloverCase` switched to `"WON"` —
  TaskStatus.COMPLETED references left alone

### Phase 2 — sync infrastructure
- `src/lib/wealthbox.ts`: added `getContact()`, `pickPrimaryEmail()`,
  `readCustomField()`, plus `custom_fields[]` on the opportunity type
- `src/lib/crmClient.ts`: added `getOpportunityHydrated()` (joins opportunity
  + linked Contact + custom fields) and `listOpportunitiesByStage()`
- `src/lib/crmSync.ts`:
  - `pollFirmForNewOpportunities(firmId)` — the inbound creator. Idempotent
    (skips already-linked opps). Per-opp errors don't abort the run.
  - `syncOpportunityStage()` (already existed) now silently returns
    `rift_only_stage` for intermediate statuses instead of writing fake
    "no_mapping" errors to `wealthboxLastSyncError`.
  - `MAPPABLE_STATUSES` constant — keep in sync with the API validation.
- `src/app/api/integrations/wealthbox/poll/route.ts`: POST endpoint with
  two auth modes:
  - `Authorization: Bearer ${CRON_SECRET}` → polls **all** firms (for cron)
  - Active ADMIN session → polls **own firm only** (for the manual button)
- `prisma/migrations/20260502000000_add_needs_review_to_case`: adds
  `needsReview Boolean` + `reviewReason String?` to `RolloverCase`
- `SettingsForm.tsx`: "Sync from Wealthbox" panel with a "Sync now" button
- `CasesView.tsx`: orange "Needs review" pill (tooltip = reason)
- `CaseDetail.tsx`: banner with reason + "Mark as reviewed" button

### Wealthbox custom field names (must match exactly, case-insensitive)
Defined in `src/lib/crmSync.ts` as `WEALTHBOX_CUSTOM_FIELDS`:
- `Source Provider` (free text)
- `Destination Custodian` (free text)
- `Account Type` (single-select dropdown)

`Account Type` dropdown values map via `mapAccountType()`:
- contains "traditional" → `TRADITIONAL_IRA_401K`
- contains "roth" → `ROTH_IRA_401K`
- contains "403" → `IRA_403B`
- exact "other" → `OTHER`
- anything else → null → case still created but flagged needsReview

---

## What's NOT done — pick up here

### 1. Wealthbox-side configuration (manual, no code)

In Wealthbox dashboard:

1. **Settings → Custom Fields → Opportunities**, add three fields with
   these exact names (case-insensitive but spell them right):
   - `Source Provider` (Text)
   - `Destination Custodian` (Text)
   - `Account Type` (Single-select dropdown). Options:
     - `401(k) → Traditional IRA`
     - `401(k) → Roth IRA`
     - `403(b) → IRA`
     - `Other`
2. **Settings → Categories → Opportunity Stages**: confirm the `Won` stage
   has its **win type** set to "won". This is what makes Wealthbox close
   the opp when our outbound sync moves it there.
3. In Rift: **Settings → Integrations**, set the two stage mappings
   (Proposal Accepted ↔ your Wealthbox stage, Won ↔ Wealthbox Won).

### 2. External cron pinger (Vercel Hobby tier won't run sub-daily crons)

The `/api/integrations/wealthbox/poll` route exists and works on demand,
but nothing pings it on a schedule. User is on **Vercel Hobby**, which
caps cron jobs at once-per-day — useless for this. Pick one:

**Option A — cron-job.org (recommended, free, fastest setup)**
1. Create a free account at cron-job.org
2. New cronjob:
   - URL: `https://<your-vercel-app>.vercel.app/api/integrations/wealthbox/poll`
   - Method: `POST`
   - Header: `Authorization: Bearer <CRON_SECRET>` (the value already in
     the Vercel env vars)
   - Schedule: every 1, 2, or 5 minutes (user hasn't picked yet)

**Option B — GitHub Actions**
Workflow file would live at `.github/workflows/wealthbox-poll.yml`,
schedule: `cron: '*/5 * * * *'` (every 5 min — GH Actions doesn't
guarantee sub-5-min). POSTs to the same URL with the same auth header
stored in repo secrets.

Until either is set up, the **"Sync now"** button in Settings →
Integrations does the same thing on demand.

### 3. Optional polish (not on the critical path)

- **Pagination in `listOpportunitiesByStage`**: `crmClient.ts` currently
  fetches `limit: 500` and filters client-side because Wealthbox's API
  doesn't expose a stage filter. If a firm has >500 active opportunities,
  newer ones could be missed. Add cursor/offset pagination.
- **Tests**: no isolation test for `pollFirmForNewOpportunities` yet.
  Pattern: seed two firms with Wealthbox connections, mock the wb API,
  assert firm A's poll never creates a case in firm B.
- **Activity event for inbound creation** is generic
  (`"Auto-created from Wealthbox opportunity \"X\""`). Could add a
  dedicated `EventType.CASE_AUTO_CREATED` for filtering.
- **Salesforce inbound**: `getOpportunityHydrated` for Salesforce returns
  empty `contact` + `customFields`. If Salesforce ever needs inbound
  polling, the Salesforce branch in `crmClient.ts` needs the equivalent
  contact-and-custom-fields hydration path.

---

## Repo gotchas (learned the hard way last session)

- **Do NOT put the project in `~/Desktop` on a Mac**. macOS auto-syncs
  Desktop to iCloud and silently evicts file content as "dataless"
  placeholders — the bytes appear to exist (`ls -lO` shows size) but
  reads return nothing. This corrupted ~20 source files including
  `src/app/layout.tsx` and broke the dev server. The project now lives
  at `~/dev/rift`. On the new machine, clone to a non-iCloud path:
  `git clone https://github.com/KrewBussel/rift.git ~/dev/rift`.
- **Vercel pull**: env vars come down as `.env.local`, not `.env`.
  `prisma.config.ts` reads `process.env.DIRECT_URL ?? process.env.DATABASE_URL`,
  but if both are missing or the URL doesn't include `?sslmode`, the pg
  Pool will throw ECONNRESET on idle sockets. The fix is in
  `src/lib/prisma.ts` (already committed): `ssl: { rejectUnauthorized: false }`,
  `keepAlive: true`, and a `pool.on('error')` handler so dropped idle
  sockets don't crash the dev server.
- **Migrations on a non-interactive shell**: `prisma migrate dev` requires
  TTY. For CI/scripted use:
  ```
  npx prisma migrate deploy
  ```
  (deploys the SQL files in `prisma/migrations/` without prompting). To
  generate a new migration, run `prisma migrate dev` interactively.
- **Pooled URL and ad-hoc tsx scripts**: Supabase's pooled URL gives
  ECONNREFUSED for one-off scripts. Use `DIRECT_URL` for those — see
  `scripts/inspect-users.ts` and `scripts/cleanup-non-admins.ts` for
  working examples.

---

## Verification checklist (do this end-to-end after Wealthbox-side setup)

1. ✅ `npm run dev` starts cleanly, `GET /` returns 200
2. ✅ Settings → Integrations shows Wealthbox connected, just two
   mapping rows
3. Save mappings: Proposal Accepted ↔ <Wealthbox stage>, Won ↔ Won
4. In Wealthbox: create a new opportunity, link it to a contact, fill
   the three custom fields, move it to your "Proposal Accepted" stage
5. In Rift: Settings → Integrations → "Sync now". Result should show
   `Created: 1`. The new case appears on the Cases page.
6. Verify `clientFirstName/Last/Email` came from the Wealthbox contact
   and `sourceProvider/destinationCustodian/accountType` came from the
   custom fields
7. Test the missing-field path: create another Wealthbox opp with one
   custom field blank, sync, expect a case with the orange "Needs
   review" pill and reason text
8. Test outbound: move a case to `WON` in Rift, refresh Wealthbox,
   the linked opportunity should be at the mapped Won stage and closed
9. Test intermediate skip: move a case to `SUBMITTED`, then check
   `wealthboxLastSyncError` on that case — should be null (silent skip,
   not a fake error)

---

## Where to look in the codebase

| What | File |
|---|---|
| Enum definition | `prisma/schema.prisma` (`enum CaseStatus`) |
| Mappable-statuses constant | `src/lib/crmSync.ts` (`MAPPABLE_STATUSES`) |
| API mapping validation | `src/app/api/integrations/crm/mapping/route.ts` |
| Inbound poller | `src/lib/crmSync.ts` (`pollFirmForNewOpportunities`) |
| Outbound sync | `src/lib/crmSync.ts` (`syncOpportunityStage`) — fired from `PATCH /api/cases/[id]` |
| Polling endpoint | `src/app/api/integrations/wealthbox/poll/route.ts` |
| Wealthbox API client | `src/lib/wealthbox.ts` |
| Polymorphic CRM client | `src/lib/crmClient.ts` |
| Custom field name constants | `src/lib/crmSync.ts` (`WEALTHBOX_CUSTOM_FIELDS`) |
| Account type mapper | `src/lib/crmSync.ts` (`mapAccountType`) |
| Settings UI (mapping + sync button) | `src/components/SettingsForm.tsx` (`IntegrationsSection`) |
| Review badge | `src/components/CasesView.tsx`, `src/components/CaseDetail.tsx` |
