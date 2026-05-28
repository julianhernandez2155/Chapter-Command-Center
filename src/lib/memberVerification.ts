import { supabase } from './supabase';

export type VerificationCycleStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type VerificationSubmissionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'needs_changes'
  | 'exempted'
  | 'temporarily_unlocked';

export const VERIFICATION_REQUIRED_FIELDS = [
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
  'hoodie_size'
] as const;

export const VERIFICATION_CONDITIONAL_REQUIRED_FIELDS = [
  'local_address',
  'campus_housing'
] as const;

export const VERIFICATION_GUARDIAN_REQUIRED_FIELDS = [
  'guardian_1_first_name',
  'guardian_1_last_name',
  'guardian_1_relationship',
  'guardian_1_phone',
  'guardian_1_email'
] as const;

export const VERIFICATION_OPTIONAL_REVIEW_FIELDS = [
  'parent_outreach_consent'
] as const;

export type VerificationRequiredField =
  | typeof VERIFICATION_REQUIRED_FIELDS[number]
  | typeof VERIFICATION_CONDITIONAL_REQUIRED_FIELDS[number]
  | typeof VERIFICATION_GUARDIAN_REQUIRED_FIELDS[number];
export type VerificationOptionalReviewField = typeof VERIFICATION_OPTIONAL_REVIEW_FIELDS[number];
export type HousingType = 'on_campus' | 'off_campus' | 'chapter_housing';

export interface VerificationCycle {
  id: string;
  term_label: string;
  status: VerificationCycleStatus;
  gate_mode: 'hard';
  due_at: string | null;
  required_member_statuses: string[];
  required_fields: VerificationRequiredField[];
  optional_review_fields: VerificationOptionalReviewField[];
  launched_by: string | null;
  launched_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationSubmission {
  id: string;
  cycle_id: string;
  member_id: string;
  status: VerificationSubmissionStatus;
  first_seen_at: string | null;
  last_seen_at: string | null;
  draft_saved_at: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  exempted_by: string | null;
  exempted_at: string | null;
  exemption_reason: string | null;
  missing_required_fields: VerificationRequiredField[];
  optional_review_flags: VerificationOptionalReviewField[];
  changed_fields: string[];
  confirmed_fields: string[];
  correction_notes: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VerificationGateStatus {
  cycle_id: string;
  term_label: string;
  cycle_status: VerificationCycleStatus;
  gate_mode: 'hard';
  due_at: string | null;
  required_fields: VerificationRequiredField[];
  optional_review_fields: VerificationOptionalReviewField[];
  member_id: string;
  submission_status: VerificationSubmissionStatus;
  submission_id: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  draft_saved_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  exempted_at: string | null;
  missing_required_fields: VerificationRequiredField[];
  optional_review_flags: VerificationOptionalReviewField[];
  is_gate_required: boolean;
  is_complete: boolean;
}

export interface MemberVerificationSelfProfile {
  id: string;
  google_email: string;
  personal_email: string | null;
  suid: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  phone: string | null;
  status: string;
  graduation_year: number | null;
  expected_graduation_term: string | null;
  school: string | null;
  college: string | null;
  major: string | null;
  housing_type: HousingType | null;
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
  parent_outreach_consent: boolean;
  has_parent_guardian_contact: boolean;
  updated_at: string;
}

export interface MemberVerificationGuardianContact {
  id: string;
  member_id: string;
  contact_order: 1 | 2;
  first_name: string | null;
  last_name: string | null;
  contact_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  outreach_consent: boolean;
}

export interface MemberVerificationContacts {
  guardians: MemberVerificationGuardianContact[];
}

export type MemberVerificationProfileUpdate = Partial<Pick<
  MemberVerificationSelfProfile,
  | 'preferred_name'
  | 'personal_email'
  | 'phone'
  | 'graduation_year'
  | 'expected_graduation_term'
  | 'school'
  | 'major'
  | 'housing_type'
  | 'local_address'
  | 'campus_housing'
  | 'home_city'
  | 'home_state'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'avatar_url'
  | 'bio'
  | 'tshirt_size'
  | 'hoodie_size'
  | 'parent_outreach_consent'
>>;

export interface LaunchVerificationCycleInput {
  termLabel: string;
  dueAt: string | null;
  launchedBy: string;
  activeMemberIds: string[];
}

export interface SaveVerificationSubmissionInput {
  cycleId: string;
  memberId: string;
  status: Extract<VerificationSubmissionStatus, 'in_progress' | 'submitted'>;
  missingRequiredFields: VerificationRequiredField[];
  optionalReviewFlags: VerificationOptionalReviewField[];
  changedFields: string[];
  confirmedFields: string[];
  correctionNotes?: string | null;
  snapshot: Record<string, unknown>;
}

export interface GuardianContactInput {
  id?: string | null;
  contactOrder: 1 | 2;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email: string;
  outreachConsent: boolean;
}

const CYCLE_SELECT = `
  id,
  term_label,
  status,
  gate_mode,
  due_at,
  required_member_statuses,
  required_fields,
  optional_review_fields,
  launched_by,
  launched_at,
  closed_by,
  closed_at,
  created_at,
  updated_at
`;

const SUBMISSION_SELECT = `
  id,
  cycle_id,
  member_id,
  status,
  first_seen_at,
  last_seen_at,
  draft_saved_at,
  submitted_at,
  approved_by,
  approved_at,
  exempted_by,
  exempted_at,
  exemption_reason,
  missing_required_fields,
  optional_review_flags,
  changed_fields,
  confirmed_fields,
  correction_notes,
  snapshot,
  created_at,
  updated_at
`;

const SELF_PROFILE_SELECT = `
  id,
  google_email,
  personal_email,
  suid,
  legal_first_name,
  legal_last_name,
  preferred_name,
  phone,
  status,
  graduation_year,
  expected_graduation_term,
  school,
  college,
  major,
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
  parent_outreach_consent,
  has_parent_guardian_contact,
  updated_at
`;

const GUARDIAN_CONTACT_SELECT = `
  id,
  member_id,
  contact_order,
  first_name,
  last_name,
  contact_name,
  relationship,
  phone,
  email,
  outreach_consent
`;

export const fetchMyVerificationGateStatus = async (): Promise<VerificationGateStatus | null> => {
  const { data, error } = await supabase
    .from('member_verification_gate_status')
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as VerificationGateStatus | null;
};

export const fetchMyVerificationSelfProfile = async (): Promise<MemberVerificationSelfProfile | null> => {
  const { data, error } = await supabase
    .from('member_verification_self_profiles')
    .select(SELF_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as MemberVerificationSelfProfile | null;
};

export const fetchMyVerificationContacts = async (memberId: string): Promise<MemberVerificationContacts> => {
  const guardiansResult = await supabase
    .from('member_guardian_contacts')
    .select(GUARDIAN_CONTACT_SELECT)
    .eq('member_id', memberId)
    .order('contact_order', { ascending: true });

  if (guardiansResult.error) {
    throw guardiansResult.error;
  }

  return {
    guardians: (guardiansResult.data ?? []) as MemberVerificationGuardianContact[]
  };
};

export const fetchActiveVerificationCycle = async (): Promise<VerificationCycle | null> => {
  const { data, error } = await supabase
    .from('verification_cycles')
    .select(CYCLE_SELECT)
    .eq('status', 'open')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as VerificationCycle | null;
};

export const fetchVerificationSubmissions = async (cycleId: string): Promise<VerificationSubmission[]> => {
  const { data, error } = await supabase
    .from('member_verification_submissions')
    .select(SUBMISSION_SELECT)
    .eq('cycle_id', cycleId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as VerificationSubmission[];
};

export const launchVerificationCycle = async ({
  termLabel,
  dueAt,
  launchedBy,
  activeMemberIds
}: LaunchVerificationCycleInput): Promise<string> => {
  const { data: cycle, error: cycleError } = await supabase
    .from('verification_cycles')
    .insert({
      term_label: termLabel,
      status: 'open',
      gate_mode: 'hard',
      due_at: dueAt,
      required_member_statuses: ['active'],
      required_fields: [...VERIFICATION_REQUIRED_FIELDS, ...VERIFICATION_GUARDIAN_REQUIRED_FIELDS],
      optional_review_fields: [...VERIFICATION_OPTIONAL_REVIEW_FIELDS],
      launched_by: launchedBy,
      launched_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (cycleError) {
    throw cycleError;
  }

  const cycleId = cycle.id as string;
  if (activeMemberIds.length > 0) {
    const { error: submissionsError } = await supabase
      .from('member_verification_submissions')
      .insert(activeMemberIds.map(memberId => ({
        cycle_id: cycleId,
        member_id: memberId,
        status: 'not_started'
      })));

    if (submissionsError) {
      throw submissionsError;
    }
  }

  return cycleId;
};

export const closeVerificationCycle = async (cycleId: string, closedBy: string) => {
  const { error } = await supabase
    .from('verification_cycles')
    .update({
      status: 'closed',
      closed_by: closedBy,
      closed_at: new Date().toISOString()
    })
    .eq('id', cycleId);

  if (error) {
    throw error;
  }
};

export const updateMyVerificationProfile = async (
  memberId: string,
  values: MemberVerificationProfileUpdate
) => {
  const { error } = await supabase
    .from('members')
    .update(values)
    .eq('id', memberId);

  if (error) {
    throw error;
  }
};

export const saveMyVerificationContacts = async (
  memberId: string,
  guardians: GuardianContactInput[]
) => {
  for (const guardian of guardians) {
    const hasValue = hasAnyValue([
      guardian.firstName,
      guardian.lastName,
      guardian.relationship,
      guardian.phone,
      guardian.email
    ]);

    if (!hasValue) {
      if (guardian.id) {
        const { error } = await supabase
          .from('member_guardian_contacts')
          .delete()
          .eq('id', guardian.id)
          .eq('member_id', memberId);

        if (error) {
          throw error;
        }
      }
      continue;
    }

    const payload = {
      member_id: memberId,
      contact_order: guardian.contactOrder,
      first_name: cleanOptional(guardian.firstName),
      last_name: cleanOptional(guardian.lastName),
      contact_name: buildContactName(guardian.firstName, guardian.lastName, `Parent/Guardian ${guardian.contactOrder}`),
      relationship: cleanOptional(guardian.relationship),
      phone: cleanOptional(guardian.phone),
      email: cleanOptional(guardian.email),
      outreach_consent: guardian.outreachConsent
    };

    const { error } = await supabase
      .from('member_guardian_contacts')
      .upsert(payload, { onConflict: 'member_id,contact_order' });

    if (error) {
      throw error;
    }
  }

  const { error: memberError } = await supabase
    .from('members')
    .update({ parent_outreach_consent: guardians.some(guardian => guardian.outreachConsent) })
    .eq('id', memberId);

  if (memberError) {
    throw memberError;
  }
};

export const saveMyVerificationSubmission = async ({
  cycleId,
  memberId,
  status,
  missingRequiredFields,
  optionalReviewFlags,
  changedFields,
  confirmedFields,
  correctionNotes,
  snapshot
}: SaveVerificationSubmissionInput) => {
  const { error } = await supabase
    .from('member_verification_submissions')
    .upsert({
      cycle_id: cycleId,
      member_id: memberId,
      status,
      missing_required_fields: missingRequiredFields,
      optional_review_flags: optionalReviewFlags,
      changed_fields: changedFields,
      confirmed_fields: confirmedFields,
      correction_notes: correctionNotes,
      snapshot
    }, { onConflict: 'cycle_id,member_id' });

  if (error) {
    throw error;
  }
};

const cleanOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hasAnyValue = (values: string[]) => values.some(value => value.trim().length > 0);

const buildContactName = (firstName: string, lastName: string, fallback: string) => {
  const name = [firstName, lastName].map(value => value.trim()).filter(Boolean).join(' ');
  return name || fallback;
};

export const approveVerificationSubmission = async (submissionId: string, approvedBy: string) => {
  const { error } = await supabase
    .from('member_verification_submissions')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    })
    .eq('id', submissionId);

  if (error) {
    throw error;
  }
};

export const exemptVerificationSubmission = async (
  submissionId: string,
  exemptedBy: string,
  exemptionReason: string
) => {
  const { error } = await supabase
    .from('member_verification_submissions')
    .update({
      status: 'exempted',
      exempted_by: exemptedBy,
      exempted_at: new Date().toISOString(),
      exemption_reason: exemptionReason
    })
    .eq('id', submissionId);

  if (error) {
    throw error;
  }
};
