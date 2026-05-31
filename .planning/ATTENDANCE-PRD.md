# Attendance, Check-In, Service, And Eligibility PRD

Status: Draft v2 for Claude/owner review
Owner: Chapter Command Center
Last updated: 2026-05-30

## 1. Purpose

Build an attendance system that is low-touch during real chapter operations, produces clean accountability records, and supplies trustworthy tier-input data without pretending to replace the Executive Board's judgment.

The normal chapter-meeting flow should be:

1. Secretary creates the chapter meeting.
2. All active brothers, including new members and pledges, are expected.
3. Secretary opens check-in and projects a QR code.
4. Members scan as they enter.
5. The app marks present/late automatically.
6. Secretary corrects only edge cases.
7. Unexcused absences feed the weekly Ineligible List.
8. Cumulative attendance facts feed the monthly Engagement Dashboard.

This PRD covers attendance, QR check-in, guest lists, service hours, social eligibility, quorum, and the attendance-owned tier-input contract.

It does not define the final tier engine. Final Gold/Garnet/White classification is certified manually by the Executive Board at Lock-In.

## 2. Current Implementation State

The active app is a Vite React SPA connected to hosted Supabase. Events are already live enough to create, edit, archive, list, and view event details. There are existing schema tables for `events`, `event_attendees`, `excusals`, `tier_config`, and `tier_snapshots`.

Treat the backend as designable before real attendance/compliance records exist. The current schema is useful scaffolding, not a binding compliance contract.

Important existing facts:

- `members` already has `id`, `suid`, and `auth_user_id`.
- `events` already has `check_in_open`, `check_in_token`, `late_cutoff_time`, `expected_count`, `allow_excusals`, and `qr_enabled`.
- `event_attendees` already has member attendance rows with `status`, `method`, `logged_by`, and `override_reason`.
- `attendance_status` currently supports `on_time` and `late`.
- `attendance_method` currently supports `qr`, `manual`, and `csv`.
- The frontend currently exposes only `chapter_meeting` and `social` in the event creation form.
- The database enum already includes more event types than the frontend exposes.

Known gaps:

- `expected_count` is numeric only and does not identify who was expected.
- Absence is inferred from count math, not member-level expectation rows.
- The current check-in page is static/mock.
- There is no real QR generation, token validation, or open/close workflow.
- There is no guest ledger.
- There is no RSVP model.
- There is no service-hours ledger.
- There is no weekly Ineligible List archive.
- There is no quorum display.
- There is no eligibility gate for social door check-in.
- There is no external philanthropy self-report/approval flow.

## 3. Locked Product Decisions

These decisions should replace earlier PRD uncertainty.

1. SUID is the external member identity anchor. It is the primary key for onboarding/import matching in the product sense, with email secondary.
2. Keep UUID `members.id` as the internal database primary key and foreign key target. Do not make SUID the physical database PK.
3. CSV import matches on SUID or email only. Never match on name.
4. Community service is a top-level event type.
5. Service hours are one aggregate bucket, target 20 per semester.
6. Service hours come from community service, hosted philanthropy, and external philanthropy participation.
7. Community service has a floor: each member must attend at least one community service event per semester.
8. Chapter-run service-hour events apply a fixed officer-set hour value to each checked-in attendee.
9. External philanthropy hours are self-reported by the member and approved by the Community Service / Philanthropy Chairman. External philanthropy does not use chapter QR.
10. External counts means other organizations' philanthropy events only, not socials or mixers.
11. New members and pledges are in chapter-meeting expected rosters and the weekly Social Rule.
12. New members and pledges are excluded from initiated-member tier certification.
13. External philanthropy no-show applies only when a member signed up or was assigned and then missed it.
14. External philanthropy no-show creates a flagged missed commitment and SAA-visible mark, not an automatic point deduction.
15. Chapter-meeting attendance rate is isolated from other mandatory events.
16. Chapter-meeting rate formula is `(on_time + late) / (expected - excused)`.
17. Late counts as present for the chapter-meeting rate.
18. Excused absences leave the denominator.
19. Retire `late_attendance_weight` from the chapter-meeting attendance percentage.
20. Excusal window is 24 hours advance notice to the Secretary; emergency retroactive excusal is within 24 hours at the President's discretion.
21. `expected_count` is derived/cached, not hand-edited.
22. Social RSVP "going" stays soft and never becomes an expectation.
23. Expectation rows snapshot at check-in close from the then-current active roster, with changes audited.
24. Guest school email is nullable in the database and required only by UI/policy when appropriate.
25. A guest not on the social guest list gets an audited officer override path, not a hard block.
26. Social events can assign sober monitors. Sober monitors get guest list and door check-in access for that event.
27. Executive members get social guest list and door check-in access automatically.
28. Unlisted male guest override is limited to President, Social Chairman, and Health & Safety Officer.
29. Hosted philanthropy absences use the same excusal flow as chapter meetings.
30. Quorum is based on eligible voting members, not the full undergraduate roster.

## 4. Product Principles

### Low Touch During Events

For chapter meetings, the Secretary should be able to run attendance by projecting one QR code and watching live counts.

### Expected Attendance Is Separate From Actual Attendance

Expected attendance answers: "Who was supposed to be there?"

Actual attendance answers: "Who checked in?"

Do not mix these concepts.

### Member Attendance Is Separate From Guest Attendance

Member check-ins feed accountability and tier-input records.

Guest check-ins feed event records, door operations, and turnout reporting only.

Guests must not be stored in `event_attendees`.

### Absences Are Computed

Do not store an `absent` row for every missing member.

Absence is computed as:

`expected members - checked-in members - approved excusals`

### The App Produces Inputs, Not Final Tiers

Attendance owns clean records for dimensions it controls. The Engagement Dashboard combines attendance-owned dimensions with academic, financial, judicial, PIKE-module, and other owner-supplied data.

The Executive Board certifies final tiers at Lock-In.

### Geolocation Is Out Of Scope For V1

Geolocation adds browser permission friction, weak indoor accuracy, privacy concerns, and edge cases. QR plus authenticated session plus officer override is enough.

## 5. Users And Permissions

### General Member

- View upcoming events.
- RSVP to social/brotherhood events when enabled.
- Sign up for community service or optional philanthropy when enabled.
- Scan QR to check in.
- Submit external philanthropy service hours.
- View own attendance, service, excusal, and current social-eligibility status.

### Secretary

- Full chapter-meeting attendance oversight.
- Open/close chapter check-in.
- View expected, on-time, late, absent, excused, and eligibility counts.
- Manually mark members on-time or late.
- Correct mistaken check-ins with audit reason.
- Publish/archive the attendance half of the weekly Ineligible List.
- Import CSV attendance later.

### President

- Same attendance authority as Secretary.
- Final say on emergency retroactive excusals.
- Override event policies and attendance records when needed.

### SAA

- Review missed-obligation/accountability flags.
- View mandatory attendance and Ineligible List state.
- Own follow-up for executive-council unexcused absence flags and chronic missed commitments.

### Event Creator / Chairman

- Create and manage events they own.
- Open/close check-in for their own eligible events.
- View attendance and planning counts for their own events.
- Manage signup/assignment rosters for their own events.

### Community Service / Philanthropy Chairman

- Manage community service events.
- Manage hosted philanthropy events.
- Manage external philanthropy opportunities.
- Verify external philanthropy self-reported hours.
- View service-hours progress and community-service floor completion.

### Recruitment Chairman

- Manage recruitment events.
- View recruitment-event attendance counts.
- Own the non-attendance requirement of names submitted separately.

### Door Brother

- Use a social door view for guest lookup/check-in.
- Check in pre-approved male guests.
- Add/check in female guests at the door.
- See social eligibility flags for members/guests where applicable.
- Should not receive broad attendance-admin powers.

### Sober Monitor

- Assigned per social event.
- Gets guest list and door check-in access for that assigned event.
- Can help enforce sign-in, guest list, and social eligibility rules at the door.
- Does not receive broad attendance-admin powers outside assigned events.

### Guest

- Non-member attendee.
- May be pre-approved or door-added depending on event policy.
- Does not authenticate through CCC in V1.
- Does not affect tier-input calculations.

## 6. Output Cadences

Attendance drives three products on three clocks.

### Weekly: Social Rule / Ineligible List

This is the highest-use attendance artifact.

Rule:

- One unexcused chapter-meeting absence makes a member ineligible for social events until the next chapter meeting.
- No grace period.
- It resets when the member attends the next chapter meeting.
- Applies to new members and pledges.
- Social events include mixers, parties, and special events.
- Date nights and formals are excluded.
- Secretary publishes one Ineligible List on Flare at 9:00 PM Monday.
- The final weekly list should merge unexcused chapter absences with form non-compliance once forms exist.
- V1 builds the attendance half.
- A 24-hour dispute window runs to the Secretary, then President for final say.
- Every weekly list is archived.

Required V1 output:

- Per-member current social eligibility flag.
- Weekly archived attendance-half Ineligible List.
- Reason: unexcused chapter absence.
- Start event and reset event references.

Design requirement:

- The list should be built so form non-compliance can plug in cleanly later.
- Until forms exist, the record should clearly represent the attendance-owned portion of the final weekly list.

### Monthly: Cumulative Tier-Input Dataset

At each Lock-In, the app exposes a cumulative semester-to-date dataset keyed by SUID.

This dataset is input to human tier certification, not the final tier result.

### Ongoing: Missed-Obligation Counter

Feed progressive accountability:

- 1-2 missed obligations: Level 1.
- 3+ missed obligations in a four-week window: Level 2.
- 5+ missed obligations in a semester: Level 3.

Also compute:

- all-events participation rate per member.
- flag members below 50% participation when paired with below-average service hours for Judicial Board review.

The app owns the attendance slice of this counter.

## 7. Tier-Input Contract

The app must expose clean per-member records for dimensions it owns or partially feeds. It must not compute final Gold/Garnet/White classification.

| Dimension | Requirement | Attendance feeds it? | Data owner |
|---|---|---|---|
| Chapter meeting attendance | Rate >=90% / >=75% | Yes, fully | Secretary |
| Committee meeting attendance | Rate >=90% / >=75% plus task completion | Partial, via Chairman Report | Chairman |
| Recruitment | 2+ events attended and 3+ names submitted | Events only | Recruitment Chairman |
| Service hours | 20 aggregate hours; Garnet at pro-rated pace | Yes, plus community-service floor | Community Service / Philanthropy Chairman |
| Academic standing | Cum 3.2 / sem 2.5 | No | Scholarship Chairman |
| Financial standing | $0 balance by semester end | No | Treasurer |
| Judicial sanctions | None outstanding for Gold | No | SAA |
| PIKE modules | All complete | No | Secretary |

### Tier-Input Output Shape

Emit one record per member, keyed by SUID, cumulative semester-to-date and queryable at any Lock-In date.

Fields attendance owns:

- `suid`
- `member_id`
- `semester`
- `as_of_date`
- `chapter_meetings_expected`
- `chapter_meetings_present`
- `chapter_meetings_late`
- `chapter_meetings_excused`
- `chapter_meetings_unexcused_absent`
- `chapter_meeting_rate`
- `recruitment_events_attended`
- `service_hours_total`
- `community_service_events_attended`
- `community_service_floor_met`
- `hosted_philanthropy_events_attended`
- `external_philanthropy_hours_approved`
- `missed_obligation_count`
- `missed_commitment_count`
- `current_social_ineligible`

Optional fields later:

- `committee_attendance_rate`
- `committee_task_completion_flag`
- `all_events_participation_rate`

### Committee Data Path

Committee attendance should flow through the weekly Chairman Report, not QR for every committee meeting.

The Chairman Report needs:

- committee attendance field.
- task-completion judgment field.
- submitted-by chairman.
- week/semester association.

Committee QR can be added later, but the documented path is Chairman Report intake.

## 8. Event Taxonomy

Attendance behavior should be driven by event configuration.

### Event Types

Expose these event types in frontend create/edit:

- `chapter_meeting`
- `executive_council`
- `committee`
- `social`
- `philanthropy`
- `community_service`
- `recruitment`
- `study_hours`
- `other`

Backend enum changes:

- add `community_service`.
- add `executive_council`.
- consider `brotherhood` later if it becomes distinct enough from `social`/`other`.

### Attendance Modes

Add event-level attendance mode:

- `mandatory_all`: all active members are expected.
- `exec_only`: active Executive Council roster is expected.
- `assignment`: officers assign specific members.
- `signup`: members sign up and become expected.
- `rsvp`: members indicate likely attendance, not punitive.
- `open_check_in`: attendance is tracked for whoever shows up.
- `report_only`: attendance enters through a report, not QR.
- `duration_tracking`: for future study-hours module.

### Event Policy Fields

Add or model:

- `attendance_mode`
- `guest_check_in_enabled`
- `guest_policy`
- `brother_rsvp_enabled`
- `min_brother_rsvp_count`
- `signup_enabled`
- `signup_capacity`
- `signup_deadline`
- `assignment_enabled`
- `counts_toward_service_hours`
- `hours`
- `feeds_chapter_meeting_rate`
- `feeds_recruitment_requirement`
- `feeds_service_hours`
- `feeds_missed_obligation_counter`
- `late_cutoff_time`
- `check_in_opened_at`
- `check_in_opened_by`
- `check_in_closed_at`
- `check_in_closed_by`

Possible `guest_policy` values:

- `none`
- `open_guest_list`
- `social_gender_policy`
- `hosted_philanthropy_guest_list`

### Mandatory-Designation Cap

Warn when the Exec Board designates more than three discretionary mandatory events in a semester.

Exclusions from the cap:

- recruitment.
- Ritual.
- elections.
- philanthropies that are always mandatory.

This is a warning/control, not a hard database block.

## 9. Event Type Behavior

### Chapter Meeting

Default setup:

- `type = chapter_meeting`
- `category = mandatory`
- `attendance_mode = mandatory_all`
- `feeds_chapter_meeting_rate = true`
- `feeds_missed_obligation_counter = true`
- `guest_check_in_enabled = false`
- `brother_rsvp_enabled = false`
- `allow_excusals = true`
- `qr_enabled = true`
- `late_cutoff_time` defaults to start time.

Expected roster:

- all active applicable brothers.
- includes new members and pledges.
- excludes members who are abroad, inactive, suspended, alumni, or otherwise not attendance-applicable for that event.

Check-in:

- QR on projector.
- scan before cutoff = `on_time`.
- scan at or after cutoff = `late`.
- late counts present for attendance rate.

Absence:

- computed from expected roster.
- unexcused absence triggers weekly Social Rule.

Quorum:

- live display of present eligible voting members against the quorum threshold.
- threshold defaults to 50% plus one eligible voting member.
- vote snapshots record whether quorum held.

### Executive Council Meeting

Default setup:

- `type = executive_council`
- `attendance_mode = exec_only`
- `feeds_missed_obligation_counter = true`
- `qr_enabled = true` or manual depending on size.
- `allow_excusals = true`.

Expected roster:

- current Executive Council members.

Outputs:

- unexcused absence flag.
- $15 unexcused-absence flag.
- counter that flags removal review at three unexcused absences in a term.
- SAA-owned follow-up.

This is distinct from chapter meetings and committees.

### Committee

Default setup:

- `type = committee`
- `attendance_mode = report_only`
- `qr_enabled = false` by default.

Data path:

- Chairman Report captures attendance and task-completion judgment.
- Feeds committee tier-input dimension.

### Recruitment

Default setup:

- `type = recruitment`
- `attendance_mode = open_check_in` or `assignment`, depending on event.
- `feeds_recruitment_requirement = true`
- `qr_enabled = true`.

Tier-input impact:

- counts toward 2+ recruitment events attended.
- does not track the 3+ names submitted requirement.
- not part of chapter-meeting attendance rate.
- carved out of discretionary mandatory-event cap.

### Study Hours

Default setup:

- `type = study_hours`
- `attendance_mode = duration_tracking`

Decision:

- Do not model study hours as on-time/late attendance.
- Route to a companion Scholarship/Study Hours module.

### Social

Default setup:

- `type = social`
- `category = optional`
- `attendance_mode = rsvp`
- `brother_rsvp_enabled = true`
- `guest_check_in_enabled = true`
- `guest_policy = social_gender_policy`
- `qr_enabled = true` for brothers.

Brother RSVP:

- `going`
- `maybe`
- `not_going`

Rules:

- RSVP is soft planning.
- RSVP does not create an expectation.
- RSVP does not affect tiers.
- Actual brother attendance still comes from QR/manual check-in.
- Optional `min_brother_rsvp_count` helps decide if event should be held.

Guest policy:

- Male non-brother guests must be added in advance.
- Door brothers search male guest list.
- If found and pre-approved, check in.
- If not found, override is available only to President, Social Chairman, or Health & Safety Officer and must be audited.
- Female guests do not need advance registration.
- Female guests can be added and checked in at the door.
- Guest school email is nullable in DB but required by UI when event policy requires it.

Eligibility gate:

- Door view should surface social-ineligible flag.
- V1 flag source is attendance-owned Ineligible List.
- Later flags include dues, academic probation, study-hour social eligibility, and judicial restrictions.

### Hosted Philanthropy

Purpose:

- large chapter-run philanthropy event, usually one or two per semester.

Default setup:

- `type = philanthropy`
- `attendance_mode = mandatory_all`
- `counts_toward_service_hours = true`
- `feeds_service_hours = true`
- `feeds_missed_obligation_counter = true`
- `category = mandatory`
- `guest_check_in_enabled = true`
- `guest_policy = hosted_philanthropy_guest_list`
- `qr_enabled = true`
- `hours` set by officer.

Member rules:

- all active brothers expected by default.
- missing event is a Core Requirement violation and missed obligation.
- not part of chapter-meeting attendance rate.
- absences use the same excusal flow as chapter meetings.

Guest rules:

- guests stored in guest ledger.
- collect first name, last name, and school email when policy requires.

Service-hours impact:

- checked-in brothers receive event `hours`.

### External Philanthropy

Purpose:

- attending another organization, sorority, or fraternity philanthropy event.

Default setup:

- `type = philanthropy`
- `attendance_mode = signup` or `assignment`
- `counts_toward_service_hours = true`
- `feeds_service_hours = true`
- `feeds_missed_obligation_counter = true`
- `qr_enabled = false`

Rules:

- no chapter QR because the chapter does not control the external event.
- members sign up or are assigned.
- signup/assignment creates expected commitment.
- member self-reports hours after the event.
- Community Service / Philanthropy Chairman approves, rejects, or adjusts hours.
- missing after signup/assignment creates flagged missed commitment.
- a member who never signed up is never penalized.

### Community Service

Default setup:

- `type = community_service`
- `attendance_mode = signup`
- `counts_toward_service_hours = true`
- `feeds_service_hours = true`
- `feeds_missed_obligation_counter = true`
- `signup_enabled = true`
- `signup_capacity` defaults around 40.
- `hours` set by officer.
- `qr_enabled = true`.

Business rule:

- chapter plans roughly one community service event per month.
- each initiated member must attend at least one community service event per semester.
- members can sign up for more.
- signup automatically creates an expectation.
- checked-in members receive event `hours`.

Tier-input impact:

- contributes to `service_hours_total`.
- contributes to `community_service_events_attended`.
- determines `community_service_floor_met`.

### Brotherhood / Optional Headcount

Default setup:

- `attendance_mode = rsvp` or `signup`
- `brother_rsvp_enabled = true`
- `qr_enabled = true`
- `guest_check_in_enabled = false` by default.

Tier-input impact:

- none by default.

## 10. Data Model Proposal

### Member Identity

Keep:

- `members.id uuid primary key`
- `members.suid text unique not null`
- `members.auth_user_id uuid unique`
- `members.google_email text unique not null`

Interpretation:

- UUID is internal relational identity.
- SUID is external/business identity anchor.
- CSV import, onboarding joins, and cross-system matching use SUID first, email second.
- Name matching is prohibited for attendance import.

### Update `events`

Add:

- `attendance_mode text`
- `guest_check_in_enabled boolean not null default false`
- `guest_policy text not null default 'none'`
- `brother_rsvp_enabled boolean not null default false`
- `min_brother_rsvp_count integer`
- `signup_enabled boolean not null default false`
- `signup_capacity integer`
- `signup_deadline timestamptz`
- `counts_toward_service_hours boolean not null default false`
- `hours numeric`
- `feeds_chapter_meeting_rate boolean not null default false`
- `feeds_recruitment_requirement boolean not null default false`
- `feeds_service_hours boolean not null default false`
- `feeds_missed_obligation_counter boolean not null default false`
- `check_in_opened_at timestamptz`
- `check_in_opened_by uuid references members(id)`
- `check_in_closed_at timestamptz`
- `check_in_closed_by uuid references members(id)`

Derived/cached:

- `expected_count` should be derived from active expectation rows or policy, not edited by hand.

### Add `event_expectations`

Purpose:

- member-level expected attendance / commitment.

Suggested columns:

- `id uuid primary key`
- `event_id uuid references events(id) on delete cascade`
- `member_id uuid references members(id) on delete cascade`
- `source text not null`
- `required boolean not null default true`
- `snapshot_reason text`
- `created_by uuid references members(id)`
- `created_at timestamptz not null default now()`
- `removed_at timestamptz`
- `removed_by uuid references members(id)`
- `notes text`
- unique active `(event_id, member_id)` where `removed_at is null`

Sources:

- `all_active`
- `exec_roster`
- `active_applicable_roster`
- `manual_assignment`
- `signup`
- `community_service_signup`
- `import`
- `check_in_close_snapshot`

Snapshot semantics:

- for all-active events, expectation rows are created or finalized at check-in close from the then-current active applicable roster.
- active applicable roster excludes abroad, inactive, suspended, alumni, and event-exempt members.
- post-close changes are audited.
- expectation rows are the source of truth for absence and rate math.

### Add `event_attendance_audit`

Purpose:

- preserve manual corrections and expectation edits.

Suggested columns:

- `id uuid primary key`
- `event_id uuid references events(id)`
- `member_id uuid references members(id)`
- `actor_member_id uuid references members(id)`
- `action text not null`
- `before jsonb`
- `after jsonb`
- `reason text`
- `created_at timestamptz not null default now()`

### Keep `event_attendees` Members-Only

Rules:

- one row per `(event_id, member_id)`.
- status remains `on_time` or `late`.
- do not add `absent`.
- do not add `excused`.
- absence comes from expectations.
- excusal comes from `excusals`.
- direct member insert stays blocked.
- member check-in uses secure RPC.

### Add `event_rsvps`

Purpose:

- soft planning response, mostly social/brotherhood.

Suggested columns:

- `id uuid primary key`
- `event_id uuid references events(id) on delete cascade`
- `member_id uuid references members(id) on delete cascade`
- `response text not null`
- `responded_at timestamptz not null default now()`
- unique `(event_id, member_id)`

Responses:

- `going`
- `maybe`
- `not_going`

Rule:

- social RSVP never creates an expectation.

### Add `event_guests`

Purpose:

- non-member guest ledger.

Suggested columns:

- `id uuid primary key`
- `event_id uuid references events(id) on delete cascade`
- `first_name text not null`
- `last_name text not null`
- `school_email text`
- `guest_type text`
- `approval_status text not null`
- `checked_in_at timestamptz`
- `checked_in_by uuid references members(id)`
- `added_by uuid references members(id)`
- `source text not null`
- `organization text`
- `notes text`
- `created_at timestamptz not null default now()`
- `purge_after date`

Guest types:

- `male_guest`
- `female_guest`
- `other`
- `unknown`

Approval statuses:

- `pre_approved`
- `door_added`
- `checked_in`
- `denied`
- `override_approved`

Sources:

- `advance_list`
- `door_entry`
- `manual_entry`
- `import`

PII:

- guest data needs retention/purge policy.
- historical guest lists must not be broadly readable.

### Add `service_hour_entries`

Purpose:

- per-member service-hour ledger.

Suggested columns:

- `id uuid primary key`
- `member_id uuid references members(id)`
- `event_id uuid references events(id)`
- `source text not null`
- `hours numeric not null`
- `status text not null`
- `submitted_by uuid references members(id)`
- `verified_by uuid references members(id)`
- `submitted_at timestamptz`
- `verified_at timestamptz`
- `notes text`
- `created_at timestamptz not null default now()`

Sources:

- `chapter_run_event`
- `external_philanthropy_self_report`

Statuses:

- `pending`
- `approved`
- `rejected`
- `adjusted`

Rules:

- chapter-run service events create approved entries from check-in.
- external philanthropy creates pending self-reports for chairman review.

### Add `weekly_ineligible_lists`

Purpose:

- archive the weekly Social Rule output.

Suggested columns:

- `id uuid primary key`
- `chapter_event_id uuid references events(id)`
- `week_start date`
- `published_at timestamptz`
- `published_by uuid references members(id)`
- `status text not null`
- `includes_attendance boolean not null default true`
- `includes_forms boolean not null default false`
- `created_at timestamptz not null default now()`

### Add `weekly_ineligible_list_members`

Suggested columns:

- `id uuid primary key`
- `list_id uuid references weekly_ineligible_lists(id) on delete cascade`
- `member_id uuid references members(id)`
- `suid text not null`
- `reason text not null`
- `source text not null`
- `source_event_id uuid references events(id)`
- `dispute_status text`
- `resolved_by uuid references members(id)`
- `resolved_at timestamptz`
- `resolution_note text`

### Add `quorum_snapshots`

Purpose:

- record whether quorum existed for meeting/vote moments.

Suggested columns:

- `id uuid primary key`
- `event_id uuid references events(id)`
- `snapshot_type text not null`
- `present_count integer not null`
- `eligible_count integer not null`
- `threshold_count integer not null`
- `quorum_met boolean not null`
- `created_by uuid references members(id)`
- `created_at timestamptz not null default now()`
- `notes text`

### Add Event Incident Hook

Thin event object hook:

- `event_incidents`
- tied to event.
- creates/reminds 48-hour FASA deadline and 24-hour PIKE HQ deadline.
- full incident workflow can be a companion PRD.

## 11. RPCs, RLS, And Security

### Required RPCs

- `open_event_check_in(event_id)`
- `close_event_check_in(event_id)`
- `rotate_event_check_in_token(event_id)`
- `check_in_member(event_id, token)`
- `manual_mark_attendance(event_id, member_id, status, reason)`
- `set_event_rsvp(event_id, response)`
- `signup_for_event(event_id)`
- `cancel_event_signup(event_id)`
- `add_event_guest(...)`
- `check_in_event_guest(guest_id, override_reason?)`
- `submit_external_service_hours(...)`
- `review_external_service_hours(entry_id, status, approved_hours, note)`
- `publish_weekly_ineligible_list(chapter_event_id)`
- `record_quorum_snapshot(event_id, snapshot_type, notes)`

### Member QR Check-In RPC

The RPC must:

1. Resolve current member from auth.
2. Validate event exists.
3. Validate check-in is open.
4. Validate QR is enabled.
5. Validate token.
6. Determine status from `late_cutoff_time`.
7. Insert attendance if no row exists.
8. Return already-checked-in result if duplicate.
9. Return event name, status, timestamp, and current eligibility flag.

### QR Threat Model

Static QR plus authenticated session is screenshot-shareable.

V1 should use rotating QR tokens:

- rotate every 30-60 seconds while projector page is open.
- rotate token on every check-in open.
- invalidate token on close.
- scan route must tolerate token refresh timing.

If rotating token is deferred, the PRD must explicitly document the residual risk and use a tight check-in window. Recommendation: implement rotation now.

### Auth Redirect Risk

Scanning while signed out is a first-class flow, not an edge case.

The app must preserve the check-in token through auth redirect and resume check-in after sign-in/onboarding.

### RLS Requirements

Attendance:

- members cannot directly insert `event_attendees`.
- members check in through RPC only.
- President/Secretary manage all.
- event owners manage own event attendance where policy allows.

RSVPs/signups:

- members manage own RSVP/signup while open.
- officers can view/manage events they own.

Guests:

- President/Secretary can manage all.
- event creator can manage own event guests.
- door workers can manage assigned event guest check-in only.
- sober monitors can manage guest list/check-in for assigned social events.
- Executive members can access social guest list/check-in automatically.
- unlisted male guest override is limited to President, Social Chairman, and Health & Safety Officer.
- general members cannot browse guest lists.

Service hours:

- members can create own external self-report.
- Community Service / Philanthropy Chairman can review external reports.
- President/Secretary can read all.

Ineligible lists:

- Secretary/President publish and resolve disputes.
- door view can read only current eligibility flag, not full history unless authorized.

## 12. UI/UX Direction

Follow the existing Modern Legacy design:

- dark editorial surface.
- crimson for decisive actions and active state.
- gold for status, service, achievement, and late markers.
- large operational numbers.
- type-led hierarchy.
- no cluttered dashboard grid.
- subtle surface shifts instead of heavy borders.
- no empty tabs.

### Event Creation UI

Use conditional sections instead of one giant form.

Sections:

1. Core identity
   - event name
   - event type
   - date/time
   - location

2. Attendance policy
   - attendance mode
   - mandatory/optional category
   - QR enabled
   - late cutoff
   - allow excusals

3. Type-specific policy
   - chapter meeting: all active members expected.
   - executive council: exec roster expected.
   - social: brother RSVP, minimum brother count, guest policy.
   - hosted philanthropy: all active, guest check-in, service hours.
   - external philanthropy: signup/assignment, service self-report.
   - community service: signup capacity, event hours.
   - recruitment: recruitment requirement flag.
   - committee: Chairman Report path.
   - study hours: companion module warning.

4. Officer notes

Show an operational preview before save:

- expected roster source.
- QR mode.
- guest policy.
- service-hours impact.
- tier-input impact.
- mandatory-cap warning when relevant.

### Event Detail UI

Top hero:

- event name.
- type/category/status pills.
- date/time/location.
- check-in state.
- owner/creator.

Primary stats should be event-specific.

Chapter meeting:

- Expected
- On Time
- Late
- Excused
- Unexcused Absent
- Quorum

Social:

- Going
- Maybe
- Brother Checked In
- Guests Checked In
- Ineligible Flags
- Minimum Needed

Community service:

- Capacity
- Signed Up
- Checked In
- Open Spots
- Hours Per Attendee

Hosted philanthropy:

- Expected Brothers
- Brothers Checked In
- Guests Checked In
- Service Hours Earned
- Missing Brothers

External philanthropy:

- Assigned/Signed Up
- Self-Reports Pending
- Approved Hours
- Missed Commitments

### Officer Check-In Panel

Closed state:

- show late cutoff.
- show expected count.
- primary action: Open Check-In.

Open state:

- large QR.
- projector mode.
- rotating token state.
- copy check-in link.
- live counts.
- close check-in.

Projector mode:

- full-screen, no sidebar.
- huge QR.
- event name.
- late cutoff.
- rotating token status.
- optional quorum/present count for chapter.

### Member Scan Flow

Mobile-first flow:

1. Scan QR.
2. If signed out, sign in and preserve token.
3. Confirm event name.
4. Check in.
5. Show status:
   - on time.
   - late.
   - already checked in.
   - closed/invalid.
   - social ineligible warning when relevant.

Do not make the member manually select an event after scanning.

### Secretary Attendance Desk

Capabilities:

- search members.
- filter expected, on-time, late, absent, excused, not checked in.
- manual mark on-time/late.
- edit attendance status.
- see method, logged by, timestamp, and reason.
- publish/archive attendance-half Ineligible List.
- view dispute status.

Manual corrections:

- compact modal.
- status selector.
- reason field.
- audit info shown after save.

### Social Door List

Search-first mobile/tablet view:

- name/email search.
- pre-approved male guests.
- checked-in guests.
- door-added female guests.
- not checked in.
- social eligibility flag for members.

Male guest flow:

1. search.
2. if pre-approved, check in.
3. if not listed, President, Social Chairman, or Health & Safety Officer can override with reason.

Female guest flow:

1. add guest.
2. first name, last name, school email when required.
3. check in.

### Community Service UI

Member view:

- upcoming service events by month.
- capacity and open spots.
- event hours.
- sign up.
- semester service-hour total.
- community-service floor complete/incomplete.

Chairman view:

- month/semester overview.
- signed up.
- checked in.
- missing floor.
- total approved service hours.
- pending external philanthropy reports.

## 13. End-To-End Workflows

### Chapter Meeting QR

1. Secretary creates chapter meeting.
2. Event defaults to all-active expected roster.
3. Secretary opens check-in.
4. QR token rotates on projector.
5. Members scan.
6. App records on-time/late.
7. Quorum updates live.
8. Secretary manually corrects edge cases.
9. Secretary closes check-in.
10. Expected roster snapshots.
11. Absences compute.
12. Ineligible List attendance half is generated.
13. Excusal/dispute window runs.
14. Archived weekly list is preserved.

### Social RSVP And Door

1. Social event is created with RSVP and guest policy.
2. Brothers respond going/maybe/not going.
3. Male guests are added in advance.
4. Door brothers open door list.
5. Brothers scan QR and eligibility flag appears.
6. Male guests are searched and checked in.
7. Unlisted male guest requires audited officer override.
8. Female guests are added/check in at door.
9. Officers monitor brother and guest counts.

### Hosted Philanthropy

1. Philanthropy chairman creates hosted event.
2. Event sets all active brothers expected.
3. Officer sets event hours.
4. Brother QR check-in records attendance.
5. Guest check-in records outside turnout.
6. Checked-in brothers receive service-hour entries.
7. Missing brothers feed missed-obligation counter.

### External Philanthropy

1. Chairman creates external philanthropy opportunity.
2. Members sign up or are assigned.
3. Signup/assignment creates expectation.
4. After event, member submits hours.
5. Chairman approves/rejects/adjusts.
6. Approved hours add to service total.
7. Signed-up no-show creates missed commitment.

### Community Service

1. Chairman creates monthly service event.
2. Sets capacity and hours.
3. Members sign up.
4. Signup creates expectation.
5. Members scan QR at event.
6. Checked-in members receive hours.
7. Community-service floor is marked complete once member attends at least one service event in semester.

### Quorum Snapshot

1. During chapter or exec meeting, live present count updates.
2. App shows quorum threshold.
3. Before a vote, officer records snapshot.
4. Snapshot stores present count, eligible count, threshold, and quorum result.

## 14. MVP Build Scope

Principle: defer final computation, not data shape.

### V1: Chapter Meeting Attendance, Shaped Correctly

Build:

- SUID/email import identity rules in planning and helpers.
- expanded event taxonomy enough for chapter meeting isolation.
- `event_expectations`.
- QR open/close.
- rotating QR token.
- member scan flow with auth redirect preservation.
- attendance writes via RPC.
- late cutoff.
- Secretary manual correction desk.
- computed absence.
- attendance-half weekly Ineligible List.
- current social eligibility flag from attendance.
- quorum display/snapshot for chapter meeting.
- cumulative tier-input scaffold, not final tier calculation.

Done means:

- Secretary can run a chapter meeting from one QR.
- all active members/new members/pledges are expected.
- late counts present.
- excused absences leave denominator.
- unexcused absences generate Social Rule records.
- quorum is visible.
- data is keyed for tier-input export by SUID.

### Next

- eligibility-gate flags at social check-in.
- executive-council meeting mode.
- committee Chairman Report intake.
- recruitment event counting.
- social RSVP and guest door list with guest PII retention.
- community service and service-hours ledger.
- external philanthropy self-report/approval.
- hosted philanthropy guest and service-hour flow.

### Later

- CSV attendance import by SUID/email.
- forms merge into weekly Ineligible List.
- other-owner feeds into Engagement Dashboard.
- academic, financial, judicial, PIKE module integrations.
- sober/event-monitor module.
- study-hours module.

## 15. Edge Cases And Threats

Duplicate scan:

- return already checked in with timestamp/status.

Late cutoff missing:

- default to event start time.

Check-in closed:

- member receives closed message.
- authorized officer can manually mark.

Signed-out QR scan:

- preserve token through auth redirect.

QR screenshot sharing:

- mitigate with rotating token.

Brother forgets phone:

- Secretary manual mark.

Expected roster changes after close:

- audited expectation edit only.

Community service capacity full:

- prevent signup or add waitlist later.

External philanthropy self-report abuse:

- chairman approval required.

Social guest not on list:

- officer override with reason.

Guest PII:

- retention/purge policy required.
- historical guest lists not broadly readable.

Event archived:

- retain attendance/guest/service records.

Event deleted:

- rare and admin-only.

## 16. Companion Modules

These should hook into events but deserve their own PRDs.

### Sober / Event Monitor System

Alcohol events need:

- monitor roster.
- two monitors per 50 attendees.
- at least one Executive Board member.
- transportation plan.
- monitor check-in confirmation.
- incident linkage.
- assigned sober monitors receive guest list/check-in access for that event.

### Study Hours

Scholarship-owned module:

- duration-based weekly accumulation.
- 0, 2, or 4 hours/week by academic status.
- supervised sessions.
- social-eligibility gate.
- falsification as Membership Review trigger.

### Incident Reporting

Thin hook can live on events now:

- per-event incident log.
- FASA 48-hour deadline.
- PIKE HQ 24-hour deadline.

Full incident operations should be separate.

## 17. Existing-Screen Evolution Plan

Do not design or build the attendance feature as a separate new app surface when an existing page already has the right foundation.

Codex should evolve current screens first:

- `src/pages/Events.tsx`: keep the existing list/calendar foundation. Expand filters, event type display, and event creation/edit modal.
- `src/pages/EventDetails.tsx`: keep the existing command-page foundation. Add event-specific stats, check-in panel, attendance desk, quorum, ineligible-list controls, RSVP/signups, and guest/service panels conditionally.
- `src/pages/CheckIn.tsx`: keep the full-screen mobile check-in foundation. Replace mock scanner states with real token-based check-in result states.
- `src/pages/ImportAttendance.tsx`: keep as the future CSV import foundation, but update import rules to SUID/email-only when CSV work starts.
- `src/components/SideNavBar.tsx`: keep existing navigation patterns and add only the minimum new links once real pages exist.

Existing-screen modifications should preserve the current Modern Legacy visual language, spacing, typography, and dark editorial surface system.

### Existing Pages To Modify In V1

Event creation/edit modal:

- expose expanded event types.
- add attendance mode.
- derive expected attendance instead of hand-editing `expected_count`.
- add late cutoff.
- add QR enabled.
- add service-hours fields where relevant.
- add social RSVP/guest policy placeholders where relevant.
- add operational preview before save.

Event detail command page:

- add chapter-meeting stat row: expected, on-time, late, excused, unexcused absent, quorum.
- add check-in open/close panel.
- add QR/projector action.
- add Secretary attendance desk inside the event detail page.
- add quorum snapshot action.
- add attendance-half Ineligible List generation/archive action.
- show placeholders only when useful; do not create empty tabs.

Check-in page:

- support `/check-in/:token`.
- preserve token through auth redirect.
- show event confirmation, success, late, already checked in, closed, invalid, and social-ineligible states.

### Views Without A Strong Existing Foundation

These should get a separate wireframe/design prompt before implementation:

1. Social door list.
2. Sober monitor assignment panel.
3. Community service member signup/status.
4. Community Service / Philanthropy Chairman service-hours dashboard.
5. External philanthropy self-report and approval queue.
6. Weekly Ineligible List archive/review page if it outgrows the event detail page.

### Prompt For New Views

Use this prompt for the views without an existing foundation:

```text
Use the Chapter Command Center Attendance PRD at .planning/ATTENDANCE-PRD.md and the existing design system in DESIGN.md.

Do not redesign the Events list, EventDetails command page, or CheckIn page from scratch. Those already exist and should be evolved by Codex in the current app.

Design only the new views that do not have a strong existing foundation:

1. Social Door List
   - mobile/tablet-first door workflow.
   - search guest by name/email.
   - check in pre-approved male guests.
   - add/check in female guests.
   - show social eligibility flag.
   - support sober monitors and Executive members as authorized door users.
   - unlisted male guest override limited to President, Social Chairman, and Health & Safety Officer.

2. Sober Monitor Assignment Panel
   - assign sober monitors to a social event.
   - show monitor coverage requirements.
   - show who gets door-list access.

3. Community Service Member View
   - show semester service-hours total.
   - show community-service floor complete/incomplete.
   - show upcoming service events by month.
   - show capacity, open spots, hours, and signup action.

4. Community Service / Philanthropy Chairman View
   - manage service events.
   - see signed up, checked in, missing floor, total approved hours.
   - review external philanthropy self-reported hours.

5. External Philanthropy Self-Report Flow
   - member submits event, hours, note/proof.
   - chairman approves, rejects, or adjusts hours.

6. Weekly Ineligible List Archive/Review
   - attendance-owned list first.
   - form non-compliance source should be plug-and-play later.
   - show dispute status and resolution.

Style constraints:
- Follow the existing Modern Legacy design.
- Dark editorial UI, crimson for decisive actions, gold for status/achievement.
- No generic dashboard grid.
- Use large operational numbers and restrained surfaces.
- Do not add instructional marketing copy.
- Design for repeated officer use during real events.
```

## 18. Remaining Questions

These are the only items I would still want reviewed before build:

1. What exact member statuses/study-abroad states should count as attendance-applicable for each event type?
2. What position slug should represent Social Chairman in the permission system?
3. What position slug should represent Health & Safety Officer in the permission system?
4. Should sober monitors be assigned from members only, or can non-member sober monitors exist?

## 19. Governing-Document Reconciliation Needed

These are document updates outside the app so the app does not enforce rules that the binding documents do not state.

- Reword "20 community service hours" to "20 aggregate service hours, counting community service, hosted philanthropy, and external philanthropy participation."
- Add the floor: at least one community service event per member per semester.
- Add external philanthropy no-show rule for signed-up or assigned commitments.
- Document late/excused rate treatment: late counts present; excused absences leave denominator.
- Align dues language if member-facing cards show a different semester amount from the Standards.

## 20. Success Criteria

The attendance system is successful when:

- Chapter meeting attendance runs from one projected QR.
- Signed-out scan flow works reliably.
- QR sharing risk is mitigated.
- Late arrivals are captured without manual time tracking.
- Absences are member-level accurate.
- The weekly attendance-half Ineligible List is generated and archived.
- Door staff can enforce current social eligibility.
- Social events can estimate brother turnout.
- Social guest list rules are enforceable at the door.
- Hosted philanthropy tracks brothers and guests separately.
- External philanthropy supports verified self-reported hours.
- Community service supports capacity, signup, hours, and semester floor tracking.
- Quorum is visible and snapshotable during meetings.
- Attendance exports clean tier-input facts without computing final tiers.
