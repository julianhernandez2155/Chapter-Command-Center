# Active Sprint Plan

## Source Of Truth

This repo is now the active implementation workspace:

`/Users/Julian/antigravity/Chapter-Command-Center`

The imported planning files came from the older reference workspace:

`/Users/Julian/workspace/personal/code/chapter-command-center`

Those files remain useful for feature intent and ordering, but some implementation details are outdated because the active app is now a Vite React SPA connected directly to hosted Supabase, not the original Next.js implementation target.

Relevant files:

- `.planning/FEATURE-BUILD-ORDER.md` — original dependency-ordered feature list.
- `.planning/ROADMAP.md` — original seven-phase roadmap.
- `.planning/PRE-16-HARDENING-V2-ALIGNMENT-PLAN.md` — prior hardening plan for the older full-stack workspace.
- `docs/AUTHORIZATION_MODEL.md` — current authorization decision.
- `docs/SPRINT_1_AUTH_FOUNDATION_CLOSEOUT.md` — completed Sprint 1 status.
- `docs/SPRINT_3_OPERATIONS_EVENTS_CLOSEOUT.md` — completed Sprint 3 status.

## Current Product State

The app had high-fidelity UI screens for roughly Features 1-16, but most of those screens were not end-to-end workflows. They were mostly static mock-data or `localStorage` experiences.

Sprint 1 changed the foundation:

- Hosted Supabase is connected.
- Real Supabase Auth sessions work.
- Developer personas are seeded and linked to `public.members.auth_user_id`.
- Route guards and role-filtered navigation exist.
- RLS is the database security boundary.

## Current Sprint Map

### Sprint 1 — Auth Foundation

Status: complete.

Closed in `docs/SPRINT_1_AUTH_FOUNDATION_CLOSEOUT.md`.

### Sprint 2 — Identity, Roster, Positions, Permissions

Status: complete.

Goal: replace mock identity/position surfaces with live Supabase data and introduce a small code-level permission registry.

Scope:

- Wire live `members`, `positions`, and `member_positions`.
- Replace `MOCK_MEMBERS` and `MOCK_BRANCHES` usage in the dashboard/positions area.
- Add typed helpers for current member positions and display data.
- Introduce a simple permission registry in code.
- Keep a database-backed permission selector out of scope until real workflows prove the permission set.

Done means:

- Dashboard shows live member/position assignments from Supabase.
- Current user's active positions are reliable.
- General Member, Secretary, President, Treasurer, Generic Chairman, and Scholarship Chairman personas show correct access differences.
- `npm run lint` and `npm run build` pass.
- A live Supabase smoke test confirms member/secretary visibility.

### Sprint 3 — Operations And Events

Status: complete.

Closed in `docs/SPRINT_3_OPERATIONS_EVENTS_CLOSEOUT.md`.

Goal: make events real before attendance depends on them.

Scope:

- Live event list and event detail from Supabase.
- Officer/chairman event creation.
- Event edit/archive behavior.
- Permissions discovered per workflow, such as `events.view`, `events.create`, `events.edit`, `events.archive`.

Attendance/check-in should not be built until event records are live and stable.

### Sprint 4 — Attendance And Excusals

Status: planned.

Goal: make attendance capture and absence review real.

Scope:

- Check-in open/close workflow.
- Attendance ledger writes to `event_attendees`.
- CSV attendance import using existing matching logic.
- Member excusal submission.
- Officer excusal review.

### Sprint 5 — Finance And Dues

Status: planned.

Goal: make Treasurer dues tracking real.

Scope:

- Live dues ledger.
- Treasurer payment entry.
- Member own-status view.
- President/Secretary read access.

### Sprint 6 — Governance And Reports

Status: planned.

Goal: migrate Chairman Reports and Admin Reports from `localStorage` to Supabase.

Scope:

- Chairman report draft/save/submit.
- Admin report review.
- Position-specific chairman report templates.
- Initial exec agenda compilation from submitted reports.

## Important Direction

Do not continue building more static screens before core workflows are live.

From here, build vertical slices:

1. live data source
2. permissions
3. user action
4. database write
5. another persona can see the result
