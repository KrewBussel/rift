<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Specifically: middleware was renamed to `src/proxy.ts` exporting a `proxy` function. App Router params arrive as a `Promise`. Server components are the default; mark client components explicitly with `"use client"`.
<!-- END:nextjs-agent-rules -->

# Project conventions agents must follow

These are recurring sources of bugs when ignored. CLAUDE.md has the full architecture; this file is the short list of rules.

## Multi-tenancy is not optional

Every firm-scoped query MUST scope by `firmId`. Cases use `where: { id, firmId }`, never just `{ id }`. Non-admin role visibility on cases:

```ts
const visibility =
  role === "ADVISOR" ? { assignedAdvisorId: userId }
  : role === "OPS"   ? { assignedOpsId: userId }
  : {};
```

Every new firm-scoped resource needs an isolation test in `tests/api/*-isolation.test.ts`. The pattern: seed two firms, take a user from firm A, try to mutate or read a resource from firm B, assert 404 or 403.

## CRM sync invariants

- Sync functions in `src/lib/crmSync.ts` are **non-throwing**. Failures land on the case row (`wealthboxLastSyncError`) and the connection (`lastHealthOk`). They never block the upstream user action.
- The poll endpoint at `/api/integrations/wealthbox/poll` is **idempotent**. Duplicate triggers are safe — the function checks `wealthboxOpportunityId` against existing rows before inserting.
- Only the two **bookend** stages (`PROPOSAL_ACCEPTED`, `WON`) sync to/from Wealthbox. Intermediate stages are Rift-only. The `MAPPABLE_STATUSES` constant in `crmSync.ts` and the Zod enum in `/api/integrations/crm/mapping/route.ts` must stay in sync.
- The CRM is never the source of truth for **Rift access**. CRM team imports populate the invite UI, but the admin always picks who and what role. See CLAUDE.md's "Firm onboarding flow" for the rationale.

## Stage labels respect the firm overlay

Don't hardcode stage labels in components. Use `resolveStageLabel(status, stageConfig)` and `resolveEnabledStages(stageConfig)` from `src/components/casesDesignTokens.ts`. Server components preload the overlay via `getFirmStageConfig(firmId)` and pass it down as `stageConfig: StageConfigRow[]`. Components are null-safe — they fall back to canonical defaults if no overlay is provided.

## Schema migrations touch two databases

Always run **both** when adding fields used by tests:

```bash
npx prisma migrate dev --name <change>                                 # dev DB
npx dotenv-cli -e .env.test -- npx prisma migrate deploy               # test DB
npx prisma generate                                                    # regen client
```

Forgetting the test DB step produces phantom typecheck errors that vanish after regenerating, then come back the next time someone clones the repo.

## Patterns that lint as errors but are intentional

- `useEffect(() => { void asyncFn(); }, [...])` for fetch-on-mount triggers a `react-hooks/set-state-in-effect` error. The pattern is fine; suppress with `// eslint-disable-next-line react-hooks/set-state-in-effect` (see existing usage in `OnboardingWizard.tsx`, `SettingsForm.tsx`).
- The CSP in `proxy.ts` uses `'self' 'unsafe-inline'` for scripts. Don't tighten without understanding why — see CLAUDE.md gotchas.

## Don't break existing isolation, sync, or onboarding tests

The full test suite (`npx vitest run`) exercises every cross-firm boundary, the entire Wealthbox sync pipeline, and the onboarding gate. If you change `crmSync.ts`, `crmClient.ts`, the `RolloverCase` schema, or anything in `/api/firm/**`, run those tests before claiming success.
