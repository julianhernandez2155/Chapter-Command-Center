-- Secretary Registry guided workflow foundation.
-- Adds registry-only sizing fields, canonical active role display, current
-- study abroad context, and copy/paste missing-info chase batch tracking.

alter table public.members
  add column if not exists hoodie_size text;

comment on column public.members.hoodie_size is 'Secretary-maintained hoodie size for chapter apparel and registry exports.';

create table if not exists public.secretary_chase_batches (
  id uuid primary key default gen_random_uuid(),
  batch_label text not null,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.secretary_chase_batch_members (
  batch_id uuid not null references public.secretary_chase_batches(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  recipient_line text not null,
  missing_fields text[] not null default '{}',
  marked_at timestamptz not null default now(),
  primary key (batch_id, member_id)
);

create index if not exists secretary_chase_batch_members_member_id_idx
  on public.secretary_chase_batch_members(member_id, marked_at desc);

drop trigger if exists secretary_chase_batches_touch on public.secretary_chase_batches;
create trigger secretary_chase_batches_touch before update on public.secretary_chase_batches
for each row execute function public.touch_updated_at();

alter table public.secretary_chase_batches enable row level security;
alter table public.secretary_chase_batch_members enable row level security;

drop policy if exists secretary_chase_batches_secretary_access on public.secretary_chase_batches;
create policy secretary_chase_batches_secretary_access
  on public.secretary_chase_batches
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists secretary_chase_batch_members_secretary_access on public.secretary_chase_batch_members;
create policy secretary_chase_batch_members_secretary_access
  on public.secretary_chase_batch_members
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

comment on table public.secretary_chase_batches is 'Copy/paste Missing Info Chase batches. No email or SMS is sent by the app.';
comment on table public.secretary_chase_batch_members is 'Members included in a Missing Info Chase batch and the exact copied recipient line.';

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
  m.tshirt_size,
  m.hoodie_size,
  active_status.status_type as current_status_type,
  active_status.label as current_status_label,
  active_status.start_term as current_status_start_term,
  active_status.end_term as current_status_end_term,
  coalesce(active_roles.position_names, '{}') as active_position_names,
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
    case when nullif(trim(coalesce(m.tshirt_size, '')), '') is null then 'tshirt_size' end,
    case when nullif(trim(coalesce(m.hoodie_size, '')), '') is null then 'hoodie_size' end,
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
    case when nullif(trim(coalesce(m.tshirt_size, '')), '') is null then 'tshirt_size' end,
    case when nullif(trim(coalesce(m.hoodie_size, '')), '') is null then 'hoodie_size' end,
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
left join lateral (
  select
    msp.status_type,
    msp.label,
    msp.start_term,
    msp.end_term
  from public.member_status_periods msp
  where msp.member_id = m.id
    and msp.status_type = 'study_abroad'
    and (msp.starts_on is null or msp.starts_on <= current_date)
    and (msp.ends_on is null or msp.ends_on >= current_date)
  order by msp.starts_on nulls last, msp.created_at desc
  limit 1
) active_status on true
left join lateral (
  select array_agg(p.display_name order by p.sort_order, p.display_name) as position_names
  from public.member_positions mp
  join public.positions p on p.id = mp.position_id
  where mp.member_id = m.id
    and mp.removed_at is null
) active_roles on true
where public.has_position(array['president', 'secretary']);

grant select on public.member_secretary_profiles to authenticated;
grant select, insert, update, delete on public.secretary_chase_batches to authenticated;
grant select, insert, update, delete on public.secretary_chase_batch_members to authenticated;

notify pgrst, 'reload schema';
