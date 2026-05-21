create extension if not exists "pgcrypto";

create type member_status as enum ('active', 'inactive', 'suspended', 'new_member', 'alumni');
create type event_type as enum ('chapter_meeting', 'committee', 'social', 'philanthropy', 'recruitment', 'study_hours', 'other');
create type event_category as enum ('mandatory', 'optional');
create type attendance_status as enum ('on_time', 'late');
create type attendance_method as enum ('qr', 'manual', 'csv');
create type excusal_status as enum ('pending', 'approved', 'denied');
create type dues_method as enum ('venmo', 'check', 'cash', 'zelle', 'other');
create type tier_level as enum ('gold', 'garnet', 'white', 'ineligible');
create type form_section_status as enum ('pending', 'accepted', 'rejected');
create type question_type as enum ('short_answer', 'multiple_choice', 'checkbox');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  google_email text not null unique,
  suid text not null unique check (suid ~ '^[0-9]{6}$'),
  legal_first_name text not null,
  legal_last_name text not null,
  preferred_name text,
  personal_email text,
  graduation_year integer not null check (graduation_year between 2020 and 2040),
  major text not null,
  phone text,
  dorm_location text,
  room text,
  tshirt_size text,
  instagram text,
  snapchat text,
  linkedin text,
  venmo text,
  parent_outreach_consent boolean not null default false,
  status member_status not null default 'active',
  college text,
  membership_review_initiated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  contact_name text not null,
  relationship text not null,
  phone text not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index emergency_contacts_member_idx on public.emergency_contacts(member_id);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  position_group text not null,
  supervised_by uuid references public.positions(id),
  is_active boolean not null default true,
  sort_order integer not null default 100
);

create table public.member_positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  position_id uuid not null references public.positions(id),
  semester text not null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (member_id, position_id, semester, assigned_at)
);
create index member_positions_active_idx on public.member_positions(member_id, position_id) where removed_at is null;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type event_type not null default 'chapter_meeting',
  category event_category not null default 'optional',
  event_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid references public.members(id),
  archived_at timestamptz,
  check_in_open boolean not null default false,
  check_in_token uuid,
  late_cutoff_time timestamptz,
  expected_count integer check (expected_count is null or expected_count >= 0),
  officer_notes text,
  allow_excusals boolean not null default true,
  qr_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  status attendance_status not null,
  method attendance_method not null,
  logged_by uuid references public.members(id),
  override_reason text,
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);
create index event_attendees_member_idx on public.event_attendees(member_id);
create index event_attendees_event_status_idx on public.event_attendees(event_id, status);

create table public.excusals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  reason text not null,
  supporting_note text,
  status excusal_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.members(id),
  reviewed_at timestamptz,
  review_note text,
  unique (member_id, event_id)
);
create index excusals_member_status_idx on public.excusals(member_id, status);

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  semester text not null,
  amount_paid numeric(10,2) not null check (amount_paid >= 0),
  paid_at date not null,
  method dues_method not null default 'venmo',
  on_time boolean not null default false,
  treasurer_notes text,
  logged_by uuid references public.members(id),
  created_at timestamptz not null default now()
);
create index dues_payments_member_semester_idx on public.dues_payments(member_id, semester);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid references public.members(id),
  source_name text,
  total_rows integer not null default 0,
  auto_matched_rows integer not null default 0,
  review_required_rows integer not null default 0,
  imported_rows integer not null default 0,
  created_at timestamptz not null default now()
);
create index import_batches_event_idx on public.import_batches(event_id, created_at desc);

create table public.import_review_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  raw_name text not null,
  matched_member_id uuid references public.members(id),
  confidence text not null,
  score numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index import_review_rows_batch_idx on public.import_review_rows(batch_id);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  week_number integer not null,
  semester text not null,
  chapter_event_id uuid references public.events(id),
  deadline timestamptz not null,
  published_at timestamptz,
  created_by uuid references public.members(id),
  created_at timestamptz not null default now(),
  unique (semester, week_number)
);

create table public.form_sections (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.forms(id) on delete cascade,
  submitted_by_member_id uuid references public.members(id),
  submitted_by_position_id uuid references public.positions(id),
  title text not null,
  content jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  status form_section_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  secretary_notes text
);

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (form_id, member_id)
);

create table public.form_answers (
  id uuid primary key default gen_random_uuid(),
  form_response_id uuid not null references public.form_responses(id) on delete cascade,
  question_id text not null,
  answer jsonb not null,
  member_id uuid references public.members(id)
);

create table public.tier_config (
  id uuid primary key default gen_random_uuid(),
  semester text not null unique,
  gold_attendance_min_pct numeric not null default 0.90,
  garnet_attendance_min_pct numeric not null default 0.75,
  white_attendance_min_pct numeric not null default 0.55,
  gold_form_min_pct numeric not null default 0.95,
  garnet_form_min_pct numeric not null default 0.80,
  gold_score_min numeric not null default 90,
  garnet_score_min numeric not null default 75,
  white_score_min numeric not null default 55,
  dues_required_amount numeric(10,2) not null default 750,
  dues_rebate_deadline date not null,
  late_attendance_weight numeric not null default 0.5,
  dimension_weights jsonb not null default '{"mandatory_attendance":40,"forms":20,"dues":20,"officer_bonus":10,"gpa":10}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tier_snapshots (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  semester text not null,
  tier tier_level not null,
  score_based_tier tier_level not null,
  weighted_score numeric not null,
  dimension_breakdown jsonb not null default '{}'::jsonb,
  calculated_by uuid references public.members(id)
);
create index tier_snapshots_member_latest_idx on public.tier_snapshots(member_id, calculated_at desc);

create table public.ineligible_overrides (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  semester text not null,
  week_number integer not null,
  reason text not null,
  overridden_by uuid not null references public.members(id),
  created_at timestamptz not null default now()
);

create table public.ineligible_list_publications (
  id uuid primary key default gen_random_uuid(),
  semester text not null,
  week_number integer not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.members(id),
  member_ids_at_time jsonb not null,
  flare_content_generated text not null
);

create table public.gpa_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  semester text not null,
  self_reported_gpa numeric(3,2),
  official_gpa numeric(3,2),
  college text,
  status text not null default 'none',
  effective_gpa numeric(3,2) generated always as (coalesce(official_gpa, self_reported_gpa)) stored,
  created_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  location_verified boolean not null default false,
  check_in_method text not null default 'manual'
);

create table public.chairman_reports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.members(id),
  position_id uuid references public.positions(id),
  semester text not null,
  week_number integer not null,
  submitted_at timestamptz,
  status text not null default 'draft',
  content jsonb not null default '{}'::jsonb
);

create table public.event_proposals (
  id uuid primary key default gen_random_uuid(),
  proposed_by uuid references public.members(id),
  name text not null,
  event_date date not null,
  status text not null default 'pending',
  details jsonb not null default '{}'::jsonb
);

create table public.budget_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id),
  requested_by uuid references public.members(id),
  amount numeric(10,2) not null,
  status text not null default 'pending',
  details jsonb not null default '{}'::jsonb
);

create table public.compliance_deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_at timestamptz not null,
  responsible_position_id uuid references public.positions(id),
  status text not null default 'open'
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_touch before update on public.members
for each row execute function public.touch_updated_at();

create trigger tier_config_touch before update on public.tier_config
for each row execute function public.touch_updated_at();

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.user_positions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(p.slug), array[]::text[])
  from public.member_positions mp
  join public.positions p on p.id = mp.position_id
  where mp.member_id = public.current_member_id()
    and mp.removed_at is null
    and p.is_active
$$;

create or replace function public.has_position(slugs text[])
returns boolean
language sql
stable
as $$
  select public.user_positions() && slugs
$$;

create or replace function public.is_officer()
returns boolean
language sql
stable
as $$
  select public.has_position(array[
    'president','ivp','evp','secretary','treasurer','saa','recruitment_chairman',
    'vpmd','hs_officer','past_president','housing_manager','scholarship_chairman',
    'assistant_treasurer'
  ])
$$;

create or replace function public.can_manage_events()
returns boolean
language sql
stable
as $$
  select public.has_position(array[
    'president','ivp','evp','secretary','saa','recruitment_chairman',
    'vpmd','hs_officer','past_president','housing_manager','scholarship_chairman'
  ])
$$;

create or replace function public.member_review_initiated(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select m.membership_review_initiated from public.members m where m.id = target_member_id), false)
$$;

alter table public.members enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.positions enable row level security;
alter table public.member_positions enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.excusals enable row level security;
alter table public.dues_payments enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_review_rows enable row level security;
alter table public.forms enable row level security;
alter table public.form_sections enable row level security;
alter table public.form_responses enable row level security;
alter table public.form_answers enable row level security;
alter table public.tier_config enable row level security;
alter table public.tier_snapshots enable row level security;
alter table public.ineligible_overrides enable row level security;
alter table public.ineligible_list_publications enable row level security;
alter table public.gpa_records enable row level security;
alter table public.study_sessions enable row level security;
alter table public.chairman_reports enable row level security;
alter table public.event_proposals enable row level security;
alter table public.budget_draws enable row level security;
alter table public.compliance_deadlines enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.positions to anon;
grant usage, select on all sequences in schema public to authenticated;

create policy members_select on public.members for select to authenticated
using (id = public.current_member_id() or public.has_position(array['president','secretary']));
create policy members_insert_self on public.members for insert to authenticated
with check (auth_user_id = auth.uid());
create policy members_update_admin_or_self_limited on public.members for update to authenticated
using (id = public.current_member_id() or public.has_position(array['president','secretary']))
with check (id = public.current_member_id() or public.has_position(array['president','secretary']));

create policy emergency_contacts_select on public.emergency_contacts for select to authenticated
using (member_id = public.current_member_id() or public.has_position(array['president','secretary']));
create policy emergency_contacts_write_self_or_admin on public.emergency_contacts for all to authenticated
using (member_id = public.current_member_id() or public.has_position(array['president','secretary']))
with check (member_id = public.current_member_id() or public.has_position(array['president','secretary']));

create policy positions_select_all on public.positions for select using (true);
create policy positions_write_admin on public.positions for all to authenticated
using (public.has_position(array['president','secretary']))
with check (public.has_position(array['president','secretary']));

create policy member_positions_select_admin on public.member_positions for select to authenticated
using (member_id = public.current_member_id() or public.is_officer());
create policy member_positions_write_admin on public.member_positions for all to authenticated
using (public.has_position(array['president','secretary']))
with check (public.has_position(array['president','secretary']));

create policy events_select_members on public.events for select to authenticated using (true);
create policy events_write_officers on public.events for all to authenticated
using (public.can_manage_events()) with check (public.can_manage_events());

create policy attendees_select on public.event_attendees for select to authenticated
using (member_id = public.current_member_id() or public.is_officer());
create policy attendees_insert on public.event_attendees for insert to authenticated
with check (member_id = public.current_member_id() or public.is_officer());
create policy attendees_update_officers on public.event_attendees for update to authenticated
using (public.is_officer()) with check (public.is_officer());

create policy excusals_select on public.excusals for select to authenticated
using (member_id = public.current_member_id() or public.has_position(array['president','secretary','saa']));
create policy excusals_insert_self on public.excusals for insert to authenticated
with check (member_id = public.current_member_id());
create policy excusals_review on public.excusals for update to authenticated
using (public.has_position(array['president','saa'])) with check (public.has_position(array['president','saa']));

create policy dues_select on public.dues_payments for select to authenticated
using (member_id = public.current_member_id() or public.has_position(array['president','secretary','treasurer','assistant_treasurer']));
create policy dues_write_treasury on public.dues_payments for all to authenticated
using (public.has_position(array['treasurer','assistant_treasurer']))
with check (public.has_position(array['treasurer','assistant_treasurer']));

create policy import_batches_select_officers on public.import_batches for select to authenticated using (public.is_officer());
create policy import_batches_write_secretary on public.import_batches for all to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));
create policy import_review_rows_select_officers on public.import_review_rows for select to authenticated
using (
  exists (
    select 1 from public.import_batches batch
    where batch.id = import_review_rows.batch_id
  )
);
create policy import_review_rows_write_secretary on public.import_review_rows for all to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));

create policy forms_select on public.forms for select to authenticated using (published_at is not null or public.is_officer());
create policy forms_write_secretary on public.forms for all to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));

create policy sections_select on public.form_sections for select to authenticated
using (
  status = 'accepted'
  or submitted_by_member_id = public.current_member_id()
  or public.has_position(array['president','secretary'])
);
create policy sections_insert_chairman on public.form_sections for insert to authenticated
with check (submitted_by_member_id = public.current_member_id() and public.is_officer());
create policy sections_update_secretary on public.form_sections for update to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));

create policy responses_select on public.form_responses for select to authenticated
using (member_id = public.current_member_id() or public.is_officer());
create policy responses_insert_self on public.form_responses for insert to authenticated
with check (member_id = public.current_member_id());

create policy answers_select on public.form_answers for select to authenticated
using (
  member_id is null
  or member_id = public.current_member_id()
  or public.has_position(array['president','secretary'])
  or public.is_officer()
);
create policy answers_insert_self_or_anonymous on public.form_answers for insert to authenticated
with check (member_id is null or member_id = public.current_member_id());

create policy tier_config_select on public.tier_config for select to authenticated using (true);
create policy tier_config_write_admin on public.tier_config for all to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));

create policy tier_snapshots_select on public.tier_snapshots for select to authenticated
using (member_id = public.current_member_id() or public.is_officer());
create policy tier_snapshots_insert_admin on public.tier_snapshots for insert to authenticated
with check (public.has_position(array['president','secretary']));

create policy ineligible_select_officers on public.ineligible_overrides for select to authenticated using (public.is_officer());
create policy ineligible_write_ivp on public.ineligible_overrides for all to authenticated
using (public.has_position(array['president','ivp','secretary'])) with check (public.has_position(array['president','ivp','secretary']));
create policy publications_select on public.ineligible_list_publications for select to authenticated using (public.is_officer());
create policy publications_write_secretary on public.ineligible_list_publications for all to authenticated
using (public.has_position(array['president','secretary'])) with check (public.has_position(array['president','secretary']));

create policy gpa_select on public.gpa_records for select to authenticated
using (
  member_id = public.current_member_id()
  or public.has_position(array['scholarship_chairman'])
  or (public.has_position(array['saa']) and public.member_review_initiated(gpa_records.member_id))
);
create policy gpa_write_scholarship on public.gpa_records for all to authenticated
using (public.has_position(array['scholarship_chairman'])) with check (public.has_position(array['scholarship_chairman']));

create policy own_or_officer_select_study on public.study_sessions for select to authenticated
using (member_id = public.current_member_id() or public.has_position(array['scholarship_chairman','president','secretary']));
create policy chairman_reports_policy on public.chairman_reports for all to authenticated
using (submitted_by = public.current_member_id() or public.is_officer()) with check (submitted_by = public.current_member_id() or public.is_officer());
create policy proposals_policy on public.event_proposals for all to authenticated
using (proposed_by = public.current_member_id() or public.is_officer()) with check (proposed_by = public.current_member_id() or public.is_officer());
create policy budget_draws_policy on public.budget_draws for all to authenticated
using (requested_by = public.current_member_id() or public.has_position(array['president','treasurer','assistant_treasurer'])) with check (requested_by = public.current_member_id() or public.has_position(array['president','treasurer','assistant_treasurer']));
create policy deadlines_policy on public.compliance_deadlines for all to authenticated
using (public.is_officer()) with check (public.is_officer());
;
