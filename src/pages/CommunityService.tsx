import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Loader2,
  MapPin,
  Users,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  CommunityServiceOpportunity,
  CommunityServiceSummary,
  cancelCommunityServiceSignup,
  fetchCommunityServiceOpportunities,
  fetchCommunityServiceSummary,
  signupForCommunityService
} from '../lib/communityService';

export const CommunityService = () => {
  const [summary, setSummary] = useState<CommunityServiceSummary | null>(null);
  const [opportunities, setOpportunities] = useState<CommunityServiceOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadService = async () => {
    setError(null);

    try {
      const [nextSummary, nextOpportunities] = await Promise.all([
        fetchCommunityServiceSummary(),
        fetchCommunityServiceOpportunities()
      ]);
      setSummary(nextSummary);
      setOpportunities(nextOpportunities);
    } catch (err) {
      console.error('Error loading community service:', err);
      setError('Community service records are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadService();
  }, []);

  const groupedOpportunities = useMemo(() => groupByMonth(opportunities), [opportunities]);
  const target = summary?.service_hours_target ?? 20;
  const hours = Number(summary?.service_hours_total ?? 0);
  const progress = Math.min((hours / target) * 100, 100);

  const handleSignup = async (eventId: string) => {
    setSavingEventId(eventId);
    setError(null);
    setActionMessage(null);

    try {
      await signupForCommunityService(eventId);
      await loadService();
      setActionMessage('Signup saved and attendance expectation created.');
    } catch (err) {
      console.error('Error signing up for service:', err);
      setError('Unable to sign up. This event may be full or closed.');
    } finally {
      setSavingEventId(null);
    }
  };

  const handleCancel = async (eventId: string) => {
    setSavingEventId(eventId);
    setError(null);
    setActionMessage(null);

    try {
      await cancelCommunityServiceSignup(eventId);
      await loadService();
      setActionMessage('Signup cancelled and attendance expectation removed.');
    } catch (err) {
      console.error('Error cancelling service signup:', err);
      setError('Unable to cancel this signup.');
    } finally {
      setSavingEventId(null);
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
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22rem] text-primary">Member Service</p>
          <h1 className="mt-3 max-w-4xl text-[1.75rem] font-black leading-tight tracking-tight text-on-surface sm:text-4xl md:text-6xl">Community Service</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
            Track semester service hours, floor status, and upcoming chapter service opportunities.
          </p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 lg:min-w-80">
          <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Semester Hours</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-black text-on-surface">{formatNumber(hours)}</span>
            <span className="pb-2 text-sm font-black uppercase tracking-[0.12rem] text-on-surface-variant">/ {target}</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      {(error || actionMessage) && (
        <section className={cn(
          'rounded-3xl p-5 text-sm font-bold',
          error ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
        )}>
          {error ?? actionMessage}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Service Floor"
          value={summary?.community_service_floor_met ? 'Met' : 'Open'}
          description={summary?.community_service_floor_met ? 'Community-service event attended.' : 'Attend one community-service event this semester.'}
          tone={summary?.community_service_floor_met ? 'gold' : 'primary'}
          icon={<CheckCircle2 size={18} />}
        />
        <SummaryCard
          label="Community Events"
          value={summary?.community_service_events_attended ?? 0}
          description="Checked-in community service events."
          icon={<HeartHandshake size={18} />}
        />
        <SummaryCard
          label="Active Signups"
          value={summary?.active_service_signups ?? 0}
          description="Upcoming commitments on your roster."
          icon={<Calendar size={18} />}
        />
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant">Upcoming</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface">Service Opportunities</h2>
        </div>

        {groupedOpportunities.length === 0 ? (
          <div className="rounded-[2rem] bg-surface-container-low p-10 text-center">
            <HeartHandshake className="mx-auto h-8 w-8 text-on-surface-variant" />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.14rem] text-on-surface">No service opportunities posted</p>
          </div>
        ) : (
          groupedOpportunities.map(group => (
            <div key={group.month} className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18rem] text-secondary">{group.month}</h3>
              <div className="space-y-3">
                {group.events.map(event => (
                  <ServiceOpportunityRow
                    key={event.event_id}
                    event={event}
                    saving={savingEventId === event.event_id}
                    onSignup={() => handleSignup(event.event_id)}
                    onCancel={() => handleCancel(event.event_id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  description,
  icon,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  tone?: 'default' | 'gold' | 'primary';
}) => (
  <article className="rounded-[2rem] bg-surface-container-low p-6">
    <div className={cn(
      'mb-5 flex h-11 w-11 items-center justify-center rounded-full',
      tone === 'gold' ? 'bg-secondary/10 text-secondary' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface-variant'
    )}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">{label}</p>
    <p className={cn('mt-2 text-3xl font-black', tone === 'gold' ? 'text-secondary' : tone === 'primary' ? 'text-primary' : 'text-on-surface')}>
      {value}
    </p>
    <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant">{description}</p>
  </article>
);

interface ServiceOpportunityRowProps {
  event: CommunityServiceOpportunity;
  saving: boolean;
  onSignup: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

const ServiceOpportunityRow: React.FC<ServiceOpportunityRowProps> = ({
  event,
  saving,
  onSignup,
  onCancel
}) => {
  const status = getOpportunityStatus(event);
  const actionLabel = getOpportunityActionLabel(event);

  return (
    <article className="rounded-[2rem] bg-surface-container-low p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-black text-on-surface">{event.name}</h4>
            <span className={cn(
              'rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.1rem]',
              status.tone === 'gold' ? 'bg-secondary/10 text-secondary' : status.tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface-variant'
            )}>
              {status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-4">
            <span className="flex items-center gap-2"><Clock size={15} /> {formatDateTime(event.starts_at)}</span>
            <span className="flex items-center gap-2"><MapPin size={15} /> {event.location || 'TBD'}</span>
            <span className="flex items-center gap-2"><HeartHandshake size={15} /> {formatNumber(Number(event.hours ?? 0))} hours</span>
            <span className="flex items-center gap-2"><Users size={15} /> {event.signed_up_count}{event.signup_capacity ? `/${event.signup_capacity}` : ''} signed</span>
          </div>
        </div>

        <button
          onClick={event.user_signed_up ? onCancel : onSignup}
          disabled={saving || event.user_checked_in || (!event.user_signed_up && !event.can_signup)}
          className={cn(
            'flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.16rem] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            event.user_signed_up
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
              : 'bg-primary text-white hover:bg-primary/90'
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : event.user_signed_up ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          {actionLabel}
        </button>
      </div>
    </article>
  );
};

const groupByMonth = (events: CommunityServiceOpportunity[]) => {
  const groups = new Map<string, CommunityServiceOpportunity[]>();

  for (const event of events) {
    const month = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(event.starts_at));
    groups.set(month, [...(groups.get(month) ?? []), event]);
  }

  return [...groups.entries()].map(([month, monthEvents]) => ({ month, events: monthEvents }));
};

const getOpportunityStatus = (event: CommunityServiceOpportunity): { label: string; tone: 'default' | 'gold' | 'primary' } => {
  if (event.user_checked_in) return { label: 'Completed', tone: 'gold' };
  if (event.user_signed_up) return { label: 'Signed Up', tone: 'gold' };
  if (event.is_full) return { label: 'Full', tone: 'primary' };
  return { label: `${event.spots_remaining ?? 'Open'} Spots`, tone: 'default' };
};

const getOpportunityActionLabel = (event: CommunityServiceOpportunity) => {
  if (event.user_checked_in) return 'Completed';
  if (event.user_signed_up) return 'Cancel';
  if (event.is_full) return 'Full';
  if (!event.can_signup) return 'Closed';
  return 'Sign Up';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);
