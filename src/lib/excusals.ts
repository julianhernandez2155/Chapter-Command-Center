import { supabase } from './supabase';
import { EventType, formatEventDate, formatEventTimeRange, formatEventType } from './events';

export type ExcusalStatus = 'pending' | 'approved' | 'denied';

export interface ExcusalEvent {
  id: string;
  name: string;
  type: EventType;
  category: 'mandatory' | 'optional';
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  allow_excusals: boolean;
}

export interface MemberExcusal {
  id: string;
  member_id: string;
  event_id: string;
  reason: string;
  supporting_note: string | null;
  status: ExcusalStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  event: ExcusalEvent | null;
}

export interface ReviewExcusal extends MemberExcusal {
  member: {
    id: string;
    suid: string;
    legal_first_name: string;
    legal_last_name: string;
    preferred_name: string | null;
    graduation_year: number;
  } | null;
  reviewer: {
    id: string;
    legal_first_name: string;
    legal_last_name: string;
    preferred_name: string | null;
  } | null;
}

const EXCUSAL_SELECT = `
  id,
  member_id,
  event_id,
  reason,
  supporting_note,
  status,
  submitted_at,
  reviewed_by,
  reviewed_at,
  review_note,
  event:events (
    id,
    name,
    type,
    category,
    event_date,
    starts_at,
    ends_at,
    location,
    allow_excusals
  )
`;

const REVIEW_EXCUSAL_SELECT = `
  ${EXCUSAL_SELECT},
  member:members!excusals_member_id_fkey (
    id,
    suid,
    legal_first_name,
    legal_last_name,
    preferred_name,
    graduation_year
  ),
  reviewer:members!excusals_reviewed_by_fkey (
    id,
    legal_first_name,
    legal_last_name,
    preferred_name
  )
`;

export const fetchMyExcusals = async (memberId: string): Promise<MemberExcusal[]> => {
  const { data, error } = await supabase
    .from('excusals')
    .select(EXCUSAL_SELECT)
    .eq('member_id', memberId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as MemberExcusal[];
};

export const fetchMemberExcusalForEvent = async (
  memberId: string,
  eventId: string
): Promise<MemberExcusal | null> => {
  const { data, error } = await supabase
    .from('excusals')
    .select(EXCUSAL_SELECT)
    .eq('member_id', memberId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as MemberExcusal | null;
};

export const fetchExcusableEvents = async (): Promise<ExcusalEvent[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('events')
    .select('id, name, type, category, event_date, starts_at, ends_at, location, allow_excusals')
    .eq('category', 'mandatory')
    .eq('allow_excusals', true)
    .is('archived_at', null)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('starts_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ExcusalEvent[];
};

export const submitExcusal = async (
  memberId: string,
  eventId: string,
  reason: string,
  supportingNote: string
) => {
  const { data, error } = await supabase
    .from('excusals')
    .insert({
      member_id: memberId,
      event_id: eventId,
      reason: reason.trim(),
      supporting_note: supportingNote.trim() || null
    })
    .select(EXCUSAL_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as MemberExcusal;
};

export const fetchExcusalsForReview = async (): Promise<ReviewExcusal[]> => {
  const { data, error } = await supabase
    .from('excusals')
    .select(REVIEW_EXCUSAL_SELECT)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ReviewExcusal[];
};

export const reviewExcusal = async (
  excusalId: string,
  reviewerMemberId: string,
  status: Extract<ExcusalStatus, 'approved' | 'denied'>,
  reviewNote: string
) => {
  const { data, error } = await supabase
    .from('excusals')
    .update({
      status,
      reviewed_by: reviewerMemberId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote.trim() || null
    })
    .eq('id', excusalId)
    .select(REVIEW_EXCUSAL_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as ReviewExcusal;
};

export const getDisplayName = (member: { legal_first_name: string; legal_last_name: string; preferred_name: string | null }) =>
  `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`.trim();

export const getEventLabel = (event: ExcusalEvent | null) =>
  event ? `${formatEventType(event.type)} · ${formatEventDate(event.event_date)}` : 'Unknown event';

export const getEventTimeLabel = (event: ExcusalEvent | null) =>
  event ? formatEventTimeRange(event.starts_at, event.ends_at ?? event.starts_at) : 'No event time';
