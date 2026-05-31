-- Expands the Sprint 4 tier-input RPC to the PRD contract shape.
-- Service/external philanthropy views are still gated by design wireframes, but
-- the attendance-owned export now has stable fields for downstream consumers.

drop function if exists public.attendance_tier_input(date);

create or replace function public.attendance_tier_input(
  target_as_of_date date default current_date
)
returns table (
  suid text,
  member_id uuid,
  semester text,
  as_of_date date,
  chapter_meetings_expected integer,
  chapter_meetings_present integer,
  chapter_meetings_late integer,
  chapter_meetings_excused integer,
  chapter_meetings_unexcused_absent integer,
  chapter_meeting_rate numeric,
  recruitment_events_attended integer,
  service_hours_total numeric,
  community_service_events_attended integer,
  community_service_floor_met boolean,
  hosted_philanthropy_events_attended integer,
  external_philanthropy_hours_approved numeric,
  missed_obligation_count integer,
  missed_commitment_count integer,
  current_social_ineligible boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with chapter_events as (
    select id
    from public.events
    where type = 'chapter_meeting'
      and event_date <= target_as_of_date
  ),
  expected as (
    select ee.member_id, count(*)::integer as expected_count
    from public.event_expectations ee
    join chapter_events ce on ce.id = ee.event_id
    where ee.required
      and ee.removed_at is null
    group by ee.member_id
  ),
  attendance as (
    select
      ea.member_id,
      count(*) filter (where ea.status in ('on_time', 'late'))::integer as present_count,
      count(*) filter (where ea.status = 'late')::integer as late_count
    from public.event_attendees ea
    join chapter_events ce on ce.id = ea.event_id
    group by ea.member_id
  ),
  excused as (
    select ex.member_id, count(*)::integer as excused_count
    from public.excusals ex
    join chapter_events ce on ce.id = ex.event_id
    where ex.status = 'approved'
    group by ex.member_id
  ),
  recruitment as (
    select
      ea.member_id,
      count(distinct e.id)::integer as events_attended
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where e.type = 'recruitment'
      and e.event_date <= target_as_of_date
      and ea.status in ('on_time', 'late')
    group by ea.member_id
  ),
  service as (
    select
      ea.member_id,
      coalesce(sum(coalesce(e.hours, 0)), 0)::numeric as hours_total,
      count(distinct e.id) filter (where e.type = 'community_service')::integer as community_service_count,
      count(distinct e.id) filter (
        where e.type = 'philanthropy'
          and coalesce(e.guest_check_in_enabled, false)
      )::integer as hosted_philanthropy_count
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where e.event_date <= target_as_of_date
      and coalesce(e.feeds_service_hours, false)
      and ea.status in ('on_time', 'late')
    group by ea.member_id
  ),
  missed_obligations as (
    select
      ee.member_id,
      count(*)::integer as missed_count
    from public.event_expectations ee
    join public.events e on e.id = ee.event_id
    left join public.event_attendees ea
      on ea.event_id = ee.event_id
      and ea.member_id = ee.member_id
    left join public.excusals ex
      on ex.event_id = ee.event_id
      and ex.member_id = ee.member_id
      and ex.status = 'approved'
    where e.event_date <= target_as_of_date
      and coalesce(e.feeds_missed_obligation_counter, false)
      and ee.required
      and ee.removed_at is null
      and ea.id is null
      and ex.id is null
    group by ee.member_id
  ),
  latest_published_list as (
    select wil.id
    from public.weekly_ineligible_lists wil
    where wil.status = 'published'
      and wil.includes_attendance
      and wil.week_start <= target_as_of_date
    order by wil.published_at desc nulls last, wil.created_at desc
    limit 1
  ),
  latest_ineligible as (
    select
      wilm.member_id,
      true as ineligible
    from public.weekly_ineligible_list_members wilm
    join latest_published_list lpl on lpl.id = wilm.list_id
  )
  select
    m.suid,
    m.id as member_id,
    concat(
      extract(year from target_as_of_date)::integer,
      case when extract(month from target_as_of_date)::integer >= 7 then ' Fall' else ' Spring' end
    ) as semester,
    target_as_of_date as as_of_date,
    coalesce(e.expected_count, 0) as chapter_meetings_expected,
    coalesce(a.present_count, 0) as chapter_meetings_present,
    coalesce(a.late_count, 0) as chapter_meetings_late,
    coalesce(x.excused_count, 0) as chapter_meetings_excused,
    greatest(
      coalesce(e.expected_count, 0) - coalesce(a.present_count, 0) - coalesce(x.excused_count, 0),
      0
    ) as chapter_meetings_unexcused_absent,
    case
      when greatest(coalesce(e.expected_count, 0) - coalesce(x.excused_count, 0), 0) = 0 then null
      else round(
        coalesce(a.present_count, 0)::numeric
        / greatest(coalesce(e.expected_count, 0) - coalesce(x.excused_count, 0), 1),
        4
      )
    end as chapter_meeting_rate,
    coalesce(r.events_attended, 0) as recruitment_events_attended,
    coalesce(s.hours_total, 0)::numeric as service_hours_total,
    coalesce(s.community_service_count, 0) as community_service_events_attended,
    coalesce(s.community_service_count, 0) >= 1 as community_service_floor_met,
    coalesce(s.hosted_philanthropy_count, 0) as hosted_philanthropy_events_attended,
    0::numeric as external_philanthropy_hours_approved,
    coalesce(mo.missed_count, 0) as missed_obligation_count,
    0::integer as missed_commitment_count,
    coalesce(li.ineligible, false) as current_social_ineligible
  from public.members m
  left join expected e on e.member_id = m.id
  left join attendance a on a.member_id = m.id
  left join excused x on x.member_id = m.id
  left join recruitment r on r.member_id = m.id
  left join service s on s.member_id = m.id
  left join missed_obligations mo on mo.member_id = m.id
  left join latest_ineligible li on li.member_id = m.id
  where m.status in ('active', 'new_member')
  order by m.suid
$$;

notify pgrst, 'reload schema';
