import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileClock,
  HeartHandshake,
  History,
  Loader2,
  ShieldCheck,
  TableProperties,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  CsvValue,
  ServiceAuditRow,
  ServiceReportEventRow,
  ServiceReportExport,
  ServiceReportMemberRow,
  downloadCsv,
  fetchServiceAuditHistory,
  fetchServiceReportExport,
  toCsv
} from '../lib/serviceReports';

type ReportTab = 'members' | 'events' | 'audit';

export const ServiceReports = () => {
  const [report, setReport] = useState<ServiceReportExport | null>(null);
  const [auditRows, setAuditRows] = useState<ServiceAuditRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<ServiceReportMemberRow | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('audit');
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setError(null);
      const [auditResult, exportResult] = await Promise.allSettled([
        fetchServiceAuditHistory(),
        fetchServiceReportExport()
      ]);

      if (!isMounted) return;

      if (auditResult.status === 'fulfilled') {
        setAuditRows(auditResult.value);
      } else {
        setError(getErrorMessage(auditResult.reason, 'Unable to load your service-hour history.'));
      }

      if (exportResult.status === 'fulfilled') {
        setReport(exportResult.value);
        setActiveTab('members');
      }

      setLoading(false);
    };

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const officerMode = Boolean(report);
  const summary = report?.summary;
  const term = report?.term;
  const members = report?.members ?? [];
  const events = report?.events ?? [];
  const totalAuditHours = useMemo(
    () => auditRows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0),
    [auditRows]
  );

  const handleMemberAudit = async (member: ServiceReportMemberRow) => {
    setSelectedMember(member);
    setActiveTab('audit');
    setAuditLoading(true);
    setError(null);

    try {
      const rows = await fetchServiceAuditHistory(member.member_id);
      setAuditRows(rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load member audit history.'));
    } finally {
      setAuditLoading(false);
    }
  };

  const handleMyAudit = async () => {
    setSelectedMember(null);
    setActiveTab('audit');
    setAuditLoading(true);
    setError(null);

    try {
      const rows = await fetchServiceAuditHistory();
      setAuditRows(rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load your service-hour history.'));
    } finally {
      setAuditLoading(false);
    }
  };

  const exportMembers = () => {
    if (!report) return;
    const columns = [
      'semester',
      'as_of_date',
      'suid',
      'display_name',
      'service_hours_total',
      'community_service_events_attended',
      'community_service_floor_met',
      'hosted_philanthropy_events_attended',
      'external_philanthropy_hours_approved',
      'missed_external_commitments'
    ];
    downloadCsv(
      `service-members-${report.as_of_date}.csv`,
      toCsv(members.map(row => toCsvRecord(row, columns)), columns)
    );
    setExportMessage(`Member CSV prepared with ${members.length} rows.`);
  };

  const exportEvents = () => {
    if (!report) return;
    const columns = [
      'event_date',
      'name',
      'event_type',
      'capacity',
      'signed_up_count',
      'checked_in_count',
      'open_spots',
      'hours_per_attendee',
      'expected_brothers',
      'brothers_checked_in',
      'guests_checked_in',
      'service_hours_earned',
      'missing_brothers',
      'external_pending_reports',
      'external_approved_hours',
      'external_missed_commitments',
      'archived'
    ];
    downloadCsv(
      `service-events-${report.as_of_date}.csv`,
      toCsv(events.map(row => toCsvRecord(row, columns)), columns)
    );
    setExportMessage(`Event CSV prepared with ${events.length} rows.`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.08rem] text-primary sm:tracking-[0.18rem]">
            {officerMode ? 'Service Reporting' : 'Service History'}
          </p>
          <h1 className="mt-3 max-w-4xl text-[1.75rem] font-black leading-tight tracking-tight text-on-surface sm:text-4xl md:text-6xl">
            Reports & Audit
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
            {officerMode
              ? `Export service records and inspect member-level ledgers for ${term?.name ?? 'the current term'}.`
              : 'Review your own service-hour ledger and external philanthropy report history.'}
          </p>
        </div>

        {officerMode && (
          <div className="flex flex-wrap gap-2">
            <ExportButton onClick={exportMembers} label="Member CSV" />
            <ExportButton onClick={exportEvents} label="Event CSV" />
          </div>
        )}
      </section>

      {error && (
        <section className="flex items-start gap-3 rounded-[2rem] bg-primary/10 p-5 text-primary">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold leading-6">{error}</p>
        </section>
      )}

      {exportMessage && (
        <section className="flex items-start gap-3 rounded-[2rem] bg-secondary/10 p-5 text-secondary">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-black leading-6">{exportMessage}</p>
        </section>
      )}

      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryTile label="Approved Hours" value={formatNumber(summary.approved_service_hours)} icon={<HeartHandshake size={18} />} tone="gold" />
          <SummaryTile label="Members" value={summary.member_count} icon={<Users size={18} />} />
          <SummaryTile label="Floor Missing" value={summary.community_floor_missing} icon={<AlertCircle size={18} />} tone="primary" />
          <SummaryTile label="External Hours" value={formatNumber(summary.external_hours_approved)} icon={<ShieldCheck size={18} />} />
          <SummaryTile label="Report Events" value={summary.reportable_events} icon={<TableProperties size={18} />} />
        </section>
      )}

      {officerMode && (
        <section className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'members'} onClick={() => setActiveTab('members')} label="Members" count={members.length} />
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} label="Events" count={events.length} />
          <TabButton active={activeTab === 'audit'} onClick={handleMyAudit} label={selectedMember ? 'Member Audit' : 'My Audit'} count={auditRows.length} />
        </section>
      )}

      {activeTab === 'members' && officerMode && (
        <section className="space-y-3">
          {members.map(member => (
            <MemberReportRow key={member.member_id} member={member} onAudit={() => void handleMemberAudit(member)} />
          ))}
        </section>
      )}

      {activeTab === 'events' && officerMode && (
        <section className="space-y-3">
          {events.length === 0 ? <EmptyState title="No reportable service events in this term" /> : events.map(event => (
            <EventReportRow key={event.event_id} event={event} />
          ))}
        </section>
      )}

      {activeTab === 'audit' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[2rem] bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
                {selectedMember ? selectedMember.display_name : 'My Service Ledger'}
              </p>
              <p className="mt-2 text-2xl font-black text-on-surface">{formatNumber(totalAuditHours)} approved / recorded hours</p>
            </div>
            {selectedMember && (
              <button
                onClick={() => void handleMyAudit()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-container-lowest px-5 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                Back To My Audit
              </button>
            )}
          </div>

          {auditLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : auditRows.length === 0 ? (
            <EmptyState title="No service-hour ledger rows found" />
          ) : auditRows.map(row => (
            <AuditRow key={row.row_id} row={row} />
          ))}
        </section>
      )}
    </div>
  );
};

const ExportButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.12rem] text-white transition-colors hover:bg-primary/90 sm:px-6 sm:tracking-[0.16rem]"
  >
    <Download size={15} />
    {label}
  </button>
);

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

const MemberReportRow: React.FC<{ member: ServiceReportMemberRow; onAudit: () => void }> = ({ member, onAudit }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black text-on-surface">{member.display_name}</h2>
          <Badge tone={member.community_service_floor_met ? 'gold' : 'primary'}>
            {member.community_service_floor_met ? 'Floor Met' : 'Floor Missing'}
          </Badge>
        </div>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">SUID {member.suid}</p>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-5">
          <span>{formatNumber(member.service_hours_total)} hours</span>
          <span>{member.community_service_events_attended} community events</span>
          <span>{member.hosted_philanthropy_events_attended} hosted philanthropy</span>
          <span>{formatNumber(member.external_philanthropy_hours_approved)} external hours</span>
          <span>{member.missed_external_commitments} missed external</span>
        </div>
      </div>
      <button
        onClick={onAudit}
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-6 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <History size={15} />
        Audit
      </button>
    </div>
  </article>
);

const EventReportRow: React.FC<{ event: ServiceReportEventRow }> = ({ event }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-black text-on-surface">{event.name}</h2>
        <Badge>{event.event_type === 'community_service' ? 'Community Service' : 'Philanthropy'}</Badge>
        {event.archived && <Badge tone="primary">Archived</Badge>}
      </div>
      <div className="grid gap-3 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-6">
        <span>{formatShortDate(event.event_date)}</span>
        <span>{event.signed_up_count}{event.capacity ? `/${event.capacity}` : ''} signed</span>
        <span>{event.checked_in_count} checked in</span>
        <span>{event.guests_checked_in} guests</span>
        <span>{formatNumber(event.service_hours_earned)} hours</span>
        <span>{event.missing_brothers} missing</span>
      </div>
    </div>
  </article>
);

const AuditRow: React.FC<{ row: ServiceAuditRow }> = ({ row }) => (
  <article className="rounded-[2rem] bg-surface-container-low p-5">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-on-surface">{row.event_name}</h2>
          <Badge tone={row.source === 'external_philanthropy_self_report' ? 'gold' : 'default'}>
            {row.source === 'chapter_run_event' ? 'Chapter Event' : 'External'}
          </Badge>
          <Badge tone={row.status === 'rejected' ? 'primary' : 'default'}>{row.status}</Badge>
        </div>
        <div className="mt-3 grid gap-2 text-sm font-semibold text-on-surface-variant sm:grid-cols-2 xl:grid-cols-4">
          <span>{formatShortDate(row.event_date)}</span>
          <span>{formatNumber(row.hours)} hours</span>
          {row.requested_hours !== null && <span>{formatNumber(row.requested_hours)} requested</span>}
          <span>{row.audit_trail.length} audit actions</span>
        </div>
        {(row.notes || row.reviewer_note) && (
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-on-surface-variant">
            {row.reviewer_note || row.notes}
          </p>
        )}
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant">
        <FileClock size={18} />
      </div>
    </div>
  </article>
);

const Badge = ({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'gold' | 'primary' }) => (
  <span className={cn(
    'inline-flex min-h-7 items-center rounded-full px-3 text-[9px] font-black uppercase tracking-[0.12rem]',
    tone === 'gold'
      ? 'bg-secondary/10 text-secondary'
      : tone === 'primary'
        ? 'bg-primary/10 text-primary'
        : 'bg-surface-container-lowest text-on-surface-variant'
  )}>
    {children}
  </span>
);

const EmptyState = ({ title }: { title: string }) => (
  <div className="rounded-[2rem] bg-surface-container-low p-8 text-center">
    <p className="text-sm font-black uppercase tracking-[0.14rem] text-on-surface-variant">{title}</p>
  </div>
);

const toCsvRecord = <T extends object>(row: T, columns: string[]) => (
  columns.reduce<Record<string, CsvValue>>((record, column) => {
    const value = (row as Record<string, unknown>)[column];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      record[column] = value as CsvValue;
    } else {
      record[column] = JSON.stringify(value) ?? '';
    }
    return record;
  }, {})
);

const getErrorMessage = (err: unknown, fallback: string) => (
  err instanceof Error ? err.message : fallback
);

const formatNumber = (value: number) => (
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value ?? 0))
);

const formatShortDate = (value: string) => (
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
);
