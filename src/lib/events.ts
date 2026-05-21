import { supabase } from './supabase';

export type EventType = 'chapter_meeting' | 'social';
export type EventCategory = 'mandatory' | 'optional';

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
  created_at: string;
}

export interface EventAttendanceSummary {
  expected: number;
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
  officerNotes: string;
  allowExcusals: boolean;
  qrEnabled: boolean;
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
  created_at
`;

const toAttendanceSummary = (event: LiveEvent, statuses: string[]): EventAttendanceSummary => {
  const present = statuses.filter(status => status === 'on_time' || status === 'late' || status === 'present').length;
  const excused = statuses.filter(status => status === 'excused').length;
  const absent = Math.max(event.expected_count - present - excused, 0);

  return {
    expected: event.expected_count,
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
    throw error;
  }

  return attachAttendance((data ?? []) as LiveEvent[]);
};

export const fetchEventById = async (eventId: string): Promise<EventWithAttendance | null> => {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const [event] = await attachAttendance([data as LiveEvent]);
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
      officer_notes: values.officerNotes.trim() || null,
      allow_excusals: values.allowExcusals,
      qr_enabled: values.qrEnabled
    })
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as LiveEvent;
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
      officer_notes: values.officerNotes.trim() || null,
      allow_excusals: values.allowExcusals,
      qr_enabled: values.qrEnabled
    })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as LiveEvent;
};

export const archiveEvent = async (eventId: string): Promise<LiveEvent> => {
  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as LiveEvent;
};

export const restoreEvent = async (eventId: string): Promise<LiveEvent> => {
  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: null })
    .eq('id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as LiveEvent;
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
  officerNotes: event.officer_notes ?? '',
  allowExcusals: event.allow_excusals,
  qrEnabled: event.qr_enabled
});

export const defaultEventFormValues = (): EventFormValues => {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const eventDate = nextWeek.toISOString().slice(0, 10);

  return {
    name: '',
    type: 'chapter_meeting',
    category: 'optional',
    eventDate,
    startTime: '19:00',
    endTime: '20:00',
    location: '',
    expectedCount: 1,
    officerNotes: '',
    allowExcusals: true,
    qrEnabled: true
  };
};

export const formatEventType = (type: EventType) =>
  type === 'chapter_meeting' ? 'Chapter Meeting' : 'Social';

export const formatEventCategory = (category: EventCategory) =>
  category === 'mandatory' ? 'Mandatory' : 'Optional';

export const formatEventDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${isoDate}T00:00:00`));

export const formatEventTimeRange = (startsAt: string, endsAt: string) => {
  const formatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
};

export const getEventTiming = (event: LiveEvent) => {
  if (event.archived_at) return 'archived';
  return new Date(event.ends_at).getTime() < Date.now() ? 'past' : 'upcoming';
};

const toDateTime = (eventDate: string, time: string) => new Date(`${eventDate}T${time}:00`).toISOString();

const toTimeInput = (isoDate: string) => {
  const date = new Date(isoDate);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
