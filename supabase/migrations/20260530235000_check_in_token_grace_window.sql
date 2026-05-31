-- Allow a short grace window for members who scan immediately before the
-- projected QR rotates. This keeps rotating tokens without rejecting a valid
-- in-room scan during page load or auth handoff.

alter table public.events
  add column if not exists check_in_previous_token uuid,
  add column if not exists check_in_previous_token_expires_at timestamptz;

create or replace function public.open_event_check_in(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  token uuid;
  expected_total integer;
  event_record public.events%rowtype;
  updated_event public.events%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to open check-in for this event.';
  end if;

  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found or event_record.archived_at is not null then
    raise exception 'Event not found or archived.';
  end if;

  if not event_record.qr_enabled then
    raise exception 'QR check-in is disabled for this event.';
  end if;

  perform public.sync_event_expected_roster(target_event_id, 'check_in_open_snapshot');
  token := gen_random_uuid();

  update public.events
  set
    check_in_open = true,
    check_in_token = token,
    check_in_previous_token = null,
    check_in_previous_token_expires_at = null,
    check_in_opened_at = now(),
    check_in_opened_by = actor_id,
    check_in_closed_at = null,
    check_in_closed_by = null,
    check_in_token_rotated_at = now(),
    late_cutoff_time = coalesce(late_cutoff_time, starts_at)
  where id = target_event_id
    and archived_at is null
  returning *
  into updated_event;

  if not found then
    raise exception 'Event not found or archived.';
  end if;

  select count(*)
  into expected_total
  from public.event_expectations ee
  where ee.event_id = target_event_id
    and ee.required
    and ee.removed_at is null;

  insert into public.event_attendance_audit (
    event_id,
    actor_member_id,
    action,
    after,
    reason
  )
  values (
    target_event_id,
    actor_id,
    'check_in_opened',
    jsonb_build_object('check_in_open', true, 'expected_count', expected_total),
    'Officer opened check-in.'
  );

  return jsonb_build_object(
    'event_id', target_event_id,
    'token', token,
    'check_in_open', true,
    'expected_count', expected_total,
    'late_cutoff_time', updated_event.late_cutoff_time
  );
end;
$$;

create or replace function public.rotate_event_check_in_token(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  token uuid;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to rotate this check-in token.';
  end if;

  token := gen_random_uuid();

  update public.events
  set
    check_in_previous_token = check_in_token,
    check_in_previous_token_expires_at = now() + interval '90 seconds',
    check_in_token = token,
    check_in_token_rotated_at = now()
  where id = target_event_id
    and check_in_open = true
    and archived_at is null;

  if not found then
    raise exception 'Check-in is not open.';
  end if;

  return jsonb_build_object(
    'event_id', target_event_id,
    'token', token,
    'rotated_at', now()
  );
end;
$$;

create or replace function public.close_event_check_in(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  expected_total integer;
  present_total integer;
  excused_total integer;
  absent_total integer;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to close check-in for this event.';
  end if;

  perform public.sync_event_expected_roster(target_event_id, 'check_in_close_snapshot');

  update public.events
  set
    check_in_open = false,
    check_in_token = null,
    check_in_previous_token = null,
    check_in_previous_token_expires_at = null,
    check_in_closed_at = now(),
    check_in_closed_by = actor_id
  where id = target_event_id
    and archived_at is null;

  if not found then
    raise exception 'Event not found.';
  end if;

  select count(*)
  into expected_total
  from public.event_expectations ee
  where ee.event_id = target_event_id
    and ee.required
    and ee.removed_at is null;

  select count(distinct ea.member_id)
  into present_total
  from public.event_attendees ea
  where ea.event_id = target_event_id;

  select count(distinct ex.member_id)
  into excused_total
  from public.excusals ex
  join public.event_expectations ee
    on ee.event_id = ex.event_id
    and ee.member_id = ex.member_id
    and ee.required
    and ee.removed_at is null
  where ex.event_id = target_event_id
    and ex.status = 'approved';

  absent_total := greatest(expected_total - present_total - excused_total, 0);

  insert into public.event_attendance_audit (
    event_id,
    actor_member_id,
    action,
    after,
    reason
  )
  values (
    target_event_id,
    actor_id,
    'check_in_closed',
    jsonb_build_object(
      'check_in_open', false,
      'expected_count', expected_total,
      'present_count', present_total,
      'excused_count', excused_total,
      'absent_count', absent_total
    ),
    'Officer closed check-in.'
  );

  return jsonb_build_object(
    'event_id', target_event_id,
    'check_in_open', false,
    'expected_count', expected_total,
    'present_count', present_total,
    'excused_count', excused_total,
    'absent_count', absent_total
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
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found then
    return jsonb_build_object('result', 'invalid', 'message', 'Event not found.');
  end if;

  if event_record.archived_at is not null then
    return jsonb_build_object('result', 'closed', 'event_name', event_record.name, 'message', 'This event is archived.');
  end if;

  if not event_record.qr_enabled then
    return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'QR check-in is disabled for this event.');
  end if;

  if not event_record.check_in_open then
    return jsonb_build_object('result', 'closed', 'event_name', event_record.name, 'message', 'Check-in is closed.');
  end if;

  if event_record.check_in_token is null or submitted_token is null then
    return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'This check-in link is no longer valid.');
  end if;

  if event_record.check_in_token <> submitted_token then
    if event_record.check_in_previous_token = submitted_token
      and event_record.check_in_previous_token_expires_at is not null
      and event_record.check_in_previous_token_expires_at >= checked_at
    then
      token_grace_used := true;
    else
      return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'This check-in link is no longer valid.');
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
      'token_grace_used', token_grace_used
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
      'token_grace_used', token_grace_used
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
    'token_grace_used', token_grace_used
  );
end;
$$;

create or replace function public.check_in_member_by_token(submitted_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id uuid;
begin
  if public.current_member_id() is null then
    raise exception 'Authentication required.';
  end if;

  select e.id
  into target_event_id
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

  if target_event_id is null then
    return jsonb_build_object('result', 'invalid', 'message', 'This check-in link is no longer valid.');
  end if;

  return public.check_in_member(target_event_id, submitted_token);
end;
$$;

notify pgrst, 'reload schema';
