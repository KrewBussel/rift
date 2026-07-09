# Rift

Rift is a multi-tenant rollover-case-management SaaS for independent RIAs
(registered investment advisors). One firm = many users (ADMIN / ADVISOR / OPS)
= many rollover cases moving through a 7-stage pipeline. The two bookend stages
sync bidirectionally with the firm's Wealthbox CRM; the five intermediate stages
are Rift-only. Around the case, the app layers a custodian-knowledge hub, a
magic-link client portal, Wealthbox CRM sync, an admin dashboard, and a guided
onboarding wizard.

## Setup

```bash
npm install                                   # installs deps + runs prisma generate
cp .env.example .env                           # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, etc.
npx prisma migrate deploy                      # apply migrations to your database
npm run seed:custodians                        # populate the global Custodian directory (idempotent)
npm run dev                                     # next dev on port 3000
```

Set both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in `.env` — the
pooled URL hangs on migrations and fails ad-hoc scripts. There is no public
signup: a firm's first ADMIN is provisioned by the platform, then walks the
`/onboarding` wizard before the dashboard unlocks.

## Testing

```bash
npm run test:run                               # vitest run (CI mode)
npm run test                                   # vitest watch mode
```

Tests hit a **real Postgres database** pointed to by `.env.test` — this must be
a separate database from your dev DB. Apply migrations to it before running:

```bash
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full architecture — multi-tenancy rules,
the two auth systems, the Wealthbox sync engine, stage configuration, and the
onboarding flow. The Wealthbox integration has its own deep-dive in
[docs/wealthbox-integration.md](./docs/wealthbox-integration.md).
