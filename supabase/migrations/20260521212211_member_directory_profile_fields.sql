-- Sprint 4 Member Directory profile fields.
-- Adds low-risk directory/profile fields and first-class lifecycle periods
-- for statuses like Study Abroad without mixing compliance into roster.

alter table public.members
  add column if not exists school text,
  add column if not exists pledge_class text,
  add column if not exists member_since_term text,
  add column if not exists birthday_month integer,
  add column if not exists birthday_day integer,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add constraint members_birthday_month_check
    check (birthday_month is null or birthday_month between 1 and 12),
  add constraint members_birthday_day_check
    check (birthday_day is null or birthday_day between 1 and 31);

update public.members
set school = coalesce(school, college)
where school is null
  and college is not null;

comment on column public.members.school is 'Academic school/college display value used by member directory filters. Backfilled from legacy college.';
comment on column public.members.major is 'Academic major, stored separately from school.';
comment on column public.members.pledge_class is 'Initiation/new member class label, e.g. Spring 2027.';
comment on column public.members.member_since_term is 'Chapter membership start term, e.g. Spring 2027.';
comment on column public.members.birthday_month is 'Birthday month only; birth year intentionally omitted from general directory.';
comment on column public.members.birthday_day is 'Birthday day only; birth year intentionally omitted from general directory.';
comment on column public.members.bio is 'Optional member-editable public profile biography.';

create table if not exists public.member_status_periods (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  status_type text not null check (status_type in ('study_abroad', 'loa', 'transfer')),
  label text,
  start_term text,
  end_term text,
  notes text,
  created_by uuid references public.members(id),
  updated_by uuid references public.members(id),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_status_periods_member_id_idx
  on public.member_status_periods(member_id);

create index if not exists member_status_periods_type_dates_idx
  on public.member_status_periods(member_id, status_type, starts_on, ends_on);

alter table public.member_status_periods enable row level security;

drop policy if exists member_status_periods_select_directory_safe on public.member_status_periods;
create policy member_status_periods_select_directory_safe
  on public.member_status_periods
  for select
  to authenticated
  using (
    status_type = 'study_abroad'
    or member_id = public.current_member_id()
    or public.has_position(array['president', 'secretary', 'saa'])
  );

drop policy if exists member_status_periods_manage_admin on public.member_status_periods;
create policy member_status_periods_manage_admin
  on public.member_status_periods
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists members_select_directory_visible on public.members;
create policy members_select_directory_visible
  on public.members
  for select
  to authenticated
  using (
    status in ('active', 'new_member', 'alumni')
    or id = public.current_member_id()
    or public.has_position(array['president', 'secretary'])
  );

create or replace view public.member_directory_profiles
with (security_invoker = true)
as
select
  m.id,
  m.google_email,
  m.personal_email,
  m.legal_first_name,
  m.legal_last_name,
  m.preferred_name,
  m.phone,
  m.instagram,
  m.snapchat,
  m.status,
  m.graduation_year,
  coalesce(m.school, m.college) as school,
  m.college,
  m.major,
  m.avatar_url,
  m.pledge_class,
  m.member_since_term,
  m.birthday_month,
  m.birthday_day,
  m.bio,
  active_status.status_type as current_status_type,
  active_status.label as current_status_label,
  active_status.start_term as current_status_start_term,
  active_status.end_term as current_status_end_term,
  m.created_at,
  m.updated_at
from public.members m
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
where m.status in ('active', 'new_member', 'alumni');

grant select on public.member_directory_profiles to authenticated;
grant select, insert, update, delete on public.member_status_periods to authenticated;

notify pgrst, 'reload schema';
