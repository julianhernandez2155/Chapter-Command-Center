import { supabase } from './supabase';
import {
  normalizeAddressText,
  normalizeApparelSize,
  normalizeEmail,
  normalizeGraduationYear,
  normalizeGuardianRelationship,
  normalizeHousingType,
  normalizeInstagram,
  normalizeLinkedIn,
  normalizeNullableText,
  normalizePhone,
  normalizeSnapchat,
  normalizeState,
  normalizeTerm
} from './normalizers';

export type SecretaryMemberStatus = 'active' | 'inactive' | 'suspended' | 'new_member' | 'alumni' | string;

export interface SecretaryMemberProfile {
  id: string;
  google_email: string;
  personal_email: string | null;
  suid: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  phone: string | null;
  status: SecretaryMemberStatus;
  pledge_class: string | null;
  initiation_date: string | null;
  graduation_year: number | null;
  expected_graduation_term: string | null;
  school: string | null;
  college: string | null;
  major: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  housing_type: string | null;
  local_address: string | null;
  campus_housing: string | null;
  home_city: string | null;
  home_state: string | null;
  instagram: string | null;
  snapchat: string | null;
  linkedin: string | null;
  avatar_url: string | null;
  bio: string | null;
  tshirt_size: string | null;
  hoodie_size: string | null;
  current_status_type: string | null;
  current_status_label: string | null;
  current_status_start_term: string | null;
  current_status_end_term: string | null;
  active_position_names: string[];
  parent_outreach_consent: boolean;
  last_verified_at: string | null;
  last_chased_at: string | null;
  guardian_1_name: string | null;
  guardian_1_relationship: string | null;
  guardian_1_phone: string | null;
  guardian_1_email: string | null;
  guardian_2_name: string | null;
  guardian_2_relationship: string | null;
  guardian_2_phone: string | null;
  guardian_2_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  emergency_contact_same_as_parent: boolean | null;
  missing_required_fields: string[];
  missing_required_field_count: number;
  created_at: string;
  updated_at: string;
}

export type SecretaryMemberProfileUpdate = Partial<Pick<
  SecretaryMemberProfile,
  | 'preferred_name'
  | 'personal_email'
  | 'phone'
  | 'graduation_year'
  | 'expected_graduation_term'
  | 'school'
  | 'major'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'tshirt_size'
  | 'hoodie_size'
  | 'housing_type'
  | 'local_address'
  | 'campus_housing'
  | 'home_city'
  | 'home_state'
  | 'parent_outreach_consent'
  | 'last_verified_at'
  | 'last_chased_at'
>>;

export interface GuardianContactUpsert {
  member_id: string;
  contact_order: 1 | 2;
  contact_name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface SecretaryChaseBatchCreate {
  batch_label: string;
  subject: string;
  body: string;
  members: Array<{
    member_id: string;
    recipient_line: string;
    missing_fields: string[];
  }>;
}

const SECRETARY_PROFILE_SELECT = `
  id,
  google_email,
  personal_email,
  suid,
  legal_first_name,
  legal_last_name,
  preferred_name,
  phone,
  status,
  pledge_class,
  initiation_date,
  graduation_year,
  expected_graduation_term,
  school,
  college,
  major,
  birthday_month,
  birthday_day,
  housing_type,
  local_address,
  campus_housing,
  home_city,
  home_state,
  instagram,
  snapchat,
  linkedin,
  avatar_url,
  bio,
  tshirt_size,
  hoodie_size,
  current_status_type,
  current_status_label,
  current_status_start_term,
  current_status_end_term,
  active_position_names,
  parent_outreach_consent,
  last_verified_at,
  last_chased_at,
  guardian_1_name,
  guardian_1_relationship,
  guardian_1_phone,
  guardian_1_email,
  guardian_2_name,
  guardian_2_relationship,
  guardian_2_phone,
  guardian_2_email,
  emergency_contact_name,
  emergency_contact_relationship,
  emergency_contact_phone,
  emergency_contact_email,
  emergency_contact_same_as_parent,
  missing_required_fields,
  missing_required_field_count,
  created_at,
  updated_at
`;

export const fetchSecretaryMemberProfiles = async (): Promise<SecretaryMemberProfile[]> => {
  const { data, error } = await supabase
    .from('member_secretary_profiles')
    .select(SECRETARY_PROFILE_SELECT)
    .order('legal_last_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SecretaryMemberProfile[];
};

export const updateSecretaryMemberProfile = async (
  memberId: string,
  values: SecretaryMemberProfileUpdate
) => {
  const normalizedValues = normalizeSecretaryMemberProfileUpdate(values);
  const { error } = await supabase
    .from('members')
    .update(normalizedValues)
    .eq('id', memberId);

  if (error) {
    throw error;
  }
};

export const markSecretaryProfileVerified = async (memberId: string) =>
  updateSecretaryMemberProfile(memberId, { last_verified_at: new Date().toISOString() });

export const markSecretaryProfileChased = async (memberId: string) =>
  updateSecretaryMemberProfile(memberId, { last_chased_at: new Date().toISOString() });

export const createSecretaryChaseBatch = async ({
  batch_label,
  subject,
  body,
  members
}: SecretaryChaseBatchCreate): Promise<string> => {
  if (members.length === 0) {
    throw new Error('A chase batch requires at least one member.');
  }

  const { data: batch, error: batchError } = await supabase
    .from('secretary_chase_batches')
    .insert({
      batch_label,
      subject,
      body,
      recipient_count: members.length
    })
    .select('id')
    .single();

  if (batchError) {
    throw batchError;
  }

  const batchId = batch.id as string;
  const { error: membersError } = await supabase
    .from('secretary_chase_batch_members')
    .insert(members.map(member => ({
      batch_id: batchId,
      member_id: member.member_id,
      recipient_line: member.recipient_line,
      missing_fields: member.missing_fields
    })));

  if (membersError) {
    throw membersError;
  }

  const chasedAt = new Date().toISOString();
  for (const member of members) {
    await updateSecretaryMemberProfile(member.member_id, { last_chased_at: chasedAt });
  }

  return batchId;
};

export const upsertGuardianContact = async (values: GuardianContactUpsert) => {
  const normalizedValues = {
    ...values,
    contact_name: normalizeNullableText(values.contact_name) ?? 'Parent/Guardian',
    relationship: normalizeGuardianRelationship(values.relationship, `guardian_${values.contact_order}_relationship`),
    phone: normalizePhone(values.phone, `guardian_${values.contact_order}_phone`),
    email: normalizeEmail(values.email, `guardian_${values.contact_order}_email`)
  };

  const { error } = await supabase
    .from('member_guardian_contacts')
    .upsert(normalizedValues, { onConflict: 'member_id,contact_order' });

  if (error) {
    throw error;
  }
};

const normalizeSecretaryMemberProfileUpdate = (
  values: SecretaryMemberProfileUpdate
): SecretaryMemberProfileUpdate => {
  const normalized: SecretaryMemberProfileUpdate = {};

  for (const [key, value] of Object.entries(values) as Array<[keyof SecretaryMemberProfileUpdate, any]>) {
    switch (key) {
      case 'personal_email':
        normalized.personal_email = normalizeEmail(value, key);
        break;
      case 'phone':
        normalized.phone = normalizePhone(value, key);
        break;
      case 'graduation_year':
        normalized.graduation_year = normalizeGraduationYear(value, key);
        break;
      case 'expected_graduation_term':
        normalized.expected_graduation_term = normalizeTerm(value, key, values.graduation_year);
        break;
      case 'housing_type':
        normalized.housing_type = normalizeHousingType(value, key);
        break;
      case 'local_address':
        normalized.local_address = normalizeAddressText(value);
        break;
      case 'campus_housing':
        normalized.campus_housing = normalizeAddressText(value);
        break;
      case 'home_state':
        normalized.home_state = normalizeState(value, key);
        break;
      case 'instagram':
        normalized.instagram = normalizeInstagram(value);
        break;
      case 'snapchat':
        normalized.snapchat = normalizeSnapchat(value);
        break;
      case 'linkedin':
        normalized.linkedin = normalizeLinkedIn(value);
        break;
      case 'tshirt_size':
        normalized.tshirt_size = normalizeApparelSize(value, key);
        break;
      case 'hoodie_size':
        normalized.hoodie_size = normalizeApparelSize(value, key);
        break;
      case 'parent_outreach_consent':
        normalized.parent_outreach_consent = Boolean(value);
        break;
      case 'last_verified_at':
      case 'last_chased_at':
        normalized[key] = value;
        break;
      default:
        normalized[key] = normalizeNullableText(value) as any;
        break;
    }
  }

  return normalized;
};
