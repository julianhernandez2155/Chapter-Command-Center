import { supabase } from './supabase';

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
  status: DirectoryMemberStatus;
  graduation_year: number | null;
  school: string | null;
  college: string | null;
  major: string | null;
  avatar_url: string | null;
  pledge_class: string | null;
  member_since_term: string | null;
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
  | 'school'
  | 'major'
  | 'graduation_year'
  | 'avatar_url'
  | 'pledge_class'
  | 'member_since_term'
  | 'birthday_month'
  | 'birthday_day'
  | 'bio'
>>;

type MemberDirectoryViewRow = Omit<DirectoryMember, 'college'> & {
  college?: string | null;
};

type MemberBaseRow = {
  id: string;
  google_email: string;
  personal_email: string | null;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  phone: string | null;
  instagram: string | null;
  snapchat: string | null;
  status: DirectoryMemberStatus;
  graduation_year: number | null;
  college: string | null;
  major: string | null;
  created_at: string;
  updated_at: string;
};

type PositionHistoryRow = {
  id: string;
  semester: string | null;
  assigned_at: string | null;
  removed_at: string | null;
  position: { display_name: string } | { display_name: string }[] | null;
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
  status,
  graduation_year,
  school,
  college,
  major,
  avatar_url,
  pledge_class,
  member_since_term,
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

const MEMBER_BASE_SELECT = `
  id,
  google_email,
  personal_email,
  legal_first_name,
  legal_last_name,
  preferred_name,
  phone,
  instagram,
  snapchat,
  status,
  graduation_year,
  college,
  major,
  created_at,
  updated_at
`;

export const fetchMemberDirectory = async (): Promise<DirectoryMember[]> => {
  const directoryResult = await supabase
    .from('member_directory_profiles')
    .select(DIRECTORY_VIEW_SELECT)
    .order('legal_last_name', { ascending: true });

  if (!directoryResult.error) {
    return ((directoryResult.data ?? []) as MemberDirectoryViewRow[]).map(normalizeDirectoryMember);
  }

  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_BASE_SELECT)
    .in('status', ['active', 'new_member', 'alumni'])
    .order('legal_last_name', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MemberBaseRow[]).map(row => normalizeDirectoryMember({
    ...row,
    school: row.college,
    avatar_url: null,
    pledge_class: null,
    member_since_term: null,
    birthday_month: null,
    birthday_day: null,
    bio: null,
    current_status_type: null,
    current_status_label: null,
    current_status_start_term: null,
    current_status_end_term: null
  }));
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
  const { error } = await supabase
    .from('members')
    .update(values)
    .eq('id', memberId);

  if (error) {
    throw error;
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
  status: row.status,
  graduation_year: row.graduation_year,
  school: row.school ?? row.college ?? null,
  college: row.college ?? null,
  major: row.major,
  avatar_url: row.avatar_url,
  pledge_class: row.pledge_class,
  member_since_term: row.member_since_term,
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
