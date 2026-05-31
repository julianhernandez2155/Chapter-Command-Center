-- Sprint 4 Slice D: community service member signup and rollup view.

create table if not exists public.community_service_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  signed_up_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.members(id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists community_service_signups_active_unique
  on public.community_service_signups(event_id, member_id)
  where cancelled_at is null;

create index if not exists community_service_signups_member_idx
  on public.community_service_signups(member_id, signed_up_at desc);

create index if not exists community_service_signups_event_idx
  on public.community_service_signups(event_id, cancelled_at);

alter table public.community_service_signups enable row level security;

grant select, insert, update on public.community_service_signups to authenticated;

drop policy if exists community_service_signups_select_relevant on public.community_service_signups;
create policy community_service_signups_select_relevant
  on public.community_service_signups
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_officer()
    or exists (
      select 1
      from public.events e
      where e.id = community_service_signups.event_id
        and e.created_by = public.current_member_id()
        and public.can_create_events()
    )
  );

drop policy if exists community_service_signups_insert_own on public.community_service_signups;
create policy community_service_signups_insert_own
  on public.community_service_signups
  for insert
  to authenticated
  with check (member_id = public.current_member_id());

drop policy if exists community_service_signups_update_relevant on public.community_service_signups;
create policy community_service_signups_update_relevant
  on public.community_service_signups
  for update
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_officer()
    or exists (
      select 1
      from public.events e
      where e.id = community_service_signups.event_id
        and e.created_by = public.current_member_id()
        and public.can_create_events()
    )
  )
  with check (
    member_id = public.current_member_id()
    or public.is_officer()
    or exists (
      select 1
      from public.events e
      where e.id = community_service_signups.event_id
        and e.created_by = public.current_member_id()
        and public.can_create_events()
    )
  );

create or replace function public.community_service_member_summary(
  target_as_of_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  service_hours numeric := 0;
  community_count integer := 0;
  hosted_count integer := 0;
  active_signup_count integer := 0;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select
    coalesce(sum(coalesce(e.hours, 0)), 0)::numeric,
    count(distinct e.id) filter (where e.type = 'community_service')::integer,
    count(distinct e.id) filter (
      where e.type = 'philanthropy'
        and coalesce(e.guest_check_in_enabled, false)
    )::integer
  into service_hours, community_count, hosted_count
  from public.event_attendees ea
  join public.events e on e.id = ea.event_id
  where ea.member_id = actor_id
    and e.event_date <= target_as_of_date
    and coalesce(e.feeds_service_hours, false)
    and ea.status in ('on_time', 'late');

  select count(*)::integer
  into active_signup_count
  from public.community_service_signups css
  join public.events e on e.id = css.event_id
  where css.member_id = actor_id
    and css.cancelled_at is null
    and e.starts_at >= now()
    and e.archived_at is null;

  return jsonb_build_object(
    'member_id', actor_id,
    'as_of_date', target_as_of_date,
    'service_hours_total', coalesce(service_hours, 0),
    'service_hours_target', 20,
    'community_service_events_attended', coalesce(community_count, 0),
    'community_service_floor_met', coalesce(community_count, 0) >= 1,
    'hosted_philanthropy_events_attended', coalesce(hosted_count, 0),
    'active_service_signups', coalesce(active_signup_count, 0)
  );
end;
$$;

create or replace function public.community_service_opportunities()
returns table (
  event_id uuid,
  name text,
  event_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  signup_capacity integer,
  signup_deadline timestamptz,
  hours numeric,
  signed_up_count integer,
  spots_remaining integer,
  user_signup_id uuid,
  user_signed_up boolean,
  user_checked_in boolean,
  is_full boolean,
  can_signup boolean
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

  return query
  with signup_counts as (
    select
      css.event_id,
      count(*)::integer as signed_up_count
    from public.community_service_signups css
    where css.cancelled_at is null
    group by css.event_id
  ),
  my_signups as (
    select distinct on (css.event_id)
      css.event_id,
      css.id
    from public.community_service_signups css
    where css.member_id = actor_id
      and css.cancelled_at is null
    order by css.event_id, css.signed_up_at desc
  ),
  my_attendance as (
    select ea.event_id
    from public.event_attendees ea
    where ea.member_id = actor_id
      and ea.status in ('on_time', 'late')
  )
  select
    e.id,
    e.name,
    e.event_date,
    e.starts_at,
    e.ends_at,
    e.location,
    e.signup_capacity,
    e.signup_deadline,
    e.hours,
    coalesce(sc.signed_up_count, 0) as signed_up_count,
    case
      when e.signup_capacity is null then null
      else greatest(e.signup_capacity - coalesce(sc.signed_up_count, 0), 0)
    end as spots_remaining,
    ms.id as user_signup_id,
    ms.id is not null as user_signed_up,
    ma.event_id is not null as user_checked_in,
    e.signup_capacity is not null and coalesce(sc.signed_up_count, 0) >= e.signup_capacity as is_full,
    e.archived_at is null
      and e.signup_enabled
      and e.starts_at >= now()
      and (e.signup_deadline is null or e.signup_deadline >= now())
      and ms.id is null
      and ma.event_id is null
      and (
        e.signup_capacity is null
        or coalesce(sc.signed_up_count, 0) < e.signup_capacity
      ) as can_signup
  from public.events e
  left join signup_counts sc on sc.event_id = e.id
  left join my_signups ms on ms.event_id = e.id
  left join my_attendance ma on ma.event_id = e.id
  where e.type = 'community_service'
    and e.archived_at is null
    and e.starts_at >= (now() - interval '14 days')
  order by e.starts_at;
end;
$$;

create or replace function public.signup_for_community_service(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  active_count integer := 0;
  signup_row public.community_service_signups%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into event_record
  from public.events
  where id = target_event_id
  for update;

  if not found then
    raise exception 'Service event not found.';
  end if;

  if event_record.type <> 'community_service' then
    raise exception 'This event is not a community service opportunity.';
  end if;

  if event_record.archived_at is not null or not event_record.signup_enabled then
    raise exception 'Signup is closed for this event.';
  end if;

  if event_record.starts_at < now() then
    raise exception 'Signup is closed because this event has started.';
  end if;

  if event_record.signup_deadline is not null and event_record.signup_deadline < now() then
    raise exception 'Signup deadline has passed.';
  end if;

  select count(*)::integer
  into active_count
  from public.community_service_signups css
  where css.event_id = target_event_id
    and css.cancelled_at is null;

  if event_record.signup_capacity is not null and active_count >= event_record.signup_capacity then
    raise exception 'This service event is full.';
  end if;

  insert into public.community_service_signups (
    event_id,
    member_id
  )
  values (
    target_event_id,
    actor_id
  )
  on conflict (event_id, member_id) where cancelled_at is null do update
    set updated_at = public.community_service_signups.updated_at
  returning * into signup_row;

  insert into public.event_expectations (
    event_id,
    member_id,
    source,
    required,
    snapshot_reason,
    created_by,
    notes
  )
  values (
    target_event_id,
    actor_id,
    'community_service_signup',
    true,
    'community_service_signup',
    actor_id,
    'Created from member community service signup.'
  )
  on conflict (event_id, member_id) where removed_at is null do update
    set required = true,
        source = 'community_service_signup',
        snapshot_reason = 'community_service_signup',
        notes = 'Updated from member community service signup.';

  update public.events e
  set expected_count = (
    select count(*)
    from public.event_expectations ee
    where ee.event_id = target_event_id
      and ee.required
      and ee.removed_at is null
  )
  where e.id = target_event_id;

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
    'community_service_signup',
    jsonb_build_object('signup_id', signup_row.id, 'source', 'community_service_signup'),
    'Member signed up for community service event.'
  );

  return jsonb_build_object(
    'signup_id', signup_row.id,
    'event_id', target_event_id,
    'member_id', actor_id
  );
end;
$$;

create or replace function public.cancel_community_service_signup(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  signup_row public.community_service_signups%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select css.*
  into signup_row
  from public.community_service_signups css
  join public.events e on e.id = css.event_id
  where css.event_id = target_event_id
    and css.member_id = actor_id
    and css.cancelled_at is null
    and e.starts_at >= now()
  for update;

  if not found then
    raise exception 'Active signup not found or cancellation window has closed.';
  end if;

  if exists (
    select 1
    from public.event_attendees ea
    where ea.event_id = target_event_id
      and ea.member_id = actor_id
  ) then
    raise exception 'Cannot cancel after attendance has been recorded.';
  end if;

  update public.community_service_signups
  set cancelled_at = now(),
      cancelled_by = actor_id,
      cancellation_reason = 'Member cancelled community service signup.',
      updated_at = now()
  where id = signup_row.id
  returning * into signup_row;

  update public.event_expectations
  set removed_at = now(),
      removed_by = actor_id,
      notes = coalesce(notes || ' ', '') || 'Removed after member cancelled community service signup.'
  where event_id = target_event_id
    and member_id = actor_id
    and source = 'community_service_signup'
    and removed_at is null;

  update public.events e
  set expected_count = (
    select count(*)
    from public.event_expectations ee
    where ee.event_id = target_event_id
      and ee.required
      and ee.removed_at is null
  )
  where e.id = target_event_id;

  insert into public.event_attendance_audit (
    event_id,
    member_id,
    actor_member_id,
    action,
    before,
    reason
  )
  values (
    target_event_id,
    actor_id,
    actor_id,
    'community_service_signup_cancelled',
    jsonb_build_object('signup_id', signup_row.id),
    'Member cancelled community service signup.'
  );

  return jsonb_build_object(
    'signup_id', signup_row.id,
    'event_id', target_event_id,
    'member_id', actor_id,
    'cancelled_at', signup_row.cancelled_at
  );
end;
$$;

revoke execute on function public.community_service_member_summary(date) from public, anon;
revoke execute on function public.community_service_opportunities() from public, anon;
revoke execute on function public.signup_for_community_service(uuid) from public, anon;
revoke execute on function public.cancel_community_service_signup(uuid) from public, anon;

grant execute on function public.community_service_member_summary(date) to authenticated;
grant execute on function public.community_service_opportunities() to authenticated;
grant execute on function public.signup_for_community_service(uuid) to authenticated;
grant execute on function public.cancel_community_service_signup(uuid) to authenticated;

notify pgrst, 'reload schema';
