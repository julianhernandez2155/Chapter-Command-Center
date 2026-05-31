-- Surface the attendance-owned Social Rule flag during member QR check-in.
-- This keeps the existing CheckIn route useful for social eligibility warnings
-- without implementing the separate social door-list view before wireframes.

create or replace function public.member_current_social_ineligible(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with latest_published_list as (
    select wil.id
    from public.weekly_ineligible_lists wil
    where wil.status = 'published'
      and wil.includes_attendance
    order by wil.published_at desc nulls last, wil.created_at desc
    limit 1
  )
  select exists (
    select 1
    from public.weekly_ineligible_list_members wilm
    join latest_published_list lpl on lpl.id = wilm.list_id
    where wilm.member_id = target_member_id
  )
$$;

create or replace function public.preview_check_in_token(submitted_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  token_grace_available boolean := false;
  social_ineligible boolean := false;
begin
  actor_id := public.current_member_id();

  if submitted_token is null then
    return jsonb_build_object('result', 'invalid', 'message', 'This check-in link is no longer valid.');
  end if;

  select e.*
  into event_record
  from public.events e
  where e.check_in_open = true
    and e.archived_at is null
    and e.qr_enabled
    and (
      e.check_in_token = submitted_token
      or (
        e.check_in_previous_token = submitted_token
        and e.check_in_previous_token_expires_at is not null
        and e.check_in_previous_token_expires_at >= now()
      )
    )
  order by
    case when e.check_in_token = submitted_token then 0 else 1 end,
    e.check_in_token_rotated_at desc nulls last
  limit 1;

  if not found then
    return jsonb_build_object('result', 'invalid', 'message', 'This check-in link is no longer valid.');
  end if;

  token_grace_available := event_record.check_in_previous_token = submitted_token
    and event_record.check_in_previous_token_expires_at is not null
    and event_record.check_in_previous_token_expires_at >= now();

  if actor_id is not null then
    social_ineligible := public.member_current_social_ineligible(actor_id);
  end if;

  return jsonb_build_object(
    'result', 'ready',
    'event_id', event_record.id,
    'event_name', event_record.name,
    'event_date', event_record.event_date,
    'starts_at', event_record.starts_at,
    'ends_at', event_record.ends_at,
    'late_cutoff_time', coalesce(event_record.late_cutoff_time, event_record.starts_at),
    'location', event_record.location,
    'token_grace_available', token_grace_available,
    'current_social_ineligible', social_ineligible
  );
end;
$$;

create or replace function public.check_in_member(
  target_event_id uuid,
  submitted_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  existing_attendance public.event_attendees%rowtype;
  computed_status public.attendance_status;
  checked_at timestamptz := now();
  token_grace_used boolean := false;
  social_ineligible boolean := false;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  social_ineligible := public.member_current_social_ineligible(actor_id);

  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found then
    return jsonb_build_object('result', 'invalid', 'message', 'Event not found.', 'current_social_ineligible', social_ineligible);
  end if;

  if event_record.archived_at is not null then
    return jsonb_build_object('result', 'closed', 'event_name', event_record.name, 'message', 'This event is archived.', 'current_social_ineligible', social_ineligible);
  end if;

  if not event_record.qr_enabled then
    return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'QR check-in is disabled for this event.', 'current_social_ineligible', social_ineligible);
  end if;

  if not event_record.check_in_open then
    return jsonb_build_object('result', 'closed', 'event_name', event_record.name, 'message', 'Check-in is closed.', 'current_social_ineligible', social_ineligible);
  end if;

  if event_record.check_in_token is null or submitted_token is null then
    return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'This check-in link is no longer valid.', 'current_social_ineligible', social_ineligible);
  end if;

  if event_record.check_in_token <> submitted_token then
    if event_record.check_in_previous_token = submitted_token
      and event_record.check_in_previous_token_expires_at is not null
      and event_record.check_in_previous_token_expires_at >= checked_at
    then
      token_grace_used := true;
    else
      return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'This check-in link is no longer valid.', 'current_social_ineligible', social_ineligible);
    end if;
  end if;

  select *
  into existing_attendance
  from public.event_attendees
  where event_id = target_event_id
    and member_id = actor_id;

  if found then
    return jsonb_build_object(
      'result', 'already_checked_in',
      'event_id', target_event_id,
      'event_name', event_record.name,
      'status', existing_attendance.status,
      'checked_in_at', existing_attendance.checked_in_at,
      'location', event_record.location,
      'token_grace_used', token_grace_used,
      'current_social_ineligible', social_ineligible
    );
  end if;

  computed_status := case
    when checked_at <= coalesce(event_record.late_cutoff_time, event_record.starts_at) then 'on_time'::public.attendance_status
    else 'late'::public.attendance_status
  end;

  insert into public.event_attendees (
    event_id,
    member_id,
    checked_in_at,
    status,
    method,
    logged_by
  )
  values (
    target_event_id,
    actor_id,
    checked_at,
    computed_status,
    'qr',
    actor_id
  );

  insert into public.event_attendance_audit (
    event_id,
    member_id,
    actor_member_id,
    action,
    after,
    reason
  )
  values (
    target_event_id,
    actor_id,
    actor_id,
    'member_qr_check_in',
    jsonb_build_object(
      'status', computed_status,
      'method', 'qr',
      'checked_in_at', checked_at,
      'token_grace_used', token_grace_used,
      'current_social_ineligible', social_ineligible
    ),
    'Member checked in through QR.'
  );

  return jsonb_build_object(
    'result', computed_status,
    'event_id', target_event_id,
    'event_name', event_record.name,
    'status', computed_status,
    'checked_in_at', checked_at,
    'location', event_record.location,
    'token_grace_used', token_grace_used,
    'current_social_ineligible', social_ineligible
  );
end;
$$;

revoke execute on function public.member_current_social_ineligible(uuid) from public, anon;
grant execute on function public.member_current_social_ineligible(uuid) to authenticated;

notify pgrst, 'reload schema';
