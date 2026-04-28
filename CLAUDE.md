# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Rift is a multi-tenant rollover-case-management SaaS for independent RIAs (registered investment advisors). One firm = many users (ADMIN / ADVISOR / OPS) = many `RolloverCase` records moving through 7 stages (INTAKE → AWAITING_CLIENT_ACTION → READY_TO_SUBMIT → SUBMITTED → PROCESSING → IN_TRANSIT → COMPLETED). Around the case, the app layers a custodian-knowledge hub, a magic-link client portal, CRM sync (Wealthbox + Salesforce), and an admin dashboard with customizable widgets.

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

There is **no public signup route**. A firm's first record is created by us (the platform) after a contract is signed. The flow is:

1. **Platform creates the Firm + first ADMIN.** Run a one-off script (or future internal admin tool) that inserts a `Firm` row and a single `User` with `role: ADMIN` and a `PasswordResetToken` (longer TTL acting as a "set initial password" token). The admin receives an email with a set-password link — never a plaintext password.
2. **Admin completes a setup wizard on first login.** Confirms firm details (legal name, website, support email), optionally connects a CRM (Wealthbox token paste or Salesforce OAuth), and invites their team.
3. **Team invites use `/api/firm/team` (ADMIN-only).** The admin types a name + email and picks `ADVISOR` or `OPS`. The route creates the user row and emails a set-password link. Seats are gated by `Firm.seatsLimit`.
4. **CRM-assisted invite is a UX accelerator, not an auto-import.** When a CRM is connected, the invite UI fetches the CRM's team list and renders it as a checklist with a role dropdown next to each name. The admin still picks who to onboard and what Rift role each gets. CRMs do **not** know the difference between `ADVISOR` and `OPS`, and not every CRM team member belongs in Rift (seats are billable).

Why CRM is never the source of truth for Rift access:
- `ADVISOR` vs `OPS` is a Rift-only concept (it gates `assignedAdvisorId` vs `assignedOpsId` visibility).
- Auto-importing every CRM user blows past `Firm.seatsLimit`.
- CRM-side email and Rift login email are not always the same person.

### CRM integration model

```
Firm  ──1:1──  CrmConnection  (provider: WEALTHBOX | SALESFORCE)
                  ↓
                  encryptedToken / refreshTokenCiphertext (AES-256-GCM via AUTH_SECRET)
                  ↓
                  CrmStageMapping[]  (firmId, riftStatus → crmStageId/Name)
RolloverCase  ──  wealthboxOpportunityId, wealthboxLastSyncedAt, wealthboxLastSyncError
```

`src/lib/crmClient.ts` is the **provider-polymorphic dispatcher** — every route calls `getProviderClient(connection)` and gets a unified interface (`getStages`, `searchOpportunities`, `updateOpportunityStage`, etc.). Salesforce branch handles OAuth refresh + 401 retry transparently. Don't add provider-specific logic outside `crmClient.ts` / `salesforce.ts` / `wealthbox.ts`.

`src/lib/crmSync.ts` is the **non-throwing sync engine**. `syncOpportunityStage(caseId)` is called fire-and-forget from `PATCH /api/cases/[id]` when status changes. Failures land on the case row (`wealthboxLastSyncError`) and the connection (`lastHealthOk = false`); they never block the upstream user action.

The shared routes are at `/api/integrations/crm/*` (stages, mapping, opportunities). The provider-specific bits are `/api/integrations/wealthbox` (token paste — POST only) and `/api/integrations/salesforce/{authorize,callback}` (OAuth dance with PKCE). Per-case link/unlink lives at `/api/cases/[id]/crm`.

Wealthbox auth header is `ACCESS_TOKEN: <token>` — **not** Bearer. Salesforce uses Bearer.

### Custodian Intelligence

Distinct from cases: a global `Custodian` directory (mailing routes, signature requirements, processing times, quirks) plus `CustodianNote` (firm-scoped). The page at `/dashboard/intelligence` mounts `IntelligenceWorkspace`, which is a chat panel + directory + detail modal with three tabs (Overview, Activity, Firm Notes). Activity tab joins live `RolloverCase` data against each custodian to show observed-vs-advertised processing times. Per-user pinning + search history live in `User.preferences`.

### Dashboard widgets

Admin dashboard (`AdminDashboard.tsx`) is a **bento grid** with three size classes (`small` 3×1 / `medium` 6×1 / `large` 6×2 on a 12-col, 285px-row grid). Layout uses `grid-auto-flow: row dense` so cards pack into available cells. Drag-reorder via `@dnd-kit/sortable` with `DragOverlay`. The order persists per-user in `User.preferences.dashboardWidgets: string[]`. Add a widget by pushing to the `WIDGETS` registry at the top of the file — that's the only file you need to touch for a new widget.

### Per-user preferences

`User.preferences` is a Json column. Schema validated in `src/app/api/settings/route.ts` (`PreferencesSchema`). Currently used for: `dashboardWidgets`, `intelligenceSearches`, `pinnedCustodians`, `defaultStatusFilter`, `compactCaseList`, `recentlyViewedCaseIds`. New per-user state goes here unless it's frequently queried (in which case make it a column).

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
- The bento grid's `min-h-0` on the flex chain matters — without it, `flex-1` children grow to content size and the whole page scrolls instead of just the intended panel. Keep `min-h-0` on the dashboard `<main>` and on intermediate flex columns.
