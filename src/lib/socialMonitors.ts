import { supabase } from './supabase';

export interface SocialMonitorCoverage {
  event_id: string;
  planned_attendance: number;
  brother_plan: number;
  guest_total: number;
  required_monitors: number;
  assigned_monitors: number;
  exec_monitors: number;
  monitor_coverage_met: boolean;
  exec_requirement_met: boolean;
}

export interface SocialMonitorAssignment {
  assignment_id: string;
  event_id: string;
  member_id: string;
  suid: string;
  display_name: string;
  member_status: string;
  assignment_status: 'assigned' | 'confirmed' | 'declined';
  is_exec_board: boolean;
  access_active: boolean;
  assigned_at: string;
  assigned_by_name: string | null;
  confirmed_at: string | null;
  removed_at: string | null;
}

export interface SocialMonitorCandidate {
  member_id: string;
  suid: string;
  display_name: string;
  member_status: string;
  is_exec_board: boolean;
  already_assigned: boolean;
}

export const fetchSocialMonitorCoverage = async (eventId: string): Promise<SocialMonitorCoverage> => {
  const { data, error } = await supabase.rpc('social_monitor_coverage', { target_event_id: eventId });
  if (error) throw error;
  return data as SocialMonitorCoverage;
};

export const fetchSocialMonitorAssignments = async (eventId: string): Promise<SocialMonitorAssignment[]> => {
  const { data, error } = await supabase.rpc('social_monitor_assignments', { target_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as SocialMonitorAssignment[];
};

export const searchSocialMonitorCandidates = async (
  eventId: string,
  searchText: string
): Promise<SocialMonitorCandidate[]> => {
  const { data, error } = await supabase.rpc('social_monitor_member_search', {
    target_event_id: eventId,
    search_text: searchText
  });

  if (error) throw error;
  return (data ?? []) as SocialMonitorCandidate[];
};

export const assignSocialMonitor = async (eventId: string, memberId: string) => {
  const { data, error } = await supabase.rpc('assign_social_monitor', {
    target_event_id: eventId,
    target_member_id: memberId
  });

  if (error) throw error;
  return data as { assignment_id: string; event_id: string; member_id: string; access_active: boolean };
};

export const confirmSocialMonitorAssignment = async (assignmentId: string) => {
  const { data, error } = await supabase.rpc('confirm_social_monitor_assignment', {
    target_assignment_id: assignmentId
  });

  if (error) throw error;
  return data as { assignment_id: string; assignment_status: 'confirmed' };
};

export const removeSocialMonitorAssignment = async (assignmentId: string, reason: string) => {
  const { data, error } = await supabase.rpc('remove_social_monitor_assignment', {
    target_assignment_id: assignmentId,
    reason
  });

  if (error) throw error;
  return data as { assignment_id: string; removed_at: string };
};
