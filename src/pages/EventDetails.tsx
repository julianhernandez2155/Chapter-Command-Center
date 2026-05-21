import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Loader2,
  MapPin,
  MoreVertical,
  QrCode,
  RotateCcw,
  Users,
  XCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  archiveEvent,
  eventToFormValues,
  fetchEventById,
  formatEventCategory,
  formatEventDate,
  formatEventTimeRange,
  formatEventType,
  LiveEvent,
  restoreEvent,
  updateEvent
} from '../lib/events';
import { EventFormModal } from './Events';

export const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, can } = useAuth();
  const [activeTab, setActiveTab] = useState('Event Details');
  const [event, setEvent] = useState<Awaited<ReturnType<typeof fetchEventById>>>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageOwnedEvent = Boolean(event && member?.id === event.created_by && can('events.create'));
  const canEditEvent = can('events.edit') || canManageOwnedEvent;
  const canArchiveEvent = can('events.archive') || canManageOwnedEvent;

  const loadEvent = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      setEvent(await fetchEventById(id));
    } catch (err) {
      console.error('Error loading event detail:', err);
      setError('Unable to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [id]);

  const handleUpdate = async (values: Parameters<typeof updateEvent>[1]) => {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateEvent(event.id, values);
      setEvent({ ...updated, attendance: event.attendance });
      setIsEditOpen(false);
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Unable to update event. Check your permissions and event fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const updated = event.archived_at
        ? await restoreEvent(event.id)
        : await archiveEvent(event.id);
      setEvent({ ...updated, attendance: event.attendance });
    } catch (err) {
      console.error('Error changing archive state:', err);
      setError('Unable to change event archive state.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading event</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto bg-surface-container-low rounded-2xl border border-white/5 p-10 text-center">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-4" />
        <h1 className="text-2xl font-black tracking-tight">Event not found</h1>
        <button onClick={() => navigate('/events')} className="mt-6 text-primary text-xs font-black uppercase tracking-widest">Back to Events</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/events')}
            className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Event Protocol</span>
            <h1 className="text-4xl font-black tracking-tighter uppercase">{event.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge label={formatEventType(event.type)} />
              <Badge label={formatEventCategory(event.category)} tone={event.category === 'mandatory' ? 'danger' : 'default'} />
              {event.archived_at && <Badge label="Archived" />}
            </div>
          </div>
        </div>

        {(canEditEvent || canArchiveEvent) && (
          <div className="flex gap-3">
            {canEditEvent && (
              <button onClick={() => setIsEditOpen(true)} className="px-5 py-3 rounded-full bg-surface-container-low border border-white/5 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-surface-container-high">
                <Edit3 size={14} /> Edit
              </button>
            )}
            {canArchiveEvent && (
              <button
                onClick={handleArchiveToggle}
                disabled={saving}
                className="px-5 py-3 rounded-full bg-error/10 border border-error/20 text-error text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-error/20 disabled:opacity-50"
              >
                {event.archived_at ? <RotateCcw size={14} /> : <XCircle size={14} />}
                {event.archived_at ? 'Restore' : 'Archive'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <section className="bg-error/10 rounded-xl p-6 border border-error/20 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Expected" value={event.attendance.expected} icon={<Users size={16} />} />
            <StatCard label="Present" value={event.attendance.present} icon={<CheckCircle2 size={16} />} color="text-green-500" />
            <StatCard label="Excused" value={event.attendance.excused} icon={<FileText size={16} />} color="text-secondary" />
            <StatCard label="Absent" value={event.attendance.absent} icon={<XCircle size={16} />} color="text-red-500" />
          </div>

          <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex border-b border-white/5">
              {['Event Details', 'Attendance Summary', 'Officer Notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-5 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'Event Details' && <EventDetailPanel event={event} />}
              {activeTab === 'Attendance Summary' && <AttendanceSummary event={event} />}
              {activeTab === 'Officer Notes' && <OfficerNotes event={event} canEdit={canEditEvent} onEdit={() => setIsEditOpen(true)} />}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cn(
            "p-8 rounded-2xl shadow-2xl space-y-6",
            event.check_in_open ? "bg-primary shadow-primary/20" : "bg-surface-container-low border border-white/5"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xl font-black uppercase tracking-tighter", event.check_in_open ? "text-white" : "text-on-surface")}>Check-In State</h3>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", event.check_in_open ? "bg-white animate-pulse" : "bg-on-surface-variant/30")} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", event.check_in_open ? "text-white/80" : "text-on-surface-variant")}>
                  {event.check_in_open ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
            <p className={cn("text-xs leading-relaxed", event.check_in_open ? "text-white/70" : "text-on-surface-variant")}>
              Check-in controls stay read-only in Sprint 3. Sprint 4 will wire attendance writes after event records are stable.
            </p>
            <button disabled className={cn(
              "w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 opacity-60",
              event.check_in_open ? "bg-white text-primary" : "bg-surface-container-high text-on-surface-variant"
            )}>
              <QrCode size={18} /> QR Portal Pending
            </button>
          </div>

          <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-tight">Operations Status</h3>
            <div className="space-y-4">
              <StatusItem label="Live event record" active />
              <StatusItem label="Officer create/edit/archive" active={canEditEvent || canArchiveEvent} />
              <StatusItem label="Attendance writes" active={false} />
            </div>
            <button onClick={() => navigate('/events')} className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2">
              Back to Event List <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditOpen && (
          <EventFormModal
            title="Edit Event"
            saving={saving}
            initialValues={eventToFormValues(event)}
            onClose={() => setIsEditOpen(false)}
            onSubmit={handleUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EventDetailPanel = ({ event }: { event: LiveEvent }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
    <div className="space-y-8">
      <DetailItem icon={<CalendarIcon size={18} />} label="Date" value={formatEventDate(event.event_date)} />
      <DetailItem icon={<Clock size={18} />} label="Time" value={formatEventTimeRange(event.starts_at, event.ends_at)} />
      <DetailItem icon={<MapPin size={18} />} label="Location" value={event.location} />
    </div>
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2rem] text-on-surface-variant/40">Attendance Policies</h4>
      <div className="space-y-3">
        <PolicyBadge label="Mandatory" active={event.category === 'mandatory'} />
        <PolicyBadge label="QR Check-In" active={event.qr_enabled} />
        <PolicyBadge label="Excusals Allowed" active={event.allow_excusals} />
      </div>
    </div>
  </div>
);

const AttendanceSummary = ({ event }: { event: Awaited<ReturnType<typeof fetchEventById>> }) => {
  if (!event) return null;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface-container-lowest rounded-xl border border-white/5">
        <h4 className="text-sm font-black uppercase tracking-widest mb-4">Read-only attendance count</h4>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          This panel reads existing `event_attendees` counts only. Check-in writes, CSV import, and excusal review stay in Sprint 4.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniCount label="Expected" value={event.attendance.expected} />
        <MiniCount label="Present" value={event.attendance.present} />
        <MiniCount label="Excused" value={event.attendance.excused} />
        <MiniCount label="Absent" value={event.attendance.absent} />
      </div>
    </div>
  );
};

const OfficerNotes = ({ event, canEdit, onEdit }: { event: LiveEvent; canEdit: boolean; onEdit: () => void }) => (
  <div className="space-y-6">
    <div className="p-6 bg-surface-container-lowest rounded-xl border border-primary/20 relative">
      <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full">Executive Note</div>
      <p className="text-sm leading-relaxed text-on-surface/80 italic">
        "{event.officer_notes || 'No officer notes recorded.'}"
      </p>
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Stored in Supabase</span>
        {canEdit && <button onClick={onEdit} className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline">Edit Note</button>}
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) => (
  <div className="bg-surface-container-low p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
    <div className="flex items-center justify-between text-on-surface-variant/40">
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    <span className={cn("text-3xl font-black tracking-tighter", color || "text-on-surface")}>{value}</span>
  </div>
);

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary border border-white/5">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  </div>
);

const PolicyBadge = ({ label, active }: { label: string; active: boolean }) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest",
    active ? "bg-primary/5 border-primary/20 text-primary" : "bg-surface-container-lowest border-white/5 text-on-surface-variant/40"
  )}>
    <span>{label}</span>
    {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
  </div>
);

const Badge = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'danger' }) => (
  <span className={cn(
    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
    tone === 'danger' ? "bg-red-600/20 text-red-500" : "bg-surface-container-high text-on-surface-variant"
  )}>
    {label}
  </span>
);

const MiniCount = ({ label, value }: { label: string; value: number }) => (
  <div className="p-4 bg-surface-container-lowest rounded-xl border border-white/5">
    <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest font-bold">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

const StatusItem = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
      {active ? <CheckCircle2 size={14} className="text-green-500" /> : <MoreVertical size={14} className="text-on-surface-variant" />}
    </div>
    <div className="flex flex-col justify-center">
      <p className="text-xs font-medium">{label}</p>
      <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">{active ? 'Active' : 'Future sprint'}</span>
    </div>
  </div>
);
