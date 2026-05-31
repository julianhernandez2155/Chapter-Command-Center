import { supabase } from './supabase';

export interface ServiceChairmanSummary {
  active_members: number;
  community_floor_met: number;
  community_floor_missing: number;
  approved_service_hours: number;
  upcoming_service_events: number;
  pending_external_reports: number;
}

export interface ServiceChairmanEvent {
  id: string;
  name: string;
  type: 'community_service' | 'philanthropy';
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  signup_capacity: number | null;
  expected_count: number | null;
  hours: number | null;
  status: 'upcoming' | 'live' | 'complete';
  signed_up_count: number;
  checked_in_count: number;
  hours_awarded: number;
}

export interface ServiceMissingFloorMember {
  member_id: string;
  suid: string;
  display_name: string;
  service_hours_total: number;
  community_service_events_attended: number;
  active_service_signups: number;
  last_service_at: string | null;
}

export interface PendingExternalReport {
  id: string;
  event_id: string;
  event_name: string;
  member_id: string;
  member_name: string;
  requested_hours: number;
  submitted_at: string;
  notes: string | null;
  proof_url: string | null;
}

export interface ServiceChairmanConsoleData {
  as_of_date: string;
  summary: ServiceChairmanSummary;
  events: ServiceChairmanEvent[];
  missing_floor: ServiceMissingFloorMember[];
  pending_external_reports: PendingExternalReport[];
}

export const fetchServiceChairmanConsole = async (): Promise<ServiceChairmanConsoleData> => {
  const { data, error } = await supabase.rpc('service_philanthropy_console');
  if (error) throw error;
  return data as ServiceChairmanConsoleData;
};
