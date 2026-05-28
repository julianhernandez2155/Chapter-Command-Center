import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Loader2,
  MessageSquare,
  Pencil,
  Save,
  ShieldCheck,
  Square
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
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
  closeVerificationCycle,
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

export const SecretaryVerificationReview = () => {
  const { member: currentMember } = useAuth();
  const [members, setMembers] = useState<SecretaryMemberProfile[]>([]);
  const [cycle, setCycle] = useState<VerificationCycle | null>(null);
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const skipReview = () => {
    if (reviewRows.length === 0) return;
    const index = activeReview ? reviewRows.findIndex(row => row.submission.id === activeReview.submission.id) : -1;
    const nextIndex = index >= 0 ? (index + 1) % reviewRows.length : 0;
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

  const closeCycle = async () => {
    if (!currentMember || !cycle) return;
    setSavingId('verification-cycle');
    try {
      await closeVerificationCycle(cycle.id, currentMember.id);
      await loadData();
    } catch (err) {
      console.error('Unable to close cycle:', err);
      setError(err instanceof Error ? err.message : 'Unable to close cycle.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="min-h-[calc(100vh-8rem)]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/members"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            title="Back to registry"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-primary">Secretary Verification</p>
            <h1 className="text-3xl font-black text-on-surface md:text-4xl">{cycle?.term_label ?? 'Verification Review'}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Complete" value={`${stats.completeCount}/${activeMembers.length}`} />
          <StatPill label="Review" value={String(stats.needsReviewCount)} tone={stats.needsReviewCount > 0 ? 'primary' : 'quiet'} />
          <StatPill label="Not started" value={String(stats.notStartedCount)} />
          <StatPill label="Flags" value={String(stats.optionalFlagCount)} tone={stats.optionalFlagCount > 0 ? 'primary' : 'quiet'} />
          {cycle && (
            <button
              type="button"
              onClick={() => void closeCycle()}
              disabled={savingId === 'verification-cycle'}
              className="ml-0 flex min-h-11 items-center gap-2 rounded-full bg-surface-container-low px-4 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-container-high disabled:opacity-50 lg:ml-2"
            >
              {savingId === 'verification-cycle' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Close Cycle
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm font-bold text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-96 items-center justify-center rounded-[2rem] bg-surface-container-low">
          <Loader2 className="animate-spin text-primary" />
          <span className="ml-3 text-xs font-black uppercase tracking-[0.18rem] text-on-surface-variant">Loading review</span>
        </div>
      ) : !cycle ? (
        <div className="rounded-[2rem] bg-surface-container-low p-10 text-center">
          <ShieldCheck className="mx-auto mb-4 text-secondary" size={36} />
          <h2 className="text-2xl font-black text-on-surface">No active verification gate</h2>
          <p className="mt-2 text-sm font-semibold text-on-surface-variant">Launch a semester gate from the Secretary Registry first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] bg-surface-container-low p-4 xl:min-h-[calc(100vh-14rem)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">Review Queue</p>
              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-[10px] font-black text-on-surface-variant">{reviewRows.length}</span>
            </div>
            {reviewRows.length === 0 ? (
              <p className="rounded-2xl bg-surface-container-lowest px-4 py-5 text-sm font-bold text-on-surface-variant">
                No submitted profiles are waiting.
              </p>
            ) : (
              <div className="space-y-2">
                {reviewRows.map(({ member, submission }) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => setActiveReviewId(submission.id)}
                    className={cn(
                      'w-full rounded-[1.5rem] px-4 py-4 text-left transition-colors',
                      activeReview?.submission.id === submission.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{getDisplayName(member)}</p>
                        <p className={cn(
                          'mt-1 text-[11px] font-bold',
                          activeReview?.submission.id === submission.id ? 'text-white/75' : 'text-on-surface-variant'
                        )}>
                          {countFieldNotes(submission)} notes · {formatDateTime(submission.submitted_at)}
                        </p>
                      </div>
                      {submission.optional_review_flags.length > 0 && (
                        <span className={cn(
                          'rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.08rem]',
                          activeReview?.submission.id === submission.id ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
                        )}>
                          Flag
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="rounded-[2rem] bg-surface-container-low p-4 md:p-6">
            {!activeReview ? (
              <div className="flex min-h-96 items-center justify-center text-center">
                <div>
                  <CheckCircle2 className="mx-auto mb-4 text-secondary" size={38} />
                  <p className="text-xl font-black text-on-surface">Queue clear</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface-variant">Every submitted verification has been handled.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-primary">Profile Inspection</p>
                    <h2 className="mt-1 text-4xl font-black text-on-surface">{getDisplayName(activeReview.member)}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SignalPill tone={missingCount > 0 ? 'primary' : 'quiet'} label={`${missingCount} missing`} />
                      <SignalPill tone={flagCount > 0 ? 'primary' : 'quiet'} label={`${flagCount} ${flagCount === 1 ? 'flag' : 'flags'}`} />
                      <SignalPill tone={noteCount > 0 ? 'error' : 'quiet'} label={`${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void submitDecision('approved')}
                      disabled={savingId === activeReview.submission.id}
                      className="flex min-h-12 items-center gap-2 rounded-full bg-secondary px-5 text-[10px] font-black uppercase tracking-[0.16rem] text-black disabled:opacity-50"
                    >
                      {savingId === activeReview.submission.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitDecision('needs_changes')}
                      disabled={savingId === activeReview.submission.id}
                      className="flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.16rem] text-white disabled:opacity-50"
                    >
                      {savingId === activeReview.submission.id ? <Loader2 size={15} className="animate-spin" /> : <AlertCircle size={15} />}
                      Request
                    </button>
                    <button
                      type="button"
                      onClick={skipReview}
                      disabled={savingId === activeReview.submission.id}
                      className="min-h-12 rounded-full bg-surface-container-lowest px-5 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {activeReview.submission.correction_notes && (
                  <div className="mb-5 rounded-2xl bg-primary/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-primary">Member Note</p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">{activeReview.submission.correction_notes}</p>
                  </div>
                )}

                <div className="space-y-5">
                  {sections.map(section => (
                    <section key={section.group} className="overflow-hidden rounded-[1.5rem] bg-surface-container-lowest">
                      <div className="px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-secondary">{section.group}</p>
                        <p className="mt-1 text-xs font-bold text-on-surface-variant">
                          {section.completeCount}/{section.fields.length} filled
                          {section.missingCount > 0 ? ` · ${section.missingCount} missing` : ''}
                          {section.noteCount > 0 ? ` · ${section.noteCount} notes` : ''}
                        </p>
                      </div>
                      <div className="hidden grid-cols-[220px_minmax(0,1fr)_110px_88px] gap-3 bg-surface-container-low/55 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16rem] text-on-surface-variant lg:grid">
                        <span>Field</span>
                        <span>Value</span>
                        <span>Status</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <div className="space-y-1 px-2 pb-2">
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
        </div>
      )}
    </section>
  );
};

const StatPill = ({ label, value, tone = 'quiet' }: { label: string; value: string; tone?: 'quiet' | 'primary' }) => (
  <div className={cn(
    'rounded-full px-4 py-2',
    tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface'
  )}>
    <p className="text-[9px] font-black uppercase tracking-[0.12rem] opacity-70">{label}</p>
    <p className="text-lg font-black leading-none">{value}</p>
  </div>
);

const SignalPill = ({ tone, label }: { tone: 'quiet' | 'primary' | 'error'; label: string }) => (
  <span className={cn(
    'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1rem]',
    tone === 'quiet' && 'bg-surface-container-lowest text-on-surface-variant',
    tone === 'primary' && 'bg-primary/10 text-primary',
    tone === 'error' && 'bg-error/10 text-error'
  )}>
    {label}
  </span>
);

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
      'group rounded-[1.25rem] px-4 py-3 transition-colors',
      note ? 'bg-error/10' : field.required && field.missing ? 'bg-primary/10' : 'bg-surface-container-low hover:bg-surface-container-high/60'
    )}>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_110px_88px] lg:items-center lg:gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-on-surface">
            {field.label}
            {field.required && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Required" />}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-on-surface-variant lg:hidden">{getFieldStatus(field, note)}</p>
        </div>

        <div className="min-w-0">
          {editing && field.editable ? (
            <div className="flex items-center gap-2">
              {field.inputType === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => setDraft(!Boolean(draft))}
                  className={cn(
                    'flex min-h-10 min-w-10 items-center justify-center rounded-full',
                    Boolean(draft) ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'
                  )}
                  title="Toggle value"
                >
                  {Boolean(draft) ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
              ) : (
                <input
                  type={field.inputType}
                  value={String(draft)}
                  onChange={event => setDraft(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
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
                className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                title="Save field"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => field.editable && setEditing(true)}
              className={cn(
                'w-full rounded-xl px-2 py-1.5 text-left text-sm font-semibold transition-colors',
                field.missing ? 'text-on-surface-variant' : 'text-on-surface',
                field.editable && 'hover:bg-surface-container-lowest'
              )}
            >
              {formatFieldValue(field)}
            </button>
          )}
        </div>

        <div className="hidden lg:block">
          <StatusPill field={field} note={note} />
        </div>

        <div className="flex justify-start gap-1 lg:justify-end">
          <button
            type="button"
            onClick={() => setEditing(current => !current)}
            disabled={!field.editable}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant opacity-100 transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 lg:opacity-45 lg:group-hover:opacity-100"
            title="Edit field"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setNoting(current => !current)}
            className={cn(
              'flex min-h-10 min-w-10 items-center justify-center rounded-full transition-colors',
              note ? 'bg-error text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface lg:opacity-45 lg:group-hover:opacity-100'
            )}
            title={note ? 'Edit note' : 'Add note'}
          >
            <MessageSquare size={15} />
          </button>
        </div>
      </div>

      {noting && (
        <label className="mt-3 block">
          <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-error">Member note</span>
          <textarea
            value={note}
            onChange={event => onNoteChange(event.target.value)}
            rows={2}
            placeholder="Tell the member exactly what to fix for this field."
            className="mt-2 w-full resize-none rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
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
      'inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.08rem]',
      tone === 'quiet' && 'bg-surface-container-lowest text-on-surface-variant',
      tone === 'primary' && 'bg-primary/10 text-primary',
      tone === 'error' && 'bg-error/10 text-error'
    )}>
      {status}
    </span>
  );
};

const REVIEW_MEMBER_FIELDS: VerificationReviewField[] = [
  reviewMemberField('preferred_name', 'Preferred name', 'Identity', 'text'),
  reviewMemberField('personal_email', 'Personal email', 'Contact', 'email'),
  reviewMemberField('phone', 'Phone', 'Contact', 'tel'),
  reviewMemberField('housing_type', 'Housing type', 'Housing', 'text'),
  reviewMemberField('local_address', 'Local address', 'Housing', 'text'),
  reviewMemberField('campus_housing', 'Dorm / room', 'Housing', 'text'),
  reviewMemberField('home_city', 'Home city', 'Housing', 'text'),
  reviewMemberField('home_state', 'Home state', 'Housing', 'text'),
  reviewMemberField('graduation_year', 'Graduation year', 'Academic', 'number'),
  reviewMemberField('expected_graduation_term', 'Expected grad term', 'Academic', 'text'),
  reviewMemberField('school', 'School', 'Academic', 'text'),
  reviewMemberField('major', 'Major', 'Academic', 'text'),
  reviewMemberField('tshirt_size', 'T-shirt size', 'Apparel', 'text'),
  reviewMemberField('hoodie_size', 'Hoodie size', 'Apparel', 'text'),
  reviewMemberField('instagram', 'Instagram', 'Social', 'text'),
  reviewMemberField('snapchat', 'Snapchat', 'Social', 'text'),
  reviewMemberField('linkedin', 'LinkedIn', 'Social', 'text'),
  reviewMemberField('parent_outreach_consent', 'Parent outreach consent', 'Family', 'checkbox')
];

const REVIEW_GUARDIAN_FIELDS: VerificationReviewField[] = [
  reviewGuardianField('guardian_1_name', 'Guardian 1 name', 'Family', 1, 'contact_name', 'text'),
  reviewGuardianField('guardian_1_relationship', 'Guardian 1 relationship', 'Family', 1, 'relationship', 'text'),
  reviewGuardianField('guardian_1_phone', 'Guardian 1 phone', 'Family', 1, 'phone', 'tel'),
  reviewGuardianField('guardian_1_email', 'Guardian 1 email', 'Family', 1, 'email', 'email'),
  reviewGuardianField('guardian_2_name', 'Guardian 2 name', 'Family', 2, 'contact_name', 'text'),
  reviewGuardianField('guardian_2_relationship', 'Guardian 2 relationship', 'Family', 2, 'relationship', 'text'),
  reviewGuardianField('guardian_2_phone', 'Guardian 2 phone', 'Family', 2, 'phone', 'tel'),
  reviewGuardianField('guardian_2_email', 'Guardian 2 email', 'Family', 2, 'email', 'email')
];

const REVIEW_SECTION_ORDER = ['Identity', 'Contact', 'Housing', 'Academic', 'Apparel', 'Social', 'Family'];

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

function getDisplayName(member: SecretaryMemberProfile) {
  return `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Submitted missing';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
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
  return 'OK';
}

function countFieldNotes(submission: VerificationSubmission) {
  return Object.values(submission.needs_changes_field_notes ?? {}).filter(note => note.trim().length > 0).length;
}
