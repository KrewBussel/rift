# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Rift is a multi-tenant rollover-case-management SaaS for independent RIAs (registered investment advisors). One firm = many users (ADMIN / ADVISOR / OPS) = many `RolloverCase` records moving through a 7-stage pipeline:

```
PROPOSAL_ACCEPTED → AWAITING_CLIENT_ACTION → READY_TO_SUBMIT → SUBMITTED → PROCESSING → IN_TRANSIT → WON
```

The two **bookend** stages (`PROPOSAL_ACCEPTED`, `WON`) sync bidirectionally with the firm's CRM. The five **intermediate** stages are Rift-only — the CRM never sees them. Each firm can rename and selectively disable the intermediate stages via a `CaseStageConfig` overlay (the bookends are always enabled because Wealthbox sync depends on them).

Around the case, the app layers a custodian-knowledge hub, a magic-link client portal, Wealthbox CRM sync, an admin dashboard with customizable widgets, and a guided first-time onboarding wizard. Wealthbox is the only supported CRM.

## Commands

```bash
npm run dev               # next dev (port 3000)
npm run build             # next build
npm run lint              # eslint
npm run test              # vitest in watch mode
npm run test:run          # vitest run (CI)
npx tsc --noEmit          # typecheck (no test build step otherwise)

# Single test file or pattern
npx vitest run tests/api/wealthbox.test.ts
npx vitest run -t "stores an encrypted connection"
```

### Database

```bash
npx prisma migrate dev --name <change>     # create+apply migration in dev
npx prisma generate                         # regen client (auto-runs postinstall)
# Apply existing migrations to the test DB (separate database):
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
```

`prisma.config.ts` resolves `DIRECT_URL ?? DATABASE_URL`; the pooled `DATABASE_URL` will hang on migrate, so set both in `.env`. Supabase pooler hosts use the new format `aws-1-<region>.pooler.supabase.com` — the legacy `db.<ref>.supabase.co` no longer resolves.

### Seeding

The only seed in this repo is **reference data**, not demo data. There are no demo firms, demo users, or demo cases — production data is created via the onboarding flow described below.

```bash
DATABASE_URL=$(grep DIRECT_URL .env | sed -e 's/DIRECT_URL=//' -e 's/"//g') \
  npx tsx prisma/seed-custodians.ts   # populates the global Custodian directory
```

`seed-custodians.ts` is idempotent — run it once per environment, and again whenever the custodian dataset is updated. Pooled URL gives ECONNREFUSED for one-off scripts; always run with `DIRECT_URL`.

## Architecture

### Stack

- **Next.js 16** App Router (`src/app/**`). The middleware file is renamed: it lives at `src/proxy.ts` and exports a `proxy` function. CSP is enforced there in production only.
- **Prisma 7** with the **driver adapter pattern** (`PrismaPg` + `pg.Pool({ max: 1 })`). The single shared client is in `src/lib/prisma.ts` — never construct another one.
- **NextAuth v5 (beta)** with credentials provider, JWT sessions. The session callback puts `id`, `firmId`, and `role` on `session.user` — code reads these directly.
- **Tailwind v4** via `@tailwindcss/postcss`. Inline styles are common for color-tokens (we don't use a Tailwind config for the design system); shared dark palette is `#0a0d12` (page bg) / `#141a24` (card bg) / `#252b38` (border) / `#e4e6ea` (text) / `#7d8590` (muted) / `#60a5fa` (blue accent).
- **Vitest 4** with `fileParallelism: false` (tests share a real Postgres test DB).

### Multi-tenancy

Every firm-scoped model has `firmId`. **Always** scope queries: cases use `where: { id, firmId }`, never just `{ id }`. Non-admin role visibility:

```ts
const visibility =
  role === "ADVISOR" ? { assignedAdvisorId: userId }
  : role === "OPS"   ? { assignedOpsId: userId }
  : {};
```

The cross-firm isolation tests in `tests/api/*-isolation.test.ts` are the safety net — every new resource type should add one.

### Authentication layers

There are **two independent auth systems**:

1. **Firm users** — NextAuth credentials. `auth()` returns `session.user.{id, firmId, role}`. Routes call `await auth()` first thing.
2. **Client portal** — `ClientAccessToken` (single-use magic link, 7d TTL) → `ClientSession` (cookie-bound, 24h TTL). All hashed with sha256; raw values only in email/cookie. Lives in `src/lib/client-auth.ts`. The `requireClientSession` guard rejects requests with a firm session active (mutual exclusion → 409).

`/api/client/**` and `/client/**` use the second system. Everything else uses the first.

### Firm onboarding flow

There is **no public signup route**. A firm's first record is created by us (the platform) after a contract is signed. From there, the admin walks through a 4-step onboarding wizard at `/onboarding` before they can use the dashboard.

**Step 0 — platform creates the Firm + first ADMIN.** A one-off script inserts a `Firm` row (with `onboardedAt: null`) and a single `User` with `role: ADMIN`. A `PasswordResetToken` is issued; the admin receives an email with a set-password link.

**Steps 1–4 — guided wizard at `/onboarding`** (gated on `Firm.onboardedAt IS NULL` for ADMIN; non-admins see a "setup in progress" screen). See `src/components/OnboardingWizard.tsx`:

| # | Step | What it does |
|---|---|---|
| 1 | **Workspace URL** | Firm picks its slug for `<slug>.riftira.com`. Live availability check; saves via `PUT /api/firm/slug` |
| 2 | **Connect Wealthbox** | Token paste with inline how-to + an illustrated mock of the Wealthbox API Access screen. Hits `POST /api/integrations/wealthbox`, which validates the token **and** pulls the firm's stages, auto-detects the bookends (via `suggestBookendStages()`), and auto-saves both mappings when confident (via `upsertBookendMappings()`) |
| 3 | **Confirm stages** | Shows the auto-detected trigger (Proposal Accepted) and Won stages for one-click confirmation — usually pre-filled. Admin can override either; saves via `PUT /api/integrations/crm/mapping` |
| 4 | **Finish** | Pipeline overview + "what happens next" summary. Completes via `POST /api/firm/onboarding` |

The connect step does the heavy lifting: `POST /api/integrations/wealthbox` returns the stage list, a `suggested` bookend pair, and an `autoMapped` flag. When both bookends match by name **and** the firm has no existing mappings, they're saved automatically (a token rotation never clobbers hand-tuned mappings). This is why the wizard collapsed from the old 8-step flow to 4 — the separate "Choose CRM", "Trigger stage", "Won stage", "Rift stages", and "Invite team" steps are gone.

`POST /api/firm/onboarding` is the completion endpoint. It enforces preconditions: a CRM must be connected and **both** bookend mappings must exist. Sets `Firm.onboardedAt = now()` and unlocks the dashboard. The wizard is idempotent on refresh — `GET /api/firm/onboarding` returns current state and resumes on the confirm step if a connection already exists.

Existing firms predating the wizard are auto-onboarded via the migration backfill (`onboardedAt = createdAt`) so nothing breaks for them. Default `CaseStageConfig` rows for all 7 statuses are also seeded by the migration.

**Post-onboarding config lives in Settings.** Rift-stage renaming/disabling and CRM connection management (rotate token, remap bookends, sync now, disconnect) moved out of the wizard into **Settings → Integrations**. Team invites live in **Settings → Team** (`/dashboard/team`).

#### Team invites — single + bulk

- **Single:** `POST /api/firm/team` with `{firstName, lastName, email, role}`. Creates a `User` row, generates a temporary password, returns it to the admin to share. (Email-based set-password is still TODO; the temp password mechanism is the current state.) Seats gated by `Firm.seatsLimit`.
- **Bulk from CRM:** `GET /api/integrations/crm/users` returns Wealthbox account members annotated with `riftStatus: "available" | "in_firm" | "other_firm"`. The endpoint still exists (and is covered by tests) for future/API use, but **no UI currently consumes it** — the bulk-from-CRM step was removed from the wizard and there's no import panel in Settings → Team today. All invites go through the single `POST /api/firm/team` path.

CRM-assisted invite is **never an auto-import**:
- `ADVISOR` vs `OPS` is a Rift-only concept (it gates `assignedAdvisorId` vs `assignedOpsId` visibility).
- Auto-importing every CRM user blows past `Firm.seatsLimit`.
- CRM-side email and Rift login email are not always the same person.
- The admin always picks who and what role.

### CRM integration model

```
Firm  ──1:1──  CrmConnection  (provider: WEALTHBOX)
                  ↓
                  encryptedToken (AES-256-GCM via AUTH_SECRET; Wealthbox PATs don't expire)
                  ↓
                  CrmStageMapping[]  (firmId, riftStatus → crmStageId/Name)
                  └─ capped at the two bookends: PROPOSAL_ACCEPTED + WON

Firm  ──1:n──  CaseStageConfig  (firmId, status, customLabel?, isEnabled, sortOrder)
                  └─ seeded for all 7 statuses; bookends forced isEnabled=true server-side

RolloverCase  ──  Wealthbox-shadowed metadata (snapshot from the linked opp):
                    wealthboxOpportunityId
                    wealthboxOpportunityName
                    wealthboxAmount + wealthboxAmountCurrency
                    wealthboxTargetClose
                    wealthboxProbability
                    wealthboxOppCreatedAt
                    wealthboxLinkedAt / wealthboxLastSyncedAt / wealthboxLastSyncError
                    needsReview + reviewReason  (auto-flagged when missing custom fields)
                    clientPhone                 (pulled from contact, click-to-call in UI)
```

#### Client adapter

`src/lib/crmClient.ts` is the **normalizing adapter** over the raw Wealthbox API module — routes call `getCrmClient(connection)` (decrypts the stored token) and get a `CrmClient` interface:

```
getStages, searchOpportunities, getOpportunity, getOpportunityHydrated,
listOpportunitiesByStage, updateOpportunityStage, createOpportunity, getOrgUsers
```

Raw HTTP shapes live in `src/lib/wealthbox.ts` (every function takes the decrypted token as its first arg); `crmClient.ts` adapts them to the neutral shapes `crmSync.ts` and the routes consume. Keep Wealthbox-specific response quirks inside those two files.

#### Sync engine — `src/lib/crmSync.ts`

Non-throwing throughout. Failures land on the case row and connection but never block the upstream user action.

| Function | Direction | Trigger |
|---|---|---|
| `syncOpportunityStage(caseId)` | Rift → CRM | Fire-and-forget from `PATCH /api/cases/[id]` when status changes. Silently no-ops for intermediate (Rift-only) stages |
| `pollFirmForNewOpportunities(firmId)` | CRM → Rift, **both bookends** | Cron + page-load auto-sync + manual button. Single pass scans the Proposal Accepted stage to create new cases AND scans the Won stage to auto-close linked cases |
| `refreshCaseFromCrm(caseId, actorUserId)` | CRM → Rift, single case | "Refresh from CRM" button on case detail. Re-pulls stage AND all Wealthbox-shadowed metadata (amount, target close, probability, phone, etc.) |
| `maybePollOnPageLoad(firmId)` | CRM → Rift, throttled | Server components on the dashboard and cases list pages await this. Throttled to once per 10s per firm; 2.5s timeout. Silent failure |

The reverse Won path inside `pollFirmForNewOpportunities` is what auto-closes a Rift case when its linked opportunity reaches the Won stage in Wealthbox — symmetric to the outbound `syncOpportunityStage` push.

#### Inbound triggers — there are three

The cron is the baseline; the other two cover gaps:

1. **External cron** (cron-job.org → `POST /api/integrations/crm/poll` or the legacy alias `/api/integrations/wealthbox/poll` with `Authorization: Bearer ${CRON_SECRET}`). Polls every connected firm. Cadence is set in cron-job.org; the codebase doesn't care.
2. **Page-load auto-sync** — `maybePollOnPageLoad` in cases list and dashboard server components. Makes refreshes feel real-time during active use without spamming the API.
3. **Manual button** — the "Sync Wealthbox" button in the cases page header (inline in `CasesView.tsx`) calls the same poll endpoint with the active session, scoping to the admin's own firm.

All three call into the same `pollFirmForNewOpportunities` function. The endpoint is fully idempotent — duplicate triggers are safe.

#### Routes

- `/api/integrations/crm/*` — `route.ts` (connection state + DELETE), `stages` (GET CRM stages), `mapping` (PUT bookend mappings), `opportunities` (search), `users` (GET CRM org members for bulk invite)
- `/api/integrations/wealthbox` — POST token paste (connect)
- `/api/integrations/crm/poll` — POST inbound trigger; accepts `Authorization: Bearer ${CRON_SECRET}` for all-firms cron mode, or an active ADMIN session for own-firm-only manual mode. The legacy alias `/api/integrations/wealthbox/poll` forwards here for back-compat with existing cron configurations.
- `/api/cases/[id]/crm` — per-case link/unlink
- `/api/cases/[id]/crm/refresh` — per-case `refreshCaseFromCrm`
- `/api/firm/stages` — GET/PUT the per-firm `CaseStageConfig` overlay
- `/api/firm/onboarding` — GET state for the wizard, POST to mark complete

Wealthbox auth header is `ACCESS_TOKEN: <token>` — **not** Bearer.

#### Required CRM-side configuration

Inbound case creation depends on three custom fields on the firm's Wealthbox **Opportunities** (Settings → Custom Fields → Opportunities). Field names are matched case-insensitively; defined in `WEALTHBOX_CUSTOM_FIELDS` in `crmSync.ts`:
- `Source Provider` (Text)
- `Destination Custodian` (Text)
- `Account Type` (Single-select dropdown)

Account Type values funnel through `mapAccountType()`:
- any value containing "traditional" → `TRADITIONAL_IRA_401K`
- any value containing "roth" → `ROTH_IRA_401K`
- any value containing "403" → `IRA_403B`
- exact "other" → `OTHER`
- anything else → null → case still created but flagged `needsReview = true`

Plus: for the Won outbound push to actually close the opportunity natively, the firm's Won-mapped Wealthbox stage needs its win type set to "won".

**Firms whose opportunities are not all rollovers** (the common case) use a dedicated Wealthbox **opportunity pipeline** (e.g. "Rollover") so only rollover opps ever reach the mapped bookend stages. This works because Wealthbox stage ids are pipeline-scoped — each pipeline has its own "Proposal Accepted"/"Won" with distinct ids, and the inbound poll filters by exact stage id. Support in code: stage rows carry `pipeline` (id) from `/categories/opportunity_pipelines` + `/categories/opportunity_stages`; `crmClient.getStages()` annotates each stage with `pipelineId`/`pipelineName`; `suggestBookendStages()` restricts auto-detection to a pipeline named like "rollover"/"rift" when one exists (and deliberately does NOT fall back to other pipelines — a wrong fallback would sync every non-rollover opp); stage pickers prefix options with the pipeline name whenever stages span multiple pipelines (`src/components/crmStageOptions.ts`). Note the number of pipelines a firm can create depends on their Wealthbox plan tier.

#### Stage configuration overlay (`CaseStageConfig`)

Per-firm overlay on the `CaseStatus` enum:
- `customLabel` — null falls back to canonical label; user-entered string overrides everywhere stage labels render
- `isEnabled` — only governs the five intermediate stages; bookends are always enabled. Disabled stages disappear from the case status dropdown and from board columns. Existing cases sitting on a now-disabled stage still display correctly via `resolveEnabledStages()` injecting an "orphan" column

Helpers in `src/components/casesDesignTokens.ts` (`resolveStageLabel`, `resolveEnabledStages`) and `src/lib/stageConfig.ts` (`getFirmStageConfig`, `ensureFirmStageConfig`). Server components preload the overlay and pass it to client components as a `stageConfig: StageConfigRow[]` prop. Null-safe — components fall back to canonical defaults if the prop isn't passed.

### Custodian Intelligence

Distinct from cases: a global `Custodian` directory (mailing routes, signature requirements, processing times, quirks) plus `CustodianNote` (firm-scoped). The page at `/dashboard/intelligence` mounts `IntelligenceWorkspace`, which is a chat panel + directory + detail modal with three tabs (Overview, Activity, Firm Notes). Activity tab joins live `RolloverCase` data against each custodian to show observed-vs-advertised processing times. Per-user pinning + search history live in `User.preferences`.

### Admin dashboard

The admin dashboard (`AdminDashboard.tsx`, exporting `AdminDashboardV2`) is a **static, fixed layout** — a server component fetches all the data and passes it down as props; there is no drag-reorder, no widget registry, and no per-user layout persistence. The panels, top to bottom: a header + KPI strip (active cases, awaiting client, cycle time, completed this month), a Pipeline card + Weekly-inflow area chart, Advisor/Ops workload bars, and a Needs-attention feed alongside an Activity feed. The pipeline bars, the inflow area chart, and the workload bars are **hand-rolled inline SVG** (see the `AreaChart` helper) — no charting library. To change the dashboard, edit the layout in this file directly.

### Per-user preferences

`User.preferences` is a Json column. Schema validated in `src/app/api/settings/route.ts` (`PreferencesSchema`). Currently used for: `timezone`, `onboardingHidden`, `intelligenceSearches`, `pinnedCustodians`. New per-user state goes here unless it's frequently queried (in which case make it a column).

### Per-firm configuration

In addition to `Firm` columns:

- `FirmSettings` — reminders + 2FA + compliance toggles
- `CrmConnection` — encrypted CRM token + health-check fields
- `CrmStageMapping` — bookend mappings to CRM stages
- `CaseStageConfig` — per-firm stage overlay (rename + enable/disable)
- `Firm.onboardedAt` — gate flag for the `/onboarding` wizard

When adding new firm-level configuration, ask: is this part of "settings" (toggleable defaults) or "integration" (connections to external systems)? Settings go on `FirmSettings`; integrations get their own model.

## Testing

Tests live in `tests/api/*.test.ts` and hit a real Postgres DB pointed to by `.env.test`. Helpers:

- `tests/helpers/db.ts` — `truncateAll()` + shared prisma client
- `tests/helpers/fixtures.ts` — `seedTwoFirms()` returns A/B firms + admin/advisor/ops users + a case each. Used by every isolation test.
- `tests/helpers/route.ts` — `mockSession(sessionFor(user))` mocks NextAuth's `auth()`; `buildRequest()` makes a minimal `Request`; `params({...})` wraps params in a Promise (App Router signature).

Pattern for a new isolation test: seed two firms, take a user from firm A, try to mutate or read a resource from firm B, assert 404 or 403. The existing `tests/api/cases-isolation.test.ts` is the template.

When adding schema fields used by tests, run **both** `prisma migrate dev` (dev DB) and the dotenv-cli command (test DB) — they're separate databases.

## Gotchas learned the hard way

- **Next.js 16 renamed middleware → proxy**, file at `src/proxy.ts`. Read `node_modules/next/dist/docs/` before assuming any v14/15 pattern still works.
- **CSP** is enforced in `proxy.ts` on production only. Tightening it (nonce + strict-dynamic) breaks Next's hydration on Vercel because cached HTML carries a stale nonce. The current policy uses `'self' 'unsafe-inline'` for scripts — this is intentional.
- **Driver adapter pool size** is `max: 1` — Next.js spawns a new pool per server-action invocation in dev, and Supabase free tier connection caps will eat you alive otherwise.
- **Prisma 7** dropped the `--skip-seed` flag. Just don't pass it.
- **Resend free tier** only delivers to the email the Resend account was created with. Update a seed case's `clientEmail` to that address to test the client portal email flow.
- **Supabase pooled URL gives ECONNREFUSED** for ad-hoc tsx scripts. Use `DIRECT_URL` for those.
- The shared focus-ring style is intentionally subtle (`focus:ring-0 focus:border-[#3b82f680]`). When adding new inputs, follow the same pattern — avoid Tailwind's default `focus:ring-2 focus:ring-blue-500`.
- `min-h-0` on the flex chain matters — without it, `flex-1` children grow to content size and the whole page scrolls instead of just the intended panel. Keep `min-h-0` on the dashboard `<main>` and on intermediate flex columns.
- **`CardSection` is itself a `Card` wrapper** — never nest `<Card><CardSection>...` or you'll render two stacked bordered boxes. If you need a card without a title/description block, use `<Card>` directly with your own padding wrapper (`Settings.tsx` has working examples).
- **Wealthbox doesn't support webhooks.** All inbound sync is poll-based. There are three independent triggers (cron, page-load, manual button) and they all converge on `pollFirmForNewOpportunities`. The poll endpoint is idempotent so duplicate triggers are harmless — inbound case creation relies on a UNIQUE index on `RolloverCase(firmId, wealthboxOpportunityId)` and a P2002 catch, not just a check-then-insert.
- **Page-load auto-sync is throttled and time-boxed** (`maybePollOnPageLoad`: 10s throttle, 2.5s timeout). The throttle keys off `CrmConnection.lastPolledAt` (written only by an inbound scan), **not** `lastHealthCheckAt` — outbound stage pushes bump the latter, and keying off it would let a recent outbound sync suppress inbound polling. Tune via the constants in `src/lib/crmSync.ts` if Wealthbox API quotas become a concern; never remove the timeout — a slow CRM should never block page rendering.
- **Bookend mappings are required to finish onboarding.** `POST /api/firm/onboarding` 400s if either `PROPOSAL_ACCEPTED` or `WON` mapping is missing, even if the wizard already wrote everything else. Don't skip the bookend save in flows that try to mark onboarding complete.
- **The `Mark as reviewed` button stayed broken silently for a while** because the case PATCH route validated `needsReview`/`reviewReason` in the Zod schema but didn't include them in the actual update payload. When extending `UpdateCaseSchema` in `src/app/api/cases/[id]/route.ts`, always cross-check that the `prisma.rolloverCase.update` data block actually writes the new field.
- **Migrations are sequential filename-sorted.** New migrations should be named with a timestamp prefix that's later than existing ones. `prisma migrate deploy` applies in filename order; do not rename existing folders or you'll desync the `_prisma_migrations` table from the filesystem.
