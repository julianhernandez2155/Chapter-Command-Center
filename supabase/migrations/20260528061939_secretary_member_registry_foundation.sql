-- Secretary/Admin member registry foundation.
-- Keeps the general member directory curated while adding a separate
-- President/Secretary read model for operational member maintenance.

alter table public.members
  add column if not exists initiation_date date,
  add column if not exists expected_graduation_term text,
  add column if not exists local_address text,
  add column if not exists campus_housing text,
  add column if not exists home_city text,
  add column if not exists home_state text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists last_chased_at timestamptz;

comment on column public.members.initiation_date is 'Secretary-maintained chapter initiation date. Not exposed in the general member directory.';
comment on column public.members.expected_graduation_term is 'Secretary-maintained expected graduation term, e.g. Spring 2027.';
comment on column public.members.local_address is 'Local Syracuse-area address for officer/admin operations. Not exposed in the general member directory.';
comment on column public.members.campus_housing is 'Campus housing label such as dorm, chapter house, apartment, or off-campus.';
comment on column public.members.home_city is 'Permanent/home city for officer/admin operations.';
comment on column public.members.home_state is 'Permanent/home state for officer/admin operations.';
comment on column public.members.last_verified_at is 'Timestamp when the member registry record was last verified by Secretary/President workflow.';
comment on column public.members.last_chased_at is 'Timestamp when the member was last chased for missing registry data.';

create table if not exists public.member_guardian_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  contact_order integer not null default 1 check (contact_order in (1, 2)),
  contact_name text not null,
  relationship text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, contact_order)
);

create index if not exists member_guardian_contacts_member_id_idx
  on public.member_guardian_contacts(member_id);

drop trigger if exists member_guardian_contacts_touch on public.member_guardian_contacts;
create trigger member_guardian_contacts_touch before update on public.member_guardian_contacts
for each row execute function public.touch_updated_at();

alter table public.member_guardian_contacts enable row level security;

drop policy if exists member_guardian_contacts_select_secretary on public.member_guardian_contacts;
create policy member_guardian_contacts_select_secretary
  on public.member_guardian_contacts
  for select
  to authenticated
  using (public.has_position(array['president', 'secretary']));

drop policy if exists member_guardian_contacts_write_secretary on public.member_guardian_contacts;
create policy member_guardian_contacts_write_secretary
  on public.member_guardian_contacts
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

alter table public.emergency_contacts
  add column if not exists same_as_guardian boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists emergency_contacts_touch on public.emergency_contacts;
create trigger emergency_contacts_touch before update on public.emergency_contacts
for each row execute function public.touch_updated_at();

comment on table public.member_guardian_contacts is 'Parent/guardian contacts for Secretary/President registry workflows. Excluded from the general member directory.';
comment on column public.emergency_contacts.same_as_guardian is 'Marks an emergency contact as duplicating a parent/guardian contact without merging the contact surfaces.';

drop view if exists public.member_secretary_profiles;

create view public.member_secretary_profiles
with (security_invoker = true)
as
select
  m.id,
  m.google_email,
  m.personal_email,
  m.suid,
  m.legal_first_name,
  m.legal_last_name,
  m.preferred_name,
  m.phone,
  m.status,
  m.pledge_class,
  m.initiation_date,
  m.graduation_year,
  m.expected_graduation_term,
  coalesce(m.school, m.college) as school,
  m.college,
  m.major,
  m.birthday_month,
  m.birthday_day,
  m.local_address,
  m.campus_housing,
  m.home_city,
  m.home_state,
  m.instagram,
  m.snapchat,
  m.linkedin,
  m.avatar_url,
  m.bio,
  m.parent_outreach_consent,
  m.last_verified_at,
  m.last_chased_at,
  guardian_one.contact_name as guardian_1_name,
  guardian_one.relationship as guardian_1_relationship,
  guardian_one.phone as guardian_1_phone,
  guardian_one.email as guardian_1_email,
  guardian_two.contact_name as guardian_2_name,
  guardian_two.relationship as guardian_2_relationship,
  guardian_two.phone as guardian_2_phone,
  guardian_two.email as guardian_2_email,
  primary_emergency.contact_name as emergency_contact_name,
  primary_emergency.relationship as emergency_contact_relationship,
  primary_emergency.phone as emergency_contact_phone,
  primary_emergency.email as emergency_contact_email,
  primary_emergency.same_as_guardian as emergency_contact_same_as_parent,
  array_remove(array[
    case when nullif(trim(m.suid), '') is null then 'suid' end,
    case when nullif(trim(m.legal_first_name), '') is null then 'legal_first_name' end,
    case when nullif(trim(m.legal_last_name), '') is null then 'legal_last_name' end,
    case when nullif(trim(m.google_email), '') is null then 'google_email' end,
    case when nullif(trim(coalesce(m.personal_email, '')), '') is null then 'personal_email' end,
    case when nullif(trim(coalesce(m.phone, '')), '') is null then 'phone' end,
    case when m.status is null then 'status' end,
    case when nullif(trim(coalesce(m.pledge_class, '')), '') is null then 'pledge_class' end,
    case when m.initiation_date is null then 'initiation_date' end,
    case when m.graduation_year is null then 'graduation_year' end,
    case when nullif(trim(coalesce(m.expected_graduation_term, '')), '') is null then 'expected_graduation_term' end,
    case when nullif(trim(coalesce(m.school, m.college, '')), '') is null then 'school' end,
    case when nullif(trim(coalesce(m.major, '')), '') is null then 'major' end,
    case when nullif(trim(coalesce(m.local_address, '')), '') is null then 'local_address' end,
    case when nullif(trim(coalesce(m.campus_housing, '')), '') is null then 'campus_housing' end,
    case when nullif(trim(coalesce(m.home_city, '')), '') is null then 'home_city' end,
    case when nullif(trim(coalesce(m.home_state, '')), '') is null then 'home_state' end,
    case when guardian_one.id is null then 'parent_guardian_contact' end,
    case when primary_emergency.id is null then 'emergency_contact' end
  ], null) as missing_required_fields,
  cardinality(array_remove(array[
    case when nullif(trim(m.suid), '') is null then 'suid' end,
    case when nullif(trim(m.legal_first_name), '') is null then 'legal_first_name' end,
    case when nullif(trim(m.legal_last_name), '') is null then 'legal_last_name' end,
    case when nullif(trim(m.google_email), '') is null then 'google_email' end,
    case when nullif(trim(coalesce(m.personal_email, '')), '') is null then 'personal_email' end,
    case when nullif(trim(coalesce(m.phone, '')), '') is null then 'phone' end,
    case when m.status is null then 'status' end,
    case when nullif(trim(coalesce(m.pledge_class, '')), '') is null then 'pledge_class' end,
    case when m.initiation_date is null then 'initiation_date' end,
    case when m.graduation_year is null then 'graduation_year' end,
    case when nullif(trim(coalesce(m.expected_graduation_term, '')), '') is null then 'expected_graduation_term' end,
    case when nullif(trim(coalesce(m.school, m.college, '')), '') is null then 'school' end,
    case when nullif(trim(coalesce(m.major, '')), '') is null then 'major' end,
    case when nullif(trim(coalesce(m.local_address, '')), '') is null then 'local_address' end,
    case when nullif(trim(coalesce(m.campus_housing, '')), '') is null then 'campus_housing' end,
    case when nullif(trim(coalesce(m.home_city, '')), '') is null then 'home_city' end,
    case when nullif(trim(coalesce(m.home_state, '')), '') is null then 'home_state' end,
    case when guardian_one.id is null then 'parent_guardian_contact' end,
    case when primary_emergency.id is null then 'emergency_contact' end
  ], null)) as missing_required_field_count,
  m.created_at,
  m.updated_at
from public.members m
left join lateral (
  select mgc.id, mgc.contact_name, mgc.relationship, mgc.phone, mgc.email
  from public.member_guardian_contacts mgc
  where mgc.member_id = m.id
    and mgc.contact_order = 1
  order by mgc.created_at asc
  limit 1
) guardian_one on true
left join lateral (
  select mgc.id, mgc.contact_name, mgc.relationship, mgc.phone, mgc.email
  from public.member_guardian_contacts mgc
  where mgc.member_id = m.id
    and mgc.contact_order = 2
  order by mgc.created_at asc
  limit 1
) guardian_two on true
left join lateral (
  select ec.id, ec.contact_name, ec.relationship, ec.phone, ec.email, ec.same_as_guardian
  from public.emergency_contacts ec
  where ec.member_id = m.id
  order by ec.is_primary desc, ec.created_at asc
  limit 1
) primary_emergency on true
where public.has_position(array['president', 'secretary']);

grant select on public.member_secretary_profiles to authenticated;
grant select, insert, update, delete on public.member_guardian_contacts to authenticated;
grant select, insert, update, delete on public.emergency_contacts to authenticated;

notify pgrst, 'reload schema';
