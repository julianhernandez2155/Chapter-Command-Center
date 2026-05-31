# Sprint 4 Attendance Slice Tracker

## Purpose

Use this tracker to keep Sprint 4 Attendance from becoming one oversized feature push.
Each slice should be started as its own `/goal` session, use the Claude Design wireframes
as workflow reference, and finish only after backend integrity, role permissions, UI polish,
manual persona verification, and automated checks are complete.

## Source References

- `AGENTS.md`
- `DESIGN.md`
- `.planning/ACTIVE-SPRINT-PLAN.md`
- `.planning/ATTENDANCE-PRD.md`
- `/Users/Julian/Downloads/Attendance Wireframes (offline).html`

## Non-Negotiables

- Do not redesign existing Events surfaces from scratch.
- Evolve existing foundations first:
  - `src/pages/Events.tsx`
  - `src/pages/EventDetails.tsx`
  - `src/pages/CheckIn.tsx`
  - `src/pages/ImportAttendance.tsx`
  - `src/components/SideNavBar.tsx`
- Create new pages only for views without a strong existing foundation.
- Use the wireframes as product direction, not literal copy-paste.
- Follow Modern Legacy UI: dark editorial surfaces, crimson for decisive actions, gold for status/achievement.
- Build vertical slices: data source, permissions, user action, database write, second persona sees result.
- Every slice must include RLS review, auditability, manual Chrome verification, and QA data cleanup.

## Dependency Order

| Order | Slice | Why It Comes Here |
| --- | --- | --- |
| A | Weekly Ineligible List / Social Eligibility | Door and social workflows need a reliable eligibility source of truth. |
| B | Social Door List | Uses current social eligibility and event guest policy. |
| C | Sober Monitor Assignment | Grants temporary door access for social events. Depends on door workflow and event-scoped permissions. |
| D | Community Service Member View | Mostly read/signup after event attendance foundations exist. |
| E | Service / Philanthropy Chairman Console | Officer management, approvals, and rollups after member service model is clear. |
| F | External Philanthropy Calendar + Check-In | Separate approval model; should not be mixed into chapter QR attendance too early. |
| G | Service/Philanthropy Reporting + Audit | Depends on trustworthy service and philanthropy ledgers. |

## Slice A - Weekly Ineligible List / Social Eligibility

### Product Intent

Create the attendance-owned weekly ineligible list archive and current social eligibility flag.
This is the source that later door users read. The archive is for officers; door users should only
see the current eligibility state.

### Wireframe Reference

- `6 - Weekly Ineligible List`
- Also check the Social Door List wireframe for how eligibility appears to door users.

### Existing Foundation

- EventDetails already has publish ineligible list controls.
- Current migrations already include initial weekly ineligible list tables/RPCs.
- Social-ineligible flag is surfaced in check-in responses.

### Backend Scope

- Confirm canonical source tables for:
  - weekly ineligible list archive.
  - weekly ineligible list members.
  - current eligibility lookup.
  - source event linkage.
  - dispute/resolution notes.
  - audit records.
- Ensure Secretary/President/SAA can review archive/history.
- Ensure door/social users can only read current eligibility flags needed for live event operation.
- Ensure published lists are immutable enough for audit, or changes append resolution records.

### UI Scope

- Add officer-facing Weekly Ineligible List archive/review page if EventDetails is no longer enough.
- Add navigation only after the page is real and permission-gated.
- Show list source, publish time, affected members, dispute state, and resolution note.
- Keep current eligibility compact for door/social users.

### Personas To Verify

- Secretary: publish/review list, see archive.
- President: review/resolve dispute if allowed.
- SAA: review list if policy allows.
- Door/sober monitor: can see current eligible/ineligible only.
- Standard member: cannot access officer archive.

### Definition Of Done

- Hosted Supabase migration applied.
- Officer archive/review works with real data.
- Door/current-eligibility read path exposes no archive/history.
- Manual Chrome verification covers each persona.
- QA data cleaned.
- `npm run lint`, `npm run build`, and `git diff --check` pass.

### Goal Prompt

```text
/goal Build Sprint 4 Slice A: Weekly Ineligible List / Social Eligibility for Chapter Command Center.

Read:
- AGENTS.md
- DESIGN.md
- .planning/ACTIVE-SPRINT-PLAN.md
- .planning/ATTENDANCE-PRD.md
- .planning/SPRINT-4-ATTENDANCE-SLICE-TRACKER.md
- /Users/Julian/Downloads/Attendance Wireframes (offline).html

Use the wireframe group "6 - Weekly Ineligible List" as workflow/UI reference.

Scope:
1. Verify and complete backend support for weekly ineligible list archive, source event linkage, current eligibility flag, disputes/resolution notes, and auditability.
2. Build the officer-facing weekly ineligible review/archive surface only if EventDetails no longer covers the workflow cleanly.
3. Gate officer archive/history to Secretary/President/SAA as appropriate.
4. Ensure door/social users can only read current eligibility status, not list history.
5. Connect the list to existing EventDetails publish flow and attendance close flow.
6. Follow DESIGN.md Modern Legacy UI.
7. Manually verify Secretary, President/SAA, door/social user, and standard member in Chrome.
8. Clean QA data.
9. Run lint, build, diff check, and Supabase integrity checks.

Do not redesign existing Events surfaces from scratch.
```

## Slice B - Social Door List

### Product Intent

Create a mobile/tablet-first live door workflow for social events: search first, check in guests,
show brother eligibility, and support audited officer override for unlisted male guests.

### Wireframe Reference

- `1 - Social Door List`

### Existing Foundation

- Event records now support social event type and guest policy placeholders.
- Current social eligibility should come from Slice A.
- Check-in token flow exists for members but guest check-in is separate.

### Backend Scope

- Guest list table(s) for event-scoped guests.
- Guest check-in ledger separate from member attendance.
- Guest gender/policy fields as required by PRD.
- Door override audit table or audit event for unlisted male guests.
- Event-scoped permission grant for sober monitors once Slice C exists.

### UI Scope

- New mobile/tablet door list route.
- Search by guest name/email and brother name/SUID.
- Check in pre-approved male guests.
- Add/check in permitted female guests at door.
- Show current brother eligibility flag.
- Show override request/action only to President, Social Chairman, Health & Safety Officer.

### Personas To Verify

- Door brother/sober monitor: search/check in allowed guests, no restricted override.
- Social Chairman: manage override where allowed.
- President: override with reason.
- Standard member: no door route access unless assigned.

### Definition Of Done

- Guest check-in does not pollute member attendance.
- Current social eligibility is read from source of truth.
- Override is audited.
- Mobile viewport is manually verified in Chrome.
- QA guests/check-ins cleaned.

### Goal Prompt

```text
/goal Build Sprint 4 Slice B: Social Door List for Chapter Command Center.

Read the standard Sprint 4 files plus .planning/SPRINT-4-ATTENDANCE-SLICE-TRACKER.md and use the "1 - Social Door List" wireframes.

Scope:
1. Build a mobile/tablet-first Social Door List route for social events.
2. Add backend support for event guest list, guest check-in, and audited override if missing.
3. Keep member attendance separate from guest attendance.
4. Show current brother eligibility from the Slice A source of truth only.
5. Gate door access to authorized officers/assigned monitors.
6. Gate unlisted male guest override to President, Social Chairman, and Health & Safety Officer.
7. Follow Modern Legacy UI and test mobile/desktop Chrome.
8. Clean QA data and run lint/build/diff checks.

Do not rebuild Events/EventDetails from scratch; link into the door list from event context only where appropriate.
```

## Slice C - Sober Monitor Assignment

### Product Intent

Let officers assign sober monitors to social events and automatically grant those monitors door-list
access for that event only.

### Wireframe Reference

- `2 - Sober Monitor Assignment`

### Existing Foundation

- EventDetails can host event-specific panels.
- Social Door List will need assigned monitor access.

### Backend Scope

- Event monitor assignment table.
- Role/permission bridge for temporary event-scoped door access.
- Coverage requirement calculation:
  - two monitors per 50 attendees.
  - at least one Executive Board member.
- Assignment audit trail.
- Access expiry after event end or assignment removal.

### UI Scope

- Prefer EventDetails social-event panel unless the workflow becomes too large.
- Show assigned monitors, confirmation state, coverage requirements, and add/remove monitor actions.
- Show access grant status.

### Personas To Verify

- Social Chairman/Secretary/President: assign/remove monitors.
- Assigned sober monitor: sees door list access.
- Unassigned member: no door list access.

### Definition Of Done

- Assignment grants and revokes event-scoped access correctly.
- Coverage requirements are visible.
- Door list permission respects assignment.
- QA assignments cleaned.

### Goal Prompt

```text
/goal Build Sprint 4 Slice C: Sober Monitor Assignment for Chapter Command Center.

Use the "2 - Sober Monitor Assignment" wireframes and the Sprint 4 slice tracker.

Scope:
1. Add event-scoped sober monitor assignment backend with audit trail.
2. Implement assignment UI, preferably inside EventDetails for social events unless a new view is clearly needed.
3. Calculate and display monitor coverage requirements.
4. Grant assigned monitors temporary Social Door List access for that event.
5. Revoke access when removed or after the event.
6. Verify Social Chairman/Secretary/President, assigned monitor, and unassigned member in Chrome.
7. Clean QA data and run lint/build/diff checks.
```

## Slice D - Community Service Member View

### Product Intent

Give members a clear view of semester service hours, community-service floor status, and upcoming
service opportunities with signup.

### Wireframe Reference

- `3 - Community Service - Member`

### Existing Foundation

- Events already support service/philanthropy event types and service-hour fields.
- Member-facing pages and route guards already exist.

### Backend Scope

- Service event signup table.
- Service hour ledger or attendance-derived service-hour entries.
- Semester/term rollup query.
- Capacity enforcement.
- Community-service floor completion state.

### UI Scope

- New member service route.
- Semester hours summary.
- Community-service floor state.
- Upcoming service events grouped by month.
- Signup/cancel signup where allowed.
- Event capacity and hours.

### Personas To Verify

- Standard member: view hours/sign up.
- Member already signed up: sees signed-up state.
- Member when event full: cannot sign up.
- Secretary/Chairman: access should match intended nav behavior.

### Definition Of Done

- Signup creates expectation where PRD requires it.
- Capacity cannot be overbooked.
- Service hours roll up from trusted records.
- Manual Chrome verification includes mobile layout.

### Goal Prompt

```text
/goal Build Sprint 4 Slice D: Community Service Member View for Chapter Command Center.

Use the "3 - Community Service - Member" wireframes and the Sprint 4 slice tracker.

Scope:
1. Add/verify backend support for service event signups, capacity, service-hour ledger/rollups, and community-service floor completion.
2. Build the member-facing service view as a new page because there is no strong existing foundation.
3. Show semester hours, floor status, upcoming events by month, capacity, hours, and signup state.
4. Ensure signup creates an attendance expectation where required by the PRD.
5. Verify standard member workflows in Chrome, including full and already-signed-up states.
6. Clean QA data and run lint/build/diff checks.
```

## Slice E - Service / Philanthropy Chairman Console

### Product Intent

Give the Community Service / Philanthropy Chairman an operational console for service events,
missing-floor tracking, approved hours, and pending external philanthropy reports.

### Wireframe Reference

- `4 - Service / Philanthropy - Chairman`

### Existing Foundation

- Service member view should establish data model and rollups first.
- Event creation already supports service/philanthropy types.

### Backend Scope

- Chairman rollup query.
- Service event management actions.
- Missing floor report.
- Pending external philanthropy report queue if Slice F backend exists, otherwise placeholder only if useful.
- Export surface if low-risk.

### UI Scope

- New chairman console route.
- Event list with signed-up, checked-in, hours, and status.
- Missing floor tab/list.
- Pending external reports tab/list.
- Management action should route back to existing EventDetails where possible.

### Personas To Verify

- Community Service / Philanthropy Chairman: full access.
- President/Secretary: read or oversight access if PRD allows.
- Standard member: denied or redirected to member service view.

### Definition Of Done

- Console uses real rollups.
- Does not duplicate EventDetails management unnecessarily.
- Permission denial is clean.
- QA service data cleaned.

### Goal Prompt

```text
/goal Build Sprint 4 Slice E: Service / Philanthropy Chairman Console for Chapter Command Center.

Use the "4 - Service / Philanthropy - Chairman" wireframes and the Sprint 4 slice tracker.

Scope:
1. Build chairman console on top of the service data model from Slice D.
2. Show service event rollups, missing floor, approved hours, and pending external philanthropy reports when real data exists.
3. Route event management to EventDetails where possible instead of duplicating event controls.
4. Gate access to Community Service / Philanthropy Chairman, with President/Secretary oversight only if PRD supports it.
5. Verify chairman, oversight officer, and standard member in Chrome.
6. Clean QA data and run lint/build/diff checks.
```

## Slice F - External Philanthropy Calendar + Check-In

### Product Intent

Support outside-organization philanthropy events where members can check in or report participation,
then an assigned approver validates hours. This is not chapter QR attendance.

### Wireframe Reference

- `5 - External Philanthropy - Calendar & Check-In`

### Existing Foundation

- Service/philanthropy data model from Slices D/E.
- CheckIn page exists, but external philanthropy should not reuse chapter QR semantics blindly.

### Backend Scope

- External event/opportunity table.
- Member external check-in/report table.
- Assigned approver field.
- Approval, rejection, adjustment records.
- Proof/note field.
- Approved hours ledger write.

### UI Scope

- Member calendar/list for external opportunities.
- Member check-in or self-report flow.
- Chairman/assigned approver review queue.
- Approve/reject/adjust hours.

### Personas To Verify

- Standard member: view external events, check in/report.
- Assigned approver: approve/reject/adjust.
- Philanthropy Chairman: manage/review.
- Unassigned officer: read-only or denied, per PRD.

### Definition Of Done

- External participation never writes directly to chapter attendance.
- Hours require approval before rollup.
- Adjustments are audited.
- QA reports cleaned.

### Goal Prompt

```text
/goal Build Sprint 4 Slice F: External Philanthropy Calendar + Check-In for Chapter Command Center.

Use the "5 - External Philanthropy - Calendar & Check-In" wireframes and the Sprint 4 slice tracker.

Scope:
1. Add backend model for external philanthropy opportunities, member reports/check-ins, assigned approvers, and approval adjustments.
2. Build member external philanthropy calendar/check-in or report flow.
3. Build approver/chairman review queue for approve/reject/adjust hours.
4. Ensure external philanthropy does not write directly to chapter QR attendance.
5. Write approved hours only after approval.
6. Verify member, assigned approver, chairman, and unassigned officer in Chrome.
7. Clean QA data and run lint/build/diff checks.
```

## Slice G - Service/Philanthropy Reporting + Audit

### Product Intent

Add exports, audit views, historical rollups, and operational reporting after service/philanthropy
records are trustworthy.

### Wireframe Reference

- Pull from `3`, `4`, and `5` wireframes as needed.
- Do not invent a broad dashboard; build reports users actually need.

### Backend Scope

- Export queries.
- Historical term rollups.
- Service-hour audit log.
- Member-level and officer-level reporting boundaries.

### UI Scope

- Chairman/Secretary report surfaces.
- Export actions.
- Member audit detail only where appropriate.

### Personas To Verify

- Chairman: export/review service records.
- Secretary/President: oversight as allowed.
- Standard member: own history only.

### Definition Of Done

- Reports match source ledgers.
- Privacy boundaries are enforced.
- Export output is verified.

### Goal Prompt

```text
/goal Build Sprint 4 Slice G: Service/Philanthropy Reporting + Audit for Chapter Command Center.

Use the Sprint 4 slice tracker and relevant service/philanthropy wireframes.

Scope:
1. Add reporting/export views only after Slices D-F are stable.
2. Build term rollups, member service-hour audit history, and chairman/secretary exports.
3. Enforce privacy boundaries: members see own history, officers see only role-appropriate reports.
4. Verify exported data against Supabase source ledgers.
5. Test relevant personas in Chrome.
6. Clean QA data and run lint/build/diff checks.
```

## Standard Closeout Checklist For Every Slice

- Read required project docs and this tracker.
- Identify existing page foundation before creating a new page.
- Add migration(s) when the schema changes.
- Apply migration(s) to hosted Supabase.
- Verify RLS and permissions.
- Verify the write path and second-persona read path.
- Manually test Chrome workflows for every relevant persona.
- Test responsive/mobile viewports for field workflows.
- Clean QA data from hosted Supabase.
- Run:
  - `npm run lint`
  - `npm run build`
  - `git diff --check`
- Summarize changed files, migrations, manual workflows, cleanup, and remaining risks.

## Progress Log

### 2026-05-30 - Slice B Social Door List

Status: implementation complete; continue next with Slice C - Sober Monitor Assignment.

Evidence:

- Added hosted migration `20260531013000_social_door_list.sql`.
- Added separate social guest ledger, guest check-in ledger, and male guest override audit table.
- Added RLS and RPC-only door operations for event summary, guest search/list, member eligibility search, guest check-in, and door add/check-in.
- Added `/events/:id/door` mobile/tablet-first door route.
- Linked social events from existing `EventDetails` instead of redesigning Events surfaces.
- Verified Secretary can open the door list, check in a pre-approved guest, search brother eligibility, and add/check in a female guest.
- Verified standard member is denied from the door route.
- Verified President override path records override audit through the door RPC.
- Verified mobile viewport has no horizontal overflow after the responsive padding fix.
- Cleaned QA social event, guests, check-ins, and override audit rows.
- Passed `npm run lint`, `npm run build`, `git diff --check`, and `npx supabase db lint --linked`.

### 2026-05-30 - Slice C Sober Monitor Assignment

Status: implementation complete; continue next with Slice D - Community Service Member View.

Evidence:

- Added hosted migration `20260531021000_sober_monitor_assignments.sql`.
- Added `social_event_monitor_assignments` and `social_event_monitor_assignment_audit`.
- Added event-scoped monitor RPCs for coverage, assignment list, candidate search, assign, confirm, and remove.
- Updated `can_use_social_door` so active sober monitor assignments grant temporary door access and removal/event-end expiry revokes it.
- Added `src/lib/socialMonitors.ts`.
- Added an EventDetails social-event panel for monitor coverage, assigned monitors, confirmation state, access state, and add/remove controls.
- Verified Secretary sees coverage requirements and assigned monitor state in Chrome.
- Verified assigned standard member sees monitor assignment and can open the Social Door List.
- Verified assigned member confirmation writes and updates the UI.
- Verified removal revokes the standard member's door access.
- Verified President and Social Chairman assignment authority through hosted RPC checks.
- Verified event-end expiry disables assigned monitor door access.
- Cleaned QA social event, guests, monitor assignments, monitor audit rows, and temporary Social Chairman test position data.
- Passed required closeout checks after implementation.

### 2026-05-31 - Slice D Community Service Member View

Status: implementation complete; continue next with Slice E - Service / Philanthropy Chairman Console.

Evidence:

- Added hosted migration `20260531030000_community_service_member_view.sql`.
- Added `community_service_signups` with active unique signup enforcement, RLS, and member/officer visibility.
- Added member summary and opportunity RPCs for trusted attendance-derived service hours, community-service floor state, active signups, capacity, and signed-up/checked-in/full states.
- Added signup/cancel RPCs that create and remove `event_expectations`, update event expected counts, enforce signup deadline/capacity, and write attendance audit rows.
- Added `src/lib/communityService.ts` and the `/service` member route.
- Added a member-facing Community Service page with semester hours, floor state, active signup count, grouped opportunities, event hours/capacity, signup, cancel, completed, full, and closed states.
- Added Service navigation for active members while preserving officer routes.
- Verified standard member summary and opportunity states in Browser with completed, open, and full QA events.
- Verified signup creates an active community-service signup and active attendance expectation; cancel removes both active records and resets expected count.
- Verified full-event capacity cannot be overbooked through the hosted RPC.
- Verified Secretary access and nav visibility; Recruitment Chairman persona was blocked by the existing verification hard gate, matching current app gate behavior.
- Verified mobile viewport has no horizontal overflow and adjusted the page H1 so it fits beside the fixed sidebar.
- Cleaned QA service events, signups, expectations, attendees, and audit rows.
- Passed `npm run lint`, `npm run build`, `git diff --check`, and `npx supabase db lint --linked`.

### 2026-05-31 - Slice E Service / Philanthropy Chairman Console

Status: implementation complete; continue next with Slice F - External Philanthropy Calendar + Check-In.

Evidence:

- Added hosted migration `20260531033000_service_philanthropy_chairman_console.sql`.
- Added `can_manage_service_philanthropy()` for Community Service Chairman, Philanthropy Chairman, President, and Secretary access.
- Added `service_philanthropy_console()` with real attendance-derived approved hours, event rollups, missing-floor rows, and an empty external-report queue placeholder until Slice F creates the real workflow.
- Added `src/lib/serviceChairman.ts` and the `/service/console` route.
- Added a Service Console page with summary tiles, service/philanthropy event rollups, missing-floor tab, external reports placeholder, and EventDetails links instead of duplicated event controls.
- Added role-aware Service Console navigation for service/philanthropy chairs and President/Secretary oversight.
- Verified standard member denial through hosted RPC and Browser.
- Verified Secretary oversight access, nav visibility, event rollups, missing-floor tab, and EventDetails routing in Browser.
- Verified Community Service Chairman access with a temporary chairman assignment, then removed it.
- Verified mobile viewport has no horizontal overflow and adjusted compact mobile labels where needed.
- Cleaned QA service/philanthropy events, signups, attendees, and temporary chairman position.
- Passed `npm run lint`, `npm run build`, `git diff --check`, and `npx supabase db lint --linked`.

### 2026-05-31 - Slice F External Philanthropy Calendar + Check-In

Status: implementation complete.

Evidence:

- Added hosted migrations `20260531040000_external_philanthropy_reports.sql` and `20260531041000_external_philanthropy_assigned_reviewer_queue.sql`.
- Added `external_approver_id` on events, `external_philanthropy_signups`, `service_hour_entries`, and `service_hour_entry_audit`.
- Added RLS and RPCs for external opportunity portal, signup, report submission, review queue, approval, rejection, adjustment, and assigned-approver review access.
- Updated member service summary, service/philanthropy console, and `attendance_tier_input` to include approved/adjusted external philanthropy hours only.
- Added `src/lib/externalPhilanthropy.ts` and the `/service/external` route.
- Added a member-facing external philanthropy calendar with signup, pending/approved status, and post-event report submission.
- Added an approver queue for assigned approvers and service/philanthropy oversight roles with approve/reject controls; adjusted-hour review is supported by the hosted RPC.
- Verified standard member external signup and report submission in Browser.
- Verified external reports do not create `event_attendees` rows.
- Verified assigned approver rejection in Browser using a temporary assigned approver fixture.
- Verified Secretary oversight approval in Browser.
- Verified adjusted approval through hosted RPC and confirmed audit row creation.
- Verified unassigned officer review denial through hosted RPC.
- Verified approved/adjusted external hours roll into member service summary.
- Verified mobile viewport has no horizontal overflow and adjusted compact mobile labeling.
- Cleaned QA external events, external signups, service-hour entries, audit rows, expectations, and attendees.
- Passed `npm run lint`, `npm run build`, `git diff --check`, and `npx supabase db lint --linked`.

### 2026-05-31 - Slice G Service/Philanthropy Reporting + Audit

Status: implementation complete; Sprint 4 Attendance slices A-G complete.

Evidence:

- Added hosted migration `20260531043000_service_philanthropy_reporting_audit.sql`.
- Added `service_philanthropy_report_export()` for officer-gated member exports, event exports, term metadata, term rollups, and summary counts.
- Added `service_member_service_hour_audit()` for member-owned service-hour audit history, with officer-only cross-member audit access.
- Added `src/lib/serviceReports.ts` and the `/service/reports` route.
- Added a Reports & Audit page with member CSV export, event CSV export, officer member/event report tabs, and member audit detail.
- Added Service History navigation for members while keeping Service Console restricted to service/philanthropy chairs, President, and Secretary.
- Replaced the stale Service Console external placeholder with real pending external report rows that link to the external review queue.
- Verified Secretary export/report access in Browser with QA rows for community service, hosted philanthropy guest count, approved external hours, and missed external commitment.
- Verified temporary Community Service Chairman export access, then removed the temporary position.
- Verified standard member privacy in Browser: no member/event CSV actions, no other member names, own chapter-run and external audit rows only.
- Verified exported/report source data against hosted Supabase RPC output: 9 member rows, 4 QA event rows, 6.5 total approved hours, 1.5 external approved hours, and 1 missed external commitment before cleanup.
- Verified member audit RPC returns the Julian chapter-run service row and adjusted external report with audit action counts, and denies standard-member export/cross-member audit access.
- Verified mobile viewport has no horizontal overflow on `/service/reports`.
- Cleaned QA service/philanthropy events, community/external signups, attendees, expectations, guest rows, service-hour entries, audit rows, and temporary chairman position.
- Passed `npm run lint`, `npm run build`, `git diff --check`, `npx supabase db lint --linked`, and confirmed migration `20260531043000` is applied remotely.
