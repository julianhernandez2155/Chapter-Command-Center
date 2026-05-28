-- Normalize member/profile data and add safe write-time backstops.
-- SUID changed from the original prototype's 6-digit check to the 9-digit
-- Syracuse identifier used by current seed data. Existing dirty rows are
-- documented in profile_normalization_review instead of being destroyed.

create or replace function public.normalize_profile_text(value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(btrim(value), '\s+', ' ', 'g'), '')
$$;

create or replace function public.normalize_us_phone(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := public.normalize_profile_text(value);
  digits text;
begin
  if clean is null then
    return null;
  end if;

  if clean like '+%' then
    digits := regexp_replace(clean, '\D', '', 'g');
    if ('+' || digits) ~ '^\+[1-9][0-9]{7,14}$' then
      return '+' || digits;
    end if;
    return clean;
  end if;

  digits := regexp_replace(clean, '\D', '', 'g');
  if length(digits) = 10 then
    return '+1' || digits;
  end if;
  if length(digits) = 11 and left(digits, 1) = '1' then
    return '+' || digits;
  end if;

  return clean;
end;
$$;

create or replace function public.normalize_us_state(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := lower(public.normalize_profile_text(value));
begin
  if clean is null then
    return null;
  end if;

  return case clean
    when 'alabama' then 'AL' when 'al' then 'AL'
    when 'alaska' then 'AK' when 'ak' then 'AK'
    when 'arizona' then 'AZ' when 'az' then 'AZ'
    when 'arkansas' then 'AR' when 'ar' then 'AR'
    when 'california' then 'CA' when 'ca' then 'CA'
    when 'colorado' then 'CO' when 'co' then 'CO'
    when 'connecticut' then 'CT' when 'ct' then 'CT'
    when 'delaware' then 'DE' when 'de' then 'DE'
    when 'district of columbia' then 'DC' when 'dc' then 'DC'
    when 'florida' then 'FL' when 'fl' then 'FL'
    when 'georgia' then 'GA' when 'ga' then 'GA'
    when 'hawaii' then 'HI' when 'hi' then 'HI'
    when 'idaho' then 'ID' when 'id' then 'ID'
    when 'illinois' then 'IL' when 'il' then 'IL'
    when 'indiana' then 'IN' when 'in' then 'IN'
    when 'iowa' then 'IA' when 'ia' then 'IA'
    when 'kansas' then 'KS' when 'ks' then 'KS'
    when 'kentucky' then 'KY' when 'ky' then 'KY'
    when 'louisiana' then 'LA' when 'la' then 'LA'
    when 'maine' then 'ME' when 'me' then 'ME'
    when 'maryland' then 'MD' when 'md' then 'MD'
    when 'massachusetts' then 'MA' when 'ma' then 'MA'
    when 'michigan' then 'MI' when 'mi' then 'MI'
    when 'minnesota' then 'MN' when 'mn' then 'MN'
    when 'mississippi' then 'MS' when 'ms' then 'MS'
    when 'missouri' then 'MO' when 'mo' then 'MO'
    when 'montana' then 'MT' when 'mt' then 'MT'
    when 'nebraska' then 'NE' when 'ne' then 'NE'
    when 'nevada' then 'NV' when 'nv' then 'NV'
    when 'new hampshire' then 'NH' when 'nh' then 'NH'
    when 'new jersey' then 'NJ' when 'nj' then 'NJ'
    when 'new mexico' then 'NM' when 'nm' then 'NM'
    when 'new york' then 'NY' when 'ny' then 'NY'
    when 'north carolina' then 'NC' when 'nc' then 'NC'
    when 'north dakota' then 'ND' when 'nd' then 'ND'
    when 'ohio' then 'OH' when 'oh' then 'OH'
    when 'oklahoma' then 'OK' when 'ok' then 'OK'
    when 'oregon' then 'OR' when 'or' then 'OR'
    when 'pennsylvania' then 'PA' when 'pa' then 'PA'
    when 'rhode island' then 'RI' when 'ri' then 'RI'
    when 'south carolina' then 'SC' when 'sc' then 'SC'
    when 'south dakota' then 'SD' when 'sd' then 'SD'
    when 'tennessee' then 'TN' when 'tn' then 'TN'
    when 'texas' then 'TX' when 'tx' then 'TX'
    when 'utah' then 'UT' when 'ut' then 'UT'
    when 'vermont' then 'VT' when 'vt' then 'VT'
    when 'virginia' then 'VA' when 'va' then 'VA'
    when 'washington' then 'WA' when 'wa' then 'WA'
    when 'west virginia' then 'WV' when 'wv' then 'WV'
    when 'wisconsin' then 'WI' when 'wi' then 'WI'
    when 'wyoming' then 'WY' when 'wy' then 'WY'
    else upper(clean)
  end;
end;
$$;

create or replace function public.normalize_guardian_relationship(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := lower(replace(public.normalize_profile_text(value), ' / ', '/'));
begin
  if clean is null then
    return null;
  end if;

  return case clean
    when 'mother' then 'Mother'
    when 'mom' then 'Mother'
    when 'father' then 'Father'
    when 'dad' then 'Father'
    when 'guardian' then 'Guardian'
    when 'parent' then 'Guardian'
    when 'parents' then 'Guardian'
    when 'parent/guardian' then 'Guardian'
    when 'stepmother' then 'Stepmother'
    when 'stepfather' then 'Stepfather'
    when 'grandparent' then 'Grandparent'
    when 'grandmother' then 'Grandparent'
    when 'grandfather' then 'Grandparent'
    when 'other' then 'Other'
    else public.normalize_profile_text(value)
  end;
end;
$$;

update public.members
set
  google_email = case
    when lower(public.normalize_profile_text(google_email)) like '%@g.syr.edu'
      then regexp_replace(lower(public.normalize_profile_text(google_email)), '@g\.syr\.edu$', '@syr.edu')
    else lower(public.normalize_profile_text(google_email))
  end,
  personal_email = lower(public.normalize_profile_text(personal_email)),
  suid = public.normalize_profile_text(suid),
  legal_first_name = public.normalize_profile_text(legal_first_name),
  legal_last_name = public.normalize_profile_text(legal_last_name),
  preferred_name = public.normalize_profile_text(preferred_name),
  school = public.normalize_profile_text(school),
  college = public.normalize_profile_text(college),
  major = public.normalize_profile_text(major),
  phone = public.normalize_us_phone(phone),
  local_address = public.normalize_profile_text(local_address),
  campus_housing = public.normalize_profile_text(campus_housing),
  home_city = public.normalize_profile_text(home_city),
  home_state = public.normalize_us_state(home_state),
  instagram = nullif(regexp_replace(regexp_replace(public.normalize_profile_text(instagram), '^https?://(www\.)?instagram\.com/', '', 'i'), '^@', ''), ''),
  snapchat = nullif(regexp_replace(regexp_replace(public.normalize_profile_text(snapchat), '^https?://(www\.)?snapchat\.com/add/', '', 'i'), '^@', ''), ''),
  linkedin = nullif(regexp_replace(regexp_replace(regexp_replace(public.normalize_profile_text(linkedin), '^https?://(www\.)?linkedin\.com/in/', '', 'i'), '^linkedin\.com/in/', '', 'i'), '/$', ''), ''),
  tshirt_size = upper(public.normalize_profile_text(tshirt_size)),
  hoodie_size = upper(public.normalize_profile_text(hoodie_size)),
  expected_graduation_term = case
    when public.normalize_profile_text(expected_graduation_term) ~* '^(spring|summer|fall|winter)(\s+[0-9]{4})?$'
      then initcap(lower(public.normalize_profile_text(expected_graduation_term)))
    else public.normalize_profile_text(expected_graduation_term)
  end
where true;

update public.members
set
  tshirt_size = case when tshirt_size = 'OTHER' then 'Other' else tshirt_size end,
  hoodie_size = case when hoodie_size = 'OTHER' then 'Other' else hoodie_size end
where tshirt_size = 'OTHER' or hoodie_size = 'OTHER';

update public.member_guardian_contacts
set
  first_name = public.normalize_profile_text(first_name),
  last_name = public.normalize_profile_text(last_name),
  contact_name = coalesce(
    public.normalize_profile_text(concat_ws(' ', first_name, last_name)),
    public.normalize_profile_text(contact_name),
    'Parent/Guardian'
  ),
  relationship = public.normalize_guardian_relationship(relationship),
  phone = public.normalize_us_phone(phone),
  email = lower(public.normalize_profile_text(email))
where true;

update public.emergency_contacts
set
  first_name = public.normalize_profile_text(first_name),
  last_name = public.normalize_profile_text(last_name),
  contact_name = coalesce(
    public.normalize_profile_text(concat_ws(' ', first_name, last_name)),
    public.normalize_profile_text(contact_name)
  ),
  relationship = public.normalize_profile_text(relationship),
  phone = public.normalize_us_phone(phone),
  email = lower(public.normalize_profile_text(email))
where true;

alter table public.members
  drop constraint if exists members_suid_check;

alter table public.members
  drop constraint if exists members_tshirt_size_check,
  drop constraint if exists members_hoodie_size_check,
  drop constraint if exists members_google_email_check,
  drop constraint if exists members_personal_email_check;

alter table public.member_guardian_contacts
  drop constraint if exists member_guardian_contacts_relationship_check,
  drop constraint if exists member_guardian_contacts_email_check;

alter table public.emergency_contacts
  drop constraint if exists emergency_contacts_email_check;

create or replace function public.enforce_member_profile_write_backstops()
returns trigger
language plpgsql
as $$
begin
  new.suid := public.normalize_profile_text(new.suid);
  if tg_op = 'INSERT' or new.suid is distinct from old.suid then
    if new.suid is null or new.suid !~ '^[0-9]{9}$' then
      raise exception 'SUID must be exactly 9 digits.';
    end if;
  end if;

  new.google_email := case
    when lower(public.normalize_profile_text(new.google_email)) like '%@g.syr.edu'
      then regexp_replace(lower(public.normalize_profile_text(new.google_email)), '@g\.syr\.edu$', '@syr.edu')
    else lower(public.normalize_profile_text(new.google_email))
  end;
  if new.google_email is null or new.google_email !~* '^[^[:space:]@]+@syr\.edu$' then
    raise exception 'School email must be a syr.edu address.';
  end if;

  new.personal_email := lower(public.normalize_profile_text(new.personal_email));
  if new.personal_email is not null and new.personal_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Personal email is invalid.';
  end if;

  new.legal_first_name := public.normalize_profile_text(new.legal_first_name);
  new.legal_last_name := public.normalize_profile_text(new.legal_last_name);
  new.preferred_name := public.normalize_profile_text(new.preferred_name);
  new.school := public.normalize_profile_text(new.school);
  new.college := public.normalize_profile_text(new.college);
  new.major := public.normalize_profile_text(new.major);
  new.phone := public.normalize_us_phone(new.phone);
  if new.phone is not null
    and new.phone !~ '^\+[1-9][0-9]{7,14}$'
    and (tg_op = 'INSERT' or public.normalize_us_phone(old.phone) is distinct from new.phone) then
    raise exception 'Phone number is invalid.';
  end if;

  new.local_address := public.normalize_profile_text(new.local_address);
  new.campus_housing := public.normalize_profile_text(new.campus_housing);
  new.home_city := public.normalize_profile_text(new.home_city);
  new.tshirt_size := case
    when upper(public.normalize_profile_text(new.tshirt_size)) = 'OTHER' then 'Other'
    else upper(public.normalize_profile_text(new.tshirt_size))
  end;
  new.hoodie_size := case
    when upper(public.normalize_profile_text(new.hoodie_size)) = 'OTHER' then 'Other'
    else upper(public.normalize_profile_text(new.hoodie_size))
  end;
  if new.tshirt_size is not null
    and new.tshirt_size not in ('S', 'M', 'L', 'XL', 'XXL', 'Other')
    and (tg_op = 'INSERT' or upper(public.normalize_profile_text(old.tshirt_size)) is distinct from new.tshirt_size) then
    raise exception 'T-shirt size must use a controlled value.';
  end if;
  if new.hoodie_size is not null
    and new.hoodie_size not in ('S', 'M', 'L', 'XL', 'XXL', 'Other')
    and (tg_op = 'INSERT' or upper(public.normalize_profile_text(old.hoodie_size)) is distinct from new.hoodie_size) then
    raise exception 'Hoodie size must use a controlled value.';
  end if;
  new.home_state := public.normalize_us_state(new.home_state);
  if new.home_state is not null
    and new.home_state !~ '^[A-Z]{2}$'
    and (tg_op = 'INSERT' or public.normalize_us_state(old.home_state) is distinct from new.home_state) then
    raise exception 'Home state must be a 2-letter state code.';
  end if;

  return new;
end;
$$;

drop trigger if exists members_profile_write_backstops on public.members;
create trigger members_profile_write_backstops
before insert or update on public.members
for each row execute function public.enforce_member_profile_write_backstops();

create or replace function public.enforce_guardian_contact_write_backstops()
returns trigger
language plpgsql
as $$
begin
  new.first_name := public.normalize_profile_text(new.first_name);
  new.last_name := public.normalize_profile_text(new.last_name);
  new.contact_name := coalesce(
    public.normalize_profile_text(concat_ws(' ', new.first_name, new.last_name)),
    public.normalize_profile_text(new.contact_name),
    'Parent/Guardian'
  );
  new.relationship := public.normalize_guardian_relationship(new.relationship);
  if new.relationship is not null and new.relationship not in ('Mother', 'Father', 'Guardian', 'Stepmother', 'Stepfather', 'Grandparent', 'Other') then
    raise exception 'Guardian relationship must use a controlled value.';
  end if;
  new.phone := public.normalize_us_phone(new.phone);
  if new.phone is not null
    and new.phone !~ '^\+[1-9][0-9]{7,14}$'
    and (tg_op = 'INSERT' or public.normalize_us_phone(old.phone) is distinct from new.phone) then
    raise exception 'Guardian phone number is invalid.';
  end if;
  new.email := lower(public.normalize_profile_text(new.email));
  if new.email is not null
    and new.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and (tg_op = 'INSERT' or lower(public.normalize_profile_text(old.email)) is distinct from new.email) then
    raise exception 'Guardian email is invalid.';
  end if;
  return new;
end;
$$;

drop trigger if exists member_guardian_contacts_write_backstops on public.member_guardian_contacts;
create trigger member_guardian_contacts_write_backstops
before insert or update on public.member_guardian_contacts
for each row execute function public.enforce_guardian_contact_write_backstops();

create or replace function public.enforce_emergency_contact_write_backstops()
returns trigger
language plpgsql
as $$
begin
  new.first_name := public.normalize_profile_text(new.first_name);
  new.last_name := public.normalize_profile_text(new.last_name);
  new.contact_name := coalesce(
    public.normalize_profile_text(concat_ws(' ', new.first_name, new.last_name)),
    public.normalize_profile_text(new.contact_name)
  );
  new.relationship := public.normalize_profile_text(new.relationship);
  new.phone := public.normalize_us_phone(new.phone);
  if new.phone is not null
    and new.phone !~ '^\+[1-9][0-9]{7,14}$'
    and (tg_op = 'INSERT' or public.normalize_us_phone(old.phone) is distinct from new.phone) then
    raise exception 'Emergency contact phone number is invalid.';
  end if;
  new.email := lower(public.normalize_profile_text(new.email));
  if new.email is not null
    and new.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and (tg_op = 'INSERT' or lower(public.normalize_profile_text(old.email)) is distinct from new.email) then
    raise exception 'Emergency contact email is invalid.';
  end if;
  return new;
end;
$$;

drop trigger if exists emergency_contacts_write_backstops on public.emergency_contacts;
create trigger emergency_contacts_write_backstops
before insert or update on public.emergency_contacts
for each row execute function public.enforce_emergency_contact_write_backstops();

create or replace view public.profile_normalization_review
with (security_invoker = true)
as
select
  'members' as source_table,
  id as source_id,
  array_remove(array[
    case when suid is null or suid !~ '^[0-9]{9}$' then 'suid_not_9_digits' end,
    case when google_email is null or google_email !~* '^[^[:space:]@]+@syr\.edu$' then 'school_email_not_syr_edu' end,
    case when phone is not null and phone !~ '^\+[1-9][0-9]{7,14}$' then 'phone_not_e164' end,
    case when home_state is not null and home_state !~ '^[A-Z]{2}$' then 'home_state_not_code' end
  ], null) as issues
from public.members
where public.has_position(array['president', 'secretary'])
  and (
    suid is null
    or suid !~ '^[0-9]{9}$'
    or google_email is null
    or google_email !~* '^[^[:space:]@]+@syr\.edu$'
    or (phone is not null and phone !~ '^\+[1-9][0-9]{7,14}$')
    or (home_state is not null and home_state !~ '^[A-Z]{2}$')
  )
union all
select
  'member_guardian_contacts' as source_table,
  id as source_id,
  array_remove(array[
    case when relationship is not null and relationship not in ('Mother', 'Father', 'Guardian', 'Stepmother', 'Stepfather', 'Grandparent', 'Other') then 'relationship_not_controlled' end,
    case when phone is not null and phone !~ '^\+[1-9][0-9]{7,14}$' then 'phone_not_e164' end,
    case when email is not null and email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then 'email_invalid' end
  ], null) as issues
from public.member_guardian_contacts
where public.has_position(array['president', 'secretary'])
  and (
    (relationship is not null and relationship not in ('Mother', 'Father', 'Guardian', 'Stepmother', 'Stepfather', 'Grandparent', 'Other'))
    or (phone is not null and phone !~ '^\+[1-9][0-9]{7,14}$')
    or (email is not null and email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  );

grant select on public.profile_normalization_review to authenticated;

comment on view public.profile_normalization_review is 'Officer review queue for profile rows that could not be safely normalized automatically.';

notify pgrst, 'reload schema';
