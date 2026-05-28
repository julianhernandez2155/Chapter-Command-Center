-- Semester verification hard-gate foundation.
-- Active members are required to complete an in-app verification cycle.
-- Parent/guardian, emergency contact, and parent consent are visible review
-- signals but are intentionally not hard-gate blockers.

create table if not exists public.verification_cycles (
  id uuid primary key default gen_random_uuid(),
  term_label text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'cancelled')),
  gate_mode text not null default 'hard' check (gate_mode = 'hard'),
  due_at timestamptz,
  required_member_statuses text[] not null default array['active'],
  required_fields text[] not null default array[
    'personal_email',
    'phone',
    'graduation_year',
    'expected_graduation_term',
    'school',
    'major',
    'local_address',
    'campus_housing',
    'home_city',
    'home_state',
    'tshirt_size',
    'hoodie_size'
  ],
  optional_review_fields text[] not null default array[
    'parent_guardian_contact',
    'emergency_contact',
    'parent_outreach_consent'
  ],
  launched_by uuid references public.members(id),
  launched_at timestamptz,
  closed_by uuid references public.members(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists verification_cycles_one_open_idx
  on public.verification_cycles ((status))
  where status = 'open';

create index if not exists verification_cycles_status_idx
  on public.verification_cycles(status, due_at);

comment on table public.verification_cycles is 'Semester verification cycles that hard-gate active members in the app until they submit profile verification.';
comment on column public.verification_cycles.required_fields is 'Member-editable fields required to unlock the hard gate.';
comment on column public.verification_cycles.optional_review_fields is 'Visible review signals that do not block member completion.';

create table if not exists public.member_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.verification_cycles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'not_started' check (status in (
    'not_started',
    'in_progress',
    'submitted',
    'approved',
    'needs_changes',
    'exempted',
    'temporarily_unlocked'
  )),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  draft_saved_at timestamptz,
  submitted_at timestamptz,
  approved_by uuid references public.members(id),
  approved_at timestamptz,
  exempted_by uuid references public.members(id),
  exempted_at timestamptz,
  exemption_reason text,
  missing_required_fields text[] not null default '{}',
  optional_review_flags text[] not null default '{}',
  changed_fields text[] not null default '{}',
  confirmed_fields text[] not null default '{}',
  correction_notes text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, member_id)
);

create index if not exists member_verification_submissions_cycle_status_idx
  on public.member_verification_submissions(cycle_id, status, submitted_at);

create index if not exists member_verification_submissions_member_idx
  on public.member_verification_submissions(member_id, created_at desc);

comment on table public.member_verification_submissions is 'Per-member progress and audit state for semester verification cycles.';
comment on column public.member_verification_submissions.snapshot is 'Profile values captured when the member submits the verification cycle.';

drop trigger if exists verification_cycles_touch on public.verification_cycles;
create trigger verification_cycles_touch before update on public.verification_cycles
for each row execute function public.touch_updated_at();

drop trigger if exists member_verification_submissions_touch on public.member_verification_submissions;
create trigger member_verification_submissions_touch before update on public.member_verification_submissions
for each row execute function public.touch_updated_at();

create or replace function public.check_member_verification_submission_write()
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
    from public.verification_cycles vc
    where vc.id = new.cycle_id
      and vc.status = 'open'
  ) into active_cycle;

  if not active_cycle then
    raise exception 'Verification cycle is not open.';
  end if;

  if new.member_id is distinct from public.current_member_id() then
    raise exception 'You can only update your own verification submission.';
  end if;

  if new.status not in ('in_progress', 'submitted') then
    raise exception 'Members can only save or submit their own verification.';
  end if;

  if new.approved_by is not null
    or new.approved_at is not null
    or new.exempted_by is not null
    or new.exempted_at is not null
    or new.exemption_reason is not null then
    raise exception 'Members cannot approve or exempt verification submissions.';
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('approved', 'exempted') then
      raise exception 'Approved or exempted verification submissions are locked.';
    end if;
  end if;

  if new.first_seen_at is null then
    if tg_op = 'UPDATE' then
      new.first_seen_at := coalesce(old.first_seen_at, now());
    else
      new.first_seen_at := now();
    end if;
  end if;

  new.last_seen_at := now();

  if new.status = 'in_progress' then
    new.draft_saved_at := now();
  end if;

  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists member_verification_submissions_member_guard on public.member_verification_submissions;
create trigger member_verification_submissions_member_guard
before insert or update on public.member_verification_submissions
for each row execute function public.check_member_verification_submission_write();

alter table public.verification_cycles enable row level security;
alter table public.member_verification_submissions enable row level security;

drop policy if exists verification_cycles_select_relevant on public.verification_cycles;
create policy verification_cycles_select_relevant
  on public.verification_cycles
  for select
  to authenticated
  using (status = 'open' or public.has_position(array['president', 'secretary']));

drop policy if exists verification_cycles_manage_secretary on public.verification_cycles;
create policy verification_cycles_manage_secretary
  on public.verification_cycles
  for all
  to authenticated
  using (public.has_position(array['president', 'secretary']))
  with check (public.has_position(array['president', 'secretary']));

drop policy if exists member_verification_submissions_select_own_or_secretary on public.member_verification_submissions;
create policy member_verification_submissions_select_own_or_secretary
  on public.member_verification_submissions
  for select
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists member_verification_submissions_insert_own_or_secretary on public.member_verification_submissions;
create policy member_verification_submissions_insert_own_or_secretary
  on public.member_verification_submissions
  for insert
  to authenticated
  with check (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists member_verification_submissions_update_own_or_secretary on public.member_verification_submissions;
create policy member_verification_submissions_update_own_or_secretary
  on public.member_verification_submissions
  for update
  to authenticated
  using (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']))
  with check (member_id = public.current_member_id() or public.has_position(array['president', 'secretary']));

drop policy if exists member_verification_submissions_delete_secretary on public.member_verification_submissions;
create policy member_verification_submissions_delete_secretary
  on public.member_verification_submissions
  for delete
  to authenticated
  using (public.has_position(array['president', 'secretary']));

drop policy if exists member_guardian_contacts_select_self on public.member_guardian_contacts;
create policy member_guardian_contacts_select_self
  on public.member_guardian_contacts
  for select
  to authenticated
  using (member_id = public.current_member_id());

drop policy if exists member_guardian_contacts_write_self on public.member_guardian_contacts;
create policy member_guardian_contacts_write_self
  on public.member_guardian_contacts
  for all
  to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

drop view if exists public.member_verification_self_profiles;

create view public.member_verification_self_profiles
with (security_invoker = true)
as
select
  m.id,
  m.google_email,
  m.personal_email,
  m.suid,
  m.legal_first_name,
  m.legal_last_name,
  m.preferred_name,
  m.phone,
  m.status,
  m.graduation_year,
  m.expected_graduation_term,
  coalesce(m.school, m.college) as school,
  m.college,
  m.major,
  m.local_address,
  m.campus_housing,
  m.home_city,
  m.home_state,
  m.instagram,
  m.snapchat,
  m.linkedin,
  m.avatar_url,
  m.bio,
  m.tshirt_size,
  m.hoodie_size,
  m.parent_outreach_consent,
  exists (
    select 1
    from public.member_guardian_contacts mgc
    where mgc.member_id = m.id
  ) as has_parent_guardian_contact,
  exists (
    select 1
    from public.emergency_contacts ec
    where ec.member_id = m.id
  ) as has_emergency_contact,
  m.updated_at
from public.members m
where m.id = public.current_member_id();

drop view if exists public.member_verification_gate_status;

create view public.member_verification_gate_status
with (security_invoker = true)
as
select
  vc.id as cycle_id,
  vc.term_label,
  vc.status as cycle_status,
  vc.gate_mode,
  vc.due_at,
  vc.required_fields,
  vc.optional_review_fields,
  m.id as member_id,
  coalesce(mvs.status, 'not_started') as submission_status,
  mvs.id as submission_id,
  mvs.first_seen_at,
  mvs.last_seen_at,
  mvs.draft_saved_at,
  mvs.submitted_at,
  mvs.approved_at,
  mvs.exempted_at,
  coalesce(mvs.missing_required_fields, array_remove(array[
    case when nullif(trim(coalesce(m.personal_email, '')), '') is null then 'personal_email' end,
    case when nullif(trim(coalesce(m.phone, '')), '') is null then 'phone' end,
    case when m.graduation_year is null then 'graduation_year' end,
    case when nullif(trim(coalesce(m.expected_graduation_term, '')), '') is null then 'expected_graduation_term' end,
    case when nullif(trim(coalesce(m.school, m.college, '')), '') is null then 'school' end,
    case when nullif(trim(coalesce(m.major, '')), '') is null then 'major' end,
    case when nullif(trim(coalesce(m.local_address, '')), '') is null then 'local_address' end,
    case when nullif(trim(coalesce(m.campus_housing, '')), '') is null then 'campus_housing' end,
    case when nullif(trim(coalesce(m.home_city, '')), '') is null then 'home_city' end,
    case when nullif(trim(coalesce(m.home_state, '')), '') is null then 'home_state' end,
    case when nullif(trim(coalesce(m.tshirt_size, '')), '') is null then 'tshirt_size' end,
    case when nullif(trim(coalesce(m.hoodie_size, '')), '') is null then 'hoodie_size' end
  ], null)) as missing_required_fields,
  coalesce(mvs.optional_review_flags, array_remove(array[
    case when not exists (
      select 1 from public.member_guardian_contacts mgc where mgc.member_id = m.id
    ) then 'parent_guardian_contact' end,
    case when not exists (
      select 1 from public.emergency_contacts ec where ec.member_id = m.id
    ) then 'emergency_contact' end,
    case when not coalesce(m.parent_outreach_consent, false) then 'parent_outreach_consent' end
  ], null)) as optional_review_flags,
  vc.status = 'open'
    and m.status::text = any(vc.required_member_statuses)
    and coalesce(mvs.status, 'not_started') not in ('submitted', 'approved', 'exempted', 'temporarily_unlocked') as is_gate_required,
  coalesce(mvs.status, 'not_started') in ('submitted', 'approved', 'exempted', 'temporarily_unlocked') as is_complete
from public.verification_cycles vc
join public.members m
  on m.id = public.current_member_id()
left join public.member_verification_submissions mvs
  on mvs.cycle_id = vc.id
 and mvs.member_id = m.id
where vc.status = 'open'
  and m.status::text = any(vc.required_member_statuses);

grant select, insert, update, delete on public.verification_cycles to authenticated;
grant select, insert, update, delete on public.member_verification_submissions to authenticated;
grant select on public.member_verification_self_profiles to authenticated;
grant select on public.member_verification_gate_status to authenticated;

notify pgrst, 'reload schema';
