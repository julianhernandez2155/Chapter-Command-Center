-- Read-only check-in preview for the member scan confirmation step.
-- Possessing a current or grace-window token is enough to see the event name
-- and timing, but attendance still requires the authenticated write RPC.

create or replace function public.preview_check_in_token(submitted_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  token_grace_available boolean := false;
begin
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

  return jsonb_build_object(
    'result', 'ready',
    'event_id', event_record.id,
    'event_name', event_record.name,
    'event_date', event_record.event_date,
    'starts_at', event_record.starts_at,
    'ends_at', event_record.ends_at,
    'late_cutoff_time', coalesce(event_record.late_cutoff_time, event_record.starts_at),
    'location', event_record.location,
    'token_grace_available', token_grace_available
  );
end;
$$;

revoke execute on function public.preview_check_in_token(uuid) from public;
grant execute on function public.preview_check_in_token(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
