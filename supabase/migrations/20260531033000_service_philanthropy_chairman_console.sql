-- Sprint 4 Slice E: Service / Philanthropy Chairman console rollups.

create or replace function public.can_manage_service_philanthropy()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.has_position(array[
      'president',
      'secretary',
      'community_service_chairman',
      'philanthropy_chairman'
    ])
$$;

create or replace function public.service_philanthropy_console(
  target_as_of_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_members integer := 0;
  floor_met_count integer := 0;
  floor_missing_count integer := 0;
  approved_hours numeric := 0;
  upcoming_count integer := 0;
  result jsonb;
begin
  if not public.can_manage_service_philanthropy() then
    raise exception 'You do not have permission to view the service and philanthropy console.';
  end if;

  with active_members as (
    select m.id
    from public.members m
    where m.status = 'active'
  ),
  service_by_member as (
    select
      am.id as member_id,
      coalesce(sum(coalesce(e.hours, 0)) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ), 0)::numeric as service_hours_total,
      count(distinct e.id) filter (
        where e.type = 'community_service'
          and coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      )::integer as community_service_events_attended
    from active_members am
    left join public.event_attendees ea on ea.member_id = am.id
    left join public.events e on e.id = ea.event_id
    group by am.id
  )
  select
    count(*)::integer,
    count(*) filter (where service_by_member.community_service_events_attended >= 1)::integer,
    count(*) filter (where service_by_member.community_service_events_attended < 1)::integer,
    coalesce(sum(service_by_member.service_hours_total), 0)::numeric
  into total_members, floor_met_count, floor_missing_count, approved_hours
  from service_by_member;

  select count(*)::integer
  into upcoming_count
  from public.events e
  where e.type in ('community_service', 'philanthropy')
    and e.archived_at is null
    and e.starts_at >= now();

  with event_rollups as (
    select
      e.id,
      e.name,
      e.type,
      e.event_date,
      e.starts_at,
      e.ends_at,
      e.location,
      e.signup_capacity,
      e.expected_count,
      e.hours,
      case
        when e.starts_at > now() then 'upcoming'
        when coalesce(e.ends_at, e.starts_at) >= now() then 'live'
        else 'complete'
      end as status,
      coalesce(css.signed_up_count, 0) as signed_up_count,
      coalesce(ea.checked_in_count, 0) as checked_in_count,
      coalesce(ea.checked_in_count, 0) * coalesce(e.hours, 0) as hours_awarded
    from public.events e
    left join (
      select event_id, count(*)::integer as signed_up_count
      from public.community_service_signups
      where cancelled_at is null
      group by event_id
    ) css on css.event_id = e.id
    left join (
      select event_id, count(*)::integer as checked_in_count
      from public.event_attendees
      where status in ('on_time', 'late')
      group by event_id
    ) ea on ea.event_id = e.id
    where e.type in ('community_service', 'philanthropy')
      and e.archived_at is null
      and e.starts_at >= (now() - interval '120 days')
    order by e.starts_at desc
  ),
  active_members as (
    select
      m.id,
      m.suid,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as display_name
    from public.members m
    where m.status = 'active'
  ),
  service_by_member as (
    select
      am.id as member_id,
      coalesce(sum(coalesce(e.hours, 0)) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ), 0)::numeric as service_hours_total,
      count(distinct e.id) filter (
        where e.type = 'community_service'
          and coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      )::integer as community_service_events_attended,
      max(e.starts_at) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ) as last_service_at
    from active_members am
    left join public.event_attendees ea on ea.member_id = am.id
    left join public.events e on e.id = ea.event_id
    group by am.id
  ),
  active_signups as (
    select css.member_id, count(*)::integer as active_service_signups
    from public.community_service_signups css
    join public.events e on e.id = css.event_id
    where css.cancelled_at is null
      and e.archived_at is null
      and e.starts_at >= now()
    group by css.member_id
  ),
  missing_floor as (
    select
      am.id as member_id,
      am.suid,
      am.display_name,
      coalesce(sbm.service_hours_total, 0) as service_hours_total,
      coalesce(sbm.community_service_events_attended, 0) as community_service_events_attended,
      coalesce(active_signups.active_service_signups, 0) as active_service_signups,
      sbm.last_service_at
    from active_members am
    left join service_by_member sbm on sbm.member_id = am.id
    left join active_signups on active_signups.member_id = am.id
    where coalesce(sbm.community_service_events_attended, 0) < 1
    order by active_service_signups asc, service_hours_total asc, display_name
  )
  select jsonb_build_object(
    'as_of_date', target_as_of_date,
    'summary', jsonb_build_object(
      'active_members', coalesce(total_members, 0),
      'community_floor_met', coalesce(floor_met_count, 0),
      'community_floor_missing', coalesce(floor_missing_count, 0),
      'approved_service_hours', coalesce(approved_hours, 0),
      'upcoming_service_events', coalesce(upcoming_count, 0),
      'pending_external_reports', 0
    ),
    'events', coalesce((select jsonb_agg(to_jsonb(event_rollups)) from event_rollups), '[]'::jsonb),
    'missing_floor', coalesce((select jsonb_agg(to_jsonb(missing_floor)) from missing_floor), '[]'::jsonb),
    'pending_external_reports', '[]'::jsonb
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.can_manage_service_philanthropy() from public, anon;
revoke execute on function public.service_philanthropy_console(date) from public, anon;

grant execute on function public.can_manage_service_philanthropy() to authenticated;
grant execute on function public.service_philanthropy_console(date) to authenticated;

notify pgrst, 'reload schema';
