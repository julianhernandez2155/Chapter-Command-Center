-- Guided Secretary review for semester verification submissions.
-- Review decisions now go through a typed RPC and are mirrored to an
-- append-only event table for officer auditability.

alter table public.member_verification_submissions
  add column if not exists needs_changes_by uuid references public.members(id),
  add column if not exists needs_changes_at timestamptz,
  add column if not exists needs_changes_note text,
  add column if not exists needs_changes_fields text[] not null default '{}',
  add column if not exists reviewed_by uuid references public.members(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists baseline_snapshot jsonb not null default '{}'::jsonb;

comment on column public.member_verification_submissions.needs_changes_note is
  'Secretary-facing note explaining why a submitted verification needs member changes.';
comment on column public.member_verification_submissions.needs_changes_fields is
  'Field keys selected by the reviewer when requesting member changes.';
comment on column public.member_verification_submissions.reviewed_by is
  'Most recent President/Secretary reviewer for this submission.';
comment on column public.member_verification_submissions.baseline_snapshot is
  'Optional baseline captured before member edits; currently reserved for richer field diffs.';

create table if not exists public.member_verification_review_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.member_verification_submissions(id) on delete restrict,
  cycle_id uuid not null references public.verification_cycles(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  actor_member_id uuid not null default public.current_member_id() references public.members(id) on delete restrict,
  action text not null check (action in ('approved', 'needs_changes', 'exempted', 'temporarily_unlocked', 'field_edit')),
  note text,
  field_decisions jsonb not null default '{}'::jsonb,
  member_patch jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists member_verification_review_events_submission_idx
  on public.member_verification_review_events(submission_id, created_at desc);

create index if not exists member_verification_review_events_cycle_idx
  on public.member_verification_review_events(cycle_id, action, created_at desc);

comment on table public.member_verification_review_events is
  'Append-only Secretary/President review log for semester verification decisions and field edits.';

alter table public.member_verification_review_events enable row level security;

drop policy if exists member_verification_review_events_select_own_or_secretary
  on public.member_verification_review_events;
create policy member_verification_review_events_select_own_or_secretary
  on public.member_verification_review_events
  for select
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists member_verification_review_events_insert_secretary
  on public.member_verification_review_events;
create policy member_verification_review_events_insert_secretary
  on public.member_verification_review_events
  for insert
  to authenticated
  with check (
    public.has_position(array['president', 'secretary'])
    and actor_member_id = public.current_member_id()
  );

drop policy if exists member_verification_submissions_delete_secretary
  on public.member_verification_submissions;

revoke delete on public.verification_cycles from authenticated;
revoke delete on public.member_verification_submissions from authenticated;

create or replace function public.review_member_verification_submission(
  target_submission_id uuid,
  decision text,
  review_note text default null,
  review_fields text[] default '{}',
  field_decisions jsonb default '{}'::jsonb,
  member_patch jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := public.current_member_id();
  submission_row public.member_verification_submissions%rowtype;
  normalized_note text := nullif(trim(coalesce(review_note, '')), '');
  normalized_fields text[];
begin
  if actor_id is null then
    raise exception 'Reviewer member profile was not found.';
  end if;

  if not public.has_position(array['president', 'secretary']) then
    raise exception 'Only the President or Secretary can review verification submissions.';
  end if;

  select *
  into submission_row
  from public.member_verification_submissions
  where id = target_submission_id
  for update;

  if not found then
    raise exception 'Verification submission was not found.';
  end if;

  if decision not in ('approved', 'needs_changes', 'exempted', 'temporarily_unlocked') then
    raise exception 'Unsupported verification review decision: %', decision;
  end if;

  if submission_row.status in ('approved', 'exempted', 'temporarily_unlocked') then
    raise exception 'This verification submission has already been cleared.';
  end if;

  if submission_row.status not in ('submitted', 'needs_changes') then
    raise exception 'Only submitted verification records can be reviewed.';
  end if;

  select coalesce(array_agg(distinct trimmed_field), '{}'::text[])
  into normalized_fields
  from (
    select nullif(trim(field_key), '') as trimmed_field
    from unnest(coalesce(review_fields, '{}'::text[])) as field_key
  ) fields
  where trimmed_field is not null;

  if decision in ('needs_changes', 'exempted', 'temporarily_unlocked') and normalized_note is null then
    raise exception 'A review note is required for this decision.';
  end if;

  if decision = 'approved' then
    update public.member_verification_submissions
    set status = 'approved',
        approved_by = actor_id,
        approved_at = now(),
        reviewed_by = actor_id,
        reviewed_at = now(),
        needs_changes_note = null,
        needs_changes_fields = '{}',
        needs_changes_by = null,
        needs_changes_at = null
    where id = target_submission_id;

    update public.members
    set last_verified_at = now()
    where id = submission_row.member_id;
  elsif decision = 'needs_changes' then
    update public.member_verification_submissions
    set status = 'needs_changes',
        reviewed_by = actor_id,
        reviewed_at = now(),
        needs_changes_by = actor_id,
        needs_changes_at = now(),
        needs_changes_note = normalized_note,
        needs_changes_fields = normalized_fields
    where id = target_submission_id;
  elsif decision = 'exempted' then
    update public.member_verification_submissions
    set status = 'exempted',
        exempted_by = actor_id,
        exempted_at = now(),
        exemption_reason = normalized_note,
        reviewed_by = actor_id,
        reviewed_at = now()
    where id = target_submission_id;
  elsif decision = 'temporarily_unlocked' then
    update public.member_verification_submissions
    set status = 'temporarily_unlocked',
        reviewed_by = actor_id,
        reviewed_at = now(),
        needs_changes_note = normalized_note,
        needs_changes_fields = normalized_fields
    where id = target_submission_id;
  end if;

  insert into public.member_verification_review_events (
    submission_id,
    cycle_id,
    member_id,
    actor_member_id,
    action,
    note,
    field_decisions,
    member_patch
  ) values (
    submission_row.id,
    submission_row.cycle_id,
    submission_row.member_id,
    actor_id,
    decision,
    normalized_note,
    coalesce(field_decisions, '{}'::jsonb),
    coalesce(member_patch, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.review_member_verification_submission(
  uuid,
  text,
  text,
  text[],
  jsonb,
  jsonb
) from public;
grant execute on function public.review_member_verification_submission(
  uuid,
  text,
  text,
  text[],
  jsonb,
  jsonb
) to authenticated;

grant select, insert on public.member_verification_review_events to authenticated;

notify pgrst, 'reload schema';
