import { supabase } from './supabase';

export interface ExternalPhilanthropyOpportunity {
  event_id: string;
  name: string;
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  signup_capacity: number | null;
  signup_deadline: string | null;
  hours: number | null;
  external_approver_id: string | null;
  signed_up_count: number;
  spots_remaining: number | null;
  signup_id: string | null;
  user_signed_up: boolean;
  report_id: string | null;
  report_status: 'pending' | 'approved' | 'adjusted' | 'rejected' | null;
  requested_hours: number | null;
  approved_hours: number | null;
  reviewer_note: string | null;
  can_signup: boolean;
  can_report: boolean;
}

export interface ExternalServiceReport {
  id: string;
  event_id: string;
  event_name: string;
  requested_hours: number;
  hours: number;
  status: 'pending' | 'approved' | 'adjusted' | 'rejected';
  submitted_at: string;
  verified_at: string | null;
  notes: string | null;
  proof_url: string | null;
  reviewer_note: string | null;
}

export interface ExternalPhilanthropyPortalData {
  opportunities: ExternalPhilanthropyOpportunity[];
  my_reports: ExternalServiceReport[];
}

export interface ExternalReviewQueueEntry {
  entry_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  member_id: string;
  member_name: string;
  suid: string;
  requested_hours: number;
  submitted_at: string;
  notes: string | null;
  proof_url: string | null;
}

export const fetchExternalPhilanthropyPortal = async (): Promise<ExternalPhilanthropyPortalData> => {
  const { data, error } = await supabase.rpc('external_philanthropy_member_portal');
  if (error) throw error;
  return data as ExternalPhilanthropyPortalData;
};

export const fetchExternalReviewQueue = async (): Promise<ExternalReviewQueueEntry[]> => {
  const { data, error } = await supabase.rpc('external_philanthropy_review_queue');
  if (error) throw error;
  return (data ?? []) as ExternalReviewQueueEntry[];
};

export const signupForExternalPhilanthropy = async (eventId: string) => {
  const { data, error } = await supabase.rpc('signup_for_external_philanthropy', { target_event_id: eventId });
  if (error) throw error;
  return data as { signup_id: string; event_id: string; member_id: string };
};

export const submitExternalServiceHours = async (
  eventId: string,
  requestedHours: number,
  note: string,
  proof: string
) => {
  const { data, error } = await supabase.rpc('submit_external_service_hours', {
    target_event_id: eventId,
    requested_hours: requestedHours,
    report_note: note,
    proof
  });
  if (error) throw error;
  return data as { entry_id: string; event_id: string; status: string };
};

export const reviewExternalServiceHours = async (
  entryId: string,
  decision: 'approved' | 'adjusted' | 'rejected',
  approvedHours: number | null,
  note: string
) => {
  const { data, error } = await supabase.rpc('review_external_service_hours', {
    target_entry_id: entryId,
    decision,
    approved_hours: approvedHours,
    review_note: note
  });
  if (error) throw error;
  return data as { entry_id: string; event_id: string; member_id: string; status: string; hours: number };
};
