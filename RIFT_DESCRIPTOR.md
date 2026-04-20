# Rift — Project Descriptor

> Drop this into any design prompt so the AI understands what Rift is, who uses it, and what it does.

---

## What Rift Is

Rift is a **rollover case management SaaS** for independent RIA (Registered Investment Advisor) firms. It replaces spreadsheets and email chains with a structured pipeline for tracking retirement account rollovers (401k → IRA, 403b → IRA, etc.) from intake to completion.

It is **not** a CRM, custodian, or money-movement platform.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, RSC + client components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, inline styles (dark theme, GitHub-dark palette)
- **Database:** PostgreSQL via Prisma ORM (adapter: `@prisma/adapter-pg`)
- **Auth:** NextAuth v5 (credentials provider, JWT sessions)
- **File Storage:** AWS S3 (presigned POST uploads, presigned GET downloads)
- **Email:** Resend
- **AI:** Anthropic Claude API (custodian intelligence chat)
- **Charts:** Recharts
- **Hosting:** Vercel

---

## User Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full firm access. Sees all cases, all users, firm settings, AI usage stats. Firm-wide dashboard with team workload charts. |
| **ADVISOR** | Sees only cases where they are the assigned advisor. Client-relationship focused. |
| **OPS** | Sees only cases where they are the assigned ops owner. Paperwork/execution focused. |

All roles belong to exactly one **Firm** (multi-tenant, firm-scoped data).

---

## Core Entities

### Firm
Top-level tenant. Has users, cases, settings, reminder logs, custodian notes, AI usage records.

### User
Belongs to a firm. Has role, avatar (S3), JSON preferences (recently viewed cases, default filters, display prefs).

### RolloverCase
The central entity. Tracks a single retirement account rollover.

**Key fields:** client name/email, source provider, destination custodian, account type (Traditional IRA/401k, Roth IRA/401k, 403b, Other), status, high-priority flag, internal notes, assigned advisor, assigned ops.

**Status pipeline (ordered):**
1. `INTAKE` — case created, data incomplete
2. `AWAITING_CLIENT_ACTION` — waiting on client for docs/signatures
3. `READY_TO_SUBMIT` — all docs received and reviewed
4. `SUBMITTED` — paperwork sent to provider/custodian
5. `PROCESSING` — provider/custodian is processing
6. `IN_TRANSIT` — transfer confirmed in progress
7. `COMPLETED` — assets received, case closed

### Task
Tied to a case. Has title, description, assignee (user), due date, status (OPEN/COMPLETED/BLOCKED), created-by user. Default starter tasks auto-suggested on case creation.

### ChecklistItem
Per-case document/requirement checklist. Has name, required flag, status (NOT_STARTED → REQUESTED → RECEIVED → REVIEWED → COMPLETE), notes, sort order. Can have linked documents.

### Document
File uploaded to a case, stored in S3. Linked to a checklist item (optional). Tracks name, storage path, file type, file size, uploader.

### Note
Append-only case notes with author and timestamp.

### ActivityEvent
Immutable audit log. Event types: CASE_CREATED, CASE_UPDATED, STATUS_CHANGED, NOTE_ADDED, OWNER_CHANGED, TASK_CREATED, TASK_COMPLETED, TASK_REOPENED, FILE_UPLOADED, FILE_DELETED, CHECKLIST_ITEM_UPDATED.

### Custodian
Reference data for brokerage/recordkeeping firms (Fidelity, Vanguard, Schwab, etc.). ~25 seeded. Fields include contact info, processing times, signature requirements, medallion/notarization rules, ACATS support, quirks, common forms, tags.

### CustodianMailingRoute
State-based mailing address routing for custodians (e.g., Schwab routes to El Paso or Omaha depending on client state).

### CustodianNote
Firm-specific tribal knowledge about a custodian. Authored by firm users, pinned/categorized. Surfaced in AI chat and directory.

### FirmSettings
Per-firm config: reminder toggles, stalled-case threshold, operating states (for mailing route matching), AI monthly question limit.

### AiUsage
Per-question token tracking for the AI chat feature. Tracks input/output/cache-hit tokens, turn count, tool calls.

### ReminderLog
Deduplication log for automated email reminders (prevents re-sending within 20 hours).

---

## Pages & Features

### Landing Page (`/`)
Marketing page with hero, feature grid, process timeline (scroll-driven filmstrip), testimonials, stats, before/after comparison, demo request modal. Dark theme with gold/bronze accent palette.

### Login (`/login`)
Email + password form. Dark card on dark background. Redirects to `/dashboard`.

### Dashboard (`/dashboard`)
**Admin view:** Stat cards (total/active/completed/awaiting client), case pipeline segmented bar, team snapshot (advisor + ops workload bars), status bar chart, team workload stacked bar chart, recently viewed cases grid (6 cards).

**Advisor/Ops view:** Stat cards (active cases, open tasks, completed), pipeline segmented bar, task breakdown (overdue/today/this week/no date), status bar chart, account type donut chart, case list with filters.

### Cases List (`/dashboard/cases`)
Filterable/searchable case list. Filters: text search, status dropdown, advisor chips (admin only), ops chips (admin only). Each case row shows client name, source → destination, status badge, priority flag, assigned people with avatars, time since last update. "New Case" button.

### New Case (`/dashboard/cases/new`)
Multi-step wizard (4 steps): Client Info → Rollover Details → Assignment → Options & Review. Step indicator with progress dots. Creates case with status INTAKE.

### Case Detail (`/dashboard/cases/[id]`)
Full case workspace. Sections:
- **Header:** Client name, email, open date, status selector dropdown, priority badge.
- **Case Details card:** Source provider, destination custodian, account type, assigned advisor/ops, internal notes. Inline edit mode.
- **Tasks card:** Open/completed task lists, add task form with quick-add suggestions, status toggles (open/completed/blocked), due date tracking, overdue indicators.
- **Checklist card:** Progress bar with per-item segments, status bucket pills, per-item status selector (NOT_STARTED → COMPLETE), file attachment per item, inline notes, add/delete items.
- **Documents panel:** Drag-and-drop upload zone, presigned S3 upload flow, file list with type icons, download via presigned URLs, delete (admin/ops only).
- **Activity log:** Reverse-chronological event timeline with actor, action, timestamp.
- **Notes panel:** Append-only notes with author avatars, timestamps, add note form.

### Intelligence (`/dashboard/intelligence`)
Two-panel layout:
- **Left: AI Chat** — Conversational interface powered by Claude. System prompt makes it a custodian expert. Uses `search_custodians` tool to query the database. Shows tool call badges (query + result count). Suggestion chips for common questions. Monthly usage limit enforced.
- **Right: Custodian Directory** — Filterable list of all custodians with tags and note counts. Click opens a modal with Overview tab (contact, mailing, processing, signatures, quirks, forms, aliases) and Firm Notes tab (add/delete notes with pin support). Mailing section supports state-based routing rules with CRUD, auto-matches firm's operating states.

### Settings (`/dashboard/settings`)
Tabbed interface:
- **Profile:** Avatar upload (S3), name edit, email display, role badge, member-since date.
- **Password:** Current + new + confirm password change.
- **Preferences:** Default status filter, default view, timezone, show/hide dashboard widgets, compact case list toggle.
- **Firm (admin only):** AI monthly question limit with usage stats (progress bar, token breakdown, estimated API cost), operating states grid selector (US state buttons).
- **Notifications (admin only):** Email reminder toggles (overdue tasks, stalled cases, missing docs), stalled threshold selector, dry-run test button with results display, Vercel cron setup instructions.

---

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/[...nextauth]` | GET, POST | Auth handlers |
| `/api/cases` | GET, POST | List/create cases |
| `/api/cases/[id]` | GET, PATCH | Get/update a case |
| `/api/cases/[id]/notes` | POST | Add note |
| `/api/cases/[id]/tasks` | GET, POST | List/create tasks |
| `/api/cases/[id]/checklist` | GET, POST | List/create checklist items |
| `/api/cases/[id]/documents` | GET, POST | List documents / confirm upload |
| `/api/cases/[id]/documents/presign` | GET | Get presigned S3 upload URL |
| `/api/tasks/[id]` | PATCH, DELETE | Update/delete task |
| `/api/checklist/[id]` | PATCH, DELETE | Update/delete checklist item |
| `/api/documents/[id]` | GET, DELETE | Download URL / delete document |
| `/api/users` | GET | List firm users |
| `/api/users/[id]/avatar` | GET | Serve user avatar |
| `/api/users/me/avatar` | GET | Serve current user avatar |
| `/api/settings` | GET, PATCH | User profile & preferences |
| `/api/settings/avatar` | POST | Upload avatar |
| `/api/firm/settings` | GET, PATCH | Firm settings (admin) |
| `/api/firm/ai-usage` | GET | AI usage stats (admin) |
| `/api/chat` | POST | AI chat (Claude + custodian tool) |
| `/api/custodians/[id]/notes` | POST | Add custodian note |
| `/api/custodians/[id]/notes/[noteId]` | DELETE | Delete custodian note |
| `/api/custodians/[id]/mailing-routes` | POST | Add mailing route |
| `/api/custodians/[id]/mailing-routes/[routeId]` | PUT, DELETE | Update/delete route |
| `/api/cron/reminders` | GET, POST | Automated reminder engine |

---

