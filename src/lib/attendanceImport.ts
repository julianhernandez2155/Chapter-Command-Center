import { supabase } from './supabase';
import { CsvMember } from './logic/attendance';

type AttendanceImportMemberRow = {
  id: string;
  suid: string;
  google_email: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  preferred_name: string | null;
  status: string;
};

export type AttendanceImportMember = CsvMember & {
  status: string;
};

export const fetchAttendanceImportMembers = async (): Promise<AttendanceImportMember[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('id, suid, google_email, legal_first_name, legal_last_name, preferred_name, status')
    .in('status', ['active', 'new_member'])
    .order('legal_last_name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as AttendanceImportMemberRow[]).map(member => ({
    id: member.id,
    suid: member.suid,
    googleEmail: member.google_email ?? undefined,
    name: [
      member.preferred_name || member.legal_first_name || '',
      member.legal_last_name || ''
    ].join(' ').trim() || member.google_email || member.suid,
    status: member.status
  }));
};
