import { User } from '@supabase/supabase-js';
import {
  normalizeAddressText,
  normalizeApparelSize,
  normalizeEmail,
  normalizeGraduationYear,
  normalizeGuardianRelationship,
  normalizeInstagram,
  normalizeLinkedIn,
  normalizeName,
  normalizeNullableText,
  normalizePhone,
  normalizeSchoolEmail,
  normalizeSnapchat,
  normalizeSuid
} from './normalizers';
import { supabase } from './supabase';

export interface OnboardingFormInput {
  firstName: string;
  lastName: string;
  preferredName: string;
  suid: string;
  gradYear: string;
  school: string;
  major: string;
  dorm: string;
  room: string;
  tshirtSize: string;
  instagram: string;
  snapchat: string;
  linkedin: string;
  venmo: string;
  primaryContactName: string;
  primaryContactRelation: string;
  primaryContactPhone: string;
  parentConsent: boolean;
}

export const saveOnboardingProfile = async (user: User, input: OnboardingFormInput) => {
  const loginEmail = normalizeEmail(user.email, 'login_email');
  const schoolEmail = normalizeSchoolEmail(user.email, 'school_email');
  if (!loginEmail || !schoolEmail) {
    throw new Error('A Syracuse email is required.');
  }

  const existingMember = await findExistingMember(user.id, loginEmail, schoolEmail);
  const memberPayload = toMemberPayload(user.id, schoolEmail, input);
  const memberId = existingMember?.id ?? null;

  if (memberId) {
    const { error } = await supabase
      .from('members')
      .update(memberPayload)
      .eq('id', memberId);

    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('members')
      .insert({
        ...memberPayload,
        status: 'active'
      })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create member record.');
  }

  const savedMemberId = memberId ?? (await findExistingMember(user.id, loginEmail, schoolEmail))?.id;
  if (!savedMemberId) {
    throw new Error('Member profile could not be loaded after save.');
  }

  await saveOnboardingEmergencyContact(savedMemberId, input);
  return savedMemberId;
};

const findExistingMember = async (authUserId: string, loginEmail: string, schoolEmail: string) => {
  const { data: byAuthUser, error: authError } = await supabase
    .from('members')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (authError) throw authError;
  if (byAuthUser) return byAuthUser;

  const emails = [...new Set([loginEmail, schoolEmail])];
  const { data: byEmail, error: emailError } = await supabase
    .from('members')
    .select('id')
    .in('google_email', emails)
    .maybeSingle();

  if (emailError) throw emailError;
  return byEmail;
};

const toMemberPayload = (authUserId: string, schoolEmail: string, input: OnboardingFormInput) => {
  const dorm = normalizeAddressText(input.dorm);
  const room = normalizeAddressText(input.room);
  const housingType = dorm?.toLowerCase() === 'off campus' ? 'off_campus' : dorm ? 'on_campus' : null;

  return {
    auth_user_id: authUserId,
    google_email: schoolEmail,
    legal_first_name: normalizeName(input.firstName, 'firstName') ?? '',
    legal_last_name: normalizeName(input.lastName, 'lastName') ?? '',
    preferred_name: normalizeName(input.preferredName, 'preferredName'),
    suid: normalizeSuid(input.suid, 'suid'),
    graduation_year: normalizeGraduationYear(input.gradYear, 'gradYear') ?? new Date().getFullYear(),
    college: normalizeNullableText(input.school),
    school: normalizeNullableText(input.school),
    major: normalizeNullableText(input.major) ?? 'Undeclared',
    dorm_location: dorm,
    room,
    housing_type: housingType,
    local_address: housingType === 'off_campus' ? room : null,
    campus_housing: housingType === 'on_campus' ? dorm : null,
    tshirt_size: normalizeApparelSize(input.tshirtSize, 'tshirtSize'),
    instagram: normalizeInstagram(input.instagram),
    snapchat: normalizeSnapchat(input.snapchat),
    linkedin: normalizeLinkedIn(input.linkedin),
    venmo: normalizeNullableText(input.venmo)?.replace(/^@/, '') ?? null,
    parent_outreach_consent: input.parentConsent
  };
};

const saveOnboardingEmergencyContact = async (memberId: string, input: OnboardingFormInput) => {
  const contactName = normalizeName(input.primaryContactName, 'primaryContactName');
  if (!contactName) return;

  const payload = {
    member_id: memberId,
    contact_name: contactName,
    relationship: normalizeGuardianRelationship(input.primaryContactRelation, 'primaryContactRelation') ?? 'Other',
    phone: normalizePhone(input.primaryContactPhone, 'primaryContactPhone'),
    is_primary: true
  };

  const { error } = await supabase
    .from('emergency_contacts')
    .upsert(payload, { onConflict: 'member_id' });

  if (!error) return;

  const { error: insertError } = await supabase
    .from('emergency_contacts')
    .insert(payload);

  if (insertError) throw insertError;
};
