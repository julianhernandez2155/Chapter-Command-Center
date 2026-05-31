import React, { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Search,
  Upload,
  UserCheck,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { fetchAttendanceImportMembers } from '../lib/attendanceImport';
import {
  AttendanceStatus,
  LiveEvent,
  fetchEvents,
  formatEventDate,
  formatEventTimeRange,
  importCsvAttendance
} from '../lib/events';
import {
  CsvMatch,
  matchCsvIdentities,
  parseAttendanceCsv
} from '../lib/logic/attendance';

type ImportStep = 'upload' | 'review' | 'complete';

export const ImportAttendance = () => {
  const { member } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('on_time');
  const [fileName, setFileName] = useState('');
  const [matches, setMatches] = useState<CsvMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    const loadImportContext = async () => {
      setLoading(true);
      setError(null);

      try {
        const eventRows = (await fetchEvents())
          .filter(event => !event.archived_at)
          .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        setEvents(eventRows);
        setSelectedEventId(eventRows.find(event => event.type === 'chapter_meeting')?.id ?? eventRows[0]?.id ?? '');
      } catch (err) {
        console.error('Error loading attendance import context:', err);
        setError('Unable to load events for attendance import.');
      } finally {
        setLoading(false);
      }
    };

    void loadImportContext();
  }, []);

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const matchedRows = useMemo(() => matches.filter(match => match.memberId), [matches]);
  const reviewRows = useMemo(() => matches.filter(match => !match.memberId), [matches]);
  const canFinalize = Boolean(selectedEventId && matchedRows.length > 0 && member && !saving);

  const processFile = async (file: File) => {
    setError(null);

    try {
      const csv = await file.text();
      const identities = parseAttendanceCsv(csv);
      if (identities.length === 0) {
        setMatches([]);
        setFileName(file.name);
        setError('No SUID or school email column was found in that CSV.');
        return;
      }

      const members = await fetchAttendanceImportMembers();
      const nextMatches = matchCsvIdentities(identities, members);
      setMatches(nextMatches);
      setFileName(file.name);
      setStep('review');
    } catch (err) {
      console.error('Error parsing attendance CSV:', err);
      setError('Unable to parse that CSV file.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleFinalize = async () => {
    if (!member || !selectedEventId) return;

    setSaving(true);
    setError(null);

    try {
      const uniqueMemberIds: string[] = Array.from(new Set<string>(
        matchedRows
          .map(match => match.memberId)
          .filter((memberId): memberId is string => Boolean(memberId))
      ));
      const result = await importCsvAttendance(
        selectedEventId,
        uniqueMemberIds,
        status,
        `CSV import: ${fileName}`
      );
      setImportedCount(result.imported_count);
      setStep('complete');
    } catch (err) {
      console.error('Error finalizing attendance import:', err);
      setError('Unable to finalize the import. Check event permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setMatches([]);
    setFileName('');
    setImportedCount(0);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">Data Protocol</p>
          <h1 className="mt-2 text-5xl font-black uppercase tracking-tighter text-on-surface">Import Attendance</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-on-surface-variant">
            Merge a CSV into one event by exact SUID first, school email second. Names are ignored.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)] xl:w-[44rem]">
          <label className="space-y-2">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/60">Target Event</span>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={event => setSelectedEventId(event.target.value)}
                className="w-full appearance-none pr-12 sunken-input"
                disabled={loading}
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} · {formatEventDate(event.event_date)}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/60">Imported Status</span>
            <div className="relative">
              <select
                value={status}
                onChange={event => setStatus(event.target.value as AttendanceStatus)}
                className="w-full appearance-none pr-12 sunken-input"
              >
                <option value="on_time">On Time</option>
                <option value="late">Late</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            </div>
          </label>
        </div>
      </section>

      <StepRail step={step} />

      {error && (
        <section className="flex items-center gap-3 rounded-2xl bg-error/10 p-5 text-sm font-bold text-error">
          <AlertCircle size={18} />
          {error}
        </section>
      )}

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.section
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-8"
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'dashed-border flex min-h-96 cursor-pointer flex-col items-center justify-center gap-6 bg-surface-container-low/30 p-8 text-center transition-all',
                isDragging && 'scale-[0.99] bg-primary/5'
              )}
              onClick={() => inputRef.current?.click()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-black uppercase tracking-[0.18rem] text-on-surface-variant">Loading import context</p>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-surface-container-high text-primary">
                    <Upload size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black tracking-tight text-on-surface">Drop attendance CSV here</p>
                    <p className="text-sm font-semibold text-on-surface-variant">
                      Required identity column: SUID, student ID, school email, or Google email.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-surface-container-high px-8 py-3 text-xs font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-bright"
                  >
                    Browse Files
                  </button>
                </>
              )}
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TipCard icon={<FileText size={18} />} title="Format" description="UTF-8 CSV. Header names can use SUID, student ID, email, school email, or google_email." />
              <TipCard icon={<Search size={18} />} title="Matching" description="Exact SUID first, exact school email second. No member name matching." />
              <TipCard icon={<AlertCircle size={18} />} title="Review" description="Missing, duplicate, or unmatched identities are held out before import." />
            </section>
          </motion.section>
        )}

        {step === 'review' && (
          <motion.section
            key="review"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-8"
          >
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <ImportMetric label="Rows Parsed" value={matches.length} />
              <ImportMetric label="Ready" value={matchedRows.length} tone="good" />
              <ImportMetric label="Held Out" value={reviewRows.length} tone="warn" />
              <ImportMetric label="Status" value={status === 'on_time' ? 'On Time' : 'Late'} compact />
            </section>

            {selectedEvent && (
              <section className="rounded-[2rem] bg-surface-container-low p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Import Target</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-on-surface">{selectedEvent.name}</h2>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14rem] text-on-surface-variant">
                  {formatEventDate(selectedEvent.event_date)} · {formatEventTimeRange(selectedEvent.starts_at, selectedEvent.ends_at)} · {fileName}
                </p>
              </section>
            )}

            <section className="space-y-4">
              <SectionHeader label="Ready To Import" count={matchedRows.length} tone="good" />
              <div className="space-y-3">
                {matchedRows.slice(0, 12).map(match => (
                  <React.Fragment key={`${match.rowNumber}-${match.rawValue}`}>
                    <MatchRow match={match} />
                  </React.Fragment>
                ))}
                {matchedRows.length > 12 && (
                  <p className="px-4 text-xs font-bold uppercase tracking-[0.14rem] text-on-surface-variant/60">
                    {matchedRows.length - 12} additional matched rows will import.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader label="Held Out" count={reviewRows.length} tone="warn" />
              {reviewRows.length === 0 ? (
                <div className="rounded-2xl bg-green-500/10 p-5 text-sm font-bold text-green-500">No rows need review.</div>
              ) : (
                <div className="space-y-3">
                  {reviewRows.slice(0, 8).map(match => (
                    <React.Fragment key={`${match.rowNumber}-${match.rawValue}`}>
                      <MatchRow match={match} />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={resetImport} className="rounded-full bg-surface-container-high px-6 py-4 text-xs font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-bright">
                Back To Upload
              </button>
              <button
                onClick={handleFinalize}
                disabled={!canFinalize}
                className="flex min-h-14 items-center justify-center gap-3 rounded-full bg-primary px-10 text-xs font-black uppercase tracking-[0.16rem] text-white disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck size={17} />}
                Finalize {matchedRows.length} Rows
              </button>
            </div>
          </motion.section>
        )}

        {step === 'complete' && (
          <motion.section
            key="complete"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 size={54} />
            </div>
            <h2 className="mt-8 text-4xl font-black uppercase tracking-tighter text-on-surface">Import Posted</h2>
            <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-on-surface-variant">
              {importedCount} CSV attendance rows were written to {selectedEvent?.name ?? 'the selected event'} with audit entries.
            </p>
            <button onClick={resetImport} className="mt-8 rounded-full bg-primary px-8 py-4 text-xs font-black uppercase tracking-[0.16rem] text-white">
              Import Another CSV
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepRail = ({ step }: { step: ImportStep }) => {
  const steps: { key: ImportStep; label: string }[] = [
    { key: 'upload', label: 'Upload CSV' },
    { key: 'review', label: 'Review Matches' },
    { key: 'complete', label: 'Finalize' }
  ];
  const activeIndex = steps.findIndex(item => item.key === step);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((item, index) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all',
            index < activeIndex && 'bg-green-500 text-white',
            index === activeIndex && 'scale-110 bg-primary text-white',
            index > activeIndex && 'bg-surface-container-high text-on-surface-variant/40'
          )}>
            {index < activeIndex ? <CheckCircle2 size={16} /> : index + 1}
          </div>
          <span className={cn(
            'text-[10px] font-black uppercase tracking-[0.16rem]',
            index === activeIndex ? 'text-on-surface' : 'text-on-surface-variant/40'
          )}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const TipCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-[2rem] bg-surface-container-low p-6">
    <div className="text-primary">{icon}</div>
    <h3 className="mt-4 text-sm font-black uppercase tracking-tight text-on-surface">{title}</h3>
    <p className="mt-2 text-xs font-semibold leading-5 text-on-surface-variant">{description}</p>
  </div>
);

const ImportMetric = ({
  label,
  value,
  tone = 'neutral',
  compact = false
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'good' | 'warn';
  compact?: boolean;
}) => (
  <div className="rounded-[2rem] bg-surface-container-low p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/50">{label}</p>
    <p className={cn(
      'mt-2 font-black tracking-tighter',
      compact ? 'text-2xl' : 'text-4xl',
      tone === 'good' && 'text-green-500',
      tone === 'warn' && 'text-secondary',
      tone === 'neutral' && 'text-on-surface'
    )}>{value}</p>
  </div>
);

const SectionHeader = ({ label, count, tone }: { label: string; count: number; tone: 'good' | 'warn' }) => (
  <div className="flex items-center gap-4">
    <span className={cn('h-3 w-3 rounded-full', tone === 'good' ? 'bg-green-500' : 'bg-secondary')} />
    <h2 className={cn(
      'text-[10px] font-black uppercase tracking-[0.3rem]',
      tone === 'good' ? 'text-green-500' : 'text-secondary'
    )}>{label} ({count})</h2>
  </div>
);

const MatchRow = ({ match }: { match: CsvMatch }) => {
  const matched = Boolean(match.memberId);
  return (
    <article className={cn(
      'grid grid-cols-1 gap-4 rounded-2xl p-5 md:grid-cols-12 md:items-center',
      matched ? 'bg-surface-container-low' : 'bg-secondary/10'
    )}>
      <div className="md:col-span-3">
        <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">Row {match.rowNumber}</p>
        <p className="mt-1 text-sm font-black text-on-surface">{match.rawValue || 'Missing identity'}</p>
      </div>
      <ArrowRight className="hidden text-on-surface-variant/30 md:block" size={16} />
      <div className="md:col-span-5">
        <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">{matched ? 'Matched Member' : 'Review Reason'}</p>
        <p className="mt-1 text-sm font-black text-on-surface">{matched ? match.memberName : reasonLabel(match.reason)}</p>
      </div>
      <div className="md:col-span-3 md:text-right">
        <span className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.12rem]',
          matched ? 'bg-green-500/10 text-green-500' : 'bg-secondary/10 text-secondary'
        )}>
          {matched ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {matched ? (match.reason === 'suid' ? 'SUID' : 'Email') : 'Held'}
        </span>
      </div>
    </article>
  );
};

const reasonLabel = (reason: CsvMatch['reason']) => {
  if (reason === 'missing_identity') return 'Missing SUID or school email';
  if (reason === 'duplicate_identity') return 'Duplicate identity';
  if (reason === 'no_match') return 'No member match';
  return reason;
};
