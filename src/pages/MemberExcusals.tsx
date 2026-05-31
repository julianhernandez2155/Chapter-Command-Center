import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Send,
  Shield,
  X,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  ExcusalEvent,
  ExcusalStatus,
  MemberExcusal,
  fetchExcusableEvents,
  fetchMyExcusals,
  getEventLabel,
  getEventTimeLabel,
  submitExcusal
} from '../lib/excusals';

export const MemberExcusals = () => {
  const { member } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);
  const [excusals, setExcusals] = useState<MemberExcusal[]>([]);
  const [events, setEvents] = useState<ExcusalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExcusals = async () => {
    if (!member) return;

    setLoading(true);
    setError(null);

    try {
      const [excusalRows, eventRows] = await Promise.all([
        fetchMyExcusals(member.id),
        fetchExcusableEvents()
      ]);
      setExcusals(excusalRows);
      setEvents(eventRows);
    } catch (err) {
      console.error('Error loading excusals:', err);
      setError('Unable to load excusal records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExcusals();
  }, [member?.id]);

  const statusCounts = useMemo(() => ({
    pending: excusals.filter(excusal => excusal.status === 'pending').length,
    approved: excusals.filter(excusal => excusal.status === 'approved').length,
    denied: excusals.filter(excusal => excusal.status === 'denied').length
  }), [excusals]);

  const requestedEventIds = useMemo(() => new Set(excusals.map(excusal => excusal.event_id)), [excusals]);
  const requestableEvents = useMemo(() => (
    events.filter(event => !requestedEventIds.has(event.id))
  ), [events, requestedEventIds]);

  const handleSubmit = async (eventId: string, reason: string, supportingNote: string) => {
    if (!member) return;

    setSaving(true);
    setError(null);

    try {
      await submitExcusal(member.id, eventId, reason, supportingNote);
      setRequestOpen(false);
      await loadExcusals();
    } catch (err) {
      console.error('Error submitting excusal:', err);
      setError('Unable to submit this excusal. You may already have a request for that event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">Member Standing</p>
          <h1 className="mt-2 text-5xl font-black uppercase tracking-tighter text-on-surface">Excusals</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-on-surface-variant">
            Submit absence requests for mandatory events and track Secretary or standards review.
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="flex min-h-14 items-center justify-center gap-3 rounded-full bg-primary px-8 text-xs font-black uppercase tracking-[0.16rem] text-white transition-transform active:scale-95"
        >
          <Plus size={18} /> New Request
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusMetric label="Pending" value={statusCounts.pending} tone="pending" />
        <StatusMetric label="Approved" value={statusCounts.approved} tone="approved" />
        <StatusMetric label="Denied" value={statusCounts.denied} tone="denied" />
      </section>

      {error && (
        <section className="rounded-2xl bg-error/10 p-5 text-sm font-bold text-error">
          {error}
        </section>
      )}

      {loading ? (
        <section className="flex items-center justify-center gap-3 rounded-[2rem] bg-surface-container-low p-12 text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.18rem]">Loading excusals</span>
        </section>
      ) : excusals.length === 0 ? (
        <section className="rounded-[2rem] bg-surface-container-low p-10 text-center">
          <Shield className="mx-auto text-on-surface-variant" size={36} />
          <h2 className="mt-5 text-2xl font-black tracking-tight text-on-surface">No requests on file</h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-on-surface-variant">
            Submit before the excusal window closes so officers can review before attendance is finalized.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {excusals.map(excusal => (
            <React.Fragment key={excusal.id}>
              <ExcusalCard excusal={excusal} />
            </React.Fragment>
          ))}
        </section>
      )}

      <AnimatePresence>
        {requestOpen && (
          <SubmitExcusalPanel
            events={requestableEvents}
            saving={saving}
            onClose={() => setRequestOpen(false)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusMetric = ({ label, value, tone }: { label: string; value: number; tone: ExcusalStatus }) => (
  <div className="rounded-[2rem] bg-surface-container-low p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant/50">{label}</p>
    <p className={cn(
      'mt-2 text-4xl font-black tracking-tighter',
      tone === 'approved' && 'text-green-500',
      tone === 'pending' && 'text-secondary',
      tone === 'denied' && 'text-primary'
    )}>{value}</p>
  </div>
);

const ExcusalCard = ({ excusal }: { excusal: MemberExcusal }) => {
  const status = getStatusCopy(excusal.status);

  return (
    <article className="rounded-[2rem] bg-surface-container-low p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {status.icon}
            <h2 className="truncate text-xl font-black tracking-tight text-on-surface">
              {excusal.event?.name ?? 'Unknown event'}
            </h2>
            <span className={cn('rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.12rem]', status.className)}>
              {status.label}
            </span>
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14rem] text-on-surface-variant">
            {getEventLabel(excusal.event)} · {getEventTimeLabel(excusal.event)}
          </p>
        </div>
        <p className="text-right text-[10px] font-bold uppercase tracking-[0.14rem] text-on-surface-variant">
          Submitted {formatDateTime(excusal.submitted_at)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-surface-container-lowest p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">Reason</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">{excusal.reason}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-lowest p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">Review</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
            {excusal.review_note || (excusal.status === 'pending' ? 'Awaiting officer review.' : 'No review note recorded.')}
          </p>
        </div>
      </div>
    </article>
  );
};

const SubmitExcusalPanel = ({
  events,
  saving,
  onClose,
  onSubmit
}: {
  events: ExcusalEvent[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (eventId: string, reason: string, supportingNote: string) => Promise<void>;
}) => {
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [supportingNote, setSupportingNote] = useState('');

  const canSubmit = eventId.length > 0 && reason.trim().length >= 12;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <motion.form
        onSubmit={event => {
          event.preventDefault();
          if (canSubmit) void onSubmit(eventId, reason, supportingNote);
        }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl"
      >
        <div className="p-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26rem] text-secondary">Excusal Request</p>
              <h2 className="mt-2 text-4xl font-black uppercase tracking-tighter text-on-surface">Request Review</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-3 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-10 pb-10 no-scrollbar">
          {events.length === 0 ? (
            <div className="rounded-[2rem] bg-surface-container-low p-8 text-center">
              <CalendarClock className="mx-auto text-on-surface-variant" size={32} />
              <p className="mt-4 text-sm font-bold leading-6 text-on-surface-variant">
                No upcoming mandatory events are currently open for excusal requests.
              </p>
            </div>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="ml-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/60">Event</span>
                <div className="relative">
                  <select
                    value={eventId}
                    onChange={event => setEventId(event.target.value)}
                    className="w-full appearance-none pr-12 sunken-input"
                  >
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.name} · {getEventTimeLabel(event)}</option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    size={18}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="ml-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/60">Reason</span>
                <textarea
                  className="min-h-36 w-full resize-none sunken-input"
                  placeholder="State the reason clearly enough for review."
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="ml-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/60">Supporting Note</span>
                <textarea
                  className="min-h-28 w-full resize-none sunken-input"
                  placeholder="Optional context, documentation note, or contact."
                  value={supportingNote}
                  onChange={event => setSupportingNote(event.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 bg-surface p-10">
          <button type="button" onClick={onClose} className="rounded-full bg-surface-container-high px-6 py-4 text-xs font-black uppercase tracking-[0.14rem] text-on-surface">
            Cancel
          </button>
          <button
            disabled={!canSubmit || saving}
            className="flex flex-1 items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-xs font-black uppercase tracking-[0.16rem] text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
            Submit Request
          </button>
        </div>
      </motion.form>
    </div>
  );
};

const getStatusCopy = (status: ExcusalStatus) => {
  if (status === 'approved') {
    return {
      label: 'Approved',
      className: 'bg-green-500/10 text-green-500',
      icon: <CheckCircle2 className="text-green-500" size={20} />
    };
  }

  if (status === 'denied') {
    return {
      label: 'Denied',
      className: 'bg-primary/10 text-primary',
      icon: <XCircle className="text-primary" size={20} />
    };
  }

  return {
    label: 'Pending',
    className: 'bg-secondary/10 text-secondary',
    icon: <Clock className="text-secondary" size={20} />
  };
};

const formatDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoDate));
