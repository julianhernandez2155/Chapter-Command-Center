-- Store Secretary request-changes notes per verification field.

alter table public.member_verification_submissions
  add column if not exists needs_changes_field_notes jsonb not null default '{}'::jsonb;

comment on column public.member_verification_submissions.needs_changes_field_notes is
  'Field-keyed Secretary notes shown inline when a member is sent back to the verification hard block.';

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
  normalized_field_notes jsonb := coalesce(field_decisions, '{}'::jsonb);
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

  if decision = 'needs_changes' and (
    normalized_note is null
    or jsonb_typeof(normalized_field_notes) <> 'object'
    or normalized_field_notes = '{}'::jsonb
  ) then
    raise exception 'At least one field note is required to request changes.';
  end if;

  if decision in ('exempted', 'temporarily_unlocked') and normalized_note is null then
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
        needs_changes_field_notes = '{}'::jsonb,
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
        needs_changes_fields = normalized_fields,
        needs_changes_field_notes = normalized_field_notes
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
        needs_changes_fields = normalized_fields,
        needs_changes_field_notes = normalized_field_notes
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
    normalized_field_notes,
    coalesce(member_patch, '{}'::jsonb)
  );
end;
$$;

notify pgrst, 'reload schema';
