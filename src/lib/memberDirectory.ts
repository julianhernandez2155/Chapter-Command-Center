import { supabase } from './supabase';
import {
  normalizeEmail,
  normalizeGraduationYear,
  normalizeInstagram,
  normalizeLinkedIn,
  normalizeName,
  normalizeNullableText,
  normalizePhone,
  normalizeSnapchat,
  normalizeTerm
} from './normalizers';

export type DirectoryMemberStatus = 'active' | 'inactive' | 'suspended' | 'new_member' | 'alumni' | string;

export interface DirectoryMember {
  id: string;
  google_email: string;
  personal_email: string | null;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  phone: string | null;
  instagram: string | null;
  snapchat: string | null;
  linkedin: string | null;
  status: DirectoryMemberStatus;
  graduation_year: number | null;
  school: string | null;
  college: string | null;
  major: string | null;
  avatar_url: string | null;
  pledge_class: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  bio: string | null;
  current_status_type: string | null;
  current_status_label: string | null;
  current_status_start_term: string | null;
  current_status_end_term: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryPosition {
  id: string;
  display_name: string;
  semester: string | null;
  assigned_at: string | null;
  removed_at: string | null;
}

export type MemberDirectoryProfileUpdate = Partial<Pick<
  DirectoryMember,
  | 'legal_first_name'
  | 'legal_last_name'
  | 'preferred_name'
  | 'personal_email'
  | 'phone'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'school'
  | 'major'
  | 'graduation_year'
  | 'avatar_url'
  | 'pledge_class'
  | 'birthday_month'
  | 'birthday_day'
  | 'bio'
>>;

export interface StudyAbroadStatusUpdate {
  label: string | null;
  start_term: string | null;
  end_term: string | null;
}

type MemberDirectoryViewRow = Omit<DirectoryMember, 'college'> & {
  college?: string | null;
};

type PositionHistoryRow = {
  id: string;
  semester: string | null;
  assigned_at: string | null;
  removed_at: string | null;
  position: { display_name: string } | { display_name: string }[] | null;
};

type StudyAbroadStatusRow = {
  id: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
};

const DIRECTORY_VIEW_SELECT = `
  id,
  google_email,
  personal_email,
  legal_first_name,
  legal_last_name,
  preferred_name,
  phone,
  instagram,
  snapchat,
  linkedin,
  status,
  graduation_year,
  school,
  college,
  major,
  avatar_url,
  pledge_class,
  birthday_month,
  birthday_day,
  bio,
  current_status_type,
  current_status_label,
  current_status_start_term,
  current_status_end_term,
  created_at,
  updated_at
`;

export const fetchMemberDirectory = async (): Promise<DirectoryMember[]> => {
  const { data, error } = await supabase
    .from('member_directory_profiles')
    .select(DIRECTORY_VIEW_SELECT)
    .order('legal_last_name', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MemberDirectoryViewRow[]).map(normalizeDirectoryMember);
};

export const fetchMemberPositionHistory = async (memberId: string): Promise<DirectoryPosition[]> => {
  const { data, error } = await supabase
    .from('member_positions')
    .select(`
      id,
      semester,
      assigned_at,
      removed_at,
      position:positions (
        display_name
      )
    `)
    .eq('member_id', memberId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.warn('Unable to load member position history:', error.message);
    return [];
  }

  return ((data ?? []) as PositionHistoryRow[]).flatMap(row => {
    const position = Array.isArray(row.position) ? row.position[0] : row.position;
    if (!position) return [];

    return [{
      id: row.id,
      display_name: position.display_name,
      semester: row.semester,
      assigned_at: row.assigned_at,
      removed_at: row.removed_at
    }];
  });
};

export const updateMemberDirectoryProfile = async (
  memberId: string,
  values: MemberDirectoryProfileUpdate
) => {
  const normalizedValues = normalizeMemberDirectoryProfileUpdate(values);
  const { error } = await supabase
    .from('members')
    .update(normalizedValues)
    .eq('id', memberId);

  if (error) {
    throw error;
  }
};

export const replaceCurrentStudyAbroadStatus = async (
  memberId: string,
  values: StudyAbroadStatusUpdate
) => {
  const hasStatus = Boolean(values.label || values.start_term || values.end_term);

  const { data, error } = await supabase
    .from('member_status_periods')
    .select('id, starts_on, ends_on, created_at')
    .eq('member_id', memberId)
    .eq('status_type', 'study_abroad')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const currentStatus = ((data ?? []) as StudyAbroadStatusRow[]).find(isCurrentStatusPeriod);

  if (!hasStatus) {
    if (!currentStatus) return;

    const { error: deleteError } = await supabase
      .from('member_status_periods')
      .delete()
      .eq('id', currentStatus.id);

    if (deleteError) {
      throw deleteError;
    }

    return;
  }

  const payload = {
    member_id: memberId,
    status_type: 'study_abroad',
    label: normalizeNullableText(values.label),
    start_term: normalizeTerm(values.start_term, 'study_abroad_start_term'),
    end_term: normalizeTerm(values.end_term, 'study_abroad_end_term')
  };

  if (currentStatus) {
    const { error: updateError } = await supabase
      .from('member_status_periods')
      .update(payload)
      .eq('id', currentStatus.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from('member_status_periods')
    .insert(payload);

  if (insertError) {
    throw insertError;
  }
};

const normalizeDirectoryMember = (row: MemberDirectoryViewRow): DirectoryMember => ({
  id: row.id,
  google_email: row.google_email,
  personal_email: row.personal_email,
  legal_first_name: row.legal_first_name,
  legal_last_name: row.legal_last_name,
  preferred_name: row.preferred_name,
  phone: row.phone,
  instagram: row.instagram,
  snapchat: row.snapchat,
  linkedin: row.linkedin,
  status: row.status,
  graduation_year: row.graduation_year,
  school: row.school ?? row.college ?? null,
  college: row.college ?? null,
  major: row.major,
  avatar_url: row.avatar_url,
  pledge_class: row.pledge_class,
  birthday_month: row.birthday_month,
  birthday_day: row.birthday_day,
  bio: row.bio,
  current_status_type: row.current_status_type,
  current_status_label: row.current_status_label,
  current_status_start_term: row.current_status_start_term,
  current_status_end_term: row.current_status_end_term,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const normalizeMemberDirectoryProfileUpdate = (
  values: MemberDirectoryProfileUpdate
): MemberDirectoryProfileUpdate => {
  const normalized: MemberDirectoryProfileUpdate = {};

  for (const [key, value] of Object.entries(values) as Array<[keyof MemberDirectoryProfileUpdate, any]>) {
    switch (key) {
      case 'legal_first_name':
      case 'legal_last_name':
      case 'preferred_name':
        normalized[key] = normalizeName(value, key) as any;
        break;
      case 'personal_email':
        normalized.personal_email = normalizeEmail(value, key);
        break;
      case 'phone':
        normalized.phone = normalizePhone(value, key);
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
      case 'graduation_year':
        normalized.graduation_year = normalizeGraduationYear(value, key);
        break;
      case 'birthday_month':
      case 'birthday_day':
        normalized[key] = value;
        break;
      default:
        normalized[key] = normalizeNullableText(value) as any;
        break;
    }
  }

  return normalized;
};

const isCurrentStatusPeriod = (status: StudyAbroadStatusRow) => {
  const today = new Date();
  const startsOn = status.starts_on ? new Date(status.starts_on) : null;
  const endsOn = status.ends_on ? new Date(status.ends_on) : null;

  return (!startsOn || startsOn <= today) && (!endsOn || endsOn >= today);
};
