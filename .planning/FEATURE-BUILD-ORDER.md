# Chapter Command Center — Feature Build Order

Dependency-ordered feature list for vibe coding. Tackle one feature at a time, in sequence.
Each feature is scoped to be a single prompt unit.

---

## #1 — Project Scaffold + Database Schema

**What it is:** The skeleton everything else runs on. Next.js 16 project with Supabase connected, all tables created, no app logic yet.

**What it does:** Creates the database schema for all 7 phases upfront, sets up Tailwind + shadcn/ui + Geist, configures Supabase client, sets up environment variables.

**Who uses it:** Developer only.

**Dependencies:** None.

**Scope:**
- `npx create-next-app` with TypeScript, App Router, Tailwind
- Install: `shadcn/ui`, `@supabase/supabase-js`, `@supabase/ssr`, `next-auth`, Geist font
- All tables: `members`, `positions`, `member_positions`, `events`, `event_attendees`, `excusals`, `dues_payments`, `form_submissions`, `tier_snapshots`, `tier_config`, `gpa_records`, `study_sessions`, `chairman_reports`, `event_proposals`, `budget_draws`, `compliance_deadlines`
- Dark mode config, global layout, basic routing shell (empty pages, no content)
- `.env.local` with Supabase URL, anon key, `AUTH_SECRET`, Google OAuth client ID/secret

**Hard stops:** No auth logic, no UI components, no RLS yet — just schema and scaffold.

---

## #2 — Google OAuth + Onboarding Flow

**What it is:** Authentication gate and first-time member registration.

**What it does:** Members sign in via Google OAuth. If it's their first time and their email ends in `@g.syr.edu`, they're routed to an onboarding form. Completing the form creates their `members` record. No ghost records — unregistered = not in system.

**Who uses it:** Every user.

**Dependencies:** #1.

**Scope:**
- Auth.js v5 with Google provider, `@g.syr.edu` domain check on sign-in
- If no `members` record exists for the authenticated Google email → redirect to `/onboarding`
- Onboarding form collects: legal first/last name, preferred name, SUID (6-digit), graduation year, major, phone
- On submit: insert into `members`, set `google_email`, redirect to `/dashboard`
- If domain check fails (non-SU email): show "This app is for SU members only" and sign out
- Simple `/auth/signin` and `/auth/error` pages
- Middleware protecting all routes except `/auth/*` and `/onboarding`

**Hard stops:** No position assignment, no role-based access, no dashboard content yet.

---

## #3 — Position System + Admin Assignment UI

**What it is:** The system that maps members to their chapter positions (officer, chairman, member).

**What it does:** Admins (President/Secretary) can assign positions to members. Positions are rows in a lookup table — not enums. Positions have a `slug` (stable identifier for app logic), `display_name`, `group` (Exec Board, Internal Cabinet, etc.), and `supervised_by` foreign key for hierarchy.

**Who uses it:** President/Secretary for assignment; app logic reads positions for permissions everywhere.

**Dependencies:** #2 (members must exist before they can hold positions).

**Scope:**
- `positions` table pre-seeded with all 55+ positions (slugs like `president`, `secretary`, `internal-vp`, `brotherhood-chairman`, etc.)
- `member_positions` junction: `member_id`, `position_id`, `assigned_at`, `removed_at` (soft delete)
- Admin UI at `/admin/positions`: searchable member list, click a member → assign/remove positions
- A member can hold multiple positions simultaneously
- Removing a position: set `removed_at = now()`, never hard delete
- "General Member" is the default role (no position entry needed) — anyone with a `members` record is a general member

**Hard stops:** No RLS yet, no permissions enforcement — just data assignment.

---

## #4 — Role-Based Access Control (RLS)

**What it is:** Database-level security that enforces who can see and modify what data.

**What it does:** Supabase Row-Level Security policies using a `STABLE` SQL function that looks up the user's current active positions at query time. Officers get elevated access appropriate to their role.

**Who uses it:** Enforced transparently on all queries.

**Dependencies:** #3 (positions must exist to check them).

**Scope:**
- `get_member_role(user_id)` STABLE function that queries `member_positions` where `removed_at IS NULL`
- RLS policies on `members`: Secretary/President see all; general members see their own row only
- RLS policies on `tier_snapshots`: officers see all, members see their own
- RLS policies on `gpa_records`: Scholarship Chairman sees all; Academic School Captains see their college; S&A access requires `membership_review_initiated = true`; members see their own
- RLS policies on `dues_payments`: Treasurer sees all; members see their own
- Do NOT encode permissions in JWT claims — always read live from `member_positions`
- Permission helper `lib/permissions.ts` that the app uses server-side (wraps the RLS checks for use in Server Components)

**Hard stops:** Don't build role-gated UI yet — just the underlying enforcement layer.

---

## #5 — Member Registry (Secretary View)

**What it is:** The canonical member roster that the Secretary manages.

**What it does:** Full table view of all members with search, filter by class year/status, inline status management (active/inactive/suspended). Secretary can edit member records and see all data fields.

**Who uses it:** Secretary (full access), President (read), other officers (limited).

**Dependencies:** #2, #3, #4.

**Scope:**
- `/admin/members` — sortable/filterable table: name, SUID, graduation year, major, current positions, tier (placeholder until #12), dues status (placeholder until #10), status
- Click row → member detail panel (slide-in Sheet component) with all fields
- Secretary can edit: preferred name, phone, class year, major, status (active/inactive/suspended)
- "Add member manually" for edge cases (e.g., transfer student who can't register themselves yet)
- Search by name or SUID
- Export to CSV button (name, SUID, positions)

**Hard stops:** No tier data yet, no attendance data yet — those columns show "–" or "pending."

---

## #6 — Event Creation + Management

**What it is:** The foundational event record that attendance, check-in, and the tier engine all reference.

**What it does:** Officers can create events (chapter meeting, committee meeting, social, etc.), set event type and attendance category, mark events as mandatory or optional, and archive completed events.

**Who uses it:** Exec Board, Chairmen (for their committee meetings).

**Dependencies:** #3, #4.

**Scope:**
- `events` table: `id`, `name`, `type` (chapter_meeting, committee, social, philanthropy, other), `category` (mandatory, optional), `date`, `created_by`, `archived_at`, `check_in_open`, `check_in_token`
- `/events` — list of upcoming and past events with filters
- Create event form: name, type, category (mandatory/optional), date/time, location
- Event detail page: `/events/[id]`
- Only officers can create/edit events; general members can view upcoming events

**Hard stops:** No check-in, no attendance records, no tier integration yet.

---

## #7 — QR Code Check-In System

**What it is:** The primary attendance capture method — rotating QR codes officers display at events.

**What it does:** Officer opens the check-in screen, which displays a QR code that rotates every 10 minutes. Members scan with their phone. Each valid scan logs an attendance record. Live counter updates in real time.

**Who uses it:** Officers (display QR), members (scan), SAA/Secretary (oversight).

**Dependencies:** #6.

**Scope:**
- Install: `react-qr-code`, `@yudiel/react-qr-scanner` (dynamic import, `ssr: false`), `@supabase/realtime-js`
- QR token: fixed per check-in session (not rotating) — UUID + event ID, generated when officer opens check-in, invalidated when officer closes it
- `events`: add `late_cutoff_time` (defaults to event start time, officer can adjust when creating/editing), `check_in_open` (bool)
- Officer screen `/events/[id]`: two action buttons — **"Open Check-In"** (generates QR, activates session) and **"Close Check-In"** (ends session, no more scans)
- QR is fixed for the session — officer downloads as PNG to drop into chapter slides; no rotation needed since officer controls open/close gate
- **Late cutoff is time-based and automatic:** scans before `late_cutoff_time` → `status = on_time`; scans at or after `late_cutoff_time` → `status = late`; no manual "mark attendance" button
- Member scan flow: scan QR → POST `/api/checkin` → validate check-in open + member registered → insert `event_attendees` row with correct status → return success/already-checked-in/check-in-closed
- Duplicate scan: idempotent — return "already checked in" not an error
- Manual override: Officer can manually mark a member present from the event detail attendee list (searchable member list, tap to mark on_time or late)
- Attendance counter splits: "X on time · Y late" — on-time rows display in white, late rows in amber
- Live counter updates via Supabase Realtime on officer screen
- `event_attendees`: `event_id`, `member_id`, `checked_in_at`, `status` (on_time/late), `method` (qr/manual/csv)
- `tier_config`: add `late_attendance_weight` (e.g., 0.5 = late counts as half a full attendance credit toward tier score)

**Hard stops:** No CSV import yet, no excusal system yet. Late cutoff is time-based only — no manual trigger.

---

## #8 — CSV Attendance Import (Flare Export)

**What it is:** Bulk attendance import for when QR wasn't used or as a supplement.

**What it does:** Secretary uploads a CSV export from Flare. The system fuzzy-matches names to members, shows a review UI for medium-confidence matches, and bulk-inserts attendance records.

**Who uses it:** Secretary.

**Dependencies:** #6, #7 (same `event_attendees` table).

**Scope:**
- Install: `papaparse`, `fuse.js`
- `/events/[id]/import` — upload CSV, parse with papaparse
- Fuzzy match each row's name against `members` using fuse.js:
  - High confidence (>0.85): auto-match, show green
  - Medium confidence (0.6–0.85): show candidate with "confirm?" toggle, Secretary must approve
  - Low confidence (<0.6): show as unmatched, Secretary selects manually from dropdown
- Preview table showing all rows with match status before committing
- "Confirm and Import" button inserts all confirmed matches into `event_attendees` with `method = 'csv'`
- Skip rows that already have a check-in record for this event (dedup)

**Hard stops:** No changes to event creation or check-in flow.

---

## #9 — Excusal System

**What it is:** The process for members to request excusals for mandatory event absences, and officers to approve/deny them.

**What it does:** Members submit excusal requests before or after a mandatory event. SAA reviews and approves/denies. Approved excusals remove the absence from tier calculation. Social Rule (1 unexcused absence = Ineligible List) enforced automatically.

**Who uses it:** Members (submit), SAA (review), President (escalation/override).

**Dependencies:** #6, #7.

**Scope:**
- `excusals`: `member_id`, `event_id`, `reason`, `status` (pending/approved/denied), `submitted_at`, `reviewed_by`, `reviewed_at`
- Member view `/dashboard/excusals`: list of mandatory events they missed, "Request Excusal" button per event
- Excusal form: reason text field, optional supporting note
- Officer review at `/admin/excusals`: list of pending requests, approve/deny with optional note
- Approved excusal: event still shows as absent in raw data, but `excused = true` flag used by tier engine
- Social Rule enforcement: tracked by tier engine in #12, not by this feature

**Hard stops:** No tier calculation here — just record management.

---

## #10 — Dues Payment Tracking

**What it is:** Treasurer's tool for recording which members have paid dues and when.

**What it does:** Treasurer logs dues payments per member per semester. Tracks amount paid, date, payment method, and whether the on-time rebate applies. Feeds directly into tier calculation.

**Who uses it:** Treasurer (input), Secretary (read), members (see own status).

**Dependencies:** #2, #4.

**Scope:**
- `dues_payments`: `member_id`, `semester`, `amount_paid`, `paid_at`, `method` (venmo/check/other), `on_time` (bool, Treasurer confirms manually), `treasurer_notes`
- `/admin/dues` — table of all members with current semester dues status (paid/unpaid/partial)
- Treasurer can log a payment: select member, enter amount, date, mark on-time
- Bulk import option: paste/upload CSV with SUID + amount + date
- Member can see their own dues status at `/dashboard`
- `tier_config` has a `dues_rebate_deadline` date — Treasurer marks `on_time = true` for payments before that date

**Hard stops:** No tier calculation yet.

---

## #11 — Form Compliance Tracking

**What it is:** The weekly consolidated form system. Chairmen submit content requests to the Secretary, who builds one form per week presented at chapter. Members complete it within 24 hours.

**What it does:** Chairmen pitch form content (questions they need answered) to the Secretary before chapter. Secretary consolidates all requests into a single form using an in-app form builder, publishes it at chapter. Members fill it out inside CCC within 24 hours of chapter end. Completion feeds into tier calculation.

**Who uses it:** Chairmen (submit content requests), Secretary (consolidate + build form), members (complete form), SAA (oversight).

**Dependencies:** #6.

**Scope:**
- `form_sections`: `id`, `form_id`, `submitted_by` (position_id), `title` (section heading, e.g., "Brotherhood Event Preferences"), `content` (JSONB array of questions: text, type [short_answer/multiple_choice/checkbox], options if applicable, `anonymous` bool per question), `sort_order`, `status` (pending/accepted/rejected), `submitted_at`, `secretary_notes`
- `forms`: `id`, `name`, `week_number`, `semester`, `chapter_event_id` (FK to the chapter meeting event), `deadline` (auto-calculated: chapter meeting end time + 24 hours), `published_at`, `created_by`
- `form_responses`: `form_id`, `member_id`, `submitted_at` (tracks completion for tier compliance — member identity always recorded here)
- `form_answers`: `form_response_id`, `question_id`, `answer` (text/JSONB), `member_id` (NULL if question is anonymous — decoupled from identity so chairman cannot see who answered)
- **Anonymous toggle:** Per-question setting. When anonymous is on, the answer is stored without `member_id` in `form_answers`. The `form_responses` row still records that the member completed the form (for tier credit), but the individual answer content is decoupled from their identity. Chairmen viewing anonymous question responses see answer text only, no names.
- **Chairman flow:** `/dashboard/form-request` — **personal view, scoped to the logged-in chairman only** (each chairman sees only their own submissions, not other chairmen's). Chairman writes out their section content: section title, questions (free text per question, pick question type, toggle anonymous per question). Submit to Secretary. Can see status of their submission (pending/accepted/rejected with Secretary's note). Most weeks a chairman submits one section, but multiple are allowed (e.g., event recap + venue vote). "+ Add Another Section" button available. Below the current submission: "Past Submissions" compact table showing that chairman's recent weeks (Week, Section Title, Status badge, Form Completion rate). If this week's form is published, show a teaser: form completion rate and "Your section received X responses. View Responses →" link. After the form closes, chairman can view responses for their section(s) only — full member attribution on non-anonymous questions, answer-only on anonymous questions.
- **Secretary flow:** `/admin/forms` — two sections:
  - **Incoming sections:** pending section submissions from chairmen for this week, preview each, accept/reject with optional note, edit content before merging
  - **Form assembly:** accepted sections are merged into the week's form. Secretary can reorder sections, edit question text, add/remove questions, adjust anonymous toggles. Preview shows the form as members will see it (sections with headers attributed to the originating chairman's position). "Publish" button makes it live after chapter.
- **Member flow:** Form appears on `/dashboard` after publication. Sections displayed with headers. Anonymous questions show a small "Anonymous" label so members know their answer won't be attributed. Inline form completion inside CCC. 24-hour countdown timer visible. After deadline, form locks (no late submissions).
- **Chairman response view:** `/dashboard/form-responses/[form_id]` — chairman sees only their section(s). Top area: response ratio prominent (e.g., "87 / 92 responses"), "Export Responses" button (exports section responses to spreadsheet). Per-question blocks: non-anonymous questions show member name + answer in rows. Anonymous questions show answer text only, no member attribution, with "Anonymous" badge on the question header. Multiple-choice questions show the leading/most common response with a "View All Responses" expandable to see full breakdown. Response count shown per question.
- **Completion tracking:** `/admin/forms/[id]` — Secretary sees table of all members with completion status (completed with timestamp / not completed). Completion rate percentage prominent at top.
- **Hard rule:** Max 1 form per week. If a form already exists for that week, section submission is disabled with explanation.
- **Deadline:** Always auto-calculated from the linked chapter meeting's end time + 24 hours. Not manually set.

**Hard stops:** No tier calculation yet. No email/push notifications for deadline reminders.

---

## #12 — Tier Calculation Engine

**What it is:** The core scoring system that assigns Gold, Garnet, White, or Ineligible status to every member each week.

**What it does:** Calculates each member's engagement tier from 8 dimensions: mandatory attendance %, committee attendance %, dues payment status, form compliance %, Social Rule (unexcused absences), GPA (if available), service hours (if tracked), and officer role bonus. Stores a snapshot per calculation run. All thresholds pulled from `tier_config`.

**Who uses it:** System (manual trigger), officers (review results), members (see own tier).

**Dependencies:** #7, #8, #9, #10, #11.

**Scope:**
- `tier_config` table: one row per semester with all configurable thresholds (mandatory attendance threshold for Gold/Garnet/White, form compliance threshold, dues weight, etc.)
- Admin UI at `/admin/tier-config` to edit current semester's config
- Calculation function (server-side, TypeScript): for each active member, compute weighted score across available dimensions, skip missing data (rebalance weights to 100%), check binary disqualifiers first (Social Rule = 1 unexcused absence → Ineligible override)
- `tier_snapshots`: `member_id`, `calculated_at`, `tier` (gold/garnet/white/ineligible), `score_based_tier`, `weighted_score`, `dimension_breakdown` (JSONB), `calculated_by`
- "Run Tier Calculation" button at `/admin/tiers` — inserts new snapshots for all members, never updates existing rows
- Most recent snapshot per member = current tier
- Tests: unit tests for the scoring function with known inputs (selective TDD scope)

**Hard stops:** No automatic scheduling — manual trigger only for now.

---

## #13 — Ineligible List Generator

**What it is:** The Monday 9pm deliverable that currently takes the Secretary 3–5 hours.

**What it does:** Generates a formatted, copy-pasteable Ineligible List from the latest tier snapshots. Shows each ineligible member's name and the reason(s) they're ineligible. Formatted exactly for Flare paste.

**Who uses it:** Secretary (generate + copy), IVP (review).

**Dependencies:** #12.

**Scope:**
- `/admin/ineligible-list` — shows current Ineligible List based on latest tier snapshots
- Formatted output: header (date, week number), alphabetical list of ineligible members with reason codes
- "Copy for Flare" button: copies Flare-formatted markdown to clipboard
- Override panel: IVP can manually remove a member from the list (with required reason note) before posting
- Override is logged (who removed, why, when) — doesn't change the underlying tier snapshot
- Historical list: previous weeks' lists available for reference

**Hard stops:** No Flare API — manual paste only.

---

## #14 — Member Self-View Dashboard

**What it is:** What general members see when they log in — their personal standing.

**What it does:** Shows a member their current tier, score breakdown by dimension, upcoming mandatory events, dues status, form completion, and Ineligible List status. Mobile-responsive.

**Who uses it:** All members (~140).

**Dependencies:** #12, #10, #11, #6.

**Scope:**
- `/dashboard` — member's own profile + stats
- Current tier badge (Gold/Garnet/White/Ineligible) with color coding
- Score breakdown: visual progress bar per dimension (attendance %, dues, forms, etc.)
- Upcoming mandatory events in next 30 days
- Dues status for current semester
- Open excusal requests and their status
- If Ineligible: banner showing why, what needs to change
- Mobile-first layout for this page (members check this on phone)
- Members see only their own data — RLS enforces this already from #4

**Hard stops:** No editing of personal data from this view (onboarding form is the source of truth).

---

## #15 — Officer Home Dashboard

**What it is:** The command center view for Exec Board members.

**What it does:** Aggregated chapter health: tier distribution, attendance trends, dues collection rate, upcoming events, members currently on Ineligible List, recent check-ins.

**Who uses it:** Exec Board (9 officers).

**Dependencies:** #12, #13, #6.

**Scope:**
- `/dashboard` renders different content based on role (officer vs. general member)
- Stat widgets: total Gold/Garnet/White/Ineligible counts, attendance rate this semester, dues paid %, upcoming mandatory events
- Ineligible List preview: names + reasons, "View Full List" link
- Recent activity feed: last 5 check-in events with attendance counts
- Quick actions: "Run Tier Calculation," "View Roster," "Create Event"
- Responsive layout (desktop-first, functional on tablet)

**Hard stops:** No custom per-officer views yet — all officers see the same dashboard.

---

## #16 — Chairman Report Submission

**What it is:** The 9-field structured report chairmen submit before each EB meeting.

**What it does:** Chairmen fill in a standardized template (committee updates, events planned, blockers, needs from EB, etc.) by Wednesday before the Thursday EB meeting. Secretary and IVP can see all submitted reports.

**Who uses it:** All chairmen (~18+), Secretary (compilation), IVP (oversight).

**Dependencies:** #3, #4.

**Scope:**
- `chairman_reports`: `member_id`, `position_id`, `semester`, `week_number`, `submitted_at`, 9 content fields (text columns), `status` (draft/submitted)
- `/dashboard/report` for chairmen: form with 9 fields (per MGM template), save as draft, submit
- `/admin/reports` for Secretary/IVP: list of current week's submissions, filter by submitted/missing
- "Missing Reports" view: positions that haven't submitted this week
- Reports are read-only after submission (no edits post-submit)
- Submit deadline: Wednesday 11:59pm — system shows countdown, marks overdue in red after

**Hard stops:** No agenda builder yet.

---

## #17 — Exec Meeting Agenda Builder

**What it is:** Auto-assembles a structured EB meeting agenda from that week's chairman reports.

**What it does:** Secretary clicks "Generate Agenda" and gets a formatted document combining all submitted chairman reports into a structured agenda ready to share with Exec Board before the Thursday meeting.

**Who uses it:** Secretary (generate), Exec Board (read).

**Dependencies:** #16.

**Scope:**
- `/admin/agenda` — shows current week's agenda
- "Generate Agenda" button: pulls all submitted reports for the current week, assembles into a structured template (opening items, report-by-report sections, action items, closing)
- "Copy for sharing" button (plain text + markdown version)
- Agenda is generated fresh each time from current reports — no separate storage needed
- Shows which reports are still missing with a warning before generating

**Hard stops:** No distribution mechanism — Secretary copies and shares manually.

---

## #18 — Pre-Semester Synchronization Checklist

**What it is:** The MGM Article XII initialization checklist that gates the first reporting cycle each semester.

**What it does:** President works through a structured checklist at semester start (roster updated, positions assigned, tier config set, compliance calendar populated). Completing and certifying the checklist unlocks the first weekly reporting cycle.

**Who uses it:** President (certify), Secretary (execute items).

**Dependencies:** #3, #12.

**Scope:**
- `semester_init`: tracks completion status of each checklist item per semester
- `/admin/semester-init` — checklist view, each item can be marked complete
- Items: confirm member roster, assign all positions, set `tier_config` for semester, set dues amounts + deadlines, configure mandatory event categories, clear previous semester's Ineligible overrides
- President "certify" button at bottom — marks semester as initialized, unlocks reporting cycle
- Until certified: chairman report submission page shows "Semester not yet initialized" blocking message
- Can be re-opened by President if needed

**Hard stops:** No automatic actions when certified — just a gate.

---

## #19 — Lock-In Session Dashboard

**What it is:** The monthly all-hands dashboard used during Lock-In Sessions (tier review + operational calendar + chairman reviews).

**Who uses it:** President (facilitates), all Exec + all Chairmen.

**Dependencies:** #12, #16, #6.

**Scope:**
- `/admin/lock-in` — full-screen presentation mode
- Section 1 (first 30 min): tier distribution breakdown by group, members at risk of dropping tier, notable changes from last month
- Section 2: Synchronized Operational Calendar — all events across all committees for the next month in one view
- Section 3: Chairman Operational Reviews — rotating through each chairman's last report + standing
- Print/export to PDF option
- No editing from this view — display only

**Hard stops:** No automatic scheduling or reminders.

---

## #20 — Event Proposal + EB Approval Workflow

**What it is:** The structured proposal pipeline for events before they're official.

**What it does:** A chairman proposes an event (Tier 1/2/3), fills in required fields based on EOP requirements, submits for EB approval. President and relevant officers review and approve/reject. Approved events become official events in the system.

**Who uses it:** Chairmen (propose), Exec Board (approve), H&S Officer (clearance), President (final authority).

**Dependencies:** #6, #3, #4.

**Scope:**
- `event_proposals`: all EOP fields — event tier, name, date, location, expected attendance, alcohol (bool), guests (bool), budget estimate, fund (operating/social), CuseActivities registration URL, H&S clearance status
- `/events/propose` for chairmen: multi-step form based on event tier (Tier 1 = more fields, 8-week lead time warning)
- `/admin/proposals` for Exec: list of pending proposals with tier/date/chairman
- Approval flow: H&S Officer marks clearance → President approves → event created in `events` table
- H&S veto: can block any event regardless of other approvals
- Rejection: chairman notified (in-app), must resubmit
- Lead time validation: Tier 1 warns if < 8 weeks, CuseActivities deadline (5+ days before) warning

**Hard stops:** No budget draw yet.

---

## #21 — Pre-Event Compliance Checklist

**What it is:** The mandatory pre-event checklist that verifies all EOP requirements are met before the event is cleared to run.

**What it does:** For each approved event, the creating chairman works through a checklist: CuseActivities registration confirmed, sober monitors assigned (1 per 10 guests, 2 EB required), guest list submitted if applicable, H&S clearance confirmed.

**Who uses it:** Chairmen (complete), H&S Officer (verify), SAA (sober monitor assignments).

**Dependencies:** #20.

**Scope:**
- `event_compliance`: one row per event, tracking completion of each checklist item + who confirmed it
- `/events/[id]/compliance` — checklist view for the event creator
- Checklist items auto-generated based on event tier and whether alcohol/guests are present
- Sober monitor assignment: select members from roster, system validates count requirement (1 per 10 guests)
- Guest ratio check: warns if non-brother male guest count exceeds 1:3 ratio
- Checklist must be fully complete before event shows as "Cleared" status
- H&S Officer has a separate confirmation step for events with alcohol

**Hard stops:** No post-event summary yet.

---

## #22 — Post-Event Summary + Hard Gate

**What it is:** The 72-hour post-event report that gates future event proposals and budget draws for the same chairman.

**What it does:** Chairman submits a summary within 72 hours of event completion. Until submitted, their next event proposal is blocked and budget draws are blocked. President/IVP can override the gate in exceptional cases.

**Who uses it:** Chairmen (submit), President/Secretary (oversight + override).

**Dependencies:** #20, #21.

**Scope:**
- `event_summaries`: `event_id`, `submitted_by`, `submitted_at`, fields: actual attendance, what went well, what to improve, follow-up items, receipts/expenses
- `/events/[id]/summary` — post-event form, only available after event date passes
- 72-hour countdown: red warning banner on `/events/propose` and `/admin/budget-draws` if chairman has an overdue summary
- Gate enforcement: `POST /api/event-proposals` and `POST /api/budget-draws` check for overdue summaries before allowing submission
- Gate override: President can mark a summary obligation as waived with a reason note
- Auto-archive event after summary submitted

**Hard stops:** No budget draw UI yet.

---

## #23 — Budget Draw Workflow

**What it is:** The formal request process for event spending from the chapter's two funds.

**What it does:** Chairman submits a budget draw request specifying fund (Operating/Social), amount, and method (Switch/Venmo/reimbursement). Treasurer approves. Amounts over $5K require presidential co-approval.

**Who uses it:** Chairmen (request), Treasurer (approve), President (co-approve for $5K+).

**Dependencies:** #22 (post-event summary gate), #20.

**Scope:**
- `budget_draws`: `event_id`, `requested_by`, `fund` (operating/social), `amount`, `method` (switch/venmo/reimbursement), `description`, `status` (pending/approved/denied), `treasurer_approved_by`, `president_approved_by`, `approved_at`
- `/admin/budget-draws` for Treasurer: queue of pending requests, approve/deny
- $5K threshold: requests at or above $5K show "Awaiting Presidential Co-Approval" status after Treasurer approves
- Post-event summary gate enforced at submission (per #22)
- Chairman sees their request status at `/dashboard/budget-draws`
- Simple ledger view: Treasurer can see all approved draws per fund per semester

**Hard stops:** No actual payment processing — approval tracking only.

---

## #24 — GPA Tracking

**What it is:** Academic data per member — self-reported until official data arrives.

**What it does:** Members self-report their GPA. Scholarship Chairman can enter official GPA data. Official data supersedes self-reported. Computed column always shows the best available value.

**Who uses it:** Members (self-report), Scholarship Chairman (enter official), Academic School Captains (view their college).

**Dependencies:** #2, #4.

**Scope:**
- `gpa_records`: `member_id`, `semester`, `self_reported_gpa`, `official_gpa`, `college` (member's SU college), `status` (none/self-reported/official), generated column `effective_gpa AS COALESCE(official_gpa, self_reported_gpa)`
- Member self-report at `/dashboard/academics` — simple form: semester GPA, cumulative GPA, confirmation checkbox
- Scholarship Chairman view at `/admin/academics` — full table, can enter official GPA per member, can bulk import CSV
- Academic School Captain view: same page filtered to their college only (RLS handles this)
- GPA shows as "Self-reported" or "Official" badge
- S&A access flag on member record — when `membership_review_initiated = true`, S&A officer can view (RLS from #4)

**Hard stops:** No academic status tiers yet.

---

## #25 — Academic Status Tiers

**What it is:** The three-tier academic accountability system (Academic Support Status → Academic Probation → Membership Review).

**What it does:** Based on configurable GPA thresholds, the system flags members for each status tier. Scholarship Chairman can initiate and advance status, assign study hours, notify IVP.

**Who uses it:** Scholarship Chairman (manage), IVP (notified), affected members (see own status).

**Dependencies:** #24.

**Scope:**
- `academic_status`: `member_id`, `semester`, `status` (none/support/probation/membership_review), `initiated_at`, `initiated_by`, `notes`
- GPA thresholds in `tier_config`: min cumulative (3.2), min semester (2.5), target (3.5)
- Scholarship Chairman can manually set/advance a member's academic status
- Status change to `membership_review` triggers `membership_review_initiated = true` on `members` record (unlocks S&A access from #24 RLS)
- Member sees their academic status on `/dashboard/academics`
- IVP notified (in-app) when a member reaches Academic Probation or above
- Academic status feeds into tier calculation as a binary modifier (Probation = caps at Garnet, Membership Review = caps at White or forces Ineligible)

**Hard stops:** No study hour system yet.

---

## #26 — Study Hour Program

**What it is:** Structured study sessions required of members on academic probation (and optionally for all).

**What it does:** Scholarship Chairman configures required study hour sessions per week. Members check in to study sessions. Completion tracked toward academic status requirements.

**Who uses it:** Members on academic status (required), all members (optional), Scholarship Chairman (oversight).

**Dependencies:** #25.

**Scope:**
- `study_sessions`: `member_id`, `start_time`, `end_time`, `location_verified` (bool), `check_in_method` (qr/manual), `geofence_zone_id` (optional)
- Scholarship Chairman creates study session "slots" (time blocks at approved locations)
- Member checks in to a slot: timestamp logged, minimum 2hr duration enforced before check-out
- Manual check-in override by Scholarship Chairman
- Weekly tracking: `/admin/academics` shows study hours completed per member this week
- Required hours configurable in `tier_config` (default: 2 sessions/week, 2hr minimum each)

**Hard stops:** Geofencing is a separate feature (#27).

---

## #27 — Study Hour Geofencing

**What it is:** Location verification for independent (non-session) study check-ins.

**What it does:** Scholarship Chairman defines approved geographic zones (library, study rooms). Members who check in independently have their location verified against the zone. Honor system — location is logged but not strictly enforced for GPS accuracy issues.

**Who uses it:** Members (check in), Scholarship Chairman (configure zones + review).

**Dependencies:** #26.

**Scope:**
- Install: `geolib`
- `geofence_zones`: `id`, `name`, `lat`, `lng`, `radius_meters` (default 150), `created_by`
- Scholarship Chairman at `/admin/academics/zones`: add/edit/remove zones (name, pin on map or enter coordinates, radius)
- Member check-in flow: browser requests geolocation → `geolib.isPointWithinRadius` check → log result
- If outside all zones: warn "You don't appear to be in an approved study location" but still allow check-in (honor system)
- Log raw GPS accuracy value alongside each check-in for Scholarship Chairman review
- Scholarship Chairman can review suspicious check-ins and void them

**Hard stops:** No mobile app native location API — browser Geolocation only.

---

## #28 — Secretary Communications Generator

**What it is:** The template engine that generates Flare-ready formatted posts for all four weekly comms types.

**What it does:** Secretary clicks a button for each comms type and gets a fully formatted, ready-to-paste post for Flare. Pulls live data from the system — no manual compilation.

**Who uses it:** Secretary.

**Dependencies:** #13 (Ineligible List), #16 (chairman reports), #6 (events), #23 (budget draws if included).

**Scope:**
- `/admin/comms` — four tabs: Mid-Week Update, Post-Exec Update, Post-Chapter Update, Monday Ineligible List
- **Mid-Week Update** (Wednesday): upcoming events this week + weekend, any critical announcements, form deadlines
- **Post-Exec Update** (Thursday, optional): EB meeting summary, action items for chapter
- **Post-Chapter Update** (Sunday): meeting recap, key decisions, upcoming week preview
- **Monday Ineligible List** (Monday 9pm): formatted ineligible list from #13, with override notes
- Each tab: preview panel (rendered as it would look on Flare) + "Copy for Flare" button
- Secretary can edit the generated text before copying (inline edit in preview panel)

**Hard stops:** No scheduled sending, no Flare API.

---

## #29 — Compliance Calendar

**What it is:** The tracker for international (PIKE HQ), university, and IFC deadlines with responsible officer assignments.

**What it does:** Secretary/President maintains a calendar of external compliance deadlines. Each deadline has a responsible officer, due date, description, and completion status. Overdue items surface on the Officer Dashboard.

**Who uses it:** President, Secretary, relevant officers.

**Dependencies:** #3, #15.

**Scope:**
- `compliance_deadlines`: `id`, `name`, `source` (pike_hq/university/ifc/internal), `due_date`, `responsible_position_id`, `description`, `status` (upcoming/completed/overdue), `completed_by`, `completed_at`, `notes`
- `/admin/compliance` — calendar + list view of all deadlines
- Secretary/President can add deadlines: name, source, due date, assign to a position
- Responsible officer gets an in-app notification 2 weeks before and 3 days before
- Officer marks deadline complete with optional notes
- Overdue (past due date, not completed) surfaces as a red warning widget on the Officer Dashboard (#15)
- Recurring deadlines: can mark as recurring (annual/semester) and it auto-creates the next occurrence on completion

**Hard stops:** No email notifications — in-app only.

---

## Build Sequence Summary

| # | Feature | Phase |
|---|---------|-------|
| 1 | Project scaffold + database schema | Foundation |
| 2 | Google OAuth + onboarding | Phase 1 |
| 3 | Position system + admin assignment | Phase 1 |
| 4 | RLS + permissions | Phase 1 |
| 5 | Member registry (Secretary view) | Phase 1 |
| 6 | Event creation + management | Phase 2 |
| 7 | QR code check-in | Phase 2 |
| 8 | CSV attendance import | Phase 2 |
| 9 | Excusal system | Phase 2 |
| 10 | Dues payment tracking | Phase 2 |
| 11 | Form compliance tracking | Phase 2 |
| 12 | Tier calculation engine | Phase 2 |
| 13 | Ineligible List generator | Phase 2 |
| 14 | Member self-view dashboard | Phase 2 |
| 15 | Officer home dashboard | Phase 2 |
| 16 | Chairman report submission | Phase 3 |
| 17 | Exec meeting agenda builder | Phase 3 |
| 18 | Pre-Semester Sync checklist | Phase 3 |
| 19 | Lock-In Session dashboard | Phase 3 |
| 20 | Event proposal + EB approval | Phase 4 |
| 21 | Pre-event compliance checklist | Phase 4 |
| 22 | Post-event summary + hard gate | Phase 4 |
| 23 | Budget draw workflow | Phase 4 |
| 24 | GPA tracking | Phase 5 |
| 25 | Academic status tiers | Phase 5 |
| 26 | Study hour program | Phase 5 |
| 27 | Study hour geofencing | Phase 5 |
| 28 | Secretary comms generator | Phase 6 |
| 29 | Compliance calendar | Phase 7 |

---

> **Note on schema (#1):** Get all tables right upfront and review them carefully before building anything else. Schema changes get expensive fast once multiple features depend on the same tables.
