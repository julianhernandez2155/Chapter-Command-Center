-- Sprint 4 Slice G: service/philanthropy reporting exports and audit views.

create or replace function public.service_member_service_hour_audit(
  target_member_id uuid default null,
  target_as_of_date date default current_date
)
returns table (
  row_id text,
  member_id uuid,
  member_name text,
  suid text,
  event_id uuid,
  event_name text,
  event_type text,
  event_date date,
  source text,
  status text,
  hours numeric,
  requested_hours numeric,
  occurred_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  notes text,
  reviewer_note text,
  audit_trail jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  scoped_member_id uuid;
begin
  actor_id := public.current_member_id();
  scoped_member_id := coalesce(target_member_id, actor_id);

  if actor_id is null or scoped_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if scoped_member_id <> actor_id and not public.can_manage_service_philanthropy() then
    raise exception 'You do not have permission to view another member''s service-hour audit.';
  end if;

  return query
  with chapter_rows as (
    select
      ea.id::text as row_id,
      m.id as member_id,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as member_name,
      m.suid,
      e.id as event_id,
      e.name as event_name,
      e.type::text as event_type,
      e.event_date,
      'chapter_run_event'::text as source,
      ea.status::text as status,
      coalesce(e.hours, 0)::numeric as hours,
      null::numeric as requested_hours,
      ea.checked_in_at as occurred_at,
      null::timestamptz as submitted_at,
      ea.checked_in_at as verified_at,
      ea.override_reason as notes,
      null::text as reviewer_note,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'action', eaa.action,
            'reason', eaa.reason,
            'actor_member_id', eaa.actor_member_id,
            'created_at', eaa.created_at
          )
          order by eaa.created_at
        )
        from public.event_attendance_audit eaa
        where eaa.event_id = ea.event_id
          and eaa.member_id = ea.member_id
      ), '[]'::jsonb) as audit_trail
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    join public.members m on m.id = ea.member_id
    where ea.member_id = scoped_member_id
      and e.event_date <= target_as_of_date
      and coalesce(e.feeds_service_hours, false)
      and ea.status in ('on_time', 'late')
  ),
  external_rows as (
    select
      she.id::text as row_id,
      m.id as member_id,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as member_name,
      m.suid,
      e.id as event_id,
      e.name as event_name,
      e.type::text as event_type,
      e.event_date,
      she.source,
      she.status,
      she.hours,
      she.requested_hours,
      coalesce(she.verified_at, she.submitted_at) as occurred_at,
      she.submitted_at,
      she.verified_at,
      she.notes,
      she.reviewer_note,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'action', shea.action,
            'reason', shea.reason,
            'actor_member_id', shea.actor_member_id,
            'created_at', shea.created_at,
            'before', shea.before,
            'after', shea.after
          )
          order by shea.created_at
        )
        from public.service_hour_entry_audit shea
        where shea.entry_id = she.id
      ), '[]'::jsonb) as audit_trail
    from public.service_hour_entries she
    join public.events e on e.id = she.event_id
    join public.members m on m.id = she.member_id
    where she.member_id = scoped_member_id
      and coalesce(she.verified_at, she.submitted_at)::date <= target_as_of_date
  )
  select *
  from (
    select * from chapter_rows
    union all
    select * from external_rows
  ) ledger
  order by ledger.occurred_at desc nulls last, ledger.event_date desc;
end;
$$;

create or replace function public.service_philanthropy_report_export(
  target_as_of_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  term_start date;
  term_end date;
  term_name text;
  result jsonb;
begin
  if not public.can_manage_service_philanthropy() then
    raise exception 'You do not have permission to export service and philanthropy reports.';
  end if;

  if extract(month from target_as_of_date)::integer >= 7 then
    term_start := make_date(extract(year from target_as_of_date)::integer, 7, 1);
    term_end := make_date(extract(year from target_as_of_date)::integer, 12, 31);
    term_name := extract(year from target_as_of_date)::integer || ' Fall';
  else
    term_start := make_date(extract(year from target_as_of_date)::integer, 1, 1);
    term_end := make_date(extract(year from target_as_of_date)::integer, 6, 30);
    term_name := extract(year from target_as_of_date)::integer || ' Spring';
  end if;

  with tier_rows as (
    select *
    from public.attendance_tier_input(target_as_of_date)
  ),
  active_members as (
    select
      m.id,
      m.suid,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as display_name
    from public.members m
    where m.status = 'active'
  ),
  member_export as (
    select
      am.id as member_id,
      am.suid,
      am.display_name,
      target_as_of_date as as_of_date,
      term_name as semester,
      coalesce(tr.service_hours_total, 0)::numeric as service_hours_total,
      coalesce(tr.community_service_events_attended, 0)::integer as community_service_events_attended,
      coalesce(tr.community_service_floor_met, false) as community_service_floor_met,
      coalesce(tr.hosted_philanthropy_events_attended, 0)::integer as hosted_philanthropy_events_attended,
      coalesce(tr.external_philanthropy_hours_approved, 0)::numeric as external_philanthropy_hours_approved,
      coalesce(tr.missed_commitment_count, 0)::integer as missed_external_commitments
    from active_members am
    left join tier_rows tr on tr.member_id = am.id
    order by am.display_name
  ),
  event_base as (
    select
      e.id,
      e.name,
      e.type::text as event_type,
      e.event_date,
      e.starts_at,
      e.location,
      e.signup_capacity,
      e.expected_count,
      coalesce(e.hours, 0)::numeric as hours_per_attendee,
      coalesce(e.guest_check_in_enabled, false) as guest_check_in_enabled,
      e.qr_enabled,
      e.archived_at
    from public.events e
    where e.type in ('community_service', 'philanthropy')
      and e.event_date between term_start and term_end
      and e.event_date <= target_as_of_date
  ),
  event_export as (
    select
      eb.id as event_id,
      eb.name,
      eb.event_type,
      eb.event_date,
      eb.starts_at,
      eb.location,
      eb.signup_capacity as capacity,
      coalesce(css.signed_up_count, 0) + coalesce(eps.signed_up_count, 0) as signed_up_count,
      coalesce(ea.checked_in_count, 0) as checked_in_count,
      case
        when eb.signup_capacity is null then null::integer
        else greatest(eb.signup_capacity - coalesce(css.signed_up_count, 0) - coalesce(eps.signed_up_count, 0), 0)
      end as open_spots,
      eb.hours_per_attendee,
      coalesce(ee.expected_brothers, eb.expected_count, 0)::integer as expected_brothers,
      coalesce(ea.checked_in_count, 0)::integer as brothers_checked_in,
      coalesce(sgci.guests_checked_in, 0)::integer as guests_checked_in,
      (
        coalesce(ea.checked_in_count, 0) * eb.hours_per_attendee
        + coalesce(ext.approved_hours, 0)
      )::numeric as service_hours_earned,
      coalesce(missing.missing_brothers, 0)::integer as missing_brothers,
      coalesce(ext.pending_reports, 0)::integer as external_pending_reports,
      coalesce(ext.approved_hours, 0)::numeric as external_approved_hours,
      coalesce(ext_missed.missed_commitments, 0)::integer as external_missed_commitments,
      (eb.archived_at is not null) as archived
    from event_base eb
    left join (
      select event_id, count(*)::integer as signed_up_count
      from public.community_service_signups
      where cancelled_at is null
      group by event_id
    ) css on css.event_id = eb.id
    left join (
      select event_id, count(*)::integer as signed_up_count
      from public.external_philanthropy_signups
      where cancelled_at is null
      group by event_id
    ) eps on eps.event_id = eb.id
    left join (
      select event_id, count(*)::integer as checked_in_count
      from public.event_attendees
      where status in ('on_time', 'late')
      group by event_id
    ) ea on ea.event_id = eb.id
    left join (
      select event_id, count(*)::integer as guests_checked_in
      from public.social_guest_check_ins
      group by event_id
    ) sgci on sgci.event_id = eb.id
    left join (
      select event_id, count(*)::integer as expected_brothers
      from public.event_expectations
      where required
        and removed_at is null
      group by event_id
    ) ee on ee.event_id = eb.id
    left join (
      select
        she.event_id,
        count(*) filter (where she.status = 'pending')::integer as pending_reports,
        coalesce(sum(she.hours) filter (where she.status in ('approved', 'adjusted')), 0)::numeric as approved_hours
      from public.service_hour_entries she
      where she.source = 'external_philanthropy_self_report'
      group by she.event_id
    ) ext on ext.event_id = eb.id
    left join (
      select
        ee.event_id,
        count(*)::integer as missing_brothers
      from public.event_expectations ee
      join public.events e on e.id = ee.event_id
      left join public.event_attendees ea
        on ea.event_id = ee.event_id
        and ea.member_id = ee.member_id
      left join public.excusals ex
        on ex.event_id = ee.event_id
        and ex.member_id = ee.member_id
        and ex.status = 'approved'
      where ee.required
        and ee.removed_at is null
        and e.event_date <= target_as_of_date
        and ea.id is null
        and ex.id is null
      group by ee.event_id
    ) missing on missing.event_id = eb.id
    left join (
      select
        ee.event_id,
        count(*)::integer as missed_commitments
      from public.event_expectations ee
      join public.events e on e.id = ee.event_id
      left join public.service_hour_entries she
        on she.event_id = ee.event_id
        and she.member_id = ee.member_id
        and she.source = 'external_philanthropy_self_report'
        and she.status in ('pending', 'approved', 'adjusted')
      where e.type = 'philanthropy'
        and e.qr_enabled = false
        and e.event_date <= target_as_of_date
        and ee.source in ('external_philanthropy_signup', 'external_philanthropy_assignment')
        and ee.required
        and ee.removed_at is null
        and she.id is null
      group by ee.event_id
    ) ext_missed on ext_missed.event_id = eb.id
    order by eb.starts_at desc
  ),
  term_sources as (
    select
      concat(extract(year from e.event_date)::integer, case when extract(month from e.event_date)::integer >= 7 then ' Fall' else ' Spring' end) as semester,
      coalesce(sum(coalesce(e.hours, 0)), 0)::numeric as chapter_run_hours,
      0::numeric as external_hours,
      count(distinct e.id) filter (where e.type = 'community_service')::integer as community_service_events,
      count(distinct e.id) filter (where e.type = 'philanthropy' and coalesce(e.guest_check_in_enabled, false))::integer as hosted_philanthropy_events
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where coalesce(e.feeds_service_hours, false)
      and ea.status in ('on_time', 'late')
      and e.event_date <= target_as_of_date
    group by 1
    union all
    select
      concat(extract(year from coalesce(she.verified_at, she.submitted_at))::integer, case when extract(month from coalesce(she.verified_at, she.submitted_at))::integer >= 7 then ' Fall' else ' Spring' end) as semester,
      0::numeric as chapter_run_hours,
      coalesce(sum(she.hours), 0)::numeric as external_hours,
      0::integer as community_service_events,
      0::integer as hosted_philanthropy_events
    from public.service_hour_entries she
    where she.source = 'external_philanthropy_self_report'
      and she.status in ('approved', 'adjusted')
      and coalesce(she.verified_at, she.submitted_at)::date <= target_as_of_date
    group by 1
  ),
  term_rollups as (
    select
      semester,
      coalesce(sum(chapter_run_hours), 0)::numeric as chapter_run_hours,
      coalesce(sum(external_hours), 0)::numeric as external_hours,
      (coalesce(sum(chapter_run_hours), 0) + coalesce(sum(external_hours), 0))::numeric as approved_service_hours,
      coalesce(sum(community_service_events), 0)::integer as community_service_events,
      coalesce(sum(hosted_philanthropy_events), 0)::integer as hosted_philanthropy_events
    from term_sources
    group by semester
    order by semester desc
  )
  select jsonb_build_object(
    'as_of_date', target_as_of_date,
    'term', jsonb_build_object(
      'name', term_name,
      'starts_on', term_start,
      'ends_on', term_end
    ),
    'summary', jsonb_build_object(
      'member_count', (select count(*) from member_export),
      'approved_service_hours', coalesce((select sum(service_hours_total) from member_export), 0),
      'community_floor_met', coalesce((select count(*) from member_export where community_service_floor_met), 0),
      'community_floor_missing', coalesce((select count(*) from member_export where not community_service_floor_met), 0),
      'external_hours_approved', coalesce((select sum(external_philanthropy_hours_approved) from member_export), 0),
      'missed_external_commitments', coalesce((select sum(missed_external_commitments) from member_export), 0),
      'reportable_events', (select count(*) from event_export)
    ),
    'members', coalesce((select jsonb_agg(to_jsonb(member_export) order by display_name) from member_export), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(event_export) order by starts_at desc) from event_export), '[]'::jsonb),
    'term_rollups', coalesce((select jsonb_agg(to_jsonb(term_rollups) order by semester desc) from term_rollups), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.service_member_service_hour_audit(uuid, date) from public, anon;
revoke execute on function public.service_philanthropy_report_export(date) from public, anon;

grant execute on function public.service_member_service_hour_audit(uuid, date) to authenticated;
grant execute on function public.service_philanthropy_report_export(date) to authenticated;

notify pgrst, 'reload schema';
