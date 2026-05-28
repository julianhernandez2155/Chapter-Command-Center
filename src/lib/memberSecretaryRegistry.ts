import { supabase } from './supabase';

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
  local_address: string | null;
  campus_housing: string | null;
  home_city: string | null;
  home_state: string | null;
  instagram: string | null;
  snapchat: string | null;
  linkedin: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  | 'school'
  | 'major'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'local_address'
  | 'campus_housing'
  | 'home_city'
  | 'home_state'
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
  local_address,
  campus_housing,
  home_city,
  home_state,
  instagram,
  snapchat,
  linkedin,
  avatar_url,
  bio,
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
  const { error } = await supabase
    .from('members')
    .update(values)
    .eq('id', memberId);

  if (error) {
    throw error;
  }
};

export const markSecretaryProfileVerified = async (memberId: string) =>
  updateSecretaryMemberProfile(memberId, { last_verified_at: new Date().toISOString() });

export const markSecretaryProfileChased = async (memberId: string) =>
  updateSecretaryMemberProfile(memberId, { last_chased_at: new Date().toISOString() });

export const upsertGuardianContact = async (values: GuardianContactUpsert) => {
  const { error } = await supabase
    .from('member_guardian_contacts')
    .upsert(values, { onConflict: 'member_id,contact_order' });

  if (error) {
    throw error;
  }
};
