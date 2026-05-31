import { supabase } from './supabase';

export type DoorGuestGender = 'female' | 'male' | 'other' | 'unknown';

export interface SocialDoorSummary {
  event_id: string;
  name: string;
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  guest_policy: string;
  guest_total: number;
  checked_in_total: number;
  can_override_male_guest: boolean;
}

export interface SocialDoorGuest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  school_email: string | null;
  gender: DoorGuestGender;
  host_member_id: string | null;
  host_display_name: string | null;
  approval_status: 'approved' | 'override_approved' | 'denied';
  added_at_door: boolean;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
}

export interface SocialDoorMemberResult {
  member_id: string;
  suid: string;
  display_name: string;
  member_status: string;
  current_social_ineligible: boolean;
}

export interface AddDoorGuestInput {
  eventId: string;
  firstName: string;
  lastName: string;
  schoolEmail: string;
  gender: DoorGuestGender;
  hostMemberId: string | null;
  overrideReason: string;
}

export const fetchSocialDoorSummary = async (eventId: string): Promise<SocialDoorSummary> => {
  const { data, error } = await supabase.rpc('social_door_summary', { target_event_id: eventId });
  if (error) throw error;
  return data as SocialDoorSummary;
};

export const fetchSocialDoorGuests = async (eventId: string, searchText = ''): Promise<SocialDoorGuest[]> => {
  const { data, error } = await supabase.rpc('social_door_guest_list', {
    target_event_id: eventId,
    search_text: searchText
  });

  if (error) throw error;
  return (data ?? []) as SocialDoorGuest[];
};

export const searchSocialDoorMembers = async (
  eventId: string,
  searchText: string
): Promise<SocialDoorMemberResult[]> => {
  const { data, error } = await supabase.rpc('social_door_member_search', {
    target_event_id: eventId,
    search_text: searchText
  });

  if (error) throw error;
  return (data ?? []) as SocialDoorMemberResult[];
};

export const checkInSocialDoorGuest = async (guestId: string) => {
  const { data, error } = await supabase.rpc('social_door_check_in_guest', { target_guest_id: guestId });
  if (error) throw error;
  return data as { guest_id: string; event_id: string; checked_in_at: string; already_checked_in: boolean };
};

export const addAndCheckInSocialDoorGuest = async (input: AddDoorGuestInput) => {
  const { data, error } = await supabase.rpc('social_door_add_guest', {
    target_event_id: input.eventId,
    target_first_name: input.firstName,
    target_last_name: input.lastName,
    target_school_email: input.schoolEmail,
    target_gender: input.gender,
    target_host_member_id: input.hostMemberId,
    override_reason: input.overrideReason
  });

  if (error) throw error;
  return data as { guest_id: string; event_id: string; checked_in_at: string; override_recorded: boolean };
};
