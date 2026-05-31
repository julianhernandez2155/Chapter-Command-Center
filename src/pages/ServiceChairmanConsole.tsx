import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileClock,
  HeartHandshake,
  Loader2,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  ServiceChairmanConsoleData,
  ServiceChairmanEvent,
  ServiceMissingFloorMember,
  PendingExternalReport,
  fetchServiceChairmanConsole
} from '../lib/serviceChairman';

type ConsoleTab = 'events' | 'missing' | 'external';

export const ServiceChairmanConsole = () => {
  const [data, setData] = useState<ServiceChairmanConsoleData | null>(null);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('events');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadConsole = async () => {
      setError(null);
      try {
        const nextData = await fetchServiceChairmanConsole();
        if (isMounted) setData(nextData);
      } catch (err) {
        console.error('Error loading service chairman console:', err);
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Unable to load the service console.';
          setError(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadConsole();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedEvents = useMemo(() => data?.events ?? [], [data]);
  const missingFloor = data?.missing_floor ?? [];
  const pendingExternalReports = data?.pending_external_reports ?? [];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] bg-surface-container-low p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AlertCircle size={22} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.18rem] text-primary">Access Restricted</p>
          <h1 className="mt-3 text-3xl font-black text-on-surface">Service console unavailable</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-on-surface-variant">
            {error.includes('permission') ? 'This console is limited to the Community Service Chairman, Philanthropy Chairman, President, and Secretary.' : error}
          </p>
          <NavLink
            to="/service"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90"
          >
            Open My Service View
          </NavLink>
        </section>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.08rem] text-primary sm:tracking-[0.18rem]">Service Operations</p>
          <h1 className="mt-3 max-w-4xl text-[1.75rem] font-black leading-tight tracking-tight text-on-surface sm:text-4xl md:text-6xl">
            Service Console
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
            Monitor service-hour rollups, community-service floor completion, and service event execution.
          </p>
        </div>

        <NavLink
          to="/events"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-container-low px-4 text-[10px] font-black uppercase tracking-[0.08rem] text-on-surface transition-colors hover:bg-surface-container-high sm:px-6 sm:tracking-[0.16rem]"
        >
          <CalendarCheck size={16} />
          <span className="sm:hidden">Events</span>
          <span className="hidden sm:inline">Manage Events</span>
        </NavLink>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Approved Hours" value={formatNumber(Number(data.summary.approved_service_hours))} icon={<HeartHandshake size={18} />} tone="gold" />
        <SummaryTile label="Floor Met" value={data.summary.community_floor_met} icon={<CheckCircle2 size={18} />} />
        <SummaryTile label="Missing Floor" value={data.summary.community_floor_missing} icon={<AlertCircle size={18} />} tone="primary" />
        <SummaryTile label="Upcoming Events" value={data.summary.upcoming_service_events} icon={<CalendarCheck size={18} />} />
        <SummaryTile label="External Queue" value={data.summary.pending_external_reports} icon={<FileClock size={18} />} />
      </section>

      <section className="flex flex-wrap gap-2">
        <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} label="Events" count={sortedEvents.length} />
        <TabButton active={activeTab === 'missing'} onClick={() => setActiveTab('missing')} label="Missing Floor" count={missingFloor.length} />
        <TabButton active={activeTab === 'external'} onClick={() => setActiveTab('external')} label="External Reports" count={pendingExternalReports.length} />
      </section>

      {activeTab === 'events' && (
        <section className="space-y-3">
          {sortedEvents.length === 0 ? (
            <EmptyState title="No service events found" />
          ) : sortedEvents.map(event => (
            <ServiceEventRow key={event.id} event={event} />
          ))}
        </section>
      )}

      {activeTab === 'missing' && (
        <section className="space-y-3">
          {missingFloor.length === 0 ? (
            <EmptyState title="Every active member has met the community-service floor" />
          ) : missingFloor.map(member => (
            <MissingFloorRow key={member.member_id} member={member} />
          ))}
        </section>
      )}

      {activeTab === 'external' && (
        <section className="space-y-3">
          {pendingExternalReports.length === 0 ? (
            <EmptyState title="No pending external philanthropy reports" />
          ) : pendingExternalReports.map(report => (
            <ExternalReportRow key={report.id} report={report} />
          ))}
        </section>
      )}
    </div>
  );
};

const SummaryTile = ({
  label,
  value,
  icon,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'default' | 'gold' | 'primary';
}) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className={cn(
      'mb-4 flex h-10 w-10 items-center justify-center rounded-full',
      tone === 'gold' ? 'bg-secondary/10 text-secondary' : tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface-variant'
    )}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className={cn('mt-2 text-3xl font-black', tone === 'gold' ? 'text-secondary' : tone === 'primary' ? 'text-primary' : 'text-on-surface')}>{value}</p>
  </article>
);

const TabButton = ({
  active,
  onClick,
  label,
  count
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-black uppercase tracking-[0.14rem] transition-colors',
      active ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
    )}
  >
    {label}
    <span className={cn('rounded-full px-2 py-0.5 text-[9px]', active ? 'bg-white/15 text-white' : 'bg-surface-container-lowest text-on-surface-variant')}>
      {count}
    </span>
  </button>
);

interface ServiceEventRowProps {
  event: ServiceChairmanEvent;
}

const ServiceEventRow: React.FC<ServiceEventRowProps> = ({ event }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black text-on-surface">{event.name}</h2>
          <Badge tone={event.status === 'complete' ? 'gold' : event.status === 'live' ? 'primary' : 'default'}>{event.status}</Badge>
          <Badge>{event.type === 'community_service' ? 'Community Service' : 'Philanthropy'}</Badge>
        </div>

        <div className="mt-4 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-5">
          <span className="flex items-center gap-2"><Clock size={15} /> {formatDateTime(event.starts_at)}</span>
          <span className="flex items-center gap-2"><Users size={15} /> {event.signed_up_count}{event.signup_capacity ? `/${event.signup_capacity}` : ''} signed</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={15} /> {event.checked_in_count} checked in</span>
          <span className="flex items-center gap-2"><HeartHandshake size={15} /> {formatNumber(Number(event.hours_awarded))} awarded</span>
          <span>{event.location || 'Location TBD'}</span>
        </div>
      </div>

      <NavLink
        to={`/events/${event.id}`}
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90"
      >
        <ExternalLink size={15} />
        Event Details
      </NavLink>
    </div>
  </article>
);

interface MissingFloorRowProps {
  member: ServiceMissingFloorMember;
}

const MissingFloorRow: React.FC<MissingFloorRowProps> = ({ member }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-black text-on-surface">{member.display_name}</h2>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">SUID {member.suid}</p>
      </div>
      <div className="grid gap-3 text-sm font-semibold text-on-surface-variant sm:grid-cols-3">
        <span>{formatNumber(Number(member.service_hours_total))} hours</span>
        <span>{member.community_service_events_attended} community events</span>
        <span>{member.active_service_signups} active signups</span>
      </div>
    </div>
  </article>
);

const ExternalReportRow: React.FC<{ report: PendingExternalReport }> = ({ report }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-black text-on-surface">{report.member_name}</h2>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{report.event_name}</p>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-3">
          <span>{formatNumber(Number(report.requested_hours))} requested hours</span>
          <span>Submitted {formatDateTime(report.submitted_at)}</span>
          <span>{report.proof_url ? 'Proof attached' : 'No proof link'}</span>
        </div>
      </div>
      <NavLink
        to="/service/external"
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[10px] font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90"
      >
        <FileClock size={15} />
        Review Queue
      </NavLink>
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
    <HeartHandshake className="mx-auto h-8 w-8 text-on-surface-variant" />
    <p className="mt-4 text-sm font-black uppercase tracking-[0.14rem] text-on-surface">{title}</p>
  </div>
);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);
