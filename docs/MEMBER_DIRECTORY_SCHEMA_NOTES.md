# Member Directory Schema Notes

## Added by Sprint 4

Migration: `supabase/migrations/20260521212211_member_directory_profile_fields.sql`

### `public.members` profile fields

- `school`: separate academic school/college field. Backfilled from legacy `college`.
- `pledge_class`: initiation/new member class label, for example `Spring 2027`.
- `member_since_term`: chapter membership start term, for example `Spring 2027`.
- `birthday_month` / `birthday_day`: birthday display without storing birth year in the general directory.
- `avatar_url`: optional profile photo URL.
- `bio`: optional member-editable profile biography.

Existing `major` remains separate from `school`.

### `public.member_status_periods`

Tracks lifecycle/status periods without turning the roster into compliance:

- `study_abroad`
- `loa`
- `transfer`

General members can see `study_abroad` periods. President, Secretary, and SAA can see all status period types. President and Secretary can manage status periods.

### `public.member_directory_profiles`

Safe directory view for the frontend roster. It exposes only directory/profile fields and the current study abroad period. Compliance, dues, attendance, judicial, GPA, and financial data are intentionally excluded.

Migration: `supabase/migrations/20260521213536_restrict_directory_to_safe_view.sql`

General roster visibility is intentionally kept on this view instead of broadening `public.members` table access. Direct `members` table access remains limited by the existing member/officer RLS policies.

### `public.member_positions` read policy

Migration: `supabase/migrations/20260521213311_member_directory_position_history_policy.sql`

Adds a directory-safe `SELECT` policy so authenticated members can see active/alumni members' current and past position titles in the profile drawer. This does not grant write access.

## Still to decide

- Whether `bio` is editable by members in a profile settings screen.
- Whether birthday should remain month/day only everywhere, or whether Secretary can store full DOB privately.
- Whether `school` should replace `college` fully in a later cleanup migration.
- Whether LOA/transfer flags should appear to general members or remain officer-only.
