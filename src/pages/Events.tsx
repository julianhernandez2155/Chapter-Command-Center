import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
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
  createEvent,
  defaultEventFormValues,
  EventFormValues,
  EventWithAttendance,
  formatEventCategory,
  formatEventTimeRange,
  formatEventType,
  getEventTiming
} from '../lib/events';
import { fetchEvents } from '../lib/events';

type EventTab = 'upcoming' | 'past' | 'archived';

export const Events = () => {
  const { member, can } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTab>('upcoming');
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

  const visibleEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events.filter(event => {
      const matchesTab = getEventTiming(event) === activeTab;
      const matchesSearch = normalizedSearch.length === 0
        || event.name.toLowerCase().includes(normalizedSearch)
        || event.location.toLowerCase().includes(normalizedSearch)
        || formatEventType(event.type).toLowerCase().includes(normalizedSearch);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, events, search]);

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
          <p className="text-on-surface-variant font-medium text-lg max-w-lg">Live Supabase event operations before attendance capture comes online.</p>
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

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-surface-container-low/30 p-4 rounded-2xl border border-white/5">
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
          <button className="p-3 bg-surface-container-lowest rounded-full text-on-surface-variant hover:text-on-surface border border-white/5">
            <Filter size={18} />
          </button>
        </div>
        <div className="flex bg-surface-container-lowest p-1 rounded-full border border-white/5">
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

const EventRow = ({ event, onClick }: { event: EventWithAttendance; onClick: () => void }) => {
  const date = new Date(`${event.event_date}T00:00:00`);
  const attendancePct = event.attendance.expected > 0
    ? Math.min((event.attendance.present / event.attendance.expected) * 100, 100)
    : 0;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-surface-container-low p-6 rounded-2xl border border-white/5 hover:bg-surface-container-high transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 text-left"
    >
      <div className="flex items-center gap-6">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center border",
          event.category === 'mandatory' ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-secondary/20 text-secondary"
        )}>
          <span className="text-[10px] font-black uppercase leading-none mb-1">
            {new Intl.DateTimeFormat('en', { month: 'short' }).format(date)}
          </span>
          <span className="text-2xl font-black leading-none">{date.getDate()}</span>
        </div>
        <div>
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
      </div>

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
        <ChevronRight className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
      </div>
    </motion.button>
  );
};

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
        className="w-full max-w-2xl h-full bg-surface border-l border-white/5 shadow-2xl overflow-y-auto no-scrollbar"
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
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Basic Information</h3>
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
                      onChange={event => updateValue('type', event.target.value as EventFormValues['type'])}
                    >
                      <option value="chapter_meeting">Chapter Meeting</option>
                      <option value="social">Social</option>
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
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Attendance Policy</h3>
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
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Schedule</h3>
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
              <InputField label="Expected Attendance">
                <input
                  min={1}
                  type="number"
                  className="w-full sunken-input"
                  value={values.expectedCount}
                  onChange={event => updateValue('expectedCount', Number(event.target.value))}
                />
              </InputField>
              <InputField label="Officer Notes">
                <textarea
                  className="w-full sunken-input min-h-28 resize-none"
                  placeholder="Operational notes for officers."
                  value={values.officerNotes}
                  onChange={event => updateValue('officerNotes', event.target.value)}
                />
              </InputField>
            </section>
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
