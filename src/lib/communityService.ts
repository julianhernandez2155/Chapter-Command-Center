import { supabase } from './supabase';

export interface CommunityServiceSummary {
  member_id: string;
  as_of_date: string;
  service_hours_total: number;
  service_hours_target: number;
  community_service_events_attended: number;
  community_service_floor_met: boolean;
  hosted_philanthropy_events_attended: number;
  external_philanthropy_hours_approved?: number;
  active_service_signups: number;
}

export interface CommunityServiceOpportunity {
  event_id: string;
  name: string;
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  signup_capacity: number | null;
  signup_deadline: string | null;
  hours: number | null;
  signed_up_count: number;
  spots_remaining: number | null;
  user_signup_id: string | null;
  user_signed_up: boolean;
  user_checked_in: boolean;
  is_full: boolean;
  can_signup: boolean;
}

export const fetchCommunityServiceSummary = async (): Promise<CommunityServiceSummary> => {
  const { data, error } = await supabase.rpc('community_service_member_summary');
  if (error) throw error;
  return data as CommunityServiceSummary;
};

export const fetchCommunityServiceOpportunities = async (): Promise<CommunityServiceOpportunity[]> => {
  const { data, error } = await supabase.rpc('community_service_opportunities');
  if (error) throw error;
  return (data ?? []) as CommunityServiceOpportunity[];
};

export const signupForCommunityService = async (eventId: string) => {
  const { data, error } = await supabase.rpc('signup_for_community_service', { target_event_id: eventId });
  if (error) throw error;
  return data as { signup_id: string; event_id: string; member_id: string };
};

export const cancelCommunityServiceSignup = async (eventId: string) => {
  const { data, error } = await supabase.rpc('cancel_community_service_signup', { target_event_id: eventId });
  if (error) throw error;
  return data as { signup_id: string; event_id: string; member_id: string; cancelled_at: string };
};
