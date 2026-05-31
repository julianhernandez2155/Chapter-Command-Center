-- Sprint 4 Slice B: social door list, guest ledger, and audited override path.

create table if not exists public.social_event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  school_email text,
  gender text not null check (gender in ('female', 'male', 'other', 'unknown')),
  host_member_id uuid references public.members(id) on delete set null,
  approval_status text not null default 'approved' check (approval_status in ('approved', 'override_approved', 'denied')),
  added_at_door boolean not null default false,
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_event_guests_event_idx
  on public.social_event_guests(event_id, lower(last_name), lower(first_name));

create index if not exists social_event_guests_host_idx
  on public.social_event_guests(host_member_id);

create table if not exists public.social_guest_check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.social_event_guests(id) on delete cascade,
  checked_in_by uuid references public.members(id),
  checked_in_at timestamptz not null default now(),
  method text not null default 'door' check (method in ('door', 'override')),
  unique (guest_id)
);

create index if not exists social_guest_check_ins_event_idx
  on public.social_guest_check_ins(event_id, checked_in_at desc);

create table if not exists public.social_door_override_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.social_event_guests(id) on delete cascade,
  approved_by uuid not null references public.members(id),
  reason text not null check (length(trim(reason)) >= 8),
  created_at timestamptz not null default now()
);

create index if not exists social_door_override_audit_event_idx
  on public.social_door_override_audit(event_id, created_at desc);

alter table public.social_event_guests enable row level security;
alter table public.social_guest_check_ins enable row level security;
alter table public.social_door_override_audit enable row level security;

grant select, insert, update on public.social_event_guests to authenticated;
grant select, insert on public.social_guest_check_ins to authenticated;
grant select, insert on public.social_door_override_audit to authenticated;

create or replace function public.can_override_social_door_guest()
returns boolean
language sql
stable
as $$
  select public.has_position(array['president', 'social_chairman', 'hs_officer'])
$$;

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
          public.is_officer()
          or public.has_position(array['social_chairman'])
          or (
            e.created_by = public.current_member_id()
            and public.can_create_events()
          )
        )
    )
$$;

drop policy if exists social_event_guests_select_door on public.social_event_guests;
create policy social_event_guests_select_door
  on public.social_event_guests
  for select
  to authenticated
  using (public.can_use_social_door(event_id));

drop policy if exists social_event_guests_insert_door on public.social_event_guests;
create policy social_event_guests_insert_door
  on public.social_event_guests
  for insert
  to authenticated
  with check (
    public.can_use_social_door(event_id)
    and created_by = public.current_member_id()
  );

drop policy if exists social_event_guests_update_door on public.social_event_guests;
create policy social_event_guests_update_door
  on public.social_event_guests
  for update
  to authenticated
  using (public.can_use_social_door(event_id))
  with check (public.can_use_social_door(event_id));

drop policy if exists social_guest_check_ins_select_door on public.social_guest_check_ins;
create policy social_guest_check_ins_select_door
  on public.social_guest_check_ins
  for select
  to authenticated
  using (public.can_use_social_door(event_id));

drop policy if exists social_guest_check_ins_insert_door on public.social_guest_check_ins;
create policy social_guest_check_ins_insert_door
  on public.social_guest_check_ins
  for insert
  to authenticated
  with check (
    public.can_use_social_door(event_id)
    and checked_in_by = public.current_member_id()
  );

drop policy if exists social_door_override_audit_select_officers on public.social_door_override_audit;
create policy social_door_override_audit_select_officers
  on public.social_door_override_audit
  for select
  to authenticated
  using (public.can_override_social_door_guest() or public.has_position(array['secretary', 'saa']));

drop policy if exists social_door_override_audit_insert_limited on public.social_door_override_audit;
create policy social_door_override_audit_insert_limited
  on public.social_door_override_audit
  for insert
  to authenticated
  with check (
    public.can_override_social_door_guest()
    and approved_by = public.current_member_id()
  );

create or replace function public.social_door_summary(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  guest_total integer := 0;
  checked_in_total integer := 0;
begin
  if not public.can_use_social_door(target_event_id) then
    raise exception 'You do not have permission to use the social door list for this event.';
  end if;

  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found then
    raise exception 'Event not found.';
  end if;

  select count(*)::integer
  into guest_total
  from public.social_event_guests seg
  where seg.event_id = target_event_id
    and seg.approval_status in ('approved', 'override_approved');

  select count(*)::integer
  into checked_in_total
  from public.social_guest_check_ins sgci
  where sgci.event_id = target_event_id;

  return jsonb_build_object(
    'event_id', event_record.id,
    'name', event_record.name,
    'event_date', event_record.event_date,
    'starts_at', event_record.starts_at,
    'ends_at', event_record.ends_at,
    'location', event_record.location,
    'guest_policy', event_record.guest_policy,
    'guest_total', guest_total,
    'checked_in_total', checked_in_total,
    'can_override_male_guest', public.can_override_social_door_guest()
  );
end;
$$;

create or replace function public.social_door_guest_list(
  target_event_id uuid,
  search_text text default ''
)
returns table (
  id uuid,
  event_id uuid,
  first_name text,
  last_name text,
  school_email text,
  gender text,
  host_member_id uuid,
  host_display_name text,
  approval_status text,
  added_at_door boolean,
  checked_in_at timestamptz,
  checked_in_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := lower(trim(coalesce(search_text, '')));
begin
  if not public.can_use_social_door(target_event_id) then
    raise exception 'You do not have permission to use the social door list for this event.';
  end if;

  return query
  select
    seg.id,
    seg.event_id,
    seg.first_name,
    seg.last_name,
    seg.school_email,
    seg.gender,
    seg.host_member_id,
    nullif(trim(concat(coalesce(host.preferred_name, host.legal_first_name), ' ', host.legal_last_name)), '') as host_display_name,
    seg.approval_status,
    seg.added_at_door,
    sgci.checked_in_at,
    nullif(trim(concat(coalesce(checker.preferred_name, checker.legal_first_name), ' ', checker.legal_last_name)), '') as checked_in_by_name
  from public.social_event_guests seg
  left join public.members host on host.id = seg.host_member_id
  left join public.social_guest_check_ins sgci on sgci.guest_id = seg.id
  left join public.members checker on checker.id = sgci.checked_in_by
  where seg.event_id = target_event_id
    and seg.approval_status in ('approved', 'override_approved')
    and (
      normalized_search = ''
      or lower(seg.first_name || ' ' || seg.last_name) like '%' || normalized_search || '%'
      or lower(coalesce(seg.school_email, '')) like '%' || normalized_search || '%'
      or lower(coalesce(host.suid, '')) like '%' || normalized_search || '%'
      or lower(coalesce(host.preferred_name, host.legal_first_name) || ' ' || host.legal_last_name) like '%' || normalized_search || '%'
    )
  order by
    sgci.checked_in_at desc nulls last,
    seg.last_name,
    seg.first_name
  limit 75;
end;
$$;

create or replace function public.social_door_member_search(
  target_event_id uuid,
  search_text text
)
returns table (
  member_id uuid,
  suid text,
  display_name text,
  member_status text,
  current_social_ineligible boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := lower(trim(coalesce(search_text, '')));
begin
  if not public.can_use_social_door(target_event_id) then
    raise exception 'You do not have permission to use the social door list for this event.';
  end if;

  if length(normalized_search) < 2 then
    return;
  end if;

  return query
  select
    m.id,
    m.suid,
    nullif(trim(concat(coalesce(m.preferred_name, m.legal_first_name), ' ', m.legal_last_name)), '') as display_name,
    m.status::text as member_status,
    public.member_current_social_ineligible(m.id) as current_social_ineligible
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

create or replace function public.social_door_check_in_guest(target_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_record public.social_event_guests%rowtype;
  actor_id uuid;
  check_in_time timestamptz;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into guest_record
  from public.social_event_guests
  where id = target_guest_id;

  if not found then
    raise exception 'Guest not found.';
  end if;

  if not public.can_use_social_door(guest_record.event_id) then
    raise exception 'You do not have permission to check in guests for this event.';
  end if;

  if guest_record.approval_status = 'denied' then
    raise exception 'This guest is not approved for entry.';
  end if;

  insert into public.social_guest_check_ins (
    event_id,
    guest_id,
    checked_in_by,
    method
  )
  values (
    guest_record.event_id,
    guest_record.id,
    actor_id,
    case when guest_record.approval_status = 'override_approved' then 'override' else 'door' end
  )
  on conflict (guest_id) do update
    set checked_in_at = public.social_guest_check_ins.checked_in_at
  returning checked_in_at into check_in_time;

  return jsonb_build_object(
    'guest_id', guest_record.id,
    'event_id', guest_record.event_id,
    'checked_in_at', check_in_time,
    'already_checked_in', exists (
      select 1
      from public.social_guest_check_ins sgci
      where sgci.guest_id = guest_record.id
        and sgci.checked_in_at <> check_in_time
    )
  );
end;
$$;

create or replace function public.social_door_add_guest(
  target_event_id uuid,
  target_first_name text,
  target_last_name text,
  target_school_email text,
  target_gender text,
  target_host_member_id uuid default null,
  override_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  clean_gender text := lower(trim(coalesce(target_gender, 'unknown')));
  clean_reason text := trim(coalesce(override_reason, ''));
  guest_id uuid;
  checked_time timestamptz;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_use_social_door(target_event_id) then
    raise exception 'You do not have permission to add guests for this event.';
  end if;

  if clean_gender not in ('female', 'male', 'other', 'unknown') then
    raise exception 'Guest gender must be female, male, other, or unknown.';
  end if;

  if clean_gender = 'male' then
    if not public.can_override_social_door_guest() then
      raise exception 'Unlisted male guest override is limited to President, Social Chairman, or Health & Safety Officer.';
    end if;

    if length(clean_reason) < 8 then
      raise exception 'Override reason must be at least 8 characters.';
    end if;
  end if;

  insert into public.social_event_guests (
    event_id,
    first_name,
    last_name,
    school_email,
    gender,
    host_member_id,
    approval_status,
    added_at_door,
    created_by
  )
  values (
    target_event_id,
    trim(target_first_name),
    trim(target_last_name),
    nullif(trim(coalesce(target_school_email, '')), ''),
    clean_gender,
    target_host_member_id,
    case when clean_gender = 'male' then 'override_approved' else 'approved' end,
    true,
    actor_id
  )
  returning id into guest_id;

  if clean_gender = 'male' then
    insert into public.social_door_override_audit (
      event_id,
      guest_id,
      approved_by,
      reason
    )
    values (
      target_event_id,
      guest_id,
      actor_id,
      clean_reason
    );
  end if;

  insert into public.social_guest_check_ins (
    event_id,
    guest_id,
    checked_in_by,
    method
  )
  values (
    target_event_id,
    guest_id,
    actor_id,
    case when clean_gender = 'male' then 'override' else 'door' end
  )
  returning checked_in_at into checked_time;

  return jsonb_build_object(
    'guest_id', guest_id,
    'event_id', target_event_id,
    'checked_in_at', checked_time,
    'override_recorded', clean_gender = 'male'
  );
end;
$$;

revoke execute on function public.can_override_social_door_guest() from public, anon;
revoke execute on function public.can_use_social_door(uuid) from public, anon;
revoke execute on function public.social_door_summary(uuid) from public, anon;
revoke execute on function public.social_door_guest_list(uuid, text) from public, anon;
revoke execute on function public.social_door_member_search(uuid, text) from public, anon;
revoke execute on function public.social_door_check_in_guest(uuid) from public, anon;
revoke execute on function public.social_door_add_guest(uuid, text, text, text, text, uuid, text) from public, anon;

grant execute on function public.can_override_social_door_guest() to authenticated;
grant execute on function public.can_use_social_door(uuid) to authenticated;
grant execute on function public.social_door_summary(uuid) to authenticated;
grant execute on function public.social_door_guest_list(uuid, text) to authenticated;
grant execute on function public.social_door_member_search(uuid, text) to authenticated;
grant execute on function public.social_door_check_in_guest(uuid) to authenticated;
grant execute on function public.social_door_add_guest(uuid, text, text, text, text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
