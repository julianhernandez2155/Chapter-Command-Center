-- Graduation workflow with secretary-controlled alumni promotion.
-- Members can confirm graduation intent, but only President/Secretary can
-- decide and promote candidates to alumni.

create table if not exists public.graduation_cycles (
  id uuid primary key default gen_random_uuid(),
  term_label text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'cancelled')),
  due_at timestamptz,
  launched_by uuid references public.members(id),
  launched_at timestamptz,
  closed_by uuid references public.members(id),
  closed_at timestamptz,
  promoted_by uuid references public.members(id),
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists graduation_cycles_one_open_idx
  on public.graduation_cycles ((status))
  where status = 'open';

create index if not exists graduation_cycles_status_idx
  on public.graduation_cycles(status, due_at);

create table if not exists public.graduation_candidates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.graduation_cycles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  detected_reasons text[] not null default '{}',
  previous_status public.member_status not null default 'active',
  expected_graduation_term text,
  graduation_year integer,
  member_response text check (member_response in ('graduating', 'not_graduating', 'delayed', 'unsure')),
  response_note text,
  confirmed_personal_email text,
  confirmed_phone text,
  confirmed_linkedin text,
  alumni_city text,
  alumni_directory_visibility text not null default 'standard' check (alumni_directory_visibility in ('standard', 'limited', 'hidden')),
  responded_at timestamptz,
  secretary_decision text not null default 'pending' check (secretary_decision in ('pending', 'promote', 'keep_active', 'defer')),
  secretary_note text,
  decided_by uuid references public.members(id),
  decided_at timestamptz,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, member_id)
);

create index if not exists graduation_candidates_cycle_decision_idx
  on public.graduation_candidates(cycle_id, secretary_decision, promoted_at);

create index if not exists graduation_candidates_member_idx
  on public.graduation_candidates(member_id, created_at desc);

create table if not exists public.graduation_candidate_events (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.graduation_cycles(id) on delete cascade,
  candidate_id uuid references public.graduation_candidates(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  actor_member_id uuid not null default public.current_member_id() references public.members(id),
  event_type text not null check (event_type in ('cycle_launched', 'member_responded', 'secretary_decided', 'promoted_to_alumni', 'cycle_closed')),
  event_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists graduation_candidate_events_cycle_idx
  on public.graduation_candidate_events(cycle_id, created_at desc);

drop trigger if exists graduation_cycles_touch on public.graduation_cycles;
create trigger graduation_cycles_touch before update on public.graduation_cycles
for each row execute function public.touch_updated_at();

drop trigger if exists graduation_candidates_touch on public.graduation_candidates;
create trigger graduation_candidates_touch before update on public.graduation_candidates
for each row execute function public.touch_updated_at();

create or replace function public.check_graduation_candidate_member_write()
returns trigger
language plpgsql
as $$
declare
  is_admin boolean := public.has_position(array['president', 'secretary']);
  active_cycle boolean;
begin
  if is_admin then
    return new;
  end if;

  select exists (
    select 1
    from public.graduation_cycles gc
    where gc.id = new.cycle_id
      and gc.status = 'open'
  ) into active_cycle;

  if not active_cycle then
    raise exception 'Graduation cycle is not open.';
  end if;

  if new.member_id is distinct from public.current_member_id() then
    raise exception 'You can only update your own graduation confirmation.';
  end if;

  if tg_op = 'UPDATE' then
    new.cycle_id := old.cycle_id;
    new.member_id := old.member_id;
    new.detected_reasons := old.detected_reasons;
    new.previous_status := old.previous_status;
    new.expected_graduation_term := old.expected_graduation_term;
    new.graduation_year := old.graduation_year;
    new.secretary_decision := old.secretary_decision;
    new.secretary_note := old.secretary_note;
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
    new.promoted_at := old.promoted_at;
  else
    if new.secretary_decision <> 'pending'
      or new.secretary_note is not null
      or new.decided_by is not null
      or new.decided_at is not null
      or new.promoted_at is not null then
      raise exception 'Members cannot set secretary graduation decisions.';
    end if;
  end if;

  if new.member_response is not null and new.responded_at is null then
    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists graduation_candidates_member_guard on public.graduation_candidates;
create trigger graduation_candidates_member_guard
before insert or update on public.graduation_candidates
for each row execute function public.check_graduation_candidate_member_write();

create or replace function public.record_graduation_candidate_event()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.member_response is distinct from old.member_response and new.member_response is not null then
    insert into public.graduation_candidate_events (
      cycle_id,
      candidate_id,
      member_id,
      event_type,
      event_note,
      metadata
    ) values (
      new.cycle_id,
      new.id,
      new.member_id,
      'member_responded',
      new.response_note,
      jsonb_build_object('member_response', new.member_response)
    );
  end if;

  if tg_op = 'UPDATE' and new.secretary_decision is distinct from old.secretary_decision then
    insert into public.graduation_candidate_events (
      cycle_id,
      candidate_id,
      member_id,
      event_type,
      event_note,
      metadata
    ) values (
      new.cycle_id,
      new.id,
      new.member_id,
      'secretary_decided',
      new.secretary_note,
      jsonb_build_object('secretary_decision', new.secretary_decision)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists graduation_candidates_event_log on public.graduation_candidates;
create trigger graduation_candidates_event_log
after update on public.graduation_candidates
for each row execute function public.record_graduation_candidate_event();

create or replace function public.record_graduation_cycle_event()
returns trigger
language plpgsql
as $$
declare
  actor_id uuid;
begin
  if tg_op = 'INSERT' and new.status = 'open' and new.launched_by is not null then
    insert into public.graduation_candidate_events (
      cycle_id,
      member_id,
      actor_member_id,
      event_type,
      event_note,
      metadata
    ) values (
      new.id,
      new.launched_by,
      new.launched_by,
      'cycle_launched',
      'Graduation cycle launched.',
      jsonb_build_object('term_label', new.term_label, 'due_at', new.due_at)
    );
  end if;

  if tg_op = 'UPDATE' and new.status = 'closed' and old.status is distinct from new.status then
    actor_id := coalesce(new.closed_by, public.current_member_id());

    insert into public.graduation_candidate_events (
      cycle_id,
      member_id,
      actor_member_id,
      event_type,
      event_note,
      metadata
    ) values (
      new.id,
      actor_id,
      actor_id,
      'cycle_closed',
      'Graduation cycle closed.',
      jsonb_build_object('term_label', new.term_label)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists graduation_cycles_event_log on public.graduation_cycles;
create trigger graduation_cycles_event_log
after insert or update on public.graduation_cycles
for each row execute function public.record_graduation_cycle_event();

alter table public.graduation_cycles enable row level security;
alter table public.graduation_candidates enable row level security;
alter table public.graduation_candidate_events enable row level security;

drop policy if exists graduation_cycles_select_relevant on public.graduation_cycles;
create policy graduation_cycles_select_relevant
  on public.graduation_cycles
  for select
  to authenticated
  using (status = 'open' or public.has_position(array['president', 'secretary']));

drop policy if exists graduation_cycles_manage_secretary on public.graduation_cycles;
create policy graduation_cycles_manage_secretary
  on public.graduation_cycles
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidates_select_own_or_secretary on public.graduation_candidates;
create policy graduation_candidates_select_own_or_secretary
  on public.graduation_candidates
  for select
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidates_insert_own_or_secretary on public.graduation_candidates;
create policy graduation_candidates_insert_own_or_secretary
  on public.graduation_candidates
  for insert
  to authenticated
  with check (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidates_update_own_or_secretary on public.graduation_candidates;
create policy graduation_candidates_update_own_or_secretary
  on public.graduation_candidates
  for update
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']))
  with check (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidates_delete_secretary on public.graduation_candidates;
create policy graduation_candidates_delete_secretary
  on public.graduation_candidates
  for delete
  to authenticated
  using (public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidate_events_select_own_or_secretary on public.graduation_candidate_events;
create policy graduation_candidate_events_select_own_or_secretary
  on public.graduation_candidate_events
  for select
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists graduation_candidate_events_insert_secretary on public.graduation_candidate_events;
create policy graduation_candidate_events_insert_secretary
  on public.graduation_candidate_events
  for insert
  to authenticated
  with check (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

create or replace function public.promote_graduation_candidates(
  candidate_ids uuid[],
  actor_member_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted_count integer := 0;
  candidate_row public.graduation_candidates%rowtype;
begin
  if not public.has_position(array['president', 'secretary']) then
    raise exception 'Only President or Secretary can promote graduation candidates.';
  end if;

  if actor_member_id is distinct from public.current_member_id() then
    raise exception 'Actor mismatch.';
  end if;

  for candidate_row in
    select *
    from public.graduation_candidates
    where id = any(candidate_ids)
      and secretary_decision = 'promote'
      and promoted_at is null
  loop
    update public.members
      set status = 'alumni'
      where id = candidate_row.member_id;

    update public.member_positions
      set removed_at = coalesce(removed_at, now())
      where member_id = candidate_row.member_id
        and removed_at is null;

    update public.graduation_candidates
      set promoted_at = now(),
          decided_by = coalesce(decided_by, actor_member_id),
          decided_at = coalesce(decided_at, now())
      where id = candidate_row.id;

    update public.graduation_cycles
      set promoted_by = actor_member_id,
          promoted_at = now()
      where id = candidate_row.cycle_id;

    insert into public.graduation_candidate_events (
      cycle_id,
      candidate_id,
      member_id,
      actor_member_id,
      event_type,
      event_note,
      metadata
    ) values (
      candidate_row.cycle_id,
      candidate_row.id,
      candidate_row.member_id,
      actor_member_id,
      'promoted_to_alumni',
      'Promoted from active roster to alumni.',
      jsonb_build_object('previous_status', candidate_row.previous_status)
    );

    promoted_count := promoted_count + 1;
  end loop;

  return promoted_count;
end;
$$;

revoke all on function public.promote_graduation_candidates(uuid[], uuid) from public;
grant execute on function public.promote_graduation_candidates(uuid[], uuid) to authenticated;

grant select, insert, update, delete on public.graduation_cycles to authenticated;
grant select, insert, update, delete on public.graduation_candidates to authenticated;
grant select, insert on public.graduation_candidate_events to authenticated;

notify pgrst, 'reload schema';
