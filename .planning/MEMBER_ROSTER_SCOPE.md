# Member Roster Scope

## Purpose

The member roster is the chapter-facing directory. It should help brothers quickly find who is in the chapter, contact them, and understand basic chapter/academic context without turning the roster into a compliance, finance, or discipline dashboard.

This file is the scope boundary for roster work. Anything not needed to make the member-facing directory excellent should stay out of the current roster build.

## Current Roster V1

The general roster lives at `/roster`.

It should include:

- Active and Alumni tabs.
- Three member cards per row on desktop.
- Search by name, school, major, and phone last four.
- Filters for class year, school, major, and pledge class.
- Sort by first name or last name.
- Pledge class grouping toggle.
- Birthdays this week.
- Study abroad badge.
- Profile drawer on member card click.

The member card should stay simple:

- Avatar or initials.
- Preferred/legal display name with last name.
- School.
- Major.
- Class year.
- Pledge class.
- Text, call, and social shortcut actions.

## General Member Profile Drawer

Every authenticated member may see these fields in the profile drawer:

- Preferred name and legal name.
- School and major as separate fields.
- Class year.
- Pledge class.
- Birthday month/day only.
- Phone.
- Email.
- Instagram.
- Snapchat.
- LinkedIn.
- Public bio.
- Current and past positions.
- Active study abroad status, when present.

Do not show `member_since_term`, "member since", or "member year" in the roster UI. Treat those as duplicate concepts of `pledge_class`.

## Supabase Boundary

Roster data should be exposed through curated views, not broad direct table access.

Current general-member view:

- `public.member_directory_profiles`

This view may expose only intentionally public directory/profile fields. Adding a column to `public.members` does not automatically mean it belongs in the directory view.

Low-risk directory fields can remain on `public.members`:

- Names.
- Graduation year.
- School.
- Major.
- Pledge class.
- Birthday month/day.
- Avatar URL.
- Bio.
- Instagram.
- Snapchat.
- LinkedIn.

Sensitive or workflow-specific data should live outside the general directory surface:

- Emergency contacts stay in `public.emergency_contacts`.
- GPA stays in `public.gpa_records`.
- Study abroad, LOA, and transfer periods stay in `public.member_status_periods`.
- Future payment details should move toward a restricted payment/profile table.
- Parent/family contact data should be separate from `public.members` and excluded from the general directory view.

RLS remains the final security boundary. Views and frontend filters are not a replacement for RLS.

## Spreadsheet-Derived Fields

High-leverage fields to keep or expose in roster/profile:

- LinkedIn.
- Phone.
- Email.
- Instagram.
- Snapchat.
- School.
- Major.
- Graduation year.
- Pledge class.
- Birthday month/day.
- Study abroad status.

High-leverage fields for later officer/private workflows:

- Emergency contacts.
- Parent/family contacts and parent outreach consent.
- Venmo/payment handles.
- T-shirt/apparel size.
- Campus organizations and jobs.
- Leadership interest.
- Mentor/big-little relationships.

Fields that should not enter the general roster:

- GPA.
- Dues balance.
- Attendance/compliance status.
- Emergency contacts.
- Parent/family contacts.
- Date/social event guest information.
- Class schedule PDFs.
- Any joke/inappropriate spreadsheet fields.

## Deferred Secretary/Admin Scope

Do not build this yet, but preserve the future direction:

- Secretary detailed roster view.
- Secretary/admin profile edit drawer.
- Column picker.
- Custom CSV export.
- Saved views.
- Missing data indicators.
- Recently edited indicators.
- Full member lifecycle actions.

Future secretary/admin reads should use a role-specific view such as `public.member_secretary_profiles`, not the general directory view.

Detailed Secretary/Admin registry scope is tracked in `.planning/SECRETARY_ROSTER_SCOPE.md`.

## Explicitly Out Of Current Scope

- Full database-backed permissions selector.
- Compliance dashboard inside the roster.
- GPA or scholarship workflow.
- Dues/payment workflow.
- Emergency contact management.
- Parent contact management.
- Big/little family tree.
- Inline editing for general members.
- Bulk admin actions for general members.
