import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  Timer,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  ExcusalStatus,
  ReviewExcusal,
  fetchExcusalsForReview,
  getDisplayName,
  getEventLabel,
  getEventTimeLabel,
  reviewExcusal
} from '../lib/excusals';

export const ExcusalReview = () => {
  const { member } = useAuth();
  const [excusals, setExcusals] = useState<ReviewExcusal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviewQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      setExcusals(await fetchExcusalsForReview());
    } catch (err) {
      console.error('Error loading excusal review queue:', err);
      setError('Unable to load the excusal review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewQueue();
  }, []);

  const grouped = useMemo(() => ({
    pending: excusals.filter(excusal => excusal.status === 'pending'),
    reviewed: excusals.filter(excusal => excusal.status !== 'pending')
  }), [excusals]);

  const handleReview = async (
    excusalId: string,
    status: Extract<ExcusalStatus, 'approved' | 'denied'>,
    note: string
  ) => {
    if (!member) return;

    setSavingId(excusalId);
    setError(null);

    try {
      await reviewExcusal(excusalId, member.id, status, note);
      await loadReviewQueue();
    } catch (err) {
      console.error('Error reviewing excusal:', err);
      setError('Unable to save the review decision. Check your review permission.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-12">
      <section className="rounded-[2rem] bg-secondary/10 px-8 py-5 text-secondary">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Timer size={24} />
            <p className="text-sm font-black uppercase tracking-[0.18rem]">
              Review before the weekly attendance list is published
            </p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16rem]">
            Pending {grouped.pending.length}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">Secretary Review</p>
        <h1 className="text-5xl font-black uppercase tracking-tighter text-on-surface">Excusal Requests</h1>
        <p className="max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
          Approve or deny member absence requests before attendance closes and the weekly ineligible list is posted.
        </p>
      </section>

      {error && (
        <section className="rounded-2xl bg-error/10 p-5 text-sm font-bold text-error">
          {error}
        </section>
      )}

      {loading ? (
        <section className="flex items-center justify-center gap-3 rounded-[2rem] bg-surface-container-low p-12 text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.18rem]">Loading review queue</span>
        </section>
      ) : (
        <>
          <section className="space-y-5">
            <SectionHeader label="Pending Review" count={grouped.pending.length} tone="pending" />
            {grouped.pending.length === 0 ? (
              <EmptyQueue />
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {grouped.pending.map(excusal => (
                  <React.Fragment key={excusal.id}>
                    <PendingReviewCard
                      excusal={excusal}
                      saving={savingId === excusal.id}
                      onReview={handleReview}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <SectionHeader label="Reviewed Requests" count={grouped.reviewed.length} tone="reviewed" />
            <div className="space-y-3">
              {grouped.reviewed.slice(0, 12).map(excusal => (
                <React.Fragment key={excusal.id}>
                  <ReviewedRow excusal={excusal} />
                </React.Fragment>
              ))}
              {grouped.reviewed.length === 0 && (
                <div className="rounded-2xl bg-surface-container-low p-6 text-sm font-bold text-on-surface-variant">
                  No reviewed requests yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const PendingReviewCard = ({
  excusal,
  saving,
  onReview
}: {
  excusal: ReviewExcusal;
  saving: boolean;
  onReview: (excusalId: string, status: Extract<ExcusalStatus, 'approved' | 'denied'>, note: string) => Promise<void>;
}) => {
  const [note, setNote] = useState('');
  const memberName = excusal.member ? getDisplayName(excusal.member) : 'Unknown member';
  const canDeny = note.trim().length >= 8;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] bg-surface-container-low p-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant">
            {excusal.member?.suid ?? 'No SUID'} · Class of {excusal.member?.graduation_year ?? 'N/A'}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-on-surface">{memberName}</h2>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-secondary">
            {getEventLabel(excusal.event)}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            {getEventTimeLabel(excusal.event)}
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-surface-container-lowest p-5">
        <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">Reason</p>
        <p className="mt-2 text-base font-semibold leading-7 text-on-surface">{excusal.reason}</p>
        {excusal.supporting_note && (
          <p className="mt-4 text-sm font-semibold leading-6 text-on-surface-variant">{excusal.supporting_note}</p>
        )}
      </div>

      <label className="mt-5 block space-y-2">
        <span className="ml-4 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">Review Note</span>
        <textarea
          className="min-h-24 w-full resize-none sunken-input"
          placeholder="Required for denial. Optional for approval."
          value={note}
          onChange={event => setNote(event.target.value)}
        />
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          disabled={saving}
          onClick={() => void onReview(excusal.id, 'approved', note)}
          className="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-green-500/10 text-xs font-black uppercase tracking-[0.14rem] text-green-500 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={17} />}
          Approve
        </button>
        <button
          disabled={saving || !canDeny}
          onClick={() => void onReview(excusal.id, 'denied', note)}
          className="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-full bg-primary/10 text-xs font-black uppercase tracking-[0.14rem] text-primary disabled:opacity-40"
        >
          <Send size={17} />
          Deny With Note
        </button>
      </div>
    </motion.article>
  );
};

const ReviewedRow = ({ excusal }: { excusal: ReviewExcusal }) => {
  const status = excusal.status;
  const memberName = excusal.member ? getDisplayName(excusal.member) : 'Unknown member';
  const reviewerName = excusal.reviewer ? getDisplayName(excusal.reviewer) : 'Officer';

  return (
    <article className="grid grid-cols-1 gap-4 rounded-2xl bg-surface-container-low px-6 py-5 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <p className="text-sm font-black text-on-surface">{memberName}</p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12rem] text-on-surface-variant/50">{excusal.member?.suid}</p>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant md:col-span-3">
        {excusal.event?.name ?? 'Unknown event'}
      </p>
      <div className="md:col-span-2">
        <span className={cn(
          'inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12rem]',
          status === 'approved' ? 'text-green-500' : 'text-primary'
        )}>
          {status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {status}
        </span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant md:col-span-3">
        Reviewed by {reviewerName}
      </p>
      <p className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant/50 md:col-span-1 md:text-right">
        {excusal.reviewed_at ? formatShortDate(excusal.reviewed_at) : ''}
      </p>
    </article>
  );
};

const SectionHeader = ({ label, count, tone }: { label: string; count: number; tone: 'pending' | 'reviewed' }) => (
  <div className="flex items-center gap-4">
    <span className={cn('h-3 w-3 rounded-full', tone === 'pending' ? 'bg-primary' : 'bg-on-surface-variant/30')} />
    <h2 className={cn(
      'text-[10px] font-black uppercase tracking-[0.3rem]',
      tone === 'pending' ? 'text-primary' : 'text-on-surface-variant'
    )}>{label} ({count})</h2>
  </div>
);

const EmptyQueue = () => (
  <div className="rounded-[2rem] bg-surface-container-low p-10 text-center">
    <ShieldCheck className="mx-auto text-green-500" size={34} />
    <p className="mt-4 text-sm font-bold text-on-surface-variant">No pending excusals require review.</p>
  </div>
);

const formatShortDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(isoDate));
