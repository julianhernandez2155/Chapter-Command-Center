-- Correct directory access boundary:
-- The broad members SELECT policy could expose non-directory columns through
-- direct table access. General roster access should go through the safe view.

drop policy if exists members_select_directory_visible on public.members;

create or replace view public.member_directory_profiles
with (security_invoker = false)
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

notify pgrst, 'reload schema';
