# Secretary Roster Scope

## Purpose

The Secretary roster is the officer-facing member registry. It should feel like a supercharged, tailored spreadsheet: fast scanning, practical saved views, controlled editing, clean exports, and strong guardrails around private data.

This is separate from the general `/roster` member directory. The general roster is for all members. The Secretary roster is for President/Secretary operational maintenance and should live at a future route such as `/admin/members`.

## Product Boundary

The Secretary roster is the source-of-truth control panel for member records and contact/status administration.

It should own:

- Canonical member identity.
- Contact data.
- Academic/profile basics.
- Parent and emergency contacts.
- Membership status and status periods.
- Missing-data hygiene.
- CSV/copy exports for roster data.
- Secretary-maintained notes and edit history.

It should not own:

- Attendance recording or reconciliation. That belongs in Attendance/Event workflows.
- Excusal review. That belongs in Excusals.
- Compliance enforcement. That belongs with SAA/Judicial workflows.
- Dues/payment details. That belongs with Treasurer workflows.
- GPA or academic intervention details. That belongs with Scholarship workflows.
- Chapter announcements, presentation generation, room booking, or MHQ reports. Those can use registry data, but should be their own Secretary/operations modules.

## MVP Data Fields

Core identity:

- `id` internal UUID, never shown as an editable field.
- `suid`, unique external identifier.
- `legal_first_name`.
- `legal_last_name`.
- `preferred_name`.
- `google_email`.
- `personal_email`.
- `phone`.
- `status`.
- `pledge_class`.
- `initiation_date`.
- `graduation_year`.
- `expected_graduation_term`, for example `Spring 2027`.
- `school`.
- `major`.
- `birthday_month`.
- `birthday_day`.

Housing and location:

- `local_address`.
- `campus_housing`, for dorm/house/apartment label.
- `home_city`.
- `home_state`.

Social/profile:

- `instagram`.
- `snapchat`.
- `linkedin`.
- `avatar_url`.
- `bio`.

Data hygiene:

- `last_verified_at`, when the member record was last confirmed as accurate.
- `last_chased_at`, when the Secretary last followed up for missing data.
- `missing_required_field_count`, computed in the view.
- `missing_required_fields`, computed text array for the UI.
- `updated_at`.
- `updated_by`, when audit support exists.

Emergency and parent contacts:

- Parent/guardian 1 name, relationship, phone, email.
- Parent/guardian 2 name, relationship, phone, email.
- Emergency contact name, relationship, phone, email.
- `emergency_contact_same_as_parent`.
- `parent_outreach_consent`.

Status periods:

- Study abroad.
- LOA.
- Transfer.
- Expected return term/date where relevant.

## Supabase Boundary

Use a role-specific view:

- `public.member_secretary_profiles`

This view should expose Secretary registry fields and computed missing-data fields. It should not expose raw dues, GPA, judicial, attendance, or compliance records.

Likely supporting tables/columns:

- Add Secretary-owned columns to `public.members` only when they are canonical member attributes.
- Keep parent/guardian contacts in a separate table such as `public.parent_contacts` or `public.member_guardian_contacts`.
- Keep emergency contacts in `public.emergency_contacts`.
- Keep study abroad, LOA, and transfer in `public.member_status_periods`.
- Add `public.member_audit_log` or `public.admin_activity_log` before broad editing/export actions ship.

RLS remains the final boundary. The frontend table, filters, and views are not security controls by themselves.

## MVP Views

### Active Roster

Purpose: default working roster.

Columns:

- Name.
- Status.
- Class year.
- Expected graduation term.
- Pledge class.
- School.
- Major.
- Phone.
- Email.
- Missing field count.

Actions:

- Open detail drawer.
- Copy emails.
- Copy phones.
- Export current view.

### Contact Sheet

Purpose: fast lookup and operational contact exports.

Columns:

- Name.
- Phone.
- Google email.
- Personal email.
- Instagram.
- Snapchat.
- LinkedIn.
- Status.

Actions:

- Copy selected contact cards.
- Copy visible emails.
- Copy visible phones.
- Export current view.

### Missing Data

Purpose: data hygiene and follow-up.

Columns:

- Name.
- Missing field count.
- Missing required fields.
- Phone.
- Personal email.
- SUID.
- Pledge class.
- Parent/emergency contact completeness.
- Last verified at.
- Last chased at.

Actions:

- Mark chased.
- Mark verified.
- Export missing-data list.

### Parent / Emergency Contacts

Purpose: crisis readiness and administrative contact support.

Columns:

- Name.
- Status.
- Member phone.
- Parent/guardian 1.
- Parent/guardian 2.
- Emergency contact.
- Parent outreach consent.

Actions:

- Copy emergency contact card.
- Export current view.

Guardrail: opening or exporting this view should be audit logged once audit support exists.

### Status Watchlist

Purpose: track non-standard membership status without turning the registry into compliance.

Columns:

- Name.
- Status.
- Status period type.
- Start term/date.
- End term/date.
- Expected return.
- Notes.

Actions:

- Update status period.
- Export watchlist.

## Detail Drawer

Default expanded sections:

- Core identity.
- Contact.
- Academic/chapter basics.
- Data hygiene.

Collapsed sections:

- Parent and emergency contacts.
- Status timeline.
- Position history.
- Secretary notes.
- Audit history, once available.

The drawer should be the primary edit surface. Avoid raw grid editing in the first version.

## Editing Rules

Direct edit:

- Preferred name.
- Personal email.
- Phone.
- School.
- Major.
- Social/profile fields.
- Local address/campus housing.
- Home city/home state.
- Secretary notes.
- Last verified at.

Confirmation required:

- SUID.
- Legal name.
- Google email.
- Status.
- Initiation date.
- Pledge class.
- Expected graduation term.
- Parent/emergency contacts.

Audit required:

- Any edit.
- Any export.
- Any parent/emergency view access.
- Any status change.
- Any bulk action.

Read-only or separate workflow:

- Position assignments unless the current Positions workflow owns the edit.
- Attendance and excusals.
- Dues/payment records.
- GPA/academic compliance records.
- Judicial/compliance records.

## MVP Acceptance Criteria

- Secretary and President can access `/admin/members`.
- General Member cannot access `/admin/members`.
- Table loads from `member_secretary_profiles`, not broad direct table reads.
- The five MVP views work.
- Search covers name, SUID, phone, email, school, major, pledge class, and status.
- Detail drawer exposes MVP fields.
- Basic safe edits work through RLS.
- Parent/emergency contacts are visible only to permitted personas.
- Missing required field count is computed.
- `last_verified_at` can be set.
- Export current view to CSV works for allowed personas.

## Deferred

- Attendance Support view.
- Compliance/Judicial flags.
- Dues status flags.
- GPA/academic flags.
- myPIKE/MHQ report automation.
- University Greek Life roster sync.
- Crisis Mode.
- Mobile-first emergency contact view.
- Member self-service update approval queue.
- Bulk edit.
