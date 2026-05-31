-- Sprint 4 Attendance foundation.
-- V1 focuses on chapter-meeting QR check-in, member-level expectations,
-- manual officer correction, quorum snapshots, and attendance-owned
-- ineligible-list output.

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.event_type'::regtype
      and enumlabel = 'executive_council'
  ) then
    alter type public.event_type add value 'executive_council';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.event_type'::regtype
      and enumlabel = 'community_service'
  ) then
    alter type public.event_type add value 'community_service';
  end if;
end $$;

alter table public.events
  add column if not exists attendance_mode text not null default 'open_check_in',
  add column if not exists guest_check_in_enabled boolean not null default false,
  add column if not exists guest_policy text not null default 'none',
  add column if not exists brother_rsvp_enabled boolean not null default false,
  add column if not exists min_brother_rsvp_count integer,
  add column if not exists signup_enabled boolean not null default false,
  add column if not exists signup_capacity integer,
  add column if not exists signup_deadline timestamptz,
  add column if not exists counts_toward_service_hours boolean not null default false,
  add column if not exists hours numeric,
  add column if not exists feeds_chapter_meeting_rate boolean not null default false,
  add column if not exists feeds_recruitment_requirement boolean not null default false,
  add column if not exists feeds_service_hours boolean not null default false,
  add column if not exists feeds_missed_obligation_counter boolean not null default false,
  add column if not exists check_in_opened_at timestamptz,
  add column if not exists check_in_opened_by uuid references public.members(id),
  add column if not exists check_in_closed_at timestamptz,
  add column if not exists check_in_closed_by uuid references public.members(id),
  add column if not exists check_in_token_rotated_at timestamptz;

alter table public.events
  drop constraint if exists events_attendance_mode_check,
  add constraint events_attendance_mode_check check (
    attendance_mode in (
      'mandatory_all',
      'exec_only',
      'assignment',
      'signup',
      'rsvp',
      'open_check_in',
      'report_only',
      'duration_tracking'
    )
  );

alter table public.events
  drop constraint if exists events_guest_policy_check,
  add constraint events_guest_policy_check check (
    guest_policy in (
      'none',
      'open_guest_list',
      'social_gender_policy',
      'hosted_philanthropy_guest_list'
    )
  );

update public.events
set
  attendance_mode = case
    when type = 'chapter_meeting' then 'mandatory_all'
    when type = 'committee' then 'report_only'
    when type = 'social' then 'rsvp'
    when type = 'recruitment' then 'open_check_in'
    when type = 'study_hours' then 'duration_tracking'
    else attendance_mode
  end,
  feeds_chapter_meeting_rate = case
    when type = 'chapter_meeting' then true
    else feeds_chapter_meeting_rate
  end,
  feeds_missed_obligation_counter = case
    when category = 'mandatory' then true
    else feeds_missed_obligation_counter
  end,
  brother_rsvp_enabled = case
    when type = 'social' then true
    else brother_rsvp_enabled
  end,
  guest_check_in_enabled = case
    when type = 'social' then true
    else guest_check_in_enabled
  end,
  guest_policy = case
    when type = 'social' then 'social_gender_policy'
    else guest_policy
  end
where true;

create table if not exists public.event_expectations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  source text not null,
  required boolean not null default true,
  snapshot_reason text,
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.members(id),
  notes text
);

create unique index if not exists event_expectations_active_unique
  on public.event_expectations(event_id, member_id)
  where removed_at is null;

create index if not exists event_expectations_event_active_idx
  on public.event_expectations(event_id, required)
  where removed_at is null;

create table if not exists public.event_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  actor_member_id uuid references public.members(id),
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists event_attendance_audit_event_idx
  on public.event_attendance_audit(event_id, created_at desc);

create table if not exists public.weekly_ineligible_lists (
  id uuid primary key default gen_random_uuid(),
  chapter_event_id uuid references public.events(id),
  week_start date not null,
  published_at timestamptz,
  published_by uuid references public.members(id),
  status text not null default 'draft',
  includes_attendance boolean not null default true,
  includes_forms boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists weekly_ineligible_lists_week_idx
  on public.weekly_ineligible_lists(week_start, created_at desc);

create table if not exists public.weekly_ineligible_list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.weekly_ineligible_lists(id) on delete cascade,
  member_id uuid references public.members(id),
  suid text not null,
  reason text not null,
  source text not null,
  source_event_id uuid references public.events(id),
  dispute_status text,
  resolved_by uuid references public.members(id),
  resolved_at timestamptz,
  resolution_note text
);

create unique index if not exists weekly_ineligible_list_members_unique
  on public.weekly_ineligible_list_members(list_id, member_id, source, source_event_id);

create table if not exists public.quorum_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  snapshot_type text not null,
  present_count integer not null,
  eligible_count integer not null,
  threshold_count integer not null,
  quorum_met boolean not null,
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  notes text
);

create index if not exists quorum_snapshots_event_idx
  on public.quorum_snapshots(event_id, created_at desc);

alter table public.event_expectations enable row level security;
alter table public.event_attendance_audit enable row level security;
alter table public.weekly_ineligible_lists enable row level security;
alter table public.weekly_ineligible_list_members enable row level security;
alter table public.quorum_snapshots enable row level security;

grant select, insert, update, delete on public.event_expectations to authenticated;
grant select, insert on public.event_attendance_audit to authenticated;
grant select, insert, update, delete on public.weekly_ineligible_lists to authenticated;
grant select, insert, update, delete on public.weekly_ineligible_list_members to authenticated;
grant select, insert on public.quorum_snapshots to authenticated;

drop policy if exists event_expectations_select on public.event_expectations;
create policy event_expectations_select
  on public.event_expectations
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_officer()
    or exists (
      select 1
      from public.events e
      where e.id = event_expectations.event_id
        and e.created_by = public.current_member_id()
        and public.can_create_events()
    )
  );

drop policy if exists event_expectations_write_officers on public.event_expectations;
create policy event_expectations_write_officers
  on public.event_expectations
  for all
  to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists event_attendance_audit_select on public.event_attendance_audit;
create policy event_attendance_audit_select
  on public.event_attendance_audit
  for select
  to authenticated
  using (
    actor_member_id = public.current_member_id()
    or member_id = public.current_member_id()
    or public.is_officer()
    or exists (
      select 1
      from public.events e
      where e.id = event_attendance_audit.event_id
        and e.created_by = public.current_member_id()
        and public.can_create_events()
    )
  );

drop policy if exists event_attendance_audit_insert_system on public.event_attendance_audit;
create policy event_attendance_audit_insert_system
  on public.event_attendance_audit
  for insert
  to authenticated
  with check (
    actor_member_id = public.current_member_id()
    and (
      public.is_officer()
      or exists (
        select 1
        from public.events e
        where e.id = event_attendance_audit.event_id
          and e.created_by = public.current_member_id()
          and public.can_create_events()
      )
    )
  );

drop policy if exists weekly_ineligible_lists_select on public.weekly_ineligible_lists;
create policy weekly_ineligible_lists_select
  on public.weekly_ineligible_lists
  for select
  to authenticated
  using (public.is_officer());

drop policy if exists weekly_ineligible_lists_write_secretary on public.weekly_ineligible_lists;
create policy weekly_ineligible_lists_write_secretary
  on public.weekly_ineligible_lists
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists weekly_ineligible_list_members_select on public.weekly_ineligible_list_members;
create policy weekly_ineligible_list_members_select
  on public.weekly_ineligible_list_members
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_officer()
  );

drop policy if exists weekly_ineligible_list_members_write_secretary on public.weekly_ineligible_list_members;
create policy weekly_ineligible_list_members_write_secretary
  on public.weekly_ineligible_list_members
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists quorum_snapshots_select on public.quorum_snapshots;
create policy quorum_snapshots_select
  on public.quorum_snapshots
  for select
  to authenticated
  using (public.is_officer());

drop policy if exists quorum_snapshots_insert_officers on public.quorum_snapshots;
create policy quorum_snapshots_insert_officers
  on public.quorum_snapshots
  for insert
  to authenticated
  with check (public.is_officer() and created_by = public.current_member_id());

create or replace function public.can_manage_event_attendance(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      public.has_position(array['president', 'secretary'])
      or exists (
        select 1
        from public.events e
        where e.id = target_event_id
          and e.created_by = public.current_member_id()
          and public.can_create_events()
      )
    )
$$;

create or replace function public.sync_event_expected_roster(
  target_event_id uuid,
  snapshot_reason text default 'manual_sync'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  actor_id uuid;
  inserted_count integer := 0;
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
    raise exception 'Event not found.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to manage attendance for this event.';
  end if;

  if event_record.attendance_mode = 'mandatory_all'
    or event_record.type in ('chapter_meeting', 'philanthropy')
  then
    insert into public.event_expectations (
      event_id,
      member_id,
      source,
      required,
      snapshot_reason,
      created_by
    )
    select
      target_event_id,
      m.id,
      case
        when event_record.type = 'chapter_meeting' then 'active_applicable_roster'
        else 'all_active'
      end,
      true,
      snapshot_reason,
      actor_id
    from public.members m
    where m.status in ('active', 'new_member')
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
  elsif event_record.attendance_mode = 'exec_only'
    or event_record.type::text = 'executive_council'
  then
    insert into public.event_expectations (
      event_id,
      member_id,
      source,
      required,
      snapshot_reason,
      created_by
    )
    select distinct
      target_event_id,
      mp.member_id,
      'exec_roster',
      true,
      snapshot_reason,
      actor_id
    from public.member_positions mp
    join public.positions p on p.id = mp.position_id
    where mp.removed_at is null
      and p.is_active
      and p.slug = any(array[
        'president',
        'ivp',
        'evp',
        'secretary',
        'treasurer',
        'saa'
      ])
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
  end if;

  update public.events e
  set expected_count = (
    select count(*)
    from public.event_expectations ee
    where ee.event_id = target_event_id
      and ee.required
      and ee.removed_at is null
  )
  where e.id = target_event_id;

  return inserted_count;
end;
$$;

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

  if event_record.check_in_token is null
    or submitted_token is null
    or event_record.check_in_token <> submitted_token
  then
    return jsonb_build_object('result', 'invalid', 'event_name', event_record.name, 'message', 'This check-in link is no longer valid.');
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
      'location', event_record.location
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
      'checked_in_at', checked_at
    ),
    'Member checked in through QR.'
  );

  return jsonb_build_object(
    'result', computed_status,
    'event_id', target_event_id,
    'event_name', event_record.name,
    'status', computed_status,
    'checked_in_at', checked_at,
    'location', event_record.location
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
  where e.check_in_token = submitted_token
    and e.check_in_open = true
    and e.archived_at is null
    and e.qr_enabled
  order by e.check_in_token_rotated_at desc nulls last
  limit 1;

  if target_event_id is null then
    return jsonb_build_object('result', 'invalid', 'message', 'This check-in link is no longer valid.');
  end if;

  return public.check_in_member(target_event_id, submitted_token);
end;
$$;

create or replace function public.manual_mark_attendance(
  target_event_id uuid,
  target_member_id uuid,
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
  existing jsonb;
  saved public.event_attendees%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to manually mark attendance for this event.';
  end if;

  if length(trim(coalesce(reason, ''))) < 4 then
    raise exception 'Manual attendance changes require a reason.';
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
    'manual',
    actor_id,
    trim(reason)
  )
  on conflict (event_id, member_id)
  do update set
    status = excluded.status,
    method = 'manual',
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
    'manual_attendance_mark',
    existing,
    to_jsonb(saved),
    trim(reason)
  );

  return jsonb_build_object(
    'event_id', target_event_id,
    'member_id', target_member_id,
    'status', saved.status,
    'method', saved.method,
    'checked_in_at', saved.checked_in_at,
    'reason', saved.override_reason
  );
end;
$$;

create or replace function public.attendance_event_roster(target_event_id uuid)
returns table (
  member_id uuid,
  suid text,
  display_name text,
  member_status text,
  expected boolean,
  attendance_status text,
  attendance_method text,
  checked_in_at timestamptz,
  excusal_status text,
  is_excused boolean,
  logged_by_name text,
  override_reason text
)
language plpgsql
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

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to view this attendance roster.';
  end if;

  return query
  with expected_members as (
    select
      ee.member_id,
      true as expected
    from public.event_expectations ee
    where ee.event_id = target_event_id
      and ee.required
      and ee.removed_at is null
  ),
  roster_members as (
    select em.member_id
    from expected_members em
    union
    select ea.member_id
    from public.event_attendees ea
    where ea.event_id = target_event_id
  )
  select
    m.id as member_id,
    m.suid,
    trim(concat(coalesce(m.preferred_name, m.legal_first_name), ' ', m.legal_last_name)) as display_name,
    m.status::text as member_status,
    coalesce(em.expected, false) as expected,
    ea.status::text as attendance_status,
    ea.method::text as attendance_method,
    ea.checked_in_at,
    ex.status::text as excusal_status,
    ex.status = 'approved' as is_excused,
    trim(concat(coalesce(logger.preferred_name, logger.legal_first_name), ' ', logger.legal_last_name)) as logged_by_name,
    ea.override_reason
  from roster_members rm
  join public.members m on m.id = rm.member_id
  left join expected_members em on em.member_id = m.id
  left join public.event_attendees ea
    on ea.event_id = target_event_id
    and ea.member_id = m.id
  left join public.excusals ex
    on ex.event_id = target_event_id
    and ex.member_id = m.id
  left join public.members logger on logger.id = ea.logged_by
  order by m.legal_last_name, m.legal_first_name;
end;
$$;

create or replace function public.record_quorum_snapshot(
  target_event_id uuid,
  target_snapshot_type text default 'vote',
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  eligible_total integer;
  present_total integer;
  threshold_total integer;
  saved public.quorum_snapshots%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_manage_event_attendance(target_event_id) then
    raise exception 'You do not have permission to record quorum for this event.';
  end if;

  select count(*)
  into eligible_total
  from public.members m
  where m.status = 'active';

  select count(distinct ea.member_id)
  into present_total
  from public.event_attendees ea
  join public.members m on m.id = ea.member_id
  where ea.event_id = target_event_id
    and m.status = 'active';

  threshold_total := floor(eligible_total / 2.0)::integer + 1;

  insert into public.quorum_snapshots (
    event_id,
    snapshot_type,
    present_count,
    eligible_count,
    threshold_count,
    quorum_met,
    created_by,
    notes
  )
  values (
    target_event_id,
    coalesce(nullif(trim(target_snapshot_type), ''), 'vote'),
    present_total,
    eligible_total,
    threshold_total,
    present_total >= threshold_total,
    actor_id,
    nullif(trim(coalesce(target_notes, '')), '')
  )
  returning *
  into saved;

  return jsonb_build_object(
    'id', saved.id,
    'event_id', target_event_id,
    'present_count', present_total,
    'eligible_count', eligible_total,
    'threshold_count', threshold_total,
    'quorum_met', saved.quorum_met
  );
end;
$$;

create or replace function public.publish_weekly_ineligible_list(chapter_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  list_id uuid;
  inserted_members integer;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.has_position(array['president', 'secretary']) then
    raise exception 'Only the President or Secretary can publish the weekly ineligible list.';
  end if;

  select *
  into event_record
  from public.events
  where id = chapter_event_id;

  if not found or event_record.type <> 'chapter_meeting' then
    raise exception 'A chapter meeting event is required.';
  end if;

  perform public.sync_event_expected_roster(chapter_event_id, 'weekly_ineligible_publish');

  insert into public.weekly_ineligible_lists (
    chapter_event_id,
    week_start,
    published_at,
    published_by,
    status,
    includes_attendance,
    includes_forms
  )
  values (
    chapter_event_id,
    date_trunc('week', event_record.event_date::timestamp)::date,
    now(),
    actor_id,
    'published',
    true,
    false
  )
  returning id into list_id;

  insert into public.weekly_ineligible_list_members (
    list_id,
    member_id,
    suid,
    reason,
    source,
    source_event_id,
    dispute_status
  )
  select
    list_id,
    m.id,
    m.suid,
    'Unexcused chapter meeting absence',
    'attendance',
    chapter_event_id,
    'none'
  from public.event_expectations ee
  join public.members m on m.id = ee.member_id
  left join public.event_attendees ea
    on ea.event_id = ee.event_id
    and ea.member_id = ee.member_id
  left join public.excusals ex
    on ex.event_id = ee.event_id
    and ex.member_id = ee.member_id
    and ex.status = 'approved'
  where ee.event_id = chapter_event_id
    and ee.required
    and ee.removed_at is null
    and ea.id is null
    and ex.id is null;

  get diagnostics inserted_members = row_count;

  return jsonb_build_object(
    'list_id', list_id,
    'chapter_event_id', chapter_event_id,
    'published_count', inserted_members,
    'week_start', date_trunc('week', event_record.event_date::timestamp)::date
  );
end;
$$;

create or replace function public.attendance_tier_input(
  target_as_of_date date default current_date
)
returns table (
  suid text,
  member_id uuid,
  as_of_date date,
  chapter_meetings_expected integer,
  chapter_meetings_present integer,
  chapter_meetings_late integer,
  chapter_meetings_excused integer,
  chapter_meetings_unexcused_absent integer,
  chapter_meeting_rate numeric,
  current_social_ineligible boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with chapter_events as (
    select id
    from public.events
    where type = 'chapter_meeting'
      and event_date <= target_as_of_date
  ),
  expected as (
    select ee.member_id, count(*)::integer as expected_count
    from public.event_expectations ee
    join chapter_events ce on ce.id = ee.event_id
    where ee.required
      and ee.removed_at is null
    group by ee.member_id
  ),
  attendance as (
    select
      ea.member_id,
      count(*) filter (where ea.status in ('on_time', 'late'))::integer as present_count,
      count(*) filter (where ea.status = 'late')::integer as late_count
    from public.event_attendees ea
    join chapter_events ce on ce.id = ea.event_id
    group by ea.member_id
  ),
  excused as (
    select ex.member_id, count(*)::integer as excused_count
    from public.excusals ex
    join chapter_events ce on ce.id = ex.event_id
    where ex.status = 'approved'
    group by ex.member_id
  ),
  latest_published_list as (
    select wil.id
    from public.weekly_ineligible_lists wil
    where wil.status = 'published'
      and wil.includes_attendance
      and wil.week_start <= target_as_of_date
    order by wil.published_at desc nulls last, wil.created_at desc
    limit 1
  ),
  latest_ineligible as (
    select
      wilm.member_id,
      true as ineligible
    from public.weekly_ineligible_list_members wilm
    join latest_published_list lpl on lpl.id = wilm.list_id
  )
  select
    m.suid,
    m.id as member_id,
    target_as_of_date as as_of_date,
    coalesce(e.expected_count, 0) as chapter_meetings_expected,
    coalesce(a.present_count, 0) as chapter_meetings_present,
    coalesce(a.late_count, 0) as chapter_meetings_late,
    coalesce(x.excused_count, 0) as chapter_meetings_excused,
    greatest(
      coalesce(e.expected_count, 0) - coalesce(a.present_count, 0) - coalesce(x.excused_count, 0),
      0
    ) as chapter_meetings_unexcused_absent,
    case
      when greatest(coalesce(e.expected_count, 0) - coalesce(x.excused_count, 0), 0) = 0 then null
      else round(
        coalesce(a.present_count, 0)::numeric
        / greatest(coalesce(e.expected_count, 0) - coalesce(x.excused_count, 0), 1),
        4
      )
    end as chapter_meeting_rate,
    coalesce(li.ineligible, false) as current_social_ineligible
  from public.members m
  left join expected e on e.member_id = m.id
  left join attendance a on a.member_id = m.id
  left join excused x on x.member_id = m.id
  left join latest_ineligible li on li.member_id = m.id
  where m.status in ('active', 'new_member')
  order by m.suid
$$;

revoke execute on function public.can_manage_event_attendance(uuid) from public, anon;
revoke execute on function public.sync_event_expected_roster(uuid, text) from public, anon;
revoke execute on function public.open_event_check_in(uuid) from public, anon;
revoke execute on function public.rotate_event_check_in_token(uuid) from public, anon;
revoke execute on function public.close_event_check_in(uuid) from public, anon;
revoke execute on function public.check_in_member(uuid, uuid) from public, anon;
revoke execute on function public.check_in_member_by_token(uuid) from public, anon;
revoke execute on function public.manual_mark_attendance(uuid, uuid, public.attendance_status, text) from public, anon;
revoke execute on function public.attendance_event_roster(uuid) from public, anon;
revoke execute on function public.record_quorum_snapshot(uuid, text, text) from public, anon;
revoke execute on function public.publish_weekly_ineligible_list(uuid) from public, anon;
revoke execute on function public.attendance_tier_input(date) from public, anon;

grant execute on function public.can_manage_event_attendance(uuid) to authenticated;
grant execute on function public.sync_event_expected_roster(uuid, text) to authenticated;
grant execute on function public.open_event_check_in(uuid) to authenticated;
grant execute on function public.rotate_event_check_in_token(uuid) to authenticated;
grant execute on function public.close_event_check_in(uuid) to authenticated;
grant execute on function public.check_in_member(uuid, uuid) to authenticated;
grant execute on function public.check_in_member_by_token(uuid) to authenticated;
grant execute on function public.manual_mark_attendance(uuid, uuid, public.attendance_status, text) to authenticated;
grant execute on function public.attendance_event_roster(uuid) to authenticated;
grant execute on function public.record_quorum_snapshot(uuid, text, text) to authenticated;
grant execute on function public.publish_weekly_ineligible_list(uuid) to authenticated;
grant execute on function public.attendance_tier_input(date) to authenticated;
