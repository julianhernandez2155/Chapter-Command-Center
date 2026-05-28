import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  House,
  Loader2,
  MessageSquare,
  Pencil,
  Save,
  ScrollText,
  ShieldCheck,
  Square,
  User,
  Users,
  UsersRound
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  SecretaryMemberProfile,
  fetchSecretaryMemberProfiles,
  updateSecretaryMemberProfile,
  upsertGuardianContact
} from '../lib/memberSecretaryRegistry';
import {
  VerificationCycle,
  VerificationReviewDecision,
  VerificationSubmission,
  fetchActiveVerificationCycle,
  fetchVerificationSubmissions,
  reviewVerificationSubmission
} from '../lib/memberVerification';

type ReviewFieldInputType = 'text' | 'email' | 'tel' | 'number' | 'checkbox';
type ReviewEditableMemberField = keyof Pick<SecretaryMemberProfile,
  | 'preferred_name'
  | 'personal_email'
  | 'phone'
  | 'graduation_year'
  | 'expected_graduation_term'
  | 'school'
  | 'major'
  | 'housing_type'
  | 'local_address'
  | 'campus_housing'
  | 'home_city'
  | 'home_state'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'tshirt_size'
  | 'hoodie_size'
  | 'parent_outreach_consent'
>;
type ReviewEditableTarget =
  | { table: 'members'; field: ReviewEditableMemberField }
  | { table: 'guardian'; order: 1 | 2; field: 'contact_name' | 'relationship' | 'phone' | 'email' };

interface VerificationReviewField {
  key: string;
  label: string;
  group: string;
  currentValue: string | boolean | number | null;
  flagged: boolean;
  missing: boolean;
  required: boolean;
  inputType: ReviewFieldInputType;
  editable?: ReviewEditableTarget;
}

interface CycleStats {
  completeCount: number;
  notStartedCount: number;
  inProgressCount: number;
  needsReviewCount: number;
  optionalFlagCount: number;
}

type QueueFilter = 'all' | 'flagged';

export const SecretaryVerificationReview = () => {
  const [members, setMembers] = useState<SecretaryMemberProfile[]>([]);
  const [cycle, setCycle] = useState<VerificationCycle | null>(null);
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberRows, activeCycle] = await Promise.all([
        fetchSecretaryMemberProfiles(),
        fetchActiveVerificationCycle()
      ]);
      setMembers(memberRows);
      setCycle(activeCycle);
      setSubmissions(activeCycle ? await fetchVerificationSubmissions(activeCycle.id) : []);
    } catch (err) {
      console.error('Unable to load verification review:', err);
      setError(err instanceof Error ? err.message : 'Unable to load verification review.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeMembers = useMemo(
    () => members.filter(member => member.status === 'active'),
    [members]
  );
  const submissionByMemberId = useMemo(
    () => new Map(submissions.map(submission => [submission.member_id, submission])),
    [submissions]
  );
  const stats = useMemo(() => getCycleStats(activeMembers, submissions), [activeMembers, submissions]);
  const reviewRows = useMemo(() => activeMembers
    .map(member => ({ member, submission: submissionByMemberId.get(member.id) }))
    .filter((row): row is { member: SecretaryMemberProfile; submission: VerificationSubmission } => row.submission?.status === 'submitted')
    .sort((a, b) => (a.submission.submitted_at ?? '').localeCompare(b.submission.submitted_at ?? '')), [activeMembers, submissionByMemberId]);
  const activeReview = reviewRows.find(row => row.submission.id === activeReviewId) ?? reviewRows[0] ?? null;
  const flaggedReviewCount = reviewRows.filter(row => row.submission.optional_review_flags.length > 0).length;
  const visibleReviewRows = queueFilter === 'flagged'
    ? reviewRows.filter(row => row.submission.optional_review_flags.length > 0)
    : reviewRows;
  const activeFields = useMemo(
    () => activeReview ? buildReviewFields(activeReview.member, activeReview.submission) : [],
    [activeReview]
  );
  const sections = useMemo(
    () => groupReviewFields(activeFields, fieldNotes),
    [activeFields, fieldNotes]
  );
  const missingCount = activeFields.filter(field => field.required && field.missing).length;
  const flagCount = activeReview?.submission.optional_review_flags.length ?? 0;
  const noteCount = Object.values(fieldNotes).filter(note => typeof note === 'string' && note.trim().length > 0).length;

  useEffect(() => {
    if (!activeReview) {
      setActiveReviewId(null);
      setFieldNotes({});
      return;
    }
    setActiveReviewId(activeReview.submission.id);
    setFieldNotes(activeReview.submission.needs_changes_field_notes ?? {});
  }, [activeReview?.submission.id]);

  const updateFieldNote = (fieldKey: string, note: string) => {
    setFieldNotes(current => {
      const next = { ...current };
      const cleanNote = note.trimStart();
      if (cleanNote.trim().length === 0) delete next[fieldKey];
      else next[fieldKey] = cleanNote;
      return next;
    });
  };

  const moveReview = (direction: 1 | -1) => {
    if (reviewRows.length === 0) return;
    const index = activeReview ? reviewRows.findIndex(row => row.submission.id === activeReview.submission.id) : -1;
    const nextIndex = index >= 0 ? (index + direction + reviewRows.length) % reviewRows.length : 0;
    setActiveReviewId(reviewRows[nextIndex].submission.id);
  };

  const submitDecision = async (decision: VerificationReviewDecision) => {
    if (!activeReview) return;
    const cleanedFieldNotes = Object.fromEntries(
      Object.entries(fieldNotes)
        .map(([field, note]) => [field, String(note).trim()] as const)
        .filter(([, note]) => note.length > 0)
    );
    const notedFields = Object.keys(cleanedFieldNotes);

    if (decision === 'needs_changes' && notedFields.length === 0) {
      setError('Add a note on at least one field before requesting changes.');
      return;
    }

    setSavingId(activeReview.submission.id);
    setError(null);
    try {
      await reviewVerificationSubmission({
        submissionId: activeReview.submission.id,
        decision,
        note: decision === 'needs_changes'
          ? `${notedFields.length} field ${notedFields.length === 1 ? 'needs' : 'need'} member attention.`
          : null,
        fields: decision === 'approved' ? [] : notedFields,
        fieldNotes: decision === 'approved' ? {} : cleanedFieldNotes
      });
      await loadData();
    } catch (err) {
      console.error('Unable to submit review decision:', err);
      setError(err instanceof Error ? err.message : 'Unable to submit review decision.');
    } finally {
      setSavingId(null);
    }
  };

  const saveField = async (
    member: SecretaryMemberProfile,
    field: VerificationReviewField,
    rawValue: string | boolean
  ) => {
    if (!field.editable) return;

    setSavingId(`${member.id}-${field.key}`);
    setError(null);
    try {
      if (field.editable.table === 'members') {
        await updateSecretaryMemberProfile(member.id, {
          [field.editable.field]: rawValue
        });
      } else {
        await upsertGuardianContact({
          member_id: member.id,
          contact_order: field.editable.order,
          contact_name: getGuardianContactName(member, field.editable.order, field.editable.field, rawValue),
          relationship: getGuardianFieldValue(member, field.editable.order, 'relationship', field.editable.field, rawValue),
          phone: getGuardianFieldValue(member, field.editable.order, 'phone', field.editable.field, rawValue),
          email: getGuardianFieldValue(member, field.editable.order, 'email', field.editable.field, rawValue)
        });
      }
      await loadData();
    } catch (err) {
      console.error('Unable to save review field:', err);
      setError(err instanceof Error ? err.message : 'Unable to save field.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="flex min-h-screen bg-surface text-on-surface">
      <aside className="hidden w-[288px] shrink-0 bg-surface-container-lowest xl:block">
        <div className="m-3 mt-20 rounded-md border border-outline-variant bg-surface-container-low">
          <div className="px-5 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11rem] text-on-surface-variant">Verification Queue</p>
            <div className="mt-4 grid grid-cols-2 border-b border-outline-variant text-sm">
              <button
                type="button"
                onClick={() => setQueueFilter('all')}
                className={cn(
                  'relative h-10 text-center transition-colors',
                  queueFilter === 'all' ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                All ({reviewRows.length})
                {queueFilter === 'all' && <span className="absolute inset-x-0 -bottom-px h-px bg-primary" />}
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('flagged')}
                className={cn(
                  'relative h-10 text-center transition-colors',
                  queueFilter === 'flagged' ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                Flagged ({flaggedReviewCount})
                {queueFilter === 'flagged' && <span className="absolute inset-x-0 -bottom-px h-px bg-primary" />}
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-0 pb-2">
            {loading ? (
              <QueueEmptyState label="Loading submitted profiles..." />
            ) : visibleReviewRows.length === 0 ? (
              <QueueEmptyState label={queueFilter === 'flagged' ? 'No flagged profiles are waiting.' : 'No submitted profiles are waiting.'} />
            ) : (
              visibleReviewRows.map(({ member, submission }) => {
                const signals = getSubmissionSignals(member, submission);
                return (
                  <QueueReviewItem
                    key={submission.id}
                    active={activeReview?.submission.id === submission.id}
                    name={getDisplayName(member)}
                    submittedAt={submission.submitted_at}
                    missing={signals.missing}
                    flagged={signals.flagged}
                    notes={signals.notes}
                    onClick={() => setActiveReviewId(submission.id)}
                  />
                );
              })
            )}
          </div>

          {reviewRows.length > 6 && (
            <div className="p-2">
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-surface-container-high text-sm font-bold text-on-surface-variant hover:text-on-surface">
                Load more <ChevronDown size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {error && (
          <div className="mb-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-[2rem] bg-surface-container-low">
            <Loader2 className="animate-spin text-primary" />
            <span className="ml-3 text-xs font-black uppercase tracking-[0.16rem] text-on-surface-variant">Loading review</span>
          </div>
        ) : !cycle ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-[2rem] bg-surface-container-low text-center">
            <div>
              <ShieldCheck className="mx-auto mb-4 text-secondary" size={36} />
              <h2 className="text-2xl font-black text-on-surface">No active verification gate</h2>
              <p className="mt-2 text-sm font-semibold text-on-surface-variant">Launch a semester gate from the Secretary Registry first.</p>
            </div>
          </div>
        ) : !activeReview ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-[2rem] bg-surface-container-low text-center">
            <div>
              <CheckCircle2 className="mx-auto mb-4 text-secondary" size={38} />
              <p className="text-xl font-black text-on-surface">Queue clear</p>
              <p className="mt-2 text-sm font-semibold text-on-surface-variant">Every submitted verification has been handled.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <Link to="/admin/members" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
                  <ArrowLeft size={15} />
                  Back to Queue
                </Link>
                <h1 className="text-[34px] font-black leading-none tracking-normal text-on-surface md:text-[40px]">
                  {getDisplayName(activeReview.member)}
                </h1>
                <div className="mt-4 flex flex-wrap gap-3">
                  <SignalCounter tone="red" value={missingCount} label="missing" />
                  <SignalCounter tone="gold" value={flagCount} label={flagCount === 1 ? 'flag' : 'flags'} />
                  <SignalCounter tone="gray" value={noteCount} label={noteCount === 1 ? 'note' : 'notes'} />
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-9">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => moveReview(-1)}
                    disabled={savingId === activeReview.submission.id || reviewRows.length < 2}
                    className="flex h-11 items-center gap-2 rounded-full bg-surface-container-low px-5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-35"
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReview(1)}
                    disabled={savingId === activeReview.submission.id || reviewRows.length < 2}
                    className="flex h-11 items-center gap-2 rounded-full bg-surface-container-low px-5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-35"
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => void submitDecision('needs_changes')}
                    disabled={savingId === activeReview.submission.id}
                    className="flex h-12 min-w-48 items-center justify-center gap-3 rounded-full bg-surface-container-high px-5 text-sm font-black text-secondary transition-colors hover:bg-surface-bright disabled:opacity-50"
                  >
                    {savingId === activeReview.submission.id ? <Loader2 size={17} className="animate-spin" /> : <MessageSquare size={17} />}
                    Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitDecision('approved')}
                    disabled={savingId === activeReview.submission.id}
                    className="flex h-12 min-w-48 items-center justify-center gap-3 rounded-full bg-primary px-5 text-sm font-black text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingId === activeReview.submission.id ? <Loader2 size={17} className="animate-spin" /> : <Check size={19} />}
                    Approve
                  </button>
                </div>
              </div>
            </div>

            {activeReview.submission.correction_notes && (
              <div className="mb-3 rounded-2xl bg-primary/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.11rem] text-primary">Member Note</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{activeReview.submission.correction_notes}</p>
              </div>
            )}

            <div className="space-y-1.5">
              {sections.map(section => (
                <section key={section.group} className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
                  <div className="flex h-7 items-center justify-between border-b border-outline-variant bg-surface-container-low px-4">
                    <div className="flex items-center gap-3">
                      <SectionHeadingIcon group={section.group} />
                      <p className="text-[13px] font-black uppercase tracking-[0.08rem] text-secondary">{section.group}</p>
                    </div>
                    <ChevronDown size={15} className="rotate-180 text-on-surface-variant" />
                  </div>
                  <div className="grid min-w-[760px] grid-cols-[30%_33%_24%_13%] border-b border-outline-variant bg-surface-container-low text-[12px] text-on-surface-variant">
                    <div className="border-r border-outline-variant px-4 py-1">Field</div>
                    <div className="border-r border-outline-variant px-4 py-1">Value</div>
                    <div className="border-r border-outline-variant px-4 py-1">Status</div>
                    <div className="px-4 py-1 text-center">Actions</div>
                  </div>
                  <div className="min-w-[760px]">
                    {section.fields.map(field => (
                      <ReviewFieldRow
                        key={field.key}
                        field={field}
                        note={fieldNotes[field.key] ?? ''}
                        saving={savingId === `${activeReview.member.id}-${field.key}`}
                        onNoteChange={value => updateFieldNote(field.key, value)}
                        onSave={value => saveField(activeReview.member, field, value)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </section>
  );
};

const QueueEmptyState = ({ label }: { label: string }) => (
  <p className="mx-3 my-3 rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-5 text-sm text-on-surface-variant">
    {label}
  </p>
);

const QueueReviewItem = ({
  active,
  name,
  submittedAt,
  missing,
  flagged,
  notes,
  onClick
}: {
  key?: React.Key;
  active: boolean;
  name: string;
  submittedAt?: string | null;
  missing: number;
  flagged: number;
  notes: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full border-b border-outline-variant px-4 py-4 text-left transition-colors',
      active ? 'border border-primary/65 bg-primary/15' : 'hover:bg-surface-container-high/45'
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-[15px] font-bold text-on-surface">{name}</p>
      <p className="shrink-0 text-[12px] text-on-surface-variant">{formatRelativeSubmission(submittedAt)}</p>
    </div>
    <div className="mt-3 flex gap-3">
      <MiniCount tone="red" value={missing} />
      <MiniCount tone="gold" value={flagged} />
      <MiniCount tone="gray" value={notes} />
    </div>
  </button>
);

const MiniCount = ({ tone, value }: { tone: 'red' | 'gold' | 'gray'; value: number }) => (
  <span className={cn(
    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white',
    tone === 'red' && 'bg-primary',
    tone === 'gold' && 'bg-secondary-container',
    tone === 'gray' && 'bg-surface-bright'
  )}>
    {value}
  </span>
);

const SignalCounter = ({ tone, value, label }: { tone: 'red' | 'gold' | 'gray'; value: number; label: string }) => (
  <span className="flex h-11 min-w-36 items-center gap-3 rounded-full bg-surface-container-low px-5 text-sm font-bold text-on-surface-variant">
    <MiniCount tone={tone} value={value} />
    <span>{label}</span>
  </span>
);

const SectionHeadingIcon = ({ group }: { group: string }) => {
  const iconProps = { size: 15, strokeWidth: 1.8, className: 'text-secondary' };
  switch (group) {
    case 'Identity':
      return <User {...iconProps} />;
    case 'Housing':
      return <House {...iconProps} />;
    case 'Academic':
      return <ScrollText {...iconProps} />;
    case 'Family':
      return <UsersRound {...iconProps} />;
    case 'Social':
      return <Users {...iconProps} />;
    case 'Apparel':
      return <FileText {...iconProps} />;
    default:
      return <MessageSquare {...iconProps} />;
  }
};

const ReviewFieldRow = ({
  field,
  note,
  saving,
  onNoteChange,
  onSave
}: {
  key?: string;
  field: VerificationReviewField;
  note: string;
  saving: boolean;
  onNoteChange: (value: string) => void;
  onSave: (value: string | boolean) => void;
}) => {
  const [draft, setDraft] = useState<string | boolean>(getReviewInputValue(field.currentValue, field.inputType));
  const [editing, setEditing] = useState(false);
  const [noting, setNoting] = useState(Boolean(note));

  useEffect(() => {
    setDraft(getReviewInputValue(field.currentValue, field.inputType));
  }, [field.currentValue, field.inputType]);

  useEffect(() => {
    setNoting(Boolean(note));
  }, [note]);

  const valueChanged = String(draft) !== String(getReviewInputValue(field.currentValue, field.inputType));

  return (
    <div className={cn(
      'group border-b border-outline-variant text-[12px] transition-colors last:border-b-0',
      note ? 'bg-primary/12' : field.required && field.missing ? 'bg-primary/18' : 'bg-transparent hover:bg-surface-container-low/65'
    )}>
      <div className="grid min-h-[25px] grid-cols-[30%_33%_24%_13%]">
        <div className="flex min-w-0 items-center border-r border-outline-variant px-4 py-0.5 text-on-surface">
          <span className="truncate">{field.label}</span>
          {!field.required && field.key === 'preferred_name' && (
            <span className="ml-2 rounded-full bg-secondary-container px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary-container">Note</span>
          )}
        </div>

        <div className="min-w-0 border-r border-outline-variant px-4 py-0.5">
          {editing && field.editable ? (
            <div className="flex items-center gap-2">
              {field.inputType === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => setDraft(!Boolean(draft))}
                  className={cn(
                    'flex h-7 min-w-7 items-center justify-center rounded-full',
                    Boolean(draft) ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
                  )}
                  title="Toggle value"
                >
                  {Boolean(draft) ? <CheckSquare size={13} /> : <Square size={13} />}
                </button>
              ) : (
                <input
                  type={field.inputType}
                  value={String(draft)}
                  onChange={event => setDraft(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg bg-surface-container-low px-2 py-1 text-[13px] text-on-surface outline-none focus:ring-1 focus:ring-secondary/60"
                  autoFocus
                />
              )}
              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
                disabled={saving || !valueChanged}
                className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                title="Save field"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => field.editable && setEditing(true)}
              className={cn(
                'w-full truncate rounded px-0 py-0.5 text-left transition-colors',
                field.required && field.missing ? 'text-primary' : field.missing ? 'text-on-surface-variant/70' : 'text-on-surface',
                field.editable && 'hover:text-on-surface'
              )}
            >
              {formatFieldValue(field)}
            </button>
          )}
        </div>

        <div className="flex items-center border-r border-outline-variant px-4 py-0.5">
          <StatusPill field={field} note={note} />
        </div>

        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={() => setEditing(current => !current)}
            disabled={!field.editable}
            className="flex min-h-[25px] items-center justify-center border-r border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface disabled:opacity-30"
            title="Edit field"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setNoting(current => !current)}
            className={cn(
              'flex min-h-[25px] items-center justify-center transition-colors hover:bg-surface-container-low',
              note ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            )}
            title={note ? 'Edit note' : 'Add note'}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </div>

      {noting && (
        <label className="block border-t border-outline-variant px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-[0.12rem] text-primary">Member note</span>
          <textarea
            value={note}
            onChange={event => onNoteChange(event.target.value)}
            rows={2}
            placeholder="Tell the member exactly what to fix for this field."
            className="mt-2 w-full resize-none rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/45 focus:ring-1 focus:ring-secondary/60"
          />
        </label>
      )}
    </div>
  );
};

const StatusPill = ({ field, note }: { field: VerificationReviewField; note: string }) => {
  const status = getFieldStatus(field, note);
  const tone = note ? 'error' : field.required && field.missing ? 'primary' : field.flagged ? 'primary' : 'quiet';
  return (
    <span className={cn(
      'text-[12px]',
      tone === 'quiet' && 'text-secondary',
      tone === 'primary' && 'text-primary',
      tone === 'error' && 'text-primary'
    )}>
      {status}
    </span>
  );
};

const REVIEW_MEMBER_FIELDS: VerificationReviewField[] = [
  reviewDisplayField('legal_name', 'Legal name', 'Identity', 'text'),
  reviewMemberField('preferred_name', 'Preferred name', 'Identity', 'text'),
  reviewDisplayField('birthday', 'Date of birth', 'Identity', 'text'),
  reviewDisplayField('suid', 'SUID', 'Identity', 'text'),
  reviewDisplayField('google_email', 'School email', 'Contact', 'email'),
  reviewMemberField('personal_email', 'Personal email', 'Contact', 'email'),
  reviewMemberField('phone', 'Phone', 'Contact', 'tel'),
  reviewMemberField('instagram', 'Instagram handle', 'Contact', 'text'),
  reviewMemberField('housing_type', 'Housing type', 'Housing', 'text'),
  reviewMemberField('local_address', 'Local address', 'Housing', 'text'),
  reviewMemberField('campus_housing', 'Dorm / room', 'Housing', 'text'),
  reviewDisplayField('college', 'College', 'Academic', 'text'),
  reviewMemberField('major', 'Major', 'Academic', 'text'),
  reviewMemberField('expected_graduation_term', 'Expected graduation', 'Academic', 'text'),
  reviewMemberField('graduation_year', 'Graduation year', 'Academic', 'number')
];

const REVIEW_GUARDIAN_FIELDS: VerificationReviewField[] = [
  reviewGuardianField('guardian_1_name', 'Guardian 1 name', 'Family', 1, 'contact_name', 'text'),
  reviewGuardianField('guardian_1_relationship', 'Guardian 1 relationship', 'Family', 1, 'relationship', 'text'),
  reviewGuardianField('guardian_1_phone', 'Guardian 1 phone', 'Family', 1, 'phone', 'tel'),
  reviewGuardianField('guardian_1_email', 'Guardian 1 email', 'Family', 1, 'email', 'email'),
  reviewGuardianField('guardian_2_name', 'Guardian 2 name', 'Family', 2, 'contact_name', 'text')
];

const REVIEW_SECTION_ORDER = ['Identity', 'Contact', 'Housing', 'Academic', 'Family'];

function reviewMemberField(
  key: ReviewEditableMemberField,
  label: string,
  group: string,
  inputType: ReviewFieldInputType
): VerificationReviewField {
  return {
    key: String(key),
    label,
    group,
    currentValue: null,
    flagged: false,
    missing: false,
    required: false,
    inputType,
    editable: { table: 'members', field: key }
  };
}

function reviewDisplayField(
  key: string,
  label: string,
  group: string,
  inputType: ReviewFieldInputType
): VerificationReviewField {
  return {
    key,
    label,
    group,
    currentValue: null,
    flagged: false,
    missing: false,
    required: false,
    inputType
  };
}

function reviewGuardianField(
  key: string,
  label: string,
  group: string,
  order: 1 | 2,
  field: 'contact_name' | 'relationship' | 'phone' | 'email',
  inputType: ReviewFieldInputType
): VerificationReviewField {
  return {
    key,
    label,
    group,
    currentValue: null,
    flagged: false,
    missing: false,
    required: false,
    inputType,
    editable: { table: 'guardian', order, field }
  };
}

function buildReviewFields(member: SecretaryMemberProfile, submission: VerificationSubmission) {
  const flaggedFields = new Set([
    ...submission.optional_review_flags,
    ...submission.needs_changes_fields,
    ...submission.missing_required_fields
  ]);
  const fields = [...REVIEW_MEMBER_FIELDS, ...REVIEW_GUARDIAN_FIELDS];
  return fields.map(field => {
    const currentValue = getMemberReviewValue(member, field.key);
    return {
      ...field,
      currentValue,
      flagged: flaggedFields.has(field.key),
      missing: !hasReviewValue(currentValue),
      required: isRequiredFieldForMember(field.key, member)
    };
  });
}

function groupReviewFields(fields: VerificationReviewField[], fieldNotes: Record<string, string>) {
  return REVIEW_SECTION_ORDER
    .map(group => {
      const sectionFields = fields.filter(field => field.group === group);
      return {
        group,
        fields: sectionFields,
        completeCount: sectionFields.filter(field => !field.missing).length,
        missingCount: sectionFields.filter(field => field.required && field.missing).length,
        noteCount: sectionFields.filter(field => Boolean(fieldNotes[field.key]?.trim())).length
      };
    })
    .filter(section => section.fields.length > 0);
}

function getMemberReviewValue(member: SecretaryMemberProfile, key: string): string | boolean | number | null {
  switch (key) {
    case 'legal_name':
      return `${member.legal_first_name} ${member.legal_last_name}`.trim();
    case 'birthday':
      if (!member.birthday_month || !member.birthday_day) return null;
      return `${String(member.birthday_month).padStart(2, '0')}/${String(member.birthday_day).padStart(2, '0')}`;
    case 'guardian_1_name':
      return member.guardian_1_name;
    case 'guardian_1_relationship':
      return member.guardian_1_relationship;
    case 'guardian_1_phone':
      return member.guardian_1_phone;
    case 'guardian_1_email':
      return member.guardian_1_email;
    case 'guardian_2_name':
      return member.guardian_2_name;
    case 'guardian_2_relationship':
      return member.guardian_2_relationship;
    case 'guardian_2_phone':
      return member.guardian_2_phone;
    case 'guardian_2_email':
      return member.guardian_2_email;
    default: {
      const value = member[key as keyof SecretaryMemberProfile];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
      return null;
    }
  }
}

function isRequiredFieldForMember(fieldKey: string, member: SecretaryMemberProfile) {
  if (fieldKey === 'local_address') return member.housing_type === 'off_campus';
  if (fieldKey === 'campus_housing') return member.housing_type === 'on_campus' || member.housing_type === 'chapter_housing';
  if (fieldKey === 'guardian_2_name') return true;
  return ![
    'preferred_name',
    'instagram',
    'snapchat',
    'linkedin',
    'guardian_2_name',
    'guardian_2_relationship',
    'guardian_2_phone',
    'guardian_2_email',
    'parent_outreach_consent'
  ].includes(fieldKey);
}

function hasReviewValue(value: string | boolean | number | null) {
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  return Boolean(value && value.trim().length > 0);
}

function getReviewInputValue(value: string | boolean | number | null, inputType: ReviewFieldInputType) {
  if (inputType === 'checkbox') return Boolean(value);
  return value === null ? '' : String(value);
}

function getGuardianContactName(
  member: SecretaryMemberProfile,
  order: 1 | 2,
  editedField: 'contact_name' | 'relationship' | 'phone' | 'email',
  rawValue: string | boolean
) {
  if (editedField === 'contact_name') return String(rawValue);
  return order === 1
    ? member.guardian_1_name ?? 'Parent/Guardian 1'
    : member.guardian_2_name ?? 'Parent/Guardian 2';
}

function getGuardianFieldValue(
  member: SecretaryMemberProfile,
  order: 1 | 2,
  targetField: 'relationship' | 'phone' | 'email',
  editedField: 'contact_name' | 'relationship' | 'phone' | 'email',
  rawValue: string | boolean
) {
  if (editedField === targetField) return String(rawValue);
  const prefix = order === 1 ? 'guardian_1' : 'guardian_2';
  return member[`${prefix}_${targetField}` as keyof SecretaryMemberProfile] as string | null;
}

function getCycleStats(activeMembers: SecretaryMemberProfile[], submissions: VerificationSubmission[]): CycleStats {
  const submissionByMemberId = new Map(submissions.map(submission => [submission.member_id, submission]));
  let completeCount = 0;
  let notStartedCount = 0;
  let inProgressCount = 0;
  let needsReviewCount = 0;
  let optionalFlagCount = 0;

  for (const member of activeMembers) {
    const submission = submissionByMemberId.get(member.id);
    const status = submission?.status ?? 'not_started';

    if (['submitted', 'approved', 'exempted', 'temporarily_unlocked'].includes(status)) completeCount += 1;
    if (status === 'not_started') notStartedCount += 1;
    if (status === 'in_progress') inProgressCount += 1;
    if (status === 'submitted' || status === 'needs_changes') needsReviewCount += 1;
    optionalFlagCount += submission?.optional_review_flags.length ?? 0;
  }

  return { completeCount, notStartedCount, inProgressCount, needsReviewCount, optionalFlagCount };
}

function getSubmissionSignals(member: SecretaryMemberProfile, submission: VerificationSubmission) {
  const fields = buildReviewFields(member, submission);
  return {
    missing: fields.filter(field => field.required && field.missing).length,
    flagged: submission.optional_review_flags.length,
    notes: countFieldNotes(submission)
  };
}

function getDisplayName(member: SecretaryMemberProfile) {
  return `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelativeSubmission(value?: string | null) {
  if (!value) return 'Submitted';
  const submitted = new Date(value).getTime();
  if (Number.isNaN(submitted)) return 'Submitted';
  const diffMs = Math.max(Date.now() - submitted, 0);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Submitted ${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Submitted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Submitted ${days}d ago`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatFieldValue(field: VerificationReviewField) {
  if (field.key === 'housing_type' && typeof field.currentValue === 'string') return formatLabel(field.currentValue);
  if (typeof field.currentValue === 'boolean') return field.currentValue ? 'Yes' : 'No';
  if (typeof field.currentValue === 'number') return String(field.currentValue);
  return field.currentValue && field.currentValue.trim().length > 0 ? field.currentValue : 'Missing';
}

function getFieldStatus(field: VerificationReviewField, note: string) {
  if (note.trim()) return 'Note';
  if (field.required && field.missing) return 'Missing';
  if (field.flagged) return 'Flag';
  return 'Complete';
}

function countFieldNotes(submission: VerificationSubmission) {
  return Object.values(submission.needs_changes_field_notes ?? {}).filter(note => note.trim().length > 0).length;
}
