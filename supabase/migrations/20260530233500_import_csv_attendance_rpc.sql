create or replace function public.import_csv_attendance(
  target_event_id uuid,
  target_member_ids uuid[],
  target_status public.attendance_status,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  target_member_id uuid;
  existing jsonb;
  saved public.event_attendees%rowtype;
  imported_count integer := 0;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to import attendance for this event.';
  end if;

  if target_member_ids is null or cardinality(target_member_ids) = 0 then
    raise exception 'CSV attendance import requires at least one matched member.';
  end if;

  if length(trim(coalesce(reason, ''))) < 4 then
    raise exception 'CSV attendance import requires a reason.';
  end if;

  foreach target_member_id in array target_member_ids loop
    if target_member_id is null then
      continue;
    end if;

    if not exists (select 1 from public.members m where m.id = target_member_id) then
      raise exception 'Member % does not exist.', target_member_id;
    end if;

    select to_jsonb(ea)
    into existing
    from public.event_attendees ea
    where ea.event_id = target_event_id
      and ea.member_id = target_member_id;

    insert into public.event_attendees (
      event_id,
      member_id,
      checked_in_at,
      status,
      method,
      logged_by,
      override_reason
    )
    values (
      target_event_id,
      target_member_id,
      now(),
      target_status,
      'csv',
      actor_id,
      trim(reason)
    )
    on conflict (event_id, member_id)
    do update set
      status = excluded.status,
      method = 'csv',
      logged_by = actor_id,
      override_reason = trim(reason)
    returning *
    into saved;

    insert into public.event_attendance_audit (
      event_id,
      member_id,
      actor_member_id,
      action,
      before,
      after,
      reason
    )
    values (
      target_event_id,
      target_member_id,
      actor_id,
      'csv_attendance_import',
      existing,
      to_jsonb(saved),
      trim(reason)
    );

    imported_count := imported_count + 1;
  end loop;

  return jsonb_build_object(
    'event_id', target_event_id,
    'imported_count', imported_count,
    'status', target_status,
    'method', 'csv'
  );
end;
$$;

revoke execute on function public.import_csv_attendance(uuid, uuid[], public.attendance_status, text) from public, anon;
grant execute on function public.import_csv_attendance(uuid, uuid[], public.attendance_status, text) to authenticated;

notify pgrst, 'reload schema';
