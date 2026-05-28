# Secretary Registry Schema Notes

Migration: `supabase/migrations/20260528061939_secretary_member_registry_foundation.sql`

## Boundary

`/roster` remains member-facing and continues to load from `public.member_directory_profiles`.

`/admin/members` is the Secretary/President registry surface and loads from `public.member_secretary_profiles`.

## MVP Member Fields

The registry adds Secretary-owned operational fields to `public.members` only when they are canonical member attributes:

- `initiation_date`
- `expected_graduation_term`
- `local_address`
- `campus_housing`
- `home_city`
- `home_state`
- `last_verified_at`
- `last_chased_at`

These fields are intentionally excluded from `member_directory_profiles`.

## Contact Boundary

Parent/guardian contacts live in `public.member_guardian_contacts`.

Emergency contacts remain in `public.emergency_contacts`; the migration only adds `same_as_guardian` and `updated_at` so the registry can represent emergency contact reuse without merging the two contact surfaces.

Both contact surfaces are excluded from the general member directory.

## Secretary View

`public.member_secretary_profiles` is a curated admin read model with:

- Core identity and roster fields.
- Contact, housing, home location, and public social/profile fields.
- Flattened parent/guardian and primary emergency contact fields.
- Computed `missing_required_fields`.
- Computed `missing_required_field_count`.

The view does not include attendance, excusals, dues, GPA, judicial, or compliance data.

## RLS

RLS remains the final security boundary.

The view is created with `security_invoker = true` and an officer predicate:

```sql
where public.has_position(array['president', 'secretary'])
```

General authenticated members receive zero rows from `member_secretary_profiles`. President and Secretary can read the view and the underlying guardian/emergency contact rows permitted by table RLS.
