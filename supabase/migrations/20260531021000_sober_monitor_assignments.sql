-- Sprint 4 Slice C: event-scoped sober monitor assignments and door access bridge.

create table if not exists public.social_event_monitor_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  assignment_status text not null default 'assigned' check (assignment_status in ('assigned', 'confirmed', 'declined')),
  assigned_by uuid not null references public.members(id),
  assigned_at timestamptz not null default now(),
  confirmed_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references public.members(id),
  removal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_event_monitor_assignments_active_unique
  on public.social_event_monitor_assignments(event_id, member_id)
  where removed_at is null;

create index if not exists social_event_monitor_assignments_event_idx
  on public.social_event_monitor_assignments(event_id, removed_at, assigned_at);

create index if not exists social_event_monitor_assignments_member_idx
  on public.social_event_monitor_assignments(member_id, removed_at, assigned_at);

create table if not exists public.social_event_monitor_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  assignment_id uuid references public.social_event_monitor_assignments(id) on delete set null,
  actor_member_id uuid not null references public.members(id),
  target_member_id uuid not null references public.members(id),
  action text not null check (action in ('assigned', 'confirmed', 'declined', 'removed')),
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists social_event_monitor_assignment_audit_event_idx
  on public.social_event_monitor_assignment_audit(event_id, created_at desc);

alter table public.social_event_monitor_assignments enable row level security;
alter table public.social_event_monitor_assignment_audit enable row level security;

grant select, insert, update on public.social_event_monitor_assignments to authenticated;
grant select, insert on public.social_event_monitor_assignment_audit to authenticated;

create or replace function public.is_exec_board_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_positions mp
    join public.positions p on p.id = mp.position_id
    where mp.member_id = target_member_id
      and mp.removed_at is null
      and p.is_active
      and p.slug = any(array[
        'president',
        'ivp',
        'evp',
        'secretary',
        'treasurer',
        'saa'
      ])
  )
$$;

create or replace function public.can_manage_social_monitors(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and e.type = 'social'
        and e.archived_at is null
        and (
          public.has_position(array['president', 'secretary', 'social_chairman'])
          or (
            e.created_by = public.current_member_id()
            and public.can_create_events()
          )
        )
    )
$$;

create or replace function public.is_active_social_monitor(target_event_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.social_event_monitor_assignments sema
    join public.events e on e.id = sema.event_id
    where sema.event_id = target_event_id
      and sema.member_id = target_member_id
      and sema.removed_at is null
      and sema.assignment_status in ('assigned', 'confirmed')
      and e.archived_at is null
      and (e.ends_at is null or e.ends_at >= now())
  )
$$;

-- Replace Slice B door access with explicit exec/social/event-owner/assigned-monitor access.
create or replace function public.can_use_social_door(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and e.type = 'social'
        and e.archived_at is null
        and e.guest_check_in_enabled
        and (
          public.has_position(array[
            'president',
            'ivp',
            'evp',
            'secretary',
            'treasurer',
            'saa',
            'social_chairman',
            'hs_officer'
          ])
          or (
            e.created_by = public.current_member_id()
            and public.can_create_events()
          )
          or public.is_active_social_monitor(target_event_id, public.current_member_id())
        )
    )
$$;

drop policy if exists social_event_monitor_assignments_select_relevant
  on public.social_event_monitor_assignments;
create policy social_event_monitor_assignments_select_relevant
  on public.social_event_monitor_assignments
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.can_manage_social_monitors(event_id)
  );

drop policy if exists social_event_monitor_assignments_insert_manager
  on public.social_event_monitor_assignments;
create policy social_event_monitor_assignments_insert_manager
  on public.social_event_monitor_assignments
  for insert
  to authenticated
  with check (
    public.can_manage_social_monitors(event_id)
    and assigned_by = public.current_member_id()
  );

drop policy if exists social_event_monitor_assignments_update_relevant
  on public.social_event_monitor_assignments;
create policy social_event_monitor_assignments_update_relevant
  on public.social_event_monitor_assignments
  for update
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.can_manage_social_monitors(event_id)
  )
  with check (
    member_id = public.current_member_id()
    or public.can_manage_social_monitors(event_id)
  );

drop policy if exists social_event_monitor_assignment_audit_select_relevant
  on public.social_event_monitor_assignment_audit;
create policy social_event_monitor_assignment_audit_select_relevant
  on public.social_event_monitor_assignment_audit
  for select
  to authenticated
  using (
    target_member_id = public.current_member_id()
    or public.can_manage_social_monitors(event_id)
    or public.has_position(array['saa'])
  );

drop policy if exists social_event_monitor_assignment_audit_insert_relevant
  on public.social_event_monitor_assignment_audit;
create policy social_event_monitor_assignment_audit_insert_relevant
  on public.social_event_monitor_assignment_audit
  for insert
  to authenticated
  with check (
    actor_member_id = public.current_member_id()
    and (
      target_member_id = public.current_member_id()
      or public.can_manage_social_monitors(event_id)
    )
  );

create or replace function public.social_monitor_coverage(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  guest_total integer := 0;
  brother_plan integer := 0;
  planned_total integer := 0;
  required_total integer := 2;
  assigned_total integer := 0;
  exec_total integer := 0;
begin
  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found then
    raise exception 'Event not found.';
  end if;

  if event_record.type <> 'social' then
    raise exception 'Monitor coverage is only available for social events.';
  end if;

  if not (
    public.can_manage_social_monitors(target_event_id)
    or public.can_use_social_door(target_event_id)
    or public.is_active_social_monitor(target_event_id, public.current_member_id())
  ) then
    raise exception 'You do not have permission to view sober monitor coverage for this event.';
  end if;

  select count(*)::integer
  into guest_total
  from public.social_event_guests seg
  where seg.event_id = target_event_id
    and seg.approval_status in ('approved', 'override_approved');

  brother_plan := greatest(
    coalesce(event_record.expected_count, 0),
    coalesce(event_record.min_brother_rsvp_count, 0)
  );
  planned_total := greatest(guest_total + brother_plan, 1);
  required_total := greatest(2, (ceil(planned_total / 50.0)::integer * 2));

  select
    count(*)::integer,
    count(*) filter (where public.is_exec_board_member(sema.member_id))::integer
  into assigned_total, exec_total
  from public.social_event_monitor_assignments sema
  where sema.event_id = target_event_id
    and sema.removed_at is null
    and sema.assignment_status in ('assigned', 'confirmed');

  return jsonb_build_object(
    'event_id', target_event_id,
    'planned_attendance', planned_total,
    'brother_plan', brother_plan,
    'guest_total', guest_total,
    'required_monitors', required_total,
    'assigned_monitors', assigned_total,
    'exec_monitors', exec_total,
    'monitor_coverage_met', assigned_total >= required_total,
    'exec_requirement_met', exec_total >= 1
  );
end;
$$;

create or replace function public.social_monitor_assignments(target_event_id uuid)
returns table (
  assignment_id uuid,
  event_id uuid,
  member_id uuid,
  suid text,
  display_name text,
  member_status text,
  assignment_status text,
  is_exec_board boolean,
  access_active boolean,
  assigned_at timestamptz,
  assigned_by_name text,
  confirmed_at timestamptz,
  removed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.can_manage_social_monitors(target_event_id)
    or public.can_use_social_door(target_event_id)
    or public.is_active_social_monitor(target_event_id, public.current_member_id())
  ) then
    raise exception 'You do not have permission to view sober monitor assignments for this event.';
  end if;

  return query
  select
    sema.id,
    sema.event_id,
    sema.member_id,
    m.suid,
    nullif(trim(concat(coalesce(m.preferred_name, m.legal_first_name), ' ', m.legal_last_name)), '') as display_name,
    m.status::text as member_status,
    sema.assignment_status,
    public.is_exec_board_member(sema.member_id) as is_exec_board,
    public.is_active_social_monitor(sema.event_id, sema.member_id) as access_active,
    sema.assigned_at,
    nullif(trim(concat(coalesce(assigner.preferred_name, assigner.legal_first_name), ' ', assigner.legal_last_name)), '') as assigned_by_name,
    sema.confirmed_at,
    sema.removed_at
  from public.social_event_monitor_assignments sema
  join public.members m on m.id = sema.member_id
  left join public.members assigner on assigner.id = sema.assigned_by
  where sema.event_id = target_event_id
    and sema.removed_at is null
  order by
    public.is_exec_board_member(sema.member_id) desc,
    sema.assigned_at,
    m.legal_last_name;
end;
$$;

create or replace function public.social_monitor_member_search(
  target_event_id uuid,
  search_text text
)
returns table (
  member_id uuid,
  suid text,
  display_name text,
  member_status text,
  is_exec_board boolean,
  already_assigned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := lower(trim(coalesce(search_text, '')));
begin
  if not public.can_manage_social_monitors(target_event_id) then
    raise exception 'You do not have permission to assign sober monitors for this event.';
  end if;

  if length(normalized_search) < 2 then
    return;
  end if;

  return query
  select
    m.id,
    m.suid,
    nullif(trim(concat(coalesce(m.preferred_name, m.legal_first_name), ' ', m.legal_last_name)), '') as display_name,
    m.status::text,
    public.is_exec_board_member(m.id),
    exists (
      select 1
      from public.social_event_monitor_assignments sema
      where sema.event_id = target_event_id
        and sema.member_id = m.id
        and sema.removed_at is null
    ) as already_assigned
  from public.members m
  where m.status in ('active', 'new_member')
    and (
      lower(m.suid) like '%' || normalized_search || '%'
      or lower(coalesce(m.google_email, '')) like '%' || normalized_search || '%'
      or lower(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) like '%' || normalized_search || '%'
    )
  order by m.legal_last_name, m.legal_first_name
  limit 20;
end;
$$;

create or replace function public.assign_social_monitor(target_event_id uuid, target_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  assignment_row public.social_event_monitor_assignments%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_social_monitors(target_event_id) then
    raise exception 'You do not have permission to assign sober monitors for this event.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = target_member_id
      and m.status in ('active', 'new_member')
  ) then
    raise exception 'Monitor must be an active member or new member.';
  end if;

  insert into public.social_event_monitor_assignments (
    event_id,
    member_id,
    assigned_by
  )
  values (
    target_event_id,
    target_member_id,
    actor_id
  )
  on conflict (event_id, member_id) where removed_at is null do update
    set updated_at = public.social_event_monitor_assignments.updated_at
  returning * into assignment_row;

  insert into public.social_event_monitor_assignment_audit (
    event_id,
    assignment_id,
    actor_member_id,
    target_member_id,
    action,
    after,
    reason
  )
  values (
    target_event_id,
    assignment_row.id,
    actor_id,
    target_member_id,
    'assigned',
    to_jsonb(assignment_row),
    'Sober monitor assigned.'
  );

  return jsonb_build_object(
    'assignment_id', assignment_row.id,
    'event_id', assignment_row.event_id,
    'member_id', assignment_row.member_id,
    'access_active', public.is_active_social_monitor(assignment_row.event_id, assignment_row.member_id)
  );
end;
$$;

create or replace function public.confirm_social_monitor_assignment(target_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  before_row public.social_event_monitor_assignments%rowtype;
  after_row public.social_event_monitor_assignments%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into before_row
  from public.social_event_monitor_assignments
  where id = target_assignment_id
    and removed_at is null;

  if not found then
    raise exception 'Monitor assignment not found.';
  end if;

  if before_row.member_id <> actor_id and not public.can_manage_social_monitors(before_row.event_id) then
    raise exception 'You do not have permission to confirm this monitor assignment.';
  end if;

  update public.social_event_monitor_assignments
  set assignment_status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
  where id = target_assignment_id
  returning * into after_row;

  insert into public.social_event_monitor_assignment_audit (
    event_id,
    assignment_id,
    actor_member_id,
    target_member_id,
    action,
    before,
    after,
    reason
  )
  values (
    after_row.event_id,
    after_row.id,
    actor_id,
    after_row.member_id,
    'confirmed',
    to_jsonb(before_row),
    to_jsonb(after_row),
    'Sober monitor confirmed assignment.'
  );

  return jsonb_build_object('assignment_id', after_row.id, 'assignment_status', after_row.assignment_status);
end;
$$;

create or replace function public.remove_social_monitor_assignment(
  target_assignment_id uuid,
  reason text default 'Removed from event coverage.'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  before_row public.social_event_monitor_assignments%rowtype;
  after_row public.social_event_monitor_assignments%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into before_row
  from public.social_event_monitor_assignments
  where id = target_assignment_id
    and removed_at is null;

  if not found then
    raise exception 'Monitor assignment not found.';
  end if;

  if not public.can_manage_social_monitors(before_row.event_id) then
    raise exception 'You do not have permission to remove sober monitors for this event.';
  end if;

  update public.social_event_monitor_assignments
  set removed_at = now(),
      removed_by = actor_id,
      removal_reason = coalesce(clean_reason, 'Removed from event coverage.'),
      updated_at = now()
  where id = target_assignment_id
  returning * into after_row;

  insert into public.social_event_monitor_assignment_audit (
    event_id,
    assignment_id,
    actor_member_id,
    target_member_id,
    action,
    before,
    after,
    reason
  )
  values (
    after_row.event_id,
    after_row.id,
    actor_id,
    after_row.member_id,
    'removed',
    to_jsonb(before_row),
    to_jsonb(after_row),
    coalesce(clean_reason, 'Removed from event coverage.')
  );

  return jsonb_build_object('assignment_id', after_row.id, 'removed_at', after_row.removed_at);
end;
$$;

revoke execute on function public.is_exec_board_member(uuid) from public, anon;
revoke execute on function public.can_manage_social_monitors(uuid) from public, anon;
revoke execute on function public.is_active_social_monitor(uuid, uuid) from public, anon;
revoke execute on function public.social_monitor_coverage(uuid) from public, anon;
revoke execute on function public.social_monitor_assignments(uuid) from public, anon;
revoke execute on function public.social_monitor_member_search(uuid, text) from public, anon;
revoke execute on function public.assign_social_monitor(uuid, uuid) from public, anon;
revoke execute on function public.confirm_social_monitor_assignment(uuid) from public, anon;
revoke execute on function public.remove_social_monitor_assignment(uuid, text) from public, anon;

grant execute on function public.is_exec_board_member(uuid) to authenticated;
grant execute on function public.can_manage_social_monitors(uuid) to authenticated;
grant execute on function public.is_active_social_monitor(uuid, uuid) to authenticated;
grant execute on function public.social_monitor_coverage(uuid) to authenticated;
grant execute on function public.social_monitor_assignments(uuid) to authenticated;
grant execute on function public.social_monitor_member_search(uuid, text) to authenticated;
grant execute on function public.assign_social_monitor(uuid, uuid) to authenticated;
grant execute on function public.confirm_social_monitor_assignment(uuid) to authenticated;
grant execute on function public.remove_social_monitor_assignment(uuid, text) to authenticated;

notify pgrst, 'reload schema';
