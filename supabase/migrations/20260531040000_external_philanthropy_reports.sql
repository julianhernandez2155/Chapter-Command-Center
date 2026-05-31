-- Sprint 4 Slice F: external philanthropy opportunities, reports, and approvals.

alter table public.events
  add column if not exists external_approver_id uuid references public.members(id);

create table if not exists public.external_philanthropy_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  signed_up_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists external_philanthropy_signups_active_unique
  on public.external_philanthropy_signups(event_id, member_id)
  where cancelled_at is null;

create index if not exists external_philanthropy_signups_member_idx
  on public.external_philanthropy_signups(member_id, signed_up_at desc);

create table if not exists public.service_hour_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  source text not null,
  requested_hours numeric not null default 0 check (requested_hours >= 0),
  hours numeric not null default 0 check (hours >= 0),
  status text not null default 'pending',
  submitted_by uuid references public.members(id),
  verified_by uuid references public.members(id),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  notes text,
  proof_url text,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_hour_entries_source_check check (
    source in ('chapter_run_event', 'external_philanthropy_self_report')
  ),
  constraint service_hour_entries_status_check check (
    status in ('pending', 'approved', 'rejected', 'adjusted')
  )
);

create unique index if not exists service_hour_entries_external_active_unique
  on public.service_hour_entries(event_id, member_id, source)
  where source = 'external_philanthropy_self_report'
    and status in ('pending', 'approved', 'adjusted');

create index if not exists service_hour_entries_member_idx
  on public.service_hour_entries(member_id, submitted_at desc);

create index if not exists service_hour_entries_status_idx
  on public.service_hour_entries(status, submitted_at desc);

create table if not exists public.service_hour_entry_audit (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.service_hour_entries(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  actor_member_id uuid references public.members(id),
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists service_hour_entry_audit_entry_idx
  on public.service_hour_entry_audit(entry_id, created_at desc);

alter table public.external_philanthropy_signups enable row level security;
alter table public.service_hour_entries enable row level security;
alter table public.service_hour_entry_audit enable row level security;

grant select, insert, update on public.external_philanthropy_signups to authenticated;
grant select, insert, update on public.service_hour_entries to authenticated;
grant select, insert on public.service_hour_entry_audit to authenticated;

create or replace function public.is_external_philanthropy_reviewer(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_service_philanthropy()
    or exists (
      select 1
      from public.events e
      where e.id = target_event_id
        and e.external_approver_id = public.current_member_id()
    )
$$;

drop policy if exists external_philanthropy_signups_select_relevant on public.external_philanthropy_signups;
create policy external_philanthropy_signups_select_relevant
  on public.external_philanthropy_signups
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_external_philanthropy_reviewer(event_id)
  );

drop policy if exists external_philanthropy_signups_insert_own on public.external_philanthropy_signups;
create policy external_philanthropy_signups_insert_own
  on public.external_philanthropy_signups
  for insert
  to authenticated
  with check (member_id = public.current_member_id());

drop policy if exists external_philanthropy_signups_update_relevant on public.external_philanthropy_signups;
create policy external_philanthropy_signups_update_relevant
  on public.external_philanthropy_signups
  for update
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_external_philanthropy_reviewer(event_id)
  )
  with check (
    member_id = public.current_member_id()
    or public.is_external_philanthropy_reviewer(event_id)
  );

drop policy if exists service_hour_entries_select_relevant on public.service_hour_entries;
create policy service_hour_entries_select_relevant
  on public.service_hour_entries
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_external_philanthropy_reviewer(event_id)
  );

drop policy if exists service_hour_entries_insert_own_external on public.service_hour_entries;
create policy service_hour_entries_insert_own_external
  on public.service_hour_entries
  for insert
  to authenticated
  with check (
    member_id = public.current_member_id()
    and submitted_by = public.current_member_id()
    and source = 'external_philanthropy_self_report'
    and status = 'pending'
  );

drop policy if exists service_hour_entries_update_reviewer on public.service_hour_entries;
create policy service_hour_entries_update_reviewer
  on public.service_hour_entries
  for update
  to authenticated
  using (public.is_external_philanthropy_reviewer(event_id))
  with check (public.is_external_philanthropy_reviewer(event_id));

drop policy if exists service_hour_entry_audit_select_relevant on public.service_hour_entry_audit;
create policy service_hour_entry_audit_select_relevant
  on public.service_hour_entry_audit
  for select
  to authenticated
  using (
    member_id = public.current_member_id()
    or public.is_external_philanthropy_reviewer(event_id)
  );

drop policy if exists service_hour_entry_audit_insert_relevant on public.service_hour_entry_audit;
create policy service_hour_entry_audit_insert_relevant
  on public.service_hour_entry_audit
  for insert
  to authenticated
  with check (
    actor_member_id = public.current_member_id()
    and (
      member_id = public.current_member_id()
      or public.is_external_philanthropy_reviewer(event_id)
    )
  );

create or replace function public.external_philanthropy_member_portal()
returns jsonb
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

  return (
    with opportunities as (
      select
        e.id as event_id,
        e.name,
        e.event_date,
        e.starts_at,
        e.ends_at,
        e.location,
        e.signup_capacity,
        e.signup_deadline,
        e.hours,
        e.external_approver_id,
        coalesce(sc.signed_up_count, 0) as signed_up_count,
        case
          when e.signup_capacity is null then null::integer
          else greatest(e.signup_capacity - coalesce(sc.signed_up_count, 0), 0)
        end as spots_remaining,
        eps.id as signup_id,
        eps.id is not null as user_signed_up,
        she.id as report_id,
        she.status as report_status,
        she.requested_hours,
        she.hours as approved_hours,
        she.reviewer_note,
        e.starts_at > now()
          and e.signup_enabled
          and (e.signup_deadline is null or e.signup_deadline >= now())
          and eps.id is null
          and (
            e.signup_capacity is null
            or coalesce(sc.signed_up_count, 0) < e.signup_capacity
          ) as can_signup,
        e.starts_at <= now()
          and eps.id is not null
          and she.id is null as can_report
      from public.events e
      left join (
        select event_id, count(*)::integer as signed_up_count
        from public.external_philanthropy_signups
        where cancelled_at is null
        group by event_id
      ) sc on sc.event_id = e.id
      left join public.external_philanthropy_signups eps
        on eps.event_id = e.id
        and eps.member_id = actor_id
        and eps.cancelled_at is null
      left join public.service_hour_entries she
        on she.event_id = e.id
        and she.member_id = actor_id
        and she.source = 'external_philanthropy_self_report'
        and she.status in ('pending', 'approved', 'adjusted')
      where e.type = 'philanthropy'
        and e.qr_enabled = false
        and coalesce(e.counts_toward_service_hours, false)
        and e.archived_at is null
        and e.starts_at >= (now() - interval '60 days')
      order by e.starts_at
    ),
    my_reports as (
      select
        she.id,
        she.event_id,
        e.name as event_name,
        she.requested_hours,
        she.hours,
        she.status,
        she.submitted_at,
        she.verified_at,
        she.notes,
        she.proof_url,
        she.reviewer_note
      from public.service_hour_entries she
      join public.events e on e.id = she.event_id
      where she.member_id = actor_id
        and she.source = 'external_philanthropy_self_report'
      order by she.submitted_at desc
    )
    select jsonb_build_object(
      'opportunities', coalesce((select jsonb_agg(to_jsonb(opportunities)) from opportunities), '[]'::jsonb),
      'my_reports', coalesce((select jsonb_agg(to_jsonb(my_reports)) from my_reports), '[]'::jsonb)
    )
  );
end;
$$;

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
begin
  if not public.can_manage_service_philanthropy() then
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

create or replace function public.signup_for_external_philanthropy(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  active_count integer := 0;
  signup_row public.external_philanthropy_signups%rowtype;
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
    raise exception 'External philanthropy opportunity not found.';
  end if;

  if event_record.type <> 'philanthropy' or event_record.qr_enabled then
    raise exception 'This is not an external philanthropy opportunity.';
  end if;

  if event_record.archived_at is not null or not event_record.signup_enabled then
    raise exception 'Signup is closed for this opportunity.';
  end if;

  if event_record.starts_at < now() then
    raise exception 'Signup is closed because this opportunity has started.';
  end if;

  if event_record.signup_deadline is not null and event_record.signup_deadline < now() then
    raise exception 'Signup deadline has passed.';
  end if;

  select count(*)::integer
  into active_count
  from public.external_philanthropy_signups eps
  where eps.event_id = target_event_id
    and eps.cancelled_at is null;

  if event_record.signup_capacity is not null and active_count >= event_record.signup_capacity then
    raise exception 'This external philanthropy opportunity is full.';
  end if;

  insert into public.external_philanthropy_signups (event_id, member_id)
  values (target_event_id, actor_id)
  on conflict (event_id, member_id) where cancelled_at is null do update
    set updated_at = public.external_philanthropy_signups.updated_at
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
    'external_philanthropy_signup',
    true,
    'external_philanthropy_signup',
    actor_id,
    'Created from member external philanthropy signup.'
  )
  on conflict (event_id, member_id) where removed_at is null do update
    set required = true,
        source = 'external_philanthropy_signup',
        snapshot_reason = 'external_philanthropy_signup',
        notes = 'Updated from member external philanthropy signup.';

  update public.events e
  set expected_count = (
    select count(*)
    from public.event_expectations ee
    where ee.event_id = target_event_id
      and ee.required
      and ee.removed_at is null
  )
  where e.id = target_event_id;

  return jsonb_build_object('signup_id', signup_row.id, 'event_id', target_event_id, 'member_id', actor_id);
end;
$$;

create or replace function public.submit_external_service_hours(
  target_event_id uuid,
  requested_hours numeric,
  report_note text default null,
  proof text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  event_record public.events%rowtype;
  entry_row public.service_hour_entries%rowtype;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if requested_hours is null or requested_hours <= 0 or requested_hours > 24 then
    raise exception 'Requested hours must be between 0 and 24.';
  end if;

  select *
  into event_record
  from public.events
  where id = target_event_id;

  if not found then
    raise exception 'External philanthropy opportunity not found.';
  end if;

  if event_record.type <> 'philanthropy' or event_record.qr_enabled then
    raise exception 'This is not an external philanthropy opportunity.';
  end if;

  if event_record.starts_at > now() then
    raise exception 'Reports can be submitted after the opportunity starts.';
  end if;

  if not exists (
    select 1
    from public.external_philanthropy_signups eps
    where eps.event_id = target_event_id
      and eps.member_id = actor_id
      and eps.cancelled_at is null
  ) then
    raise exception 'You must be signed up or assigned before reporting external philanthropy hours.';
  end if;

  insert into public.service_hour_entries (
    member_id,
    event_id,
    source,
    requested_hours,
    hours,
    status,
    submitted_by,
    notes,
    proof_url
  )
  values (
    actor_id,
    target_event_id,
    'external_philanthropy_self_report',
    requested_hours,
    0,
    'pending',
    actor_id,
    nullif(trim(coalesce(report_note, '')), ''),
    nullif(trim(coalesce(proof, '')), '')
  )
  returning * into entry_row;

  insert into public.service_hour_entry_audit (
    entry_id,
    event_id,
    member_id,
    actor_member_id,
    action,
    after,
    reason
  )
  values (
    entry_row.id,
    target_event_id,
    actor_id,
    actor_id,
    'external_report_submitted',
    to_jsonb(entry_row),
    'Member submitted external philanthropy hours.'
  );

  return jsonb_build_object('entry_id', entry_row.id, 'event_id', target_event_id, 'status', entry_row.status);
end;
$$;

create or replace function public.review_external_service_hours(
  target_entry_id uuid,
  decision text,
  approved_hours numeric default null,
  review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  before_row public.service_hour_entries%rowtype;
  after_row public.service_hour_entries%rowtype;
  normalized_decision text;
  final_hours numeric := 0;
begin
  actor_id := public.current_member_id();

  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  normalized_decision := lower(trim(coalesce(decision, '')));

  if normalized_decision not in ('approved', 'rejected', 'adjusted') then
    raise exception 'Decision must be approved, rejected, or adjusted.';
  end if;

  select *
  into before_row
  from public.service_hour_entries
  where id = target_entry_id
  for update;

  if not found then
    raise exception 'External service-hour report not found.';
  end if;

  if before_row.status <> 'pending' then
    raise exception 'Only pending external reports can be reviewed.';
  end if;

  if not public.is_external_philanthropy_reviewer(before_row.event_id) then
    raise exception 'You do not have permission to review this external philanthropy report.';
  end if;

  if normalized_decision = 'rejected' then
    final_hours := 0;
  elsif normalized_decision = 'approved' then
    final_hours := coalesce(approved_hours, before_row.requested_hours);
  else
    if approved_hours is null then
      raise exception 'Adjusted reports require approved hours.';
    end if;
    final_hours := approved_hours;
  end if;

  if final_hours < 0 or final_hours > 24 then
    raise exception 'Approved hours must be between 0 and 24.';
  end if;

  update public.service_hour_entries
  set status = normalized_decision,
      hours = final_hours,
      verified_by = actor_id,
      verified_at = now(),
      reviewer_note = nullif(trim(coalesce(review_note, '')), ''),
      updated_at = now()
  where id = target_entry_id
  returning * into after_row;

  insert into public.service_hour_entry_audit (
    entry_id,
    event_id,
    member_id,
    actor_member_id,
    action,
    before,
    after,
    reason
  )
  values (
    after_row.id,
    after_row.event_id,
    after_row.member_id,
    actor_id,
    'external_report_' || normalized_decision,
    to_jsonb(before_row),
    to_jsonb(after_row),
    nullif(trim(coalesce(review_note, '')), '')
  );

  return jsonb_build_object(
    'entry_id', after_row.id,
    'event_id', after_row.event_id,
    'member_id', after_row.member_id,
    'status', after_row.status,
    'hours', after_row.hours
  );
end;
$$;

-- Include approved external philanthropy in the member service view.
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
  event_hours numeric := 0;
  external_hours numeric := 0;
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
  into event_hours, community_count, hosted_count
  from public.event_attendees ea
  join public.events e on e.id = ea.event_id
  where ea.member_id = actor_id
    and e.event_date <= target_as_of_date
    and coalesce(e.feeds_service_hours, false)
    and ea.status in ('on_time', 'late');

  select coalesce(sum(she.hours), 0)::numeric
  into external_hours
  from public.service_hour_entries she
  where she.member_id = actor_id
    and she.source = 'external_philanthropy_self_report'
    and she.status in ('approved', 'adjusted')
    and she.verified_at::date <= target_as_of_date;

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
    'service_hours_total', coalesce(event_hours, 0) + coalesce(external_hours, 0),
    'service_hours_target', 20,
    'community_service_events_attended', coalesce(community_count, 0),
    'community_service_floor_met', coalesce(community_count, 0) >= 1,
    'hosted_philanthropy_events_attended', coalesce(hosted_count, 0),
    'external_philanthropy_hours_approved', coalesce(external_hours, 0),
    'active_service_signups', coalesce(active_signup_count, 0)
  );
end;
$$;

-- Include pending external reports and approved external hours in the chairman console.
create or replace function public.service_philanthropy_console(
  target_as_of_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_members integer := 0;
  floor_met_count integer := 0;
  floor_missing_count integer := 0;
  approved_hours numeric := 0;
  external_hours numeric := 0;
  upcoming_count integer := 0;
  pending_count integer := 0;
  result jsonb;
begin
  if not public.can_manage_service_philanthropy() then
    raise exception 'You do not have permission to view the service and philanthropy console.';
  end if;

  with active_members as (
    select m.id
    from public.members m
    where m.status = 'active'
  ),
  service_by_member as (
    select
      am.id as member_id,
      coalesce(sum(coalesce(e.hours, 0)) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ), 0)::numeric as service_hours_total,
      count(distinct e.id) filter (
        where e.type = 'community_service'
          and coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      )::integer as community_service_events_attended
    from active_members am
    left join public.event_attendees ea on ea.member_id = am.id
    left join public.events e on e.id = ea.event_id
    group by am.id
  )
  select
    count(*)::integer,
    count(*) filter (where service_by_member.community_service_events_attended >= 1)::integer,
    count(*) filter (where service_by_member.community_service_events_attended < 1)::integer,
    coalesce(sum(service_by_member.service_hours_total), 0)::numeric
  into total_members, floor_met_count, floor_missing_count, approved_hours
  from service_by_member;

  select coalesce(sum(she.hours), 0)::numeric
  into external_hours
  from public.service_hour_entries she
  where she.source = 'external_philanthropy_self_report'
    and she.status in ('approved', 'adjusted')
    and she.verified_at::date <= target_as_of_date;

  select count(*)::integer
  into upcoming_count
  from public.events e
  where e.type in ('community_service', 'philanthropy')
    and e.archived_at is null
    and e.starts_at >= now();

  select count(*)::integer
  into pending_count
  from public.service_hour_entries she
  where she.source = 'external_philanthropy_self_report'
    and she.status = 'pending';

  with event_rollups as (
    select
      e.id,
      e.name,
      e.type,
      e.event_date,
      e.starts_at,
      e.ends_at,
      e.location,
      e.signup_capacity,
      e.expected_count,
      e.hours,
      case
        when e.starts_at > now() then 'upcoming'
        when coalesce(e.ends_at, e.starts_at) >= now() then 'live'
        else 'complete'
      end as status,
      coalesce(css.signed_up_count, 0) + coalesce(eps.signed_up_count, 0) as signed_up_count,
      coalesce(ea.checked_in_count, 0) as checked_in_count,
      coalesce(ea.checked_in_count, 0) * coalesce(e.hours, 0) as hours_awarded
    from public.events e
    left join (
      select event_id, count(*)::integer as signed_up_count
      from public.community_service_signups
      where cancelled_at is null
      group by event_id
    ) css on css.event_id = e.id
    left join (
      select event_id, count(*)::integer as signed_up_count
      from public.external_philanthropy_signups
      where cancelled_at is null
      group by event_id
    ) eps on eps.event_id = e.id
    left join (
      select event_id, count(*)::integer as checked_in_count
      from public.event_attendees
      where status in ('on_time', 'late')
      group by event_id
    ) ea on ea.event_id = e.id
    where e.type in ('community_service', 'philanthropy')
      and e.archived_at is null
      and e.starts_at >= (now() - interval '120 days')
    order by e.starts_at desc
  ),
  active_members as (
    select
      m.id,
      m.suid,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as display_name
    from public.members m
    where m.status = 'active'
  ),
  service_by_member as (
    select
      am.id as member_id,
      coalesce(sum(coalesce(e.hours, 0)) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ), 0)::numeric as event_hours_total,
      count(distinct e.id) filter (
        where e.type = 'community_service'
          and coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      )::integer as community_service_events_attended,
      max(e.starts_at) filter (
        where coalesce(e.feeds_service_hours, false)
          and ea.status in ('on_time', 'late')
          and e.event_date <= target_as_of_date
      ) as last_service_at
    from active_members am
    left join public.event_attendees ea on ea.member_id = am.id
    left join public.events e on e.id = ea.event_id
    group by am.id
  ),
  external_by_member as (
    select she.member_id, coalesce(sum(she.hours), 0)::numeric as external_hours
    from public.service_hour_entries she
    where she.source = 'external_philanthropy_self_report'
      and she.status in ('approved', 'adjusted')
      and she.verified_at::date <= target_as_of_date
    group by she.member_id
  ),
  active_signups as (
    select css.member_id, count(*)::integer as active_service_signups
    from public.community_service_signups css
    join public.events e on e.id = css.event_id
    where css.cancelled_at is null
      and e.archived_at is null
      and e.starts_at >= now()
    group by css.member_id
  ),
  missing_floor as (
    select
      am.id as member_id,
      am.suid,
      am.display_name,
      coalesce(sbm.event_hours_total, 0) + coalesce(ebm.external_hours, 0) as service_hours_total,
      coalesce(sbm.community_service_events_attended, 0) as community_service_events_attended,
      coalesce(active_signups.active_service_signups, 0) as active_service_signups,
      sbm.last_service_at
    from active_members am
    left join service_by_member sbm on sbm.member_id = am.id
    left join external_by_member ebm on ebm.member_id = am.id
    left join active_signups on active_signups.member_id = am.id
    where coalesce(sbm.community_service_events_attended, 0) < 1
    order by active_service_signups asc, service_hours_total asc, display_name
  ),
  pending_external_reports as (
    select
      she.id,
      she.event_id,
      e.name as event_name,
      she.member_id,
      trim(coalesce(m.preferred_name, m.legal_first_name) || ' ' || m.legal_last_name) as member_name,
      she.requested_hours,
      she.submitted_at,
      she.notes,
      she.proof_url
    from public.service_hour_entries she
    join public.events e on e.id = she.event_id
    join public.members m on m.id = she.member_id
    where she.source = 'external_philanthropy_self_report'
      and she.status = 'pending'
    order by she.submitted_at
  )
  select jsonb_build_object(
    'as_of_date', target_as_of_date,
    'summary', jsonb_build_object(
      'active_members', coalesce(total_members, 0),
      'community_floor_met', coalesce(floor_met_count, 0),
      'community_floor_missing', coalesce(floor_missing_count, 0),
      'approved_service_hours', coalesce(approved_hours, 0) + coalesce(external_hours, 0),
      'upcoming_service_events', coalesce(upcoming_count, 0),
      'pending_external_reports', coalesce(pending_count, 0)
    ),
    'events', coalesce((select jsonb_agg(to_jsonb(event_rollups)) from event_rollups), '[]'::jsonb),
    'missing_floor', coalesce((select jsonb_agg(to_jsonb(missing_floor)) from missing_floor), '[]'::jsonb),
    'pending_external_reports', coalesce((select jsonb_agg(to_jsonb(pending_external_reports)) from pending_external_reports), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

drop function if exists public.attendance_tier_input(date);

create or replace function public.attendance_tier_input(
  target_as_of_date date default current_date
)
returns table (
  suid text,
  member_id uuid,
  semester text,
  as_of_date date,
  chapter_meetings_expected integer,
  chapter_meetings_present integer,
  chapter_meetings_late integer,
  chapter_meetings_excused integer,
  chapter_meetings_unexcused_absent integer,
  chapter_meeting_rate numeric,
  recruitment_events_attended integer,
  service_hours_total numeric,
  community_service_events_attended integer,
  community_service_floor_met boolean,
  hosted_philanthropy_events_attended integer,
  external_philanthropy_hours_approved numeric,
  missed_obligation_count integer,
  missed_commitment_count integer,
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
  recruitment as (
    select
      ea.member_id,
      count(distinct e.id)::integer as events_attended
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where e.type = 'recruitment'
      and e.event_date <= target_as_of_date
      and ea.status in ('on_time', 'late')
    group by ea.member_id
  ),
  service as (
    select
      ea.member_id,
      coalesce(sum(coalesce(e.hours, 0)), 0)::numeric as hours_total,
      count(distinct e.id) filter (where e.type = 'community_service')::integer as community_service_count,
      count(distinct e.id) filter (
        where e.type = 'philanthropy'
          and coalesce(e.guest_check_in_enabled, false)
      )::integer as hosted_philanthropy_count
    from public.event_attendees ea
    join public.events e on e.id = ea.event_id
    where e.event_date <= target_as_of_date
      and coalesce(e.feeds_service_hours, false)
      and ea.status in ('on_time', 'late')
    group by ea.member_id
  ),
  external_service as (
    select
      she.member_id,
      coalesce(sum(she.hours), 0)::numeric as approved_hours
    from public.service_hour_entries she
    where she.source = 'external_philanthropy_self_report'
      and she.status in ('approved', 'adjusted')
      and she.verified_at::date <= target_as_of_date
    group by she.member_id
  ),
  missed_obligations as (
    select
      ee.member_id,
      count(*)::integer as missed_count
    from public.event_expectations ee
    join public.events e on e.id = ee.event_id
    left join public.event_attendees ea
      on ea.event_id = ee.event_id
      and ea.member_id = ee.member_id
    left join public.excusals ex
      on ex.event_id = ee.event_id
      and ex.member_id = ee.member_id
      and ex.status = 'approved'
    where e.event_date <= target_as_of_date
      and coalesce(e.feeds_missed_obligation_counter, false)
      and ee.required
      and ee.removed_at is null
      and ea.id is null
      and ex.id is null
    group by ee.member_id
  ),
  missed_commitments as (
    select
      ee.member_id,
      count(*)::integer as missed_count
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
    group by ee.member_id
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
    concat(
      extract(year from target_as_of_date)::integer,
      case when extract(month from target_as_of_date)::integer >= 7 then ' Fall' else ' Spring' end
    ) as semester,
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
    coalesce(r.events_attended, 0) as recruitment_events_attended,
    (coalesce(s.hours_total, 0) + coalesce(es.approved_hours, 0))::numeric as service_hours_total,
    coalesce(s.community_service_count, 0) as community_service_events_attended,
    coalesce(s.community_service_count, 0) >= 1 as community_service_floor_met,
    coalesce(s.hosted_philanthropy_count, 0) as hosted_philanthropy_events_attended,
    coalesce(es.approved_hours, 0)::numeric as external_philanthropy_hours_approved,
    coalesce(mo.missed_count, 0) as missed_obligation_count,
    coalesce(mc.missed_count, 0) as missed_commitment_count,
    coalesce(li.ineligible, false) as current_social_ineligible
  from public.members m
  left join expected e on e.member_id = m.id
  left join attendance a on a.member_id = m.id
  left join excused x on x.member_id = m.id
  left join recruitment r on r.member_id = m.id
  left join service s on s.member_id = m.id
  left join external_service es on es.member_id = m.id
  left join missed_obligations mo on mo.member_id = m.id
  left join missed_commitments mc on mc.member_id = m.id
  left join latest_ineligible li on li.member_id = m.id
  where m.status in ('active', 'new_member')
  order by m.suid
$$;

revoke execute on function public.is_external_philanthropy_reviewer(uuid) from public, anon;
revoke execute on function public.external_philanthropy_member_portal() from public, anon;
revoke execute on function public.external_philanthropy_review_queue() from public, anon;
revoke execute on function public.signup_for_external_philanthropy(uuid) from public, anon;
revoke execute on function public.submit_external_service_hours(uuid, numeric, text, text) from public, anon;
revoke execute on function public.review_external_service_hours(uuid, text, numeric, text) from public, anon;

grant execute on function public.is_external_philanthropy_reviewer(uuid) to authenticated;
grant execute on function public.external_philanthropy_member_portal() to authenticated;
grant execute on function public.external_philanthropy_review_queue() to authenticated;
grant execute on function public.signup_for_external_philanthropy(uuid) to authenticated;
grant execute on function public.submit_external_service_hours(uuid, numeric, text, text) to authenticated;
grant execute on function public.review_external_service_hours(uuid, text, numeric, text) to authenticated;

notify pgrst, 'reload schema';
