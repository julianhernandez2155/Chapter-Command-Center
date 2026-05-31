import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileClock,
  HeartHandshake,
  Loader2,
  MapPin,
  Users,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  ExternalPhilanthropyOpportunity,
  ExternalReviewQueueEntry,
  fetchExternalPhilanthropyPortal,
  fetchExternalReviewQueue,
  reviewExternalServiceHours,
  signupForExternalPhilanthropy,
  submitExternalServiceHours
} from '../lib/externalPhilanthropy';

export const ExternalPhilanthropy = () => {
  const [opportunities, setOpportunities] = useState<ExternalPhilanthropyOpportunity[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ExternalReviewQueueEntry[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reportDrafts, setReportDrafts] = useState<Record<string, { hours: string; note: string; proof: string }>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { hours: string; note: string }>>({});

  const loadExternal = async () => {
    setError(null);
    try {
      const portal = await fetchExternalPhilanthropyPortal();
      setOpportunities(portal.opportunities ?? []);

      try {
        const queue = await fetchExternalReviewQueue();
        setReviewQueue(queue);
        setCanReview(true);
      } catch {
        setReviewQueue([]);
        setCanReview(false);
      }
    } catch (err) {
      console.error('Error loading external philanthropy:', err);
      setError('External philanthropy records are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExternal();
  }, []);

  const groupedOpportunities = useMemo(() => groupByMonth(opportunities), [opportunities]);

  const setReportDraft = (eventId: string, next: Partial<{ hours: string; note: string; proof: string }>) => {
    setReportDrafts(current => ({
      ...current,
      [eventId]: {
        hours: current[eventId]?.hours ?? '',
        note: current[eventId]?.note ?? '',
        proof: current[eventId]?.proof ?? '',
        ...next
      }
    }));
  };

  const setReviewDraft = (entryId: string, next: Partial<{ hours: string; note: string }>) => {
    setReviewDrafts(current => ({
      ...current,
      [entryId]: {
        hours: current[entryId]?.hours ?? '',
        note: current[entryId]?.note ?? '',
        ...next
      }
    }));
  };

  const handleSignup = async (eventId: string) => {
    setSavingId(eventId);
    setMessage(null);
    setError(null);
    try {
      await signupForExternalPhilanthropy(eventId);
      await loadExternal();
      setMessage('Signup saved and external philanthropy expectation created.');
    } catch (err) {
      console.error('Error signing up for external philanthropy:', err);
      setError('Unable to sign up for this external opportunity.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSubmitReport = async (eventId: string, defaultHours: number | null) => {
    const draft = reportDrafts[eventId] ?? { hours: '', note: '', proof: '' };
    const hours = Number(draft.hours || defaultHours || 0);

    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Enter requested hours before submitting.');
      return;
    }

    setSavingId(eventId);
    setMessage(null);
    setError(null);
    try {
      await submitExternalServiceHours(eventId, hours, draft.note, draft.proof);
      await loadExternal();
      setMessage('External philanthropy hours submitted for approval.');
    } catch (err) {
      console.error('Error submitting external philanthropy report:', err);
      setError('Unable to submit this report.');
    } finally {
      setSavingId(null);
    }
  };

  const handleReview = async (entry: ExternalReviewQueueEntry, decision: 'approved' | 'adjusted' | 'rejected') => {
    const draft = reviewDrafts[entry.entry_id] ?? { hours: String(entry.requested_hours), note: '' };
    const hours = decision === 'rejected' ? null : Number(draft.hours || entry.requested_hours);

    if (decision !== 'rejected' && (!Number.isFinite(hours) || hours <= 0)) {
      setError('Enter approved hours before approving.');
      return;
    }

    setSavingId(entry.entry_id);
    setMessage(null);
    setError(null);
    try {
      const finalDecision = decision === 'approved' && hours !== entry.requested_hours ? 'adjusted' : decision;
      await reviewExternalServiceHours(entry.entry_id, finalDecision, hours, draft.note);
      await loadExternal();
      setMessage(decision === 'rejected' ? 'External report rejected.' : 'External report approved and service hours posted.');
    } catch (err) {
      console.error('Error reviewing external philanthropy report:', err);
      setError('Unable to review this report.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.08rem] text-primary sm:tracking-[0.18rem]">
            <span className="sm:hidden">External</span>
            <span className="hidden sm:inline">External Philanthropy</span>
          </p>
          <h1 className="mt-3 max-w-4xl text-[1.75rem] font-black leading-tight tracking-tight text-on-surface sm:text-4xl md:text-6xl">
            External Calendar
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
            Sign up for outside philanthropy events, submit proof after participation, and wait for approved service-hour credit.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant">Approval Rule</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">Hours post only after chairman review.</p>
        </div>
      </section>

      {(error || message) && (
        <section className={cn(
          'rounded-3xl p-5 text-sm font-bold',
          error ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
        )}>
          {error ?? message}
        </section>
      )}

      <section className="space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Member Calendar</p>
          <h2 className="mt-2 text-3xl font-black text-on-surface">Opportunities</h2>
        </div>

        {groupedOpportunities.length === 0 ? (
          <EmptyState title="No external philanthropy opportunities posted" />
        ) : groupedOpportunities.map(group => (
          <div key={group.month} className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18rem] text-secondary">{group.month}</h3>
            {group.events.map(event => (
              <ExternalOpportunityCard
                key={event.event_id}
                event={event}
                draft={reportDrafts[event.event_id] ?? { hours: event.hours ? String(event.hours) : '', note: '', proof: '' }}
                saving={savingId === event.event_id}
                onSignup={() => handleSignup(event.event_id)}
                onDraftChange={(next) => setReportDraft(event.event_id, next)}
                onSubmitReport={() => handleSubmitReport(event.event_id, event.hours)}
              />
            ))}
          </div>
        ))}
      </section>

      {canReview && (
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Approver Queue</p>
            <h2 className="mt-2 text-3xl font-black text-on-surface">Pending Reports</h2>
          </div>

          {reviewQueue.length === 0 ? (
            <EmptyState title="No pending external reports" />
          ) : reviewQueue.map(entry => (
            <ExternalReviewCard
              key={entry.entry_id}
              entry={entry}
              draft={reviewDrafts[entry.entry_id] ?? { hours: String(entry.requested_hours), note: '' }}
              saving={savingId === entry.entry_id}
              onDraftChange={(next) => setReviewDraft(entry.entry_id, next)}
              onReview={(decision) => handleReview(entry, decision)}
            />
          ))}
        </section>
      )}
    </div>
  );
};

interface ExternalOpportunityCardProps {
  event: ExternalPhilanthropyOpportunity;
  draft: { hours: string; note: string; proof: string };
  saving: boolean;
  onSignup: () => void | Promise<void>;
  onDraftChange: (next: Partial<{ hours: string; note: string; proof: string }>) => void;
  onSubmitReport: () => void | Promise<void>;
}

const ExternalOpportunityCard: React.FC<ExternalOpportunityCardProps> = ({
  event,
  draft,
  saving,
  onSignup,
  onDraftChange,
  onSubmitReport
}) => {
  const status = getStatus(event);

  return (
    <article className="rounded-[2rem] bg-surface-container-low p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-black text-on-surface">{event.name}</h4>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>

          <div className="mt-4 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-4">
            <span className="flex items-center gap-2"><Clock size={15} /> {formatDateTime(event.starts_at)}</span>
            <span className="flex items-center gap-2"><MapPin size={15} /> {event.location || 'TBD'}</span>
            <span className="flex items-center gap-2"><HeartHandshake size={15} /> {formatNumber(Number(event.hours ?? 0))} expected hours</span>
            <span className="flex items-center gap-2"><Users size={15} /> {event.signed_up_count}{event.signup_capacity ? `/${event.signup_capacity}` : ''} signed</span>
          </div>

          {event.can_report && (
            <div className="mt-5 grid gap-3 lg:grid-cols-[120px_1fr_1fr_auto]">
              <input
                value={draft.hours}
                onChange={(e) => onDraftChange({ hours: e.target.value })}
                inputMode="decimal"
                placeholder="Hours"
                className="min-h-12 rounded-2xl border border-white/10 bg-surface-container-lowest px-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
              />
              <input
                value={draft.note}
                onChange={(e) => onDraftChange({ note: e.target.value })}
                placeholder="What did you do?"
                className="min-h-12 rounded-2xl border border-white/10 bg-surface-container-lowest px-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
              />
              <input
                value={draft.proof}
                onChange={(e) => onDraftChange({ proof: e.target.value })}
                placeholder="Proof link or note"
                className="min-h-12 rounded-2xl border border-white/10 bg-surface-container-lowest px-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
              />
              <button
                onClick={onSubmitReport}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.12rem] text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileClock size={15} />}
                Submit
              </button>
            </div>
          )}
        </div>

        {!event.user_signed_up && event.can_signup && (
          <button
            onClick={onSignup}
            disabled={saving}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.14rem] text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}
            Sign Up
          </button>
        )}
      </div>
    </article>
  );
};

interface ExternalReviewCardProps {
  entry: ExternalReviewQueueEntry;
  draft: { hours: string; note: string };
  saving: boolean;
  onDraftChange: (next: Partial<{ hours: string; note: string }>) => void;
  onReview: (decision: 'approved' | 'adjusted' | 'rejected') => void | Promise<void>;
}

const ExternalReviewCard: React.FC<ExternalReviewCardProps> = ({
  entry,
  draft,
  saving,
  onDraftChange,
  onReview
}) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xl font-black text-on-surface">{entry.member_name}</h4>
          <Badge tone="gold">{formatNumber(Number(entry.requested_hours))} requested</Badge>
        </div>
        <p className="mt-2 text-sm font-bold text-on-surface-variant">{entry.event_name} · SUID {entry.suid}</p>
        {entry.notes && <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant">{entry.notes}</p>}
        {entry.proof_url && (
          <a className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12rem] text-secondary" href={entry.proof_url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Proof
          </a>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[110px_minmax(180px,1fr)_auto_auto]">
        <input
          value={draft.hours}
          onChange={(e) => onDraftChange({ hours: e.target.value })}
          inputMode="decimal"
          placeholder="Hours"
          className="min-h-12 rounded-2xl border border-white/10 bg-surface-container-lowest px-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
        />
        <input
          value={draft.note}
          onChange={(e) => onDraftChange({ note: e.target.value })}
          placeholder="Review note"
          className="min-h-12 rounded-2xl border border-white/10 bg-surface-container-lowest px-4 text-sm font-bold text-on-surface outline-none focus:border-primary"
        />
        <button
          onClick={() => onReview('approved')}
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-secondary px-5 text-[10px] font-black uppercase tracking-[0.12rem] text-black transition-colors hover:bg-secondary/90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}
          Approve
        </button>
        <button
          onClick={() => onReview('rejected')}
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface-container-high px-5 text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface transition-colors hover:bg-surface-bright disabled:opacity-40"
        >
          <XCircle size={15} />
          Reject
        </button>
      </div>
    </div>
  </article>
);

const Badge = ({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'gold' | 'primary' }) => (
  <span className={cn(
    'rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.1rem]',
    tone === 'gold' ? 'bg-secondary/10 text-secondary' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface-variant'
  )}>
    {children}
  </span>
);

const EmptyState = ({ title }: { title: string }) => (
  <div className="rounded-[2rem] bg-surface-container-low p-10 text-center">
    <AlertCircle className="mx-auto h-8 w-8 text-on-surface-variant" />
    <p className="mt-4 text-sm font-black uppercase tracking-[0.14rem] text-on-surface">{title}</p>
  </div>
);

const getStatus = (event: ExternalPhilanthropyOpportunity): { label: string; tone: 'default' | 'gold' | 'primary' } => {
  if (event.report_status === 'approved' || event.report_status === 'adjusted') return { label: `${formatNumber(Number(event.approved_hours ?? 0))} Hours Approved`, tone: 'gold' };
  if (event.report_status === 'pending') return { label: 'Pending Approval', tone: 'primary' };
  if (event.user_signed_up && new Date(event.starts_at) <= new Date()) return { label: 'Report Hours', tone: 'primary' };
  if (event.user_signed_up) return { label: 'Signed Up', tone: 'gold' };
  if (!event.can_signup) return { label: 'Closed', tone: 'default' };
  return { label: `${event.spots_remaining ?? 'Open'} Spots`, tone: 'default' };
};

const groupByMonth = (events: ExternalPhilanthropyOpportunity[]) => {
  const groups = new Map<string, ExternalPhilanthropyOpportunity[]>();
  for (const event of events) {
    const month = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(event.starts_at));
    groups.set(month, [...(groups.get(month) ?? []), event]);
  }
  return [...groups.entries()].map(([month, monthEvents]) => ({ month, events: monthEvents }));
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);
