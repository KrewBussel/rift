# Rift — Founder-Grade Product Plan

## 1. Core Thesis
Rift is a **rollover case management system** for small-to-midsize RIAs with ops support.

It replaces spreadsheets, email chains, and ad-hoc tracking with a structured, compliance-friendly workflow and a lightweight client action layer.

**Not:**
- Not a CRM
- Not a custodian
- Not a money movement platform

---

## 2. Ideal Customer (Phase 1 Focus)
- Independent RIAs (2–15 advisors)
- At least 1 ops/admin person
- 5–30 rollovers/month

**Primary user:** Ops / admin
**Secondary user:** Advisor
**External user:** Client (limited interaction)

---

## 3. Core Problem
Rollover execution is:
- Fragmented across email, PDFs, custodians
- Prone to delays (client + paperwork)
- Poorly tracked (Excel, notes)
- Weak audit trail (compliance risk)

---

## 4. Product Principles
1. **System owns status — not the client**
2. **Checklist > flexibility (early)**
3. **Ops-first UX wins adoption**
4. **Client experience = simple, not feature-rich**
5. **No integrations until pull is proven**

---

## 5. Data Model (V1)
### Entities
- Firm
- User (advisor, ops)
- Client
- Rollover Case
- Task
- Document
- Activity Event

### Rollover Case Fields
- Client name
- Source provider (401k)
- Destination custodian
- Account type
- Status (controlled list)
- Created date
- Last activity date
- Assigned user

### Status Model
**Primary stages:**
- Intake
- Awaiting client action
- Ready to submit
- Submitted
- Processing
- In transit
- Completed

**Flags (non-stage):**
- NIGO
- Missing docs
- Stalled

---

## 6. Phase Plan (Testable, Lean)

---

## Phase 0 — Problem Validation (No Code)
**Goal:** Confirm real pain + willingness to change

**What you do:**
- Interview 10–20 advisors/ops
- Walk through real rollover examples

**What to validate:**
- Where delays occur
- What they track today
- What "success" means

**Output:**
- Refined workflow map
- Common checklist template

**Do NOT build yet**

---

## Phase 1 — Internal Case Tracker (No Client Portal)
**Goal:** Replace spreadsheets

### Features
- Create rollover case
- Status pipeline view
- Manual task list
- Notes + activity log (append-only)

### UX
- Single dashboard
- Each case = card

### Tech Scope
- Auth (email/password)
- CRUD for cases
- Basic UI

### What NOT included
- No client access
- No integrations
- No automation

### Testing Method
- Use with 2–3 firms manually
- Have them run real rollovers through it

### Success Criteria
- They stop using Excel for at least 1 case
- Daily/weekly usage

---

## Phase 2 — Checklist + Document System
**Goal:** Reduce NIGO + missing paperwork

### Features
- Per-case checklist
- Upload documents
- Required vs optional items
- Completion tracking

### UX
- Visual checklist tied to case

### Tech Scope
- File upload (S3 or equivalent)
- Checklist templates (static first)

### Testing Method
- Measure missing doc reduction
- Observe usage during real rollovers

### Success Criteria
- Users rely on checklist during process
- Fewer "what are we missing" moments

---

## Phase 3 — Task Engine + Reminders
**Goal:** Reduce stalls

### Features
- Tasks tied to case
- Assign to advisor or client
- Email reminders (basic)

### Rules
- Trigger tasks manually first
- Add automation later

### Testing Method
- Track stalled cases vs before

### Success Criteria
- Reduced follow-up emails
- Faster stage progression

---

## Phase 4 — Lightweight Client Action Layer
**Goal:** Improve client responsiveness

### Features
- Secure link or login
- Client sees:
  - Next step
  - Upload requests
- Client completes tasks (not statuses)

### Constraints
- No full portal
- No financial data

### Testing Method
- Compare response times
- Count fewer "any updates" emails

### Success Criteria
- Clients complete tasks without confusion

---

## Phase 5 — Workflow Structure + Templates
**Goal:** Handle variability without chaos

### Features
- Template checklists by provider
- Default task sequences
- Simple customization per firm

### Testing Method
- Deploy across multiple firms

### Success Criteria
- Minimal setup per new case

---

## Phase 6 — Reporting + Audit Exports
**Goal:** Compliance + ROI proof

### Features
- Case timeline export (PDF)
- Basic metrics:
  - Avg completion time
  - Time in stage

### Testing Method
- Validate with ops/compliance

### Success Criteria
- Used in internal reviews

---

## Phase 7 — Integrations (ONLY after pull)
**Goal:** Reduce friction, not define product

### Options
- CRM contact import (read-only)
- Email sync

### Rule
- Only build after repeated user demand

---

## 7. What You Should Build First (Exact Order)
1. Auth + firm structure
2. Rollover case model
3. Dashboard view
4. Activity log

Then move to Phase 2

---

## 8. Biggest Risks
- Workflow too rigid vs too flexible
- Overbuilding client experience
- Premature integrations
- Weak initial adoption

---

## 9. Early Metrics That Matter
- Cases created per week
- % of rollovers tracked in Rift
- Time to completion
- Task completion rates

---

## 10. Positioning (V1)
"Rift is a rollover command center that replaces spreadsheets, reduces paperwork errors, and gives advisors and clients clear visibility into every step."

---

## 11. What NOT to Do Early
- No CRM replacement
- No AI features
- No SMS complexity
- No custodial integrations

---

## 12. Next Step for You
Before building:
- Book 10 advisor/ops calls
- Validate checklist + workflow
- Confirm willingness to switch from Excel

If they won’t switch, don’t build.

---

## 13. Detailed Build Plan — Phase by Phase

This section translates the product plan into a practical build sequence.

### Build Rules for Every Phase
- Each phase must be usable on its own
- Each phase must be testable without paid integrations
- Each phase should add one clear behavior change
- Do not begin the next phase until users complete real rollover work in the current one

### Suggested Team Assumption
- 1 founder / product owner
- 1 full-stack developer
- Optional contract designer

### Suggested Stack
- Frontend: Next.js
- Backend: Next.js API routes or Node backend
- Database: Postgres
- Auth: simple email/password or magic link
- Storage: S3-compatible object storage
- Email: Postmark / Resend / SendGrid

---

## Phase 0 — Workflow Definition and Clickable Prototype
**Purpose:** Lock the workflow before writing real app logic.

### Deliverables
1. User journey map
2. Rollover case lifecycle
3. Draft checklist structure
4. Low-fidelity screens

### What to Produce
#### A. Workflow map
Define the exact journey from case creation to completion.

Required steps:
- Intake created
- Client information collected
- Required forms identified
- Documents requested
- Documents received
- Ops review complete
- Submission complete
- Transfer in progress
- Transfer completed
- Exception handling

#### B. Status definitions
Write a one-line rule for each status.

Example:
- Intake = case created, required data still incomplete
- Awaiting client action = at least one required client task is outstanding
- Ready to submit = all required docs received and reviewed
- Submitted = paperwork sent to provider/custodian
- Processing = awaiting provider/custodian completion
- In transit = transfer confirmed in progress
- Completed = assets received / rollover closed

#### C. Screen list
Prototype only these screens:
- Login
- Dashboard
- Case detail
- Add case
- Checklist panel
- Task panel
- Activity log

#### D. Usability testing
Show the prototype to 3–5 target users.
Ask them:
- What feels unnecessary?
- What is missing?
- What would make them trust this system?

### Exit criteria
- Users understand the dashboard without explanation
- Users agree the statuses make sense
- Users confirm they would try this instead of Excel

---

## Phase 1 — Foundation App + Internal Case Tracker
**Purpose:** Build the smallest real product that can replace a spreadsheet.

### Product outcome
An ops person can create, view, update, and manage rollover cases in one place.

### Core features
#### 1. Authentication
**Basic feature set:**
- Email + password login
- Forgot password
- Logout
- Basic session management

**Fields:**
- Email
- Password

**Admin needs:**
- Founder can manually create test users in database or admin panel

**Do not add yet:**
- SSO
- MFA
- role invitations by email

#### 2. Firm and user model
**Basic feature set:**
- One firm per account in MVP
- Users belong to one firm
- User role field

**Roles:**
- Admin
- Ops
- Advisor

**Required user fields:**
- First name
- Last name
- Email
- Role
- Firm name

#### 3. Rollover case creation
**Basic feature set:**
- “Create new case” form
- Save draft
- Submit case

**Required fields:**
- Client first name
- Client last name
- Client email
- Assigned advisor
- Assigned ops owner
- Source provider
- Destination custodian
- Account type
- Status
- Notes

**Recommended dropdowns:**
- Account type:
  - 401(k) to Traditional IRA
  - 401(k) to Roth IRA
  - 403(b) to IRA
  - Other
- Status:
  - Intake
  - Awaiting client action
  - Ready to submit
  - Submitted
  - Processing
  - In transit
  - Completed

**Validation rules:**
- Client name required
- Assigned owner required
- Status defaults to Intake

#### 4. Dashboard / pipeline view
**Basic feature set:**
- All cases list
- Board view by status
- Search by client name
- Filter by assigned user
- Filter by status

**Card contents:**
- Client full name
- Source provider
- Destination custodian
- Assigned owner
- Current status
- Days in status
- Last updated date

**Interactions:**
- Click card to open case detail
- Drag and drop can wait; start with manual status change

#### 5. Case detail page
This is the operational home screen for each rollover.

**Sections:**
- Header summary
- Status section
- Core case info
- Notes
- Tasks
- Activity log

**Header summary fields:**
- Client name
- Current status
- Assigned owner
- Created date
- Last activity

**Core case info fields:**
- Client email
- Source provider
- Destination custodian
- Account type
- High-priority flag
- Internal notes

#### 6. Notes
**Basic feature set:**
- Add note
- Timestamp each note
- Show author

**Rules:**
- Notes are append-only
- Notes cannot be silently edited; if editing exists later, create an edit event

#### 7. Activity log
**Basic feature set:**
Auto-log these events:
- Case created
- Status changed
- Note added
- Owner changed
- Case updated

**Each event should include:**
- Timestamp
- Actor
- Event type
- Event details

### Technical tasks
- Set up DB schema
- Build auth flow
- Create users table
- Create cases table
- Create activity_events table
- Build dashboard and detail views

### Testing plan
Use 5–10 fake rollover cases first, then 3–5 real cases with a pilot firm.

### Exit criteria
- Firm can track real cases in app without Excel for at least one week
- Users log in repeatedly without prompting
- Users understand status model

---

## Phase 2 — Structured Tasks
**Purpose:** Turn the tracker into an execution tool.

### Product outcome
Users no longer just observe status; they work directly from Rift.

### Core features
#### 1. Task creation
**Basic feature set:**
- Add task to case
- Mark task complete
- Reopen task
- Assign task to advisor or ops
- Add due date

**Task fields:**
- Task title
- Description
- Assignee
- Due date
- Status
- Linked case

**Task statuses:**
- Open
- Completed
- Blocked

#### 2. Task list in case page
**Display:**
- Open tasks first
- Completed tasks collapsed below
- Overdue indicator

#### 3. Simple rules
Add basic suggested tasks when a case is created.

**Default starter tasks:**
- Confirm rollover details
- Request required forms
- Review received documents
- Submit paperwork
- Confirm transfer progress

Start with manually editable defaults, not a full rules engine.

#### 4. Dashboard enhancements
Add:
- My open tasks widget
- Overdue tasks count
- Cases with no activity in 7+ days

### Technical tasks
- Create tasks table
- Link tasks to case
- Add due date and assignee logic
- Add overdue calculations
- Add activity log events for task actions

### Testing plan
Ask users to manage work from the task list instead of separate notes or email flags.

### Exit criteria
- Users complete tasks inside Rift
- Pilot firm uses task list during live work
- Users report fewer forgotten follow-ups

---

## Phase 3 — Checklist and Document Collection
**Purpose:** Reduce missing paperwork and standardize prep.

### Product outcome
Each case has a required-document checklist and file collection area.

### Core features
#### 1. Checklist template
Create a default rollover checklist.

**Default items:**
- Distribution form
- Letter of authorization
- ID verification
- Provider-specific form
- Notarization / medallion if required
- Internal review complete

**Checklist item fields:**
- Name
- Required yes/no
- Status
- Notes
- Uploaded document link

**Checklist item statuses:**
- Not started
- Requested
- Received
- Reviewed
- Complete

#### 2. File upload
**Basic feature set:**
- Upload file to case
- Link file to checklist item
- Show uploaded by + uploaded date
- File type validation

**Allowed file types initially:**
- PDF
- JPG / PNG
- DOCX optional

**Do not add yet:**
- OCR
- file versioning complexity
- eSignature

#### 3. Documents panel
Display:
- All uploaded docs
- Checklist-linked docs
- Missing required items

#### 4. Activity logging
Log these events:
- File uploaded
- File deleted by admin only
- Checklist item status changed

### Technical tasks
- Set up file storage bucket
- Add signed upload flow
- Create documents table
- Create checklist_items table
- Build upload UI and file metadata display

### Testing plan
Run live cases and watch whether users stop chasing documents in email threads.

### Exit criteria
- Users trust checklist as source of truth
- Missing-document confusion decreases
- At least one firm completes a rollover using uploaded docs tracked in Rift

---

## Phase 4 — Reminder System (Email Only)
**Purpose:** Reduce stalled cases without adding a bunch of complexity.

### Product outcome
Rift proactively reminds internal users and later clients when action is due.

### Core features
#### 1. Internal reminder emails
Trigger reminders for:
- Overdue tasks
- Cases stalled more than X days
- Missing required documents

#### 2. Reminder configuration
Keep this very simple.

**Admin settings:**
- Reminder frequency:
  - Daily digest
  - Immediate overdue alert
- Stalled threshold:
  - 3 days
  - 5 days
  - 7 days

#### 3. Email templates
Need basic templates for:
- Task overdue
- Case stalled
- Missing documents

### Technical tasks
- Add email service
- Create background job or scheduled job
- Build email template renderer
- Add audit events for sent reminders

### Testing plan
Monitor whether reminders lead to task completion within 24–48 hours.

### Exit criteria
- Reminder emails are opened
- Users take action after reminders
- Stalled cases decrease

---

## Phase 5 — Lightweight Client Action Experience
**Purpose:** Let clients complete actions without making them operational owners.

### Product outcome
Clients can see what they need to do and securely send what is needed.

### Product rule
Clients do not control official case status.
They only complete client tasks and upload requested documents.

### Core features
#### 1. Client access model
Choose one of these for MVP:
- Magic-link access by email
- Simple passwordless login

Use the simplest secure option possible.

#### 2. Client case page
Show only:
- Progress step label
- Current requested actions
- Secure upload area
- Basic help text

**Do not show:**
- Internal notes
- full audit log
- internal blockers
- anything resembling portfolio or account balance data

#### 3. Client tasks
Examples:
- Upload signed distribution form
- Upload ID
- Review next-step instructions

**Client task states:**
- Requested
- Submitted
- Received
- Complete

#### 4. Notifications
Client gets:
- Initial access email
- Reminder email
- Confirmation email after upload

### Technical tasks
- Separate client-facing route
- Tokenized or authenticated access
- Permissions layer to isolate client-safe data
- Client activity events

### Testing plan
Run with a few trusted pilot clients only.
Observe where they get confused.

### Exit criteria
- Clients successfully upload docs without support
- Advisors report fewer status-check emails
- No confusion about what the client controls

---

## Phase 6 — Templates and Firm Configuration
**Purpose:** Support workflow variation without turning Rift into a no-code platform.

### Product outcome
Firms can adapt Rift to their process without breaking the product.

### Core features
#### 1. Checklist templates
Firm admin can choose a starting template for new cases.

**Template examples:**
- Standard 401(k) rollover
- Former employer plan rollover
- Provider-specific checklist

#### 2. Default task sequences
On case creation, auto-generate starter tasks based on template.

#### 3. Custom labels / simple fields
Allow a few configurable fields:
- Team name
- Case priority
- Internal reference ID

### Rules
Do not add a full workflow builder.
Keep templates opinionated.

### Technical tasks
- Create checklist_templates table
- Create template-to-item mapping
- Add firm settings table

### Testing plan
Test with 2–3 different firms with slightly different process needs.

### Exit criteria
- New cases can be created quickly from a template
- Firms do not request deep custom development for basic rollout

---

## Phase 7 — Reporting and Audit Export
**Purpose:** Make Rift defensible to ops leaders and compliance-minded buyers.

### Product outcome
Firms can show what happened in a case and measure performance.

### Core features
#### 1. Case export
Generate a clean case summary PDF.

**Include:**
- Client name
- Timeline of status changes
- Task completion timeline
- Uploaded document list
- Notes summary

#### 2. Basic reporting dashboard
Metrics:
- Cases created this month
- Cases completed this month
- Average days to completion
- Average days by stage
- Number of stalled cases
- Number of overdue tasks

#### 3. Filters
- By advisor
- By ops owner
- By status
- By date range

### Technical tasks
- Build reporting queries
- Build export renderer
- Add downloadable PDF generation

### Testing plan
Review metrics with pilot firms and ask whether they would use this in management reviews.

### Exit criteria
- Firms find reports credible and useful
- Export is acceptable for internal review or compliance support

---

## Phase 8 — Optional Integration Layer
**Purpose:** Remove friction only after core behavior is proven.

### Product outcome
Data entry gets easier, but Rift remains useful without integrations.

### Integration order
1. CSV import for clients
2. CRM contact import (read-only)
3. Basic email forwarding / parsing later

### Do not start with
- Two-way CRM sync
- custodian APIs
- provider APIs
- deep workflow sync with external tools

### Technical tasks
- Build import mapping flow
- Add import history
- Add duplicate detection

### Exit criteria
- At least 3 firms ask for the same integration
- Integration reduces friction measurably

---

## 14. Detailed Backlog for the First Actual Build Sprint
This is the first practical coding sprint.

### Sprint 1 goal
Create a working internal tracker with login, dashboard, and case detail.

### Sprint 1 backlog
#### Setup
- Initialize Next.js app
- Configure Postgres
- Set up ORM
- Create environment config
- Deploy dev environment

#### Auth
- Build login page
- Build registration flow for internal test users
- Add password reset
- Add session middleware

#### Database schema
- users
- firms
- rollover_cases
- activity_events

#### Dashboard
- Build top nav
- Build case list view
- Build filter controls
- Build empty state

#### Case creation
- Build new case modal or page
- Add required field validation
- Save case to DB
- Log creation event

#### Case detail
- Build summary header
- Build editable details form
- Build notes section
- Build activity feed
- Build status change control

#### QA checklist
- Create user
- Log in
- Create case
- Edit case
- Add note
- Change status
- Confirm activity feed updates correctly

---

## 15. Definition of Done by Phase
### A phase is done only if:
- Real users used it on real rollover work
- One clear behavior changed
- Bugs are manageable without founder hand-holding
- You can explain the value of the phase in one sentence

If you cannot meet those, the phase is not done.

---

## 16. Founder Guidance on Sequencing
### Build in this exact order:
1. Internal tracker
2. Tasks
3. Checklist + documents
4. Reminders
5. Client action layer
6. Templates
7. Reporting
8. Integrations

### Why this order works
- It proves internal value before external complexity
- It avoids paid dependencies early
- It keeps implementation understandable
- It gives you multiple places to stop and test

---

## 17. Non-Negotiable Constraints
- No phase should require Wealthbox, Redtail, or custodial access to test
- Every phase should work with manual data entry
- Every new feature must reduce either confusion, delay, or compliance risk
- Avoid “nice to have” features until pilot users ask more than once

