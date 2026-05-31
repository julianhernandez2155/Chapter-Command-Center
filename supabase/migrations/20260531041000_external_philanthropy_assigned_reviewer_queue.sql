-- Allow assigned external philanthropy approvers to load their review queue.

create or replace function public.external_philanthropy_review_queue()
returns table (
  entry_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  member_id uuid,
  member_name text,
  suid text,
  requested_hours numeric,
  submitted_at timestamptz,
  notes text,
  proof_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_service_philanthropy()
    and not exists (
      select 1
      from public.service_hour_entries she
      join public.events e on e.id = she.event_id
      where she.source = 'external_philanthropy_self_report'
        and she.status = 'pending'
        and e.external_approver_id = actor_id
    )
  then
    raise exception 'You do not have permission to review external philanthropy hours.';
  end if;

  return query
  select
    she.id,
    she.event_id,
    e.name,
    e.event_date,
    m.id,
    trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name),
    m.suid,
    she.requested_hours,
    she.submitted_at,
    she.notes,
    she.proof_url
  from public.service_hour_entries she
  join public.events e on e.id = she.event_id
  join public.members m on m.id = she.member_id
  where she.source = 'external_philanthropy_self_report'
    and she.status = 'pending'
    and public.is_external_philanthropy_reviewer(e.id)
  order by she.submitted_at;
end;
$$;

revoke execute on function public.external_philanthropy_review_queue() from public, anon;
grant execute on function public.external_philanthropy_review_queue() to authenticated;

notify pgrst, 'reload schema';
