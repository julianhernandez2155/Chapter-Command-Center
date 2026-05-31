import { supabase } from './supabase';

export type EventType =
  | 'chapter_meeting'
  | 'executive_council'
  | 'committee'
  | 'social'
  | 'philanthropy'
  | 'community_service'
  | 'recruitment'
  | 'study_hours'
  | 'other';
export type EventCategory = 'mandatory' | 'optional';
export type AttendanceMode =
  | 'mandatory_all'
  | 'exec_only'
  | 'assignment'
  | 'signup'
  | 'rsvp'
  | 'open_check_in'
  | 'report_only'
  | 'duration_tracking';
export type GuestPolicy = 'none' | 'open_guest_list' | 'social_gender_policy' | 'hosted_philanthropy_guest_list';
export type AttendanceStatus = 'on_time' | 'late';

export interface LiveEvent {
  id: string;
  name: string;
  type: EventType;
  category: EventCategory;
  event_date: string;
  starts_at: string;
  ends_at: string;
  location: string;
  created_by: string;
  archived_at: string | null;
  check_in_open: boolean;
  check_in_token: string | null;
  late_cutoff_time: string | null;
  expected_count: number;
  officer_notes: string | null;
  allow_excusals: boolean;
  qr_enabled: boolean;
  attendance_mode: AttendanceMode;
  guest_check_in_enabled: boolean;
  guest_policy: GuestPolicy;
  brother_rsvp_enabled: boolean;
  min_brother_rsvp_count: number | null;
  signup_enabled: boolean;
  signup_capacity: number | null;
  signup_deadline: string | null;
  counts_toward_service_hours: boolean;
  hours: number | null;
  feeds_chapter_meeting_rate: boolean;
  feeds_recruitment_requirement: boolean;
  feeds_service_hours: boolean;
  feeds_missed_obligation_counter: boolean;
  check_in_opened_at: string | null;
  check_in_opened_by: string | null;
  check_in_closed_at: string | null;
  check_in_closed_by: string | null;
  check_in_token_rotated_at: string | null;
  created_at: string;
}

export interface EventAttendanceSummary {
  expected: number;
  onTime: number;
  late: number;
  present: number;
  excused: number;
  absent: number;
}

export interface EventWithAttendance extends LiveEvent {
  attendance: EventAttendanceSummary;
}

export interface EventFormValues {
  name: string;
  type: EventType;
  category: EventCategory;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  expectedCount: number;
  attendanceMode: AttendanceMode;
  lateCutoffTime: string;
  officerNotes: string;
  allowExcusals: boolean;
  qrEnabled: boolean;
  brotherRsvpEnabled: boolean;
  guestCheckInEnabled: boolean;
  guestPolicy: GuestPolicy;
  signupEnabled: boolean;
  signupCapacity: number | null;
  countsTowardServiceHours: boolean;
  hours: number | null;
  feedsChapterMeetingRate: boolean;
  feedsRecruitmentRequirement: boolean;
  feedsServiceHours: boolean;
  feedsMissedObligationCounter: boolean;
}

export interface AttendanceRosterRow {
  member_id: string;
  suid: string;
  display_name: string;
  member_status: string;
  expected: boolean;
  attendance_status: AttendanceStatus | null;
  attendance_method: 'qr' | 'manual' | 'csv' | null;
  checked_in_at: string | null;
  excusal_status: 'pending' | 'approved' | 'denied' | null;
  is_excused: boolean;
  logged_by_name: string | null;
  override_reason: string | null;
}

export interface CheckInResult {
  result: 'on_time' | 'late' | 'already_checked_in' | 'closed' | 'invalid';
  event_id?: string;
  event_name?: string;
  status?: AttendanceStatus;
  checked_in_at?: string;
  location?: string | null;
  token_grace_used?: boolean;
  current_social_ineligible?: boolean;
  message?: string;
}

export interface CheckInPreview {
  result: 'ready' | 'invalid';
  event_id?: string;
  event_name?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  late_cutoff_time?: string;
  location?: string | null;
  token_grace_available?: boolean;
  current_social_ineligible?: boolean;
  message?: string;
}

const EVENT_SELECT = `
  id,
  name,
  type,
  category,
  event_date,
  starts_at,
  ends_at,
  location,
  created_by,
  archived_at,
  check_in_open,
  check_in_token,
  late_cutoff_time,
  expected_count,
  officer_notes,
  allow_excusals,
  qr_enabled,
  attendance_mode,
  guest_check_in_enabled,
  guest_policy,
  brother_rsvp_enabled,
  min_brother_rsvp_count,
  signup_enabled,
  signup_capacity,
  signup_deadline,
  counts_toward_service_hours,
  hours,
  feeds_chapter_meeting_rate,
  feeds_recruitment_requirement,
  feeds_service_hours,
  feeds_missed_obligation_counter,
  check_in_opened_at,
  check_in_opened_by,
  check_in_closed_at,
  check_in_closed_by,
  check_in_token_rotated_at,
  created_at
`;

const LEGACY_EVENT_SELECT = `
  id,
  name,
  type,
  category,
  event_date,
  starts_at,
  ends_at,
  location,
  created_by,
  archived_at,
  check_in_open,
  check_in_token,
  late_cutoff_time,
  expected_count,
  officer_notes,
  allow_excusals,
  qr_enabled,
  created_at
`;

const normalizeLiveEvent = (event: Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>): LiveEvent => {
  const type = (event.type ?? 'chapter_meeting') as EventType;
  const category = (event.category ?? 'optional') as EventCategory;

  return {
    id: event.id,
    name: event.name,
    type,
    category,
    event_date: event.event_date ?? new Date().toISOString().slice(0, 10),
    starts_at: event.starts_at ?? new Date().toISOString(),
    ends_at: event.ends_at ?? event.starts_at ?? new Date().toISOString(),
    location: event.location ?? '',
    created_by: event.created_by ?? '',
    archived_at: event.archived_at ?? null,
    check_in_open: event.check_in_open ?? false,
    check_in_token: event.check_in_token ?? null,
    late_cutoff_time: event.late_cutoff_time ?? event.starts_at ?? null,
    expected_count: event.expected_count ?? 0,
    officer_notes: event.officer_notes ?? null,
    allow_excusals: event.allow_excusals ?? true,
    qr_enabled: event.qr_enabled ?? true,
    attendance_mode: event.attendance_mode ?? inferAttendanceMode(type),
    guest_check_in_enabled: event.guest_check_in_enabled ?? type === 'social',
    guest_policy: event.guest_policy ?? (type === 'social' ? 'social_gender_policy' : 'none'),
    brother_rsvp_enabled: event.brother_rsvp_enabled ?? type === 'social',
    min_brother_rsvp_count: event.min_brother_rsvp_count ?? null,
    signup_enabled: event.signup_enabled ?? type === 'community_service',
    signup_capacity: event.signup_capacity ?? null,
    signup_deadline: event.signup_deadline ?? null,
    counts_toward_service_hours: event.counts_toward_service_hours ?? ['community_service', 'philanthropy'].includes(type),
    hours: event.hours ?? null,
    feeds_chapter_meeting_rate: event.feeds_chapter_meeting_rate ?? type === 'chapter_meeting',
    feeds_recruitment_requirement: event.feeds_recruitment_requirement ?? type === 'recruitment',
    feeds_service_hours: event.feeds_service_hours ?? ['community_service', 'philanthropy'].includes(type),
    feeds_missed_obligation_counter: event.feeds_missed_obligation_counter ?? category === 'mandatory',
    check_in_opened_at: event.check_in_opened_at ?? null,
    check_in_opened_by: event.check_in_opened_by ?? null,
    check_in_closed_at: event.check_in_closed_at ?? null,
    check_in_closed_by: event.check_in_closed_by ?? null,
    check_in_token_rotated_at: event.check_in_token_rotated_at ?? null,
    created_at: event.created_at ?? new Date().toISOString()
  };
};

const isMissingPolicyColumnError = (error: { message?: string; code?: string } | null) =>
  Boolean(error && (error.code === '42703' || error.message?.includes('attendance_mode') || error.message?.includes('guest_check_in_enabled')));

const toAttendanceSummary = (event: LiveEvent, statuses: string[]): EventAttendanceSummary => {
  const onTime = statuses.filter(status => status === 'on_time').length;
  const late = statuses.filter(status => status === 'late').length;
  const present = onTime + late + statuses.filter(status => status === 'present').length;
  const excused = statuses.filter(status => status === 'excused').length;
  const absent = Math.max(event.expected_count - present - excused, 0);

  return {
    expected: event.expected_count,
    onTime,
    late,
    present,
    excused,
    absent
  };
};

const attachAttendance = async (events: LiveEvent[]): Promise<EventWithAttendance[]> => {
  if (events.length === 0) return [];

  const eventIds = events.map(event => event.id);
  const { data, error } = await supabase
    .from('event_attendees')
    .select('event_id, status')
    .in('event_id', eventIds);

  const statusesByEvent = new Map<string, string[]>();

  if (!error) {
    for (const attendee of data ?? []) {
      const statuses = statusesByEvent.get(attendee.event_id) ?? [];
      statuses.push(attendee.status);
      statusesByEvent.set(attendee.event_id, statuses);
    }
  } else {
    console.error('Error loading event attendance counts:', error);
  }

  return events.map(event => ({
    ...event,
    attendance: toAttendanceSummary(event, statusesByEvent.get(event.id) ?? [])
  }));
};

export const fetchEvents = async (): Promise<EventWithAttendance[]> => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .order('starts_at', { ascending: true });

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .select(LEGACY_EVENT_SELECT)
        .order('starts_at', { ascending: true });

      if (legacyError) throw legacyError;
      return attachAttendance((legacyData ?? []).map(event => normalizeLiveEvent(event as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>)));
    }

    throw error;
  }

  return attachAttendance((data ?? []).map(event => normalizeLiveEvent(event as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>)));
};

export const fetchEventById = async (eventId: string): Promise<EventWithAttendance | null> => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .select(LEGACY_EVENT_SELECT)
        .eq('id', eventId)
        .maybeSingle();

      if (legacyError) throw legacyError;
      if (!legacyData) return null;

      const [legacyEvent] = await attachAttendance([normalizeLiveEvent(legacyData as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>)]);
      return legacyEvent;
    }

    throw error;
  }

  if (!data) return null;

  const [event] = await attachAttendance([normalizeLiveEvent(data as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>)]);
  return event;
};

export const createEvent = async (values: EventFormValues, createdByMemberId: string): Promise<LiveEvent> => {
  const startsAt = toDateTime(values.eventDate, values.startTime);
  const endsAt = toDateTime(values.eventDate, values.endTime);

  const { data, error } = await supabase
    .from('events')
    .insert({
      name: values.name.trim(),
      type: values.type,
      category: values.category,
      event_date: values.eventDate,
      starts_at: startsAt,
      ends_at: endsAt,
      location: values.location.trim(),
      created_by: createdByMemberId,
      check_in_open: false,
      expected_count: values.expectedCount,
      attendance_mode: values.attendanceMode,
      late_cutoff_time: toDateTime(values.eventDate, values.lateCutoffTime),
      officer_notes: values.officerNotes.trim() || null,
      allow_excusals: values.allowExcusals,
      qr_enabled: values.qrEnabled,
      brother_rsvp_enabled: values.brotherRsvpEnabled,
      guest_check_in_enabled: values.guestCheckInEnabled,
      guest_policy: values.guestPolicy,
      signup_enabled: values.signupEnabled,
      signup_capacity: values.signupCapacity,
      counts_toward_service_hours: values.countsTowardServiceHours,
      hours: values.hours,
      feeds_chapter_meeting_rate: values.feedsChapterMeetingRate,
      feeds_recruitment_requirement: values.feedsRecruitmentRequirement,
      feeds_service_hours: values.feedsServiceHours,
      feeds_missed_obligation_counter: values.feedsMissedObligationCounter
    })
    .select(EVENT_SELECT)
    .single();

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .insert({
          name: values.name.trim(),
          type: values.type,
          category: values.category,
          event_date: values.eventDate,
          starts_at: startsAt,
          ends_at: endsAt,
          location: values.location.trim(),
          created_by: createdByMemberId,
          check_in_open: false,
          expected_count: values.expectedCount,
          late_cutoff_time: toDateTime(values.eventDate, values.lateCutoffTime),
          officer_notes: values.officerNotes.trim() || null,
          allow_excusals: values.allowExcusals,
          qr_enabled: values.qrEnabled
        })
        .select(LEGACY_EVENT_SELECT)
        .single();

      if (legacyError) throw legacyError;
      return normalizeLiveEvent(legacyData as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
    }

    throw error;
  }

  return normalizeLiveEvent(data as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
};

export const openEventCheckIn = async (eventId: string) => {
  const { data, error } = await supabase.rpc('open_event_check_in', { target_event_id: eventId });
  if (error) throw error;
  return data as { event_id: string; token: string; check_in_open: boolean; expected_count: number; late_cutoff_time: string | null };
};

export const rotateEventCheckInToken = async (eventId: string) => {
  const { data, error } = await supabase.rpc('rotate_event_check_in_token', { target_event_id: eventId });
  if (error) throw error;
  return data as { event_id: string; token: string; rotated_at: string };
};

export const closeEventCheckIn = async (eventId: string) => {
  const { data, error } = await supabase.rpc('close_event_check_in', { target_event_id: eventId });
  if (error) throw error;
  return data as {
    event_id: string;
    check_in_open: boolean;
    expected_count: number;
    present_count: number;
    excused_count: number;
    absent_count: number;
  };
};

export const checkInMemberByToken = async (token: string): Promise<CheckInResult> => {
  const { data, error } = await supabase.rpc('check_in_member_by_token', { submitted_token: token });
  if (error) throw error;
  return data as CheckInResult;
};

export const previewCheckInToken = async (token: string): Promise<CheckInPreview> => {
  const { data, error } = await supabase.rpc('preview_check_in_token', { submitted_token: token });
  if (error) throw error;
  return data as CheckInPreview;
};

export const fetchAttendanceRoster = async (eventId: string): Promise<AttendanceRosterRow[]> => {
  const { data, error } = await supabase.rpc('attendance_event_roster', { target_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as AttendanceRosterRow[];
};

export const manualMarkAttendance = async (
  eventId: string,
  memberId: string,
  status: AttendanceStatus,
  reason: string
) => {
  const { data, error } = await supabase.rpc('manual_mark_attendance', {
    target_event_id: eventId,
    target_member_id: memberId,
    target_status: status,
    reason
  });

  if (error) throw error;
  return data as { event_id: string; member_id: string; status: AttendanceStatus; checked_in_at: string };
};

export const importCsvAttendance = async (
  eventId: string,
  memberIds: string[],
  status: AttendanceStatus,
  reason: string
) => {
  const { data, error } = await supabase.rpc('import_csv_attendance', {
    target_event_id: eventId,
    target_member_ids: memberIds,
    target_status: status,
    reason
  });

  if (error) throw error;
  return data as {
    event_id: string;
    imported_count: number;
    status: AttendanceStatus;
    method: 'csv';
  };
};

export const recordQuorumSnapshot = async (eventId: string, snapshotType = 'vote', notes = '') => {
  const { data, error } = await supabase.rpc('record_quorum_snapshot', {
    target_event_id: eventId,
    target_snapshot_type: snapshotType,
    target_notes: notes
  });

  if (error) throw error;
  return data as {
    id: string;
    event_id: string;
    present_count: number;
    eligible_count: number;
    threshold_count: number;
    quorum_met: boolean;
  };
};

export const publishWeeklyIneligibleList = async (eventId: string) => {
  const { data, error } = await supabase.rpc('publish_weekly_ineligible_list', { chapter_event_id: eventId });
  if (error) throw error;
  return data as { list_id: string; chapter_event_id: string; published_count: number; week_start: string };
};

export const updateEvent = async (eventId: string, values: EventFormValues): Promise<LiveEvent> => {
  const startsAt = toDateTime(values.eventDate, values.startTime);
  const endsAt = toDateTime(values.eventDate, values.endTime);

  const { data, error } = await supabase
    .from('events')
    .update({
      name: values.name.trim(),
      type: values.type,
      category: values.category,
      event_date: values.eventDate,
      starts_at: startsAt,
      ends_at: endsAt,
      location: values.location.trim(),
      expected_count: values.expectedCount,
      attendance_mode: values.attendanceMode,
      late_cutoff_time: toDateTime(values.eventDate, values.lateCutoffTime),
      officer_notes: values.officerNotes.trim() || null,
      allow_excusals: values.allowExcusals,
      qr_enabled: values.qrEnabled,
      brother_rsvp_enabled: values.brotherRsvpEnabled,
      guest_check_in_enabled: values.guestCheckInEnabled,
      guest_policy: values.guestPolicy,
      signup_enabled: values.signupEnabled,
      signup_capacity: values.signupCapacity,
      counts_toward_service_hours: values.countsTowardServiceHours,
      hours: values.hours,
      feeds_chapter_meeting_rate: values.feedsChapterMeetingRate,
      feeds_recruitment_requirement: values.feedsRecruitmentRequirement,
      feeds_service_hours: values.feedsServiceHours,
      feeds_missed_obligation_counter: values.feedsMissedObligationCounter
    })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .update({
          name: values.name.trim(),
          type: values.type,
          category: values.category,
          event_date: values.eventDate,
          starts_at: startsAt,
          ends_at: endsAt,
          location: values.location.trim(),
          expected_count: values.expectedCount,
          late_cutoff_time: toDateTime(values.eventDate, values.lateCutoffTime),
          officer_notes: values.officerNotes.trim() || null,
          allow_excusals: values.allowExcusals,
          qr_enabled: values.qrEnabled
        })
        .eq('id', eventId)
        .select(LEGACY_EVENT_SELECT)
        .single();

      if (legacyError) throw legacyError;
      return normalizeLiveEvent(legacyData as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
    }

    throw error;
  }

  return normalizeLiveEvent(data as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
};

export const archiveEvent = async (eventId: string): Promise<LiveEvent> => {
  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', eventId)
        .select(LEGACY_EVENT_SELECT)
        .single();

      if (legacyError) throw legacyError;
      return normalizeLiveEvent(legacyData as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
    }

    throw error;
  }

  return normalizeLiveEvent(data as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
};

export const restoreEvent = async (eventId: string): Promise<LiveEvent> => {
  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: null })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    if (isMissingPolicyColumnError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('events')
        .update({ archived_at: null })
        .eq('id', eventId)
        .select(LEGACY_EVENT_SELECT)
        .single();

      if (legacyError) throw legacyError;
      return normalizeLiveEvent(legacyData as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
    }

    throw error;
  }

  return normalizeLiveEvent(data as Partial<LiveEvent> & Pick<LiveEvent, 'id' | 'name'>);
};

export const eventToFormValues = (event: LiveEvent): EventFormValues => ({
  name: event.name,
  type: event.type,
  category: event.category,
  eventDate: event.event_date,
  startTime: toTimeInput(event.starts_at),
  endTime: toTimeInput(event.ends_at),
  location: event.location,
  expectedCount: event.expected_count,
  attendanceMode: event.attendance_mode ?? inferAttendanceMode(event.type),
  lateCutoffTime: toTimeInput(event.late_cutoff_time ?? event.starts_at),
  officerNotes: event.officer_notes ?? '',
  allowExcusals: event.allow_excusals,
  qrEnabled: event.qr_enabled,
  brotherRsvpEnabled: event.brother_rsvp_enabled ?? event.type === 'social',
  guestCheckInEnabled: event.guest_check_in_enabled ?? event.type === 'social',
  guestPolicy: event.guest_policy ?? (event.type === 'social' ? 'social_gender_policy' : 'none'),
  signupEnabled: event.signup_enabled ?? event.type === 'community_service',
  signupCapacity: event.signup_capacity ?? null,
  countsTowardServiceHours: event.counts_toward_service_hours ?? ['community_service', 'philanthropy'].includes(event.type),
  hours: event.hours ?? null,
  feedsChapterMeetingRate: event.feeds_chapter_meeting_rate ?? event.type === 'chapter_meeting',
  feedsRecruitmentRequirement: event.feeds_recruitment_requirement ?? event.type === 'recruitment',
  feedsServiceHours: event.feeds_service_hours ?? ['community_service', 'philanthropy'].includes(event.type),
  feedsMissedObligationCounter: event.feeds_missed_obligation_counter ?? event.category === 'mandatory'
});

export const defaultEventFormValues = (): EventFormValues => {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const eventDate = nextWeek.toISOString().slice(0, 10);

  return {
    name: '',
    type: 'chapter_meeting',
    category: 'mandatory',
    eventDate,
    startTime: '19:00',
    endTime: '20:00',
    location: '',
    expectedCount: 0,
    attendanceMode: 'mandatory_all',
    lateCutoffTime: '19:00',
    officerNotes: '',
    allowExcusals: true,
    qrEnabled: true,
    brotherRsvpEnabled: false,
    guestCheckInEnabled: false,
    guestPolicy: 'none',
    signupEnabled: false,
    signupCapacity: null,
    countsTowardServiceHours: false,
    hours: null,
    feedsChapterMeetingRate: true,
    feedsRecruitmentRequirement: false,
    feedsServiceHours: false,
    feedsMissedObligationCounter: true
  };
};

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'chapter_meeting', label: 'Chapter Meeting' },
  { value: 'executive_council', label: 'Executive Council' },
  { value: 'committee', label: 'Committee' },
  { value: 'social', label: 'Social' },
  { value: 'philanthropy', label: 'Philanthropy' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'study_hours', label: 'Study Hours' },
  { value: 'other', label: 'Other' }
];

export const ATTENDANCE_MODE_OPTIONS: { value: AttendanceMode; label: string }[] = [
  { value: 'mandatory_all', label: 'All Active Expected' },
  { value: 'exec_only', label: 'Executive Council' },
  { value: 'assignment', label: 'Officer Assignment' },
  { value: 'signup', label: 'Signup Creates Expectation' },
  { value: 'rsvp', label: 'Soft RSVP' },
  { value: 'open_check_in', label: 'Open Check-In' },
  { value: 'report_only', label: 'Report Only' },
  { value: 'duration_tracking', label: 'Duration Tracking' }
];

export const formatEventType = (type: EventType) =>
  EVENT_TYPE_OPTIONS.find(option => option.value === type)?.label ?? type;

export const formatAttendanceMode = (mode: AttendanceMode) =>
  ATTENDANCE_MODE_OPTIONS.find(option => option.value === mode)?.label ?? mode;

export const formatEventCategory = (category: EventCategory) =>
  category === 'mandatory' ? 'Mandatory' : 'Optional';

export const formatEventDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${isoDate}T00:00:00`));

export const formatEventTimeRange = (startsAt: string, endsAt: string) => {
  const formatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
};

export const getGoogleCalendarUrl = (event: LiveEvent) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${formatCalendarDateTime(event.starts_at)}/${formatCalendarDateTime(event.ends_at)}`,
    details: [
      formatEventType(event.type),
      formatEventCategory(event.category),
      event.officer_notes ? `Notes: ${event.officer_notes}` : null
    ].filter(Boolean).join('\n'),
    location: event.location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const buildEventsIcs = (events: LiveEvent[], calendarName = 'Chapter Command Center Events') => {
  const now = formatCalendarDateTime(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chapter Command Center//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsValue(calendarName)}`,
    ...events.flatMap(event => [
      'BEGIN:VEVENT',
      `UID:${event.id}@chapter-command-center`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatCalendarDateTime(event.starts_at)}`,
      `DTEND:${formatCalendarDateTime(event.ends_at)}`,
      `SUMMARY:${escapeIcsValue(event.name)}`,
      `DESCRIPTION:${escapeIcsValue([
        formatEventType(event.type),
        formatEventCategory(event.category),
        event.officer_notes ? `Notes: ${event.officer_notes}` : null
      ].filter(Boolean).join('\\n'))}`,
      `LOCATION:${escapeIcsValue(event.location)}`,
      'END:VEVENT'
    ]),
    'END:VCALENDAR'
  ];

  return `${lines.join('\r\n')}\r\n`;
};

export const getEventTiming = (event: LiveEvent) => {
  if (event.archived_at) return 'archived';
  return new Date(event.ends_at).getTime() < Date.now() ? 'past' : 'upcoming';
};

const toDateTime = (eventDate: string, time: string) => new Date(`${eventDate}T${time}:00`).toISOString();

const formatCalendarDateTime = (isoDate: string) =>
  new Date(isoDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const escapeIcsValue = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const toTimeInput = (isoDate: string) => {
  const date = new Date(isoDate);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const inferAttendanceMode = (type: EventType): AttendanceMode => {
  if (type === 'chapter_meeting' || type === 'philanthropy') return 'mandatory_all';
  if (type === 'executive_council') return 'exec_only';
  if (type === 'committee') return 'report_only';
  if (type === 'social') return 'rsvp';
  if (type === 'community_service') return 'signup';
  if (type === 'recruitment') return 'open_check_in';
  if (type === 'study_hours') return 'duration_tracking';
  return 'open_check_in';
};

export const applyEventTypeDefaults = (values: EventFormValues, type: EventType): EventFormValues => {
  const attendanceMode = inferAttendanceMode(type);
  const isChapterMeeting = type === 'chapter_meeting';
  const isSocial = type === 'social';
  const isService = type === 'community_service';
  const isPhilanthropy = type === 'philanthropy';
  const isRecruitment = type === 'recruitment';
  const isCommittee = type === 'committee';
  const isStudyHours = type === 'study_hours';

  return {
    ...values,
    type,
    category: isChapterMeeting || isPhilanthropy ? 'mandatory' : values.category,
    attendanceMode,
    allowExcusals: isChapterMeeting || isPhilanthropy || type === 'executive_council' ? true : values.allowExcusals,
    qrEnabled: !isCommittee && !isStudyHours,
    brotherRsvpEnabled: isSocial,
    guestCheckInEnabled: isSocial || isPhilanthropy,
    guestPolicy: isSocial ? 'social_gender_policy' : isPhilanthropy ? 'hosted_philanthropy_guest_list' : 'none',
    signupEnabled: isService,
    signupCapacity: isService ? values.signupCapacity ?? 40 : values.signupCapacity,
    countsTowardServiceHours: isService || isPhilanthropy,
    hours: isService || isPhilanthropy ? values.hours ?? 2 : values.hours,
    feedsChapterMeetingRate: isChapterMeeting,
    feedsRecruitmentRequirement: isRecruitment,
    feedsServiceHours: isService || isPhilanthropy,
    feedsMissedObligationCounter: isChapterMeeting || isPhilanthropy || values.category === 'mandatory'
  };
};
