-- Make Parent/Guardian 1 the required family contact in semester verification.
-- Emergency contacts remain available to Secretary/President registry users, but
-- members are no longer asked to maintain a separate emergency contact in the
-- semester verification gate.

alter table public.verification_cycles
  alter column required_fields set default array[
    'personal_email',
    'phone',
    'graduation_year',
    'expected_graduation_term',
    'school',
    'major',
    'housing_type',
    'home_city',
    'home_state',
    'tshirt_size',
    'hoodie_size',
    'guardian_1_first_name',
    'guardian_1_last_name',
    'guardian_1_relationship',
    'guardian_1_phone',
    'guardian_1_email'
  ],
  alter column optional_review_fields set default array[
    'parent_outreach_consent'
  ];

update public.verification_cycles
set
  required_fields = array[
    'personal_email',
    'phone',
    'graduation_year',
    'expected_graduation_term',
    'school',
    'major',
    'housing_type',
    'home_city',
    'home_state',
    'tshirt_size',
    'hoodie_size',
    'guardian_1_first_name',
    'guardian_1_last_name',
    'guardian_1_relationship',
    'guardian_1_phone',
    'guardian_1_email'
  ],
  optional_review_fields = array[
    'parent_outreach_consent'
  ]
where status in ('draft', 'open');

create or replace view public.member_secretary_profiles
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
  m.pledge_class,
  m.initiation_date,
  m.graduation_year,
  m.expected_graduation_term,
  coalesce(m.school, m.college) as school,
  m.college,
  m.major,
  m.birthday_month,
  m.birthday_day,
  m.housing_type,
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
  active_status.status_type as current_status_type,
  active_status.label as current_status_label,
  active_status.start_term as current_status_start_term,
  active_status.end_term as current_status_end_term,
  coalesce(active_roles.position_names, '{}') as active_position_names,
  (
    coalesce(m.parent_outreach_consent, false)
    or coalesce(guardian_one.outreach_consent, false)
    or coalesce(guardian_two.outreach_consent, false)
  ) as parent_outreach_consent,
  m.last_verified_at,
  m.last_chased_at,
  guardian_one.contact_name as guardian_1_name,
  guardian_one.relationship as guardian_1_relationship,
  guardian_one.phone as guardian_1_phone,
  guardian_one.email as guardian_1_email,
  guardian_two.contact_name as guardian_2_name,
  guardian_two.relationship as guardian_2_relationship,
  guardian_two.phone as guardian_2_phone,
  guardian_two.email as guardian_2_email,
  primary_emergency.contact_name as emergency_contact_name,
  primary_emergency.relationship as emergency_contact_relationship,
  primary_emergency.phone as emergency_contact_phone,
  primary_emergency.email as emergency_contact_email,
  primary_emergency.same_as_guardian as emergency_contact_same_as_parent,
  missing_required.fields as missing_required_fields,
  cardinality(missing_required.fields) as missing_required_field_count,
  m.created_at,
  m.updated_at
from public.members m
left join lateral (
  select
    mgc.id,
    mgc.first_name,
    mgc.last_name,
    coalesce(nullif(trim(concat_ws(' ', mgc.first_name, mgc.last_name)), ''), mgc.contact_name) as contact_name,
    mgc.relationship,
    mgc.phone,
    mgc.email,
    mgc.outreach_consent
  from public.member_guardian_contacts mgc
  where mgc.member_id = m.id
    and mgc.contact_order = 1
  order by mgc.created_at asc
  limit 1
) guardian_one on true
left join lateral (
  select
    mgc.id,
    mgc.first_name,
    mgc.last_name,
    coalesce(nullif(trim(concat_ws(' ', mgc.first_name, mgc.last_name)), ''), mgc.contact_name) as contact_name,
    mgc.relationship,
    mgc.phone,
    mgc.email,
    mgc.outreach_consent
  from public.member_guardian_contacts mgc
  where mgc.member_id = m.id
    and mgc.contact_order = 2
  order by mgc.created_at asc
  limit 1
) guardian_two on true
left join lateral (
  select
    ec.id,
    coalesce(nullif(trim(concat_ws(' ', ec.first_name, ec.last_name)), ''), ec.contact_name) as contact_name,
    ec.relationship,
    ec.phone,
    ec.email,
    ec.same_as_guardian
  from public.emergency_contacts ec
  where ec.member_id = m.id
  order by ec.is_primary desc, ec.created_at asc
  limit 1
) primary_emergency on true
left join lateral (
  select
    msp.status_type,
    msp.label,
    msp.start_term,
    msp.end_term
  from public.member_status_periods msp
  where msp.member_id = m.id
    and msp.status_type = 'study_abroad'
    and (msp.starts_on is null or msp.starts_on <= current_date)
    and (msp.ends_on is null or msp.ends_on >= current_date)
  order by msp.starts_on nulls last, msp.created_at desc
  limit 1
) active_status on true
left join lateral (
  select array_agg(p.display_name order by p.sort_order, p.display_name) as position_names
  from public.member_positions mp
  join public.positions p on p.id = mp.position_id
  where mp.member_id = m.id
    and mp.removed_at is null
) active_roles on true
left join lateral (
  select array_remove(array[
    case when nullif(trim(m.suid), '') is null then 'suid' end,
    case when nullif(trim(m.legal_first_name), '') is null then 'legal_first_name' end,
    case when nullif(trim(m.legal_last_name), '') is null then 'legal_last_name' end,
    case when nullif(trim(m.google_email), '') is null then 'google_email' end,
    case when nullif(trim(coalesce(m.personal_email, '')), '') is null then 'personal_email' end,
    case when nullif(trim(coalesce(m.phone, '')), '') is null then 'phone' end,
    case when m.status is null then 'status' end,
    case when nullif(trim(coalesce(m.pledge_class, '')), '') is null then 'pledge_class' end,
    case when m.initiation_date is null then 'initiation_date' end,
    case when m.graduation_year is null then 'graduation_year' end,
    case when nullif(trim(coalesce(m.expected_graduation_term, '')), '') is null then 'expected_graduation_term' end,
    case when nullif(trim(coalesce(m.school, m.college, '')), '') is null then 'school' end,
    case when nullif(trim(coalesce(m.major, '')), '') is null then 'major' end,
    case when nullif(trim(coalesce(m.housing_type, '')), '') is null then 'housing_type' end,
    case when m.housing_type = 'off_campus' and nullif(trim(coalesce(m.local_address, '')), '') is null then 'local_address' end,
    case when m.housing_type in ('on_campus', 'chapter_housing') and nullif(trim(coalesce(m.campus_housing, '')), '') is null then 'campus_housing' end,
    case when nullif(trim(coalesce(m.home_city, '')), '') is null then 'home_city' end,
    case when nullif(trim(coalesce(m.home_state, '')), '') is null then 'home_state' end,
    case when nullif(trim(coalesce(m.tshirt_size, '')), '') is null then 'tshirt_size' end,
    case when nullif(trim(coalesce(m.hoodie_size, '')), '') is null then 'hoodie_size' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.first_name, '')), '') is null then 'guardian_1_first_name' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.last_name, '')), '') is null then 'guardian_1_last_name' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.relationship, '')), '') is null then 'guardian_1_relationship' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.phone, '')), '') is null then 'guardian_1_phone' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.email, '')), '') is null then 'guardian_1_email' end
  ], null) as fields
) missing_required on true
where public.has_position(array['president', 'secretary']);

create or replace view public.member_verification_gate_status
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
  case
    when coalesce(mvs.status, 'not_started') in ('submitted', 'approved', 'exempted', 'temporarily_unlocked')
      then array_remove(array_remove(coalesce(mvs.missing_required_fields, missing_required.fields), 'parent_guardian_contact'), 'emergency_contact')
    else missing_required.fields
  end as missing_required_fields,
  case
    when coalesce(mvs.status, 'not_started') in ('submitted', 'approved', 'exempted', 'temporarily_unlocked')
      then array_remove(array_remove(coalesce(mvs.optional_review_flags, optional_review.fields), 'parent_guardian_contact'), 'emergency_contact')
    else optional_review.fields
  end as optional_review_flags,
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
left join lateral (
  select
    mgc.id,
    mgc.first_name,
    mgc.last_name,
    mgc.relationship,
    mgc.phone,
    mgc.email
  from public.member_guardian_contacts mgc
  where mgc.member_id = m.id
    and mgc.contact_order = 1
  order by mgc.created_at asc
  limit 1
) guardian_one on true
left join lateral (
  select array_remove(array[
    case when nullif(trim(coalesce(m.personal_email, '')), '') is null then 'personal_email' end,
    case when nullif(trim(coalesce(m.phone, '')), '') is null then 'phone' end,
    case when m.graduation_year is null then 'graduation_year' end,
    case when nullif(trim(coalesce(m.expected_graduation_term, '')), '') is null then 'expected_graduation_term' end,
    case when nullif(trim(coalesce(m.school, m.college, '')), '') is null then 'school' end,
    case when nullif(trim(coalesce(m.major, '')), '') is null then 'major' end,
    case when nullif(trim(coalesce(m.housing_type, '')), '') is null then 'housing_type' end,
    case when m.housing_type = 'off_campus' and nullif(trim(coalesce(m.local_address, '')), '') is null then 'local_address' end,
    case when m.housing_type in ('on_campus', 'chapter_housing') and nullif(trim(coalesce(m.campus_housing, '')), '') is null then 'campus_housing' end,
    case when nullif(trim(coalesce(m.home_city, '')), '') is null then 'home_city' end,
    case when nullif(trim(coalesce(m.home_state, '')), '') is null then 'home_state' end,
    case when nullif(trim(coalesce(m.tshirt_size, '')), '') is null then 'tshirt_size' end,
    case when nullif(trim(coalesce(m.hoodie_size, '')), '') is null then 'hoodie_size' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.first_name, '')), '') is null then 'guardian_1_first_name' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.last_name, '')), '') is null then 'guardian_1_last_name' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.relationship, '')), '') is null then 'guardian_1_relationship' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.phone, '')), '') is null then 'guardian_1_phone' end,
    case when guardian_one.id is null or nullif(trim(coalesce(guardian_one.email, '')), '') is null then 'guardian_1_email' end
  ], null) as fields
) missing_required on true
left join lateral (
  select array_remove(array[
    case when not (
      coalesce(m.parent_outreach_consent, false)
      or exists (
        select 1
        from public.member_guardian_contacts mgc
        where mgc.member_id = m.id
          and mgc.outreach_consent
      )
    ) then 'parent_outreach_consent' end
  ], null) as fields
) optional_review on true
where vc.status = 'open'
  and m.status::text = any(vc.required_member_statuses);

notify pgrst, 'reload schema';
