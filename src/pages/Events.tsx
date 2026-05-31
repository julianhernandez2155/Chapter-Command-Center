import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  applyEventTypeDefaults,
  ATTENDANCE_MODE_OPTIONS,
  buildEventsIcs,
  createEvent,
  defaultEventFormValues,
  EventFormValues,
  EVENT_TYPE_OPTIONS,
  EventWithAttendance,
  formatAttendanceMode,
  formatEventCategory,
  formatEventTimeRange,
  formatEventType,
  getGoogleCalendarUrl,
  getEventTiming
} from '../lib/events';
import { fetchEvents } from '../lib/events';

type EventTab = 'upcoming' | 'past' | 'archived';
type EventViewMode = 'list' | 'calendar';

export const Events = () => {
  const { member, can } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming');
  const [viewMode, setViewMode] = useState<EventViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const canCreateEvents = can('events.create');

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      setEvents(await fetchEvents());
    } catch (err) {
      console.error('Error loading live events:', err);
      setError('Unable to load live events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events.filter(event => {
      const matchesSearch = normalizedSearch.length === 0
        || event.name.toLowerCase().includes(normalizedSearch)
        || event.location.toLowerCase().includes(normalizedSearch)
        || formatEventType(event.type).toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [events, search]);

  const visibleEvents = useMemo(() => (
    filteredEvents.filter(event => getEventTiming(event) === activeTab)
  ), [activeTab, filteredEvents]);

  const calendarEvents = useMemo(() => (
    filteredEvents.filter(event => !event.archived_at)
  ), [filteredEvents]);

  const calendarMonthEvents = useMemo(() => (
    calendarEvents.filter(event => isSameMonth(new Date(`${event.event_date}T00:00:00`), calendarMonth))
  ), [calendarEvents, calendarMonth]);

  const handleExportMonth = () => {
    if (calendarMonthEvents.length === 0) return;

    const monthLabel = formatMonthLabel(calendarMonth);
    const ics = buildEventsIcs(calendarMonthEvents, `Chapter Command Center ${monthLabel}`);
    downloadTextFile(
      `chapter-command-center-${toMonthFileSlug(calendarMonth)}.ics`,
      ics,
      'text/calendar;charset=utf-8'
    );
  };

  const handleCreate = async (values: EventFormValues) => {
    if (!member) return;

    setSaving(true);
    setError(null);

    try {
      const created = await createEvent(values, member.id);
      setIsCreateModalOpen(false);
      await loadEvents();
      navigate(`/events/${created.id}`);
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Unable to create event. Check your permissions and event fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <section className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-on-surface mb-2">Chapter Events</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-lg">Live chapter schedule, event operations, and calendar export in one place.</p>
        </div>
        {canCreateEvents && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary text-white px-8 py-4 rounded-full font-black tracking-widest uppercase text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={20} />
            Create Event
          </button>
        )}
      </section>

      <div className="flex flex-col gap-4 bg-surface-container-low/30 p-4 rounded-2xl border border-white/5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
            <input
              className="w-full bg-surface-container-lowest border-none rounded-full py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-primary/50"
              placeholder="Search events..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button
            onClick={handleExportMonth}
            disabled={viewMode !== 'calendar' || calendarMonthEvents.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-lowest px-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export Month
          </button>
        </div>

          <div className="flex bg-surface-container-lowest p-1 rounded-full border border-white/5">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  viewMode === mode.value ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant/50 hover:text-on-surface"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="flex bg-surface-container-lowest p-1 rounded-full border border-white/5 md:w-fit">
            {EVENT_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab.value ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant/50 hover:text-on-surface"
              )}
            >
              {tab.label}
            </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <section className="bg-error/10 rounded-xl p-6 border border-error/20 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      {loading ? (
        <section className="bg-surface-container-low/40 rounded-xl p-10 border border-white/5 flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading live events</span>
        </section>
      ) : viewMode === 'calendar' ? (
        <MonthCalendar
          month={calendarMonth}
          events={calendarEvents}
          monthEvents={calendarMonthEvents}
          onPreviousMonth={() => setCalendarMonth(current => addMonths(current, -1))}
          onNextMonth={() => setCalendarMonth(current => addMonths(current, 1))}
          onToday={() => setCalendarMonth(startOfMonth(new Date()))}
          onOpenEvent={event => navigate(`/events/${event.id}`)}
          onExportMonth={handleExportMonth}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleEvents.length === 0 && (
            <div className="py-20 text-center bg-surface-container-low/30 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-on-surface-variant/40">No events in this view</p>
            </div>
          )}

          {visibleEvents.map(event => (
            <React.Fragment key={event.id}>
              <EventRow event={event} onClick={() => navigate(`/events/${event.id}`)} />
            </React.Fragment>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isCreateModalOpen && (
          <EventFormModal
            title="Create Event"
            saving={saving}
            initialValues={defaultEventFormValues()}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EVENT_TABS: { value: EventTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'archived', label: 'Archived' }
];

const VIEW_MODES: { value: EventViewMode; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' }
];

const EventRow = ({ event, onClick }: { event: EventWithAttendance; onClick: () => void }) => {
  const date = new Date(`${event.event_date}T00:00:00`);
  const attendancePct = event.attendance.expected > 0
    ? Math.min((event.attendance.present / event.attendance.expected) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-surface-container-low p-6 rounded-2xl border border-white/5 hover:bg-surface-container-high transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 text-left"
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-6 text-left">
        <div className={cn(
          "h-16 w-16 shrink-0 rounded-2xl flex flex-col items-center justify-center border",
          event.category === 'mandatory' ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-secondary/20 text-secondary"
        )}>
          <span className="text-[10px] font-black uppercase leading-none mb-1">
            {new Intl.DateTimeFormat('en', { month: 'short' }).format(date)}
          </span>
          <span className="text-2xl font-black leading-none">{date.getDate()}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold tracking-tight">{event.name}</h3>
            {event.category === 'mandatory' && (
              <span className="bg-red-600/20 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Mandatory</span>
            )}
            {event.archived_at && (
              <span className="bg-surface-container-high text-on-surface-variant text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Archived</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-on-surface-variant text-xs font-medium">
            <span className="flex items-center gap-1.5"><Clock size={14} /> {formatEventTimeRange(event.starts_at, event.ends_at)}</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>
            <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {formatEventType(event.type)}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Attendance</span>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-surface-container-lowest rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${attendancePct}%` }} />
            </div>
            <span className="text-sm font-bold">{event.attendance.present}/{event.attendance.expected}</span>
          </div>
        </div>
        <a
          href={getGoogleCalendarUrl(event)}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant transition-colors hover:text-secondary"
          aria-label={`Add ${event.name} to Google Calendar`}
          title="Add to Google Calendar"
        >
          <ExternalLink size={16} />
        </a>
        <ChevronRight className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
};

const MonthCalendar = ({
  month,
  events,
  monthEvents,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onOpenEvent,
  onExportMonth
}: {
  month: Date;
  events: EventWithAttendance[];
  monthEvents: EventWithAttendance[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenEvent: (event: EventWithAttendance) => void;
  onExportMonth: () => void;
}) => {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const monthLabel = formatMonthLabel(month);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-surface-container-low p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-secondary">Calendar View</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-on-surface">{monthLabel}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onToday}
            className="min-h-11 rounded-full bg-surface-container-lowest px-5 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Today
          </button>
          <div className="flex rounded-full bg-surface-container-lowest p-1">
            <button onClick={onPreviousMonth} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface" aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <button onClick={onNextMonth} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface" aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={onExportMonth}
            disabled={monthEvents.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export .ics
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2rem] bg-surface-container-low no-scrollbar">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 bg-surface-container-lowest">
            {WEEKDAY_LABELS.map(day => (
              <div key={day} className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map(day => {
              const key = toDateKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isMuted = !isSameMonth(day, month);
              const isToday = toDateKey(day) === toDateKey(new Date());

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-36 p-3 transition-colors md:min-h-40',
                    isMuted ? 'bg-surface-container-lowest/35 text-on-surface-variant/40' : 'bg-surface-container-low text-on-surface',
                    isToday && 'bg-surface-container-high/60'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black',
                      isToday ? 'bg-primary text-white' : 'text-on-surface-variant'
                    )}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-black uppercase tracking-[0.12rem] text-secondary">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayEvents.slice(0, 4).map(event => (
                      <React.Fragment key={event.id}>
                        <CalendarEventChip event={event} onOpen={() => onOpenEvent(event)} />
                      </React.Fragment>
                    ))}
                    {dayEvents.length > 4 && (
                      <p className="px-2 text-[10px] font-bold text-on-surface-variant">
                        +{dayEvents.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const CalendarEventChip = ({ event, onOpen }: { event: EventWithAttendance; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className={cn(
      'w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-container-high',
      event.category === 'mandatory' ? 'bg-primary/10 text-on-surface' : 'bg-secondary/10 text-on-surface'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-xs font-black">{event.name}</span>
      {event.check_in_open && <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />}
    </div>
    <p className="mt-1 truncate text-[10px] font-bold text-on-surface-variant">
      {formatEventTimeRange(event.starts_at, event.ends_at)}
    </p>
  </button>
);

export const EventFormModal = ({
  title,
  initialValues,
  saving,
  onClose,
  onSubmit
}: {
  title: string;
  initialValues: EventFormValues;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
}) => {
  const [values, setValues] = useState<EventFormValues>(initialValues);

  const updateValue = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    setValues(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl h-full bg-surface-container-low shadow-2xl overflow-y-auto no-scrollbar"
      >
        <div className="p-12 space-y-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="text-primary" size={24} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">{title}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            <section className="space-y-6">
              <h3 className="rounded-full bg-surface-container-lowest px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/50">Basic Information</h3>
              <div className="space-y-4">
                <InputField label="Event Name">
                  <input
                    required
                    className="w-full sunken-input"
                    placeholder="e.g. Spring Chapter Meeting"
                    value={values.name}
                    onChange={event => updateValue('name', event.target.value)}
                  />
                </InputField>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Event Type">
                    <select
                      className="w-full sunken-input appearance-none"
                      value={values.type}
                      onChange={event => setValues(current => applyEventTypeDefaults(current, event.target.value as EventFormValues['type']))}
                    >
                      {EVENT_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </InputField>
                  <InputField label="Location">
                    <input
                      required
                      className="w-full sunken-input"
                      placeholder="e.g. Hendricks Chapel"
                      value={values.location}
                      onChange={event => updateValue('location', event.target.value)}
                    />
                  </InputField>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="rounded-full bg-surface-container-lowest px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/50">Attendance Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Attendance Mode">
                  <select
                    className="w-full sunken-input appearance-none"
                    value={values.attendanceMode}
                    onChange={event => updateValue('attendanceMode', event.target.value as EventFormValues['attendanceMode'])}
                  >
                    {ATTENDANCE_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </InputField>
                <InputField label="Late Cutoff">
                  <input
                    required
                    type="time"
                    className="w-full sunken-input"
                    value={values.lateCutoffTime}
                    onChange={event => updateValue('lateCutoffTime', event.target.value)}
                  />
                </InputField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PolicyToggle
                  label="Mandatory Attendance"
                  description="Absences require formal excusal."
                  checked={values.category === 'mandatory'}
                  onChange={() => updateValue('category', values.category === 'mandatory' ? 'optional' : 'mandatory')}
                />
                <PolicyToggle
                  label="QR Check-In Enabled"
                  description="Generate dynamic QR for entry."
                  checked={values.qrEnabled}
                  onChange={() => updateValue('qrEnabled', !values.qrEnabled)}
                />
                <PolicyToggle
                  label="Allow Excusals"
                  description="Members can submit excuse forms."
                  checked={values.allowExcusals}
                  onChange={() => updateValue('allowExcusals', !values.allowExcusals)}
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="rounded-full bg-surface-container-lowest px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/50">Schedule</h3>
              <div className="grid grid-cols-3 gap-4">
                <InputField label="Date">
                  <input
                    required
                    type="date"
                    className="w-full sunken-input"
                    value={values.eventDate}
                    onChange={event => updateValue('eventDate', event.target.value)}
                  />
                </InputField>
                <InputField label="Start Time">
                  <input
                    required
                    type="time"
                    className="w-full sunken-input"
                    value={values.startTime}
                    onChange={event => updateValue('startTime', event.target.value)}
                  />
                </InputField>
                <InputField label="End Time">
                  <input
                    required
                    type="time"
                    className="w-full sunken-input"
                    value={values.endTime}
                    onChange={event => updateValue('endTime', event.target.value)}
                  />
                </InputField>
              </div>
              <InputField label="Expected Attendance Cache">
                <div className="sunken-input min-h-12 py-3">
                  <p className="text-sm font-black text-on-surface">{values.expectedCount}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant/50">
                    Derived from roster policy when check-in opens.
                  </p>
                </div>
              </InputField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PolicyToggle
                  label="Brother RSVP"
                  description="Soft planning response. Does not create punitive expectation."
                  checked={values.brotherRsvpEnabled}
                  onChange={() => updateValue('brotherRsvpEnabled', !values.brotherRsvpEnabled)}
                />
                <PolicyToggle
                  label="Guest Check-In"
                  description="Enables future door or philanthropy guest ledger."
                  checked={values.guestCheckInEnabled}
                  onChange={() => updateValue('guestCheckInEnabled', !values.guestCheckInEnabled)}
                />
                <PolicyToggle
                  label="Signup Enabled"
                  description="Members sign up and become expected where policy allows."
                  checked={values.signupEnabled}
                  onChange={() => updateValue('signupEnabled', !values.signupEnabled)}
                />
                <PolicyToggle
                  label="Service Hours"
                  description="Checked-in members receive officer-set service credit."
                  checked={values.countsTowardServiceHours}
                  onChange={() => {
                    updateValue('countsTowardServiceHours', !values.countsTowardServiceHours);
                    updateValue('feedsServiceHours', !values.countsTowardServiceHours);
                  }}
                />
              </div>
              {(values.signupEnabled || values.countsTowardServiceHours) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {values.signupEnabled && (
                    <InputField label="Signup Capacity">
                      <input
                        min={0}
                        type="number"
                        className="w-full sunken-input"
                        value={values.signupCapacity ?? ''}
                        onChange={event => updateValue('signupCapacity', event.target.value === '' ? null : Number(event.target.value))}
                      />
                    </InputField>
                  )}
                  {values.countsTowardServiceHours && (
                    <InputField label="Hours Per Attendee">
                      <input
                        min={0}
                        step="0.25"
                        type="number"
                        className="w-full sunken-input"
                        value={values.hours ?? ''}
                        onChange={event => updateValue('hours', event.target.value === '' ? null : Number(event.target.value))}
                      />
                    </InputField>
                  )}
                </div>
              )}
              <InputField label="Officer Notes">
                <textarea
                  className="w-full sunken-input min-h-28 resize-none"
                  placeholder="Operational notes for officers."
                  value={values.officerNotes}
                  onChange={event => updateValue('officerNotes', event.target.value)}
                />
              </InputField>
            </section>
            <OperationalPreview values={values} />
          </div>

          <div className="pt-12 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-5 rounded-full font-bold uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
            <button disabled={saving} className="flex-[2] py-5 bg-primary text-white rounded-full font-black uppercase tracking-[0.2rem] text-sm shadow-xl shadow-primary/20 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">{label}</label>
    {children}
  </div>
);

const OperationalPreview = ({ values }: { values: EventFormValues }) => {
  const facts = [
    { label: 'Roster Source', value: formatAttendanceMode(values.attendanceMode) },
    { label: 'QR Mode', value: values.qrEnabled ? `Enabled, cutoff ${values.lateCutoffTime}` : 'Disabled' },
    { label: 'Excusals', value: values.allowExcusals ? 'Allowed' : 'Not allowed' },
    { label: 'Guest Policy', value: values.guestPolicy.replaceAll('_', ' ') },
    {
      label: 'Tier Input',
      value: values.feedsChapterMeetingRate
        ? 'Chapter meeting rate'
        : values.feedsServiceHours
          ? 'Service hours'
          : values.feedsRecruitmentRequirement
            ? 'Recruitment count'
            : 'None'
    },
    { label: 'Missed Obligation', value: values.feedsMissedObligationCounter ? 'Feeds counter' : 'No counter impact' }
  ];

  return (
    <section className="rounded-3xl bg-surface-container-low p-6 space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24rem] text-secondary">Operational Preview</p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-on-surface">Before save</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {facts.map(fact => (
          <div key={fact.label} className="rounded-2xl bg-surface-container-lowest p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">{fact.label}</p>
            <p className="mt-1 text-sm font-bold capitalize text-on-surface">{fact.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const PolicyToggle = ({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className={cn(
      "p-5 rounded-2xl border text-left transition-all",
      checked ? "bg-primary/5 border-primary/20" : "bg-surface-container-low border-white/5"
    )}
  >
    <div className="flex justify-between items-center mb-2">
      <span className={cn("text-xs font-bold uppercase tracking-widest", checked ? "text-primary" : "text-on-surface")}>{label}</span>
      <div className={cn("w-8 h-4 rounded-full relative transition-colors", checked ? "bg-primary" : "bg-surface-container-high")}>
        <div className={cn("absolute top-1 w-2 h-2 bg-white rounded-full transition-all", checked ? "left-5" : "left-1")} />
      </div>
    </div>
    <p className="text-[10px] text-on-surface-variant leading-relaxed">{description}</p>
  </button>
);

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    days.push(day);
  }

  return days;
}

function groupEventsByDay(events: EventWithAttendance[]) {
  const grouped = new Map<string, EventWithAttendance[]>();

  for (const event of events) {
    const key = event.event_date;
    const dayEvents = grouped.get(key) ?? [];
    dayEvents.push(event);
    grouped.set(key, dayEvents);
  }

  for (const dayEvents of grouped.values()) {
    dayEvents.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }

  return grouped;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

function toMonthFileSlug(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })
    .format(date)
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
