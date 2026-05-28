import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  SecretaryMemberProfile,
  fetchSecretaryMemberProfiles
} from '../lib/memberSecretaryRegistry';
import {
  GraduationCandidate,
  GraduationCycle,
  buildGraduationCandidateLaunchInput,
  closeGraduationCycle,
  fetchActiveGraduationCycle,
  fetchGraduationCandidates,
  isGraduationCandidateLaunchInput,
  launchGraduationCycle,
  promoteGraduationCandidates,
  updateGraduationCandidateDecision,
  GraduationSecretaryDecision
} from '../lib/memberGraduation';

type GraduationView = 'candidates' | 'waiting' | 'responses' | 'ready' | 'completed';

export const SecretaryGraduationReview = () => {
  const { member: currentMember } = useAuth();
  const [members, setMembers] = useState<SecretaryMemberProfile[]>([]);
  const [cycle, setCycle] = useState<GraduationCycle | null>(null);
  const [candidates, setCandidates] = useState<GraduationCandidate[]>([]);
  const [activeView, setActiveView] = useState<GraduationView>('candidates');
  const [termLabel, setTermLabel] = useState(getDefaultGraduationTerm);
  const [dueDate, setDueDate] = useState(getDefaultGraduationDueDate);
  const [secretaryNotes, setSecretaryNotes] = useState<Record<string, string>>({});
  const [promotionConfirmOpen, setPromotionConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [memberRows, activeCycle] = await Promise.all([
        fetchSecretaryMemberProfiles(),
        fetchActiveGraduationCycle()
      ]);
      const nextCandidates = activeCycle ? await fetchGraduationCandidates(activeCycle.id) : [];
      setMembers(memberRows);
      setCycle(activeCycle);
      setCandidates(nextCandidates);
      setSecretaryNotes(Object.fromEntries(nextCandidates.map(candidate => [candidate.id, candidate.secretary_note ?? ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load graduation workflow.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const candidateMemberById = useMemo(
    () => new Map(members.map(member => [member.id, member])),
    [members]
  );
  const launchCandidates = useMemo(
    () => members.map(member => buildGraduationCandidateLaunchInput(member)).filter(isGraduationCandidateLaunchInput),
    [members]
  );
  const responseCount = candidates.filter(candidate => candidate.member_response).length;
  const pendingResponseCount = candidates.filter(candidate => !candidate.member_response && !candidate.promoted_at).length;
  const decisionCount = candidates.filter(candidate => candidate.secretary_decision !== 'pending').length;
  const waitingCandidates = candidates.filter(candidate => !candidate.member_response && !candidate.promoted_at);
  const readyCandidates = candidates.filter(candidate => candidate.secretary_decision === 'promote' && !candidate.promoted_at);
  const completedCandidates = candidates.filter(candidate => candidate.promoted_at);
  const visibleCandidates = useMemo(() => {
    if (activeView === 'waiting') return waitingCandidates;
    if (activeView === 'responses') return candidates.filter(candidate => candidate.member_response && !candidate.promoted_at);
    if (activeView === 'ready') return readyCandidates;
    if (activeView === 'completed') return completedCandidates;
    return candidates.filter(candidate => !candidate.promoted_at);
  }, [activeView, candidates, completedCandidates, readyCandidates, waitingCandidates]);

  const startCycle = async () => {
    if (!currentMember) return;
    setSavingId('launch');
    setError(null);

    try {
      await launchGraduationCycle({
        termLabel: termLabel.trim(),
        dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
        launchedBy: currentMember.id,
        candidates: launchCandidates
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to launch graduation workflow.');
    } finally {
      setSavingId(null);
    }
  };

  const decide = async (candidate: GraduationCandidate, decision: GraduationSecretaryDecision) => {
    if (!currentMember) return;
    setSavingId(candidate.id);

    try {
      await updateGraduationCandidateDecision({
        candidateId: candidate.id,
        decision,
        note: secretaryNotes[candidate.id]?.trim() || null,
        decidedBy: currentMember.id
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save graduation decision.');
    } finally {
      setSavingId(null);
    }
  };

  const promoteReady = async () => {
    if (!currentMember || readyCandidates.length === 0) return;
    setSavingId('promote');

    try {
      await promoteGraduationCandidates(readyCandidates.map(candidate => candidate.id), currentMember.id);
      setPromotionConfirmOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to promote alumni.');
    } finally {
      setSavingId(null);
    }
  };

  const closeCycle = async () => {
    if (!currentMember || !cycle) return;
    setSavingId('close');

    try {
      await closeGraduationCycle(cycle.id, currentMember.id);
      setCloseConfirmOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to close graduation workflow.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto pb-20">
      <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3 text-secondary">
            <GraduationCap size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.22rem]">Graduation Workflow</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-on-surface">Graduate Members to Alumni</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-on-surface-variant">
            Send graduation confirmations, review member responses, then move approved graduates from the active roster to alumni.
          </p>
        </div>

        {cycle && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPromotionConfirmOpen(true)}
              disabled={savingId === 'promote' || readyCandidates.length === 0}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-white disabled:opacity-50"
            >
              {savingId === 'promote' ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Promote Approved to Alumni ({readyCandidates.length})
            </button>
            <button
              onClick={() => setCloseConfirmOpen(true)}
              disabled={savingId === 'close'}
              className="flex items-center justify-center gap-2 rounded-full bg-surface-container-high px-5 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface disabled:opacity-50"
            >
              {savingId === 'close' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Close Graduation Cycle
            </button>
          </div>
        )}
      </header>

      {error && (
        <section className="mb-6 flex items-center gap-3 rounded-2xl bg-error/10 p-4 text-error">
          <AlertCircle size={18} />
          <p className="text-sm font-bold">{error}</p>
        </section>
      )}

      {loading ? (
        <section className="flex min-h-64 items-center justify-center gap-3 rounded-2xl bg-surface-container-low text-on-surface-variant">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs font-black uppercase tracking-[0.18rem]">Loading Graduation Workflow</span>
        </section>
      ) : !cycle ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl bg-surface-container-low p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Before You Send</p>
            <h2 className="mt-2 text-2xl font-black text-on-surface">{launchCandidates.length} likely candidates</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant">
              These members match the current graduation year or term. Sending confirmations creates an in-app request for each member; it does not change anyone's status.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
              {launchCandidates.slice(0, 8).map(candidate => {
                const member = members.find(row => row.id === candidate.memberId);
                return member ? (
                  <div key={member.id}>
                    <CandidatePreview member={member} reasons={candidate.detectedReasons} />
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <aside className="h-fit rounded-2xl bg-surface-container-low p-5">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Term</span>
              <input
                value={termLabel}
                onChange={event => setTermLabel(event.target.value)}
                className="mt-2 w-full rounded-xl border-none bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary/40"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Response Due</span>
              <input
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                className="mt-2 w-full rounded-xl border-none bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary/40"
              />
            </label>
            <button
              onClick={startCycle}
              disabled={savingId === 'launch' || launchCandidates.length === 0 || termLabel.trim().length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-white disabled:opacity-50"
            >
              {savingId === 'launch' ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
              Send Confirmations
            </button>
            <p className="mt-3 text-xs font-semibold leading-5 text-on-surface-variant">
              Members confirm whether they are graduating and provide alumni contact details before you decide.
            </p>
          </aside>
        </section>
      ) : (
        <>
          <section className="mb-6 rounded-2xl bg-surface-container-low p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Active Workflow</p>
                <h2 className="mt-1 text-2xl font-black text-on-surface">{cycle.term_label}</h2>
                <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                  {cycle.due_at ? `Member responses due ${formatDate(cycle.due_at)}` : 'No response deadline set'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Metric label="Candidates" value={candidates.length} />
                <Metric label="Responded" value={responseCount} />
                <Metric label="Decided" value={decisionCount} />
                <Metric label="Promoted" value={completedCandidates.length} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <WorkflowStep icon={<MessageSquare size={15} />} label="Waiting on members" value={pendingResponseCount} active={pendingResponseCount > 0} />
              <WorkflowStep icon={<UserRound size={15} />} label="Approved by secretary" value={readyCandidates.length} active={readyCandidates.length > 0} />
              <WorkflowStep icon={<ShieldCheck size={15} />} label="Promoted to alumni" value={completedCandidates.length} active={completedCandidates.length > 0} />
            </div>
          </section>

          <div className="mb-5 flex flex-wrap gap-2">
            {([
              ['candidates', 'All Candidates'],
              ['waiting', 'Waiting on Members'],
              ['responses', 'Member Responses'],
              ['ready', 'Approved to Promote'],
              ['completed', 'Promoted']
            ] as Array<[GraduationView, string]>).map(([view, label]) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  'rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem]',
                  activeView === view ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="space-y-3">
            {visibleCandidates.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
                <p className="text-sm font-black">{getEmptyViewMessage(activeView)}</p>
              </div>
            ) : visibleCandidates.map(candidate => (
              <div key={candidate.id}>
                <GraduationCandidateRow
                  candidate={candidate}
                  member={candidateMemberById.get(candidate.member_id)}
                  saving={savingId === candidate.id}
                  secretaryNote={secretaryNotes[candidate.id] ?? ''}
                  onSecretaryNoteChange={value => setSecretaryNotes(current => ({ ...current, [candidate.id]: value }))}
                  onDecision={decision => void decide(candidate, decision)}
                />
              </div>
            ))}
          </section>
          <PromotionConfirmDialog
            open={promotionConfirmOpen}
            candidates={readyCandidates}
            memberById={candidateMemberById}
            saving={savingId === 'promote'}
            onCancel={() => setPromotionConfirmOpen(false)}
            onConfirm={() => void promoteReady()}
          />
          <CloseCycleConfirmDialog
            open={closeConfirmOpen}
            candidates={candidates}
            saving={savingId === 'close'}
            onCancel={() => setCloseConfirmOpen(false)}
            onConfirm={() => void closeCycle()}
          />
        </>
      )}
    </div>
  );
};

const GraduationCandidateRow = ({
  candidate,
  member,
  secretaryNote,
  saving,
  onSecretaryNoteChange,
  onDecision
}: {
  candidate: GraduationCandidate;
  member?: SecretaryMemberProfile;
  secretaryNote: string;
  saving: boolean;
  onSecretaryNoteChange: (value: string) => void;
  onDecision: (decision: GraduationSecretaryDecision) => void;
}) => (
  <article className="grid grid-cols-1 gap-4 rounded-2xl bg-surface-container-low p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-on-surface">{member ? getDisplayName(member) : candidate.member_id}</p>
          <p className="mt-1 text-xs font-bold text-on-surface-variant">
            {candidate.expected_graduation_term ?? candidate.graduation_year ?? 'Grad term missing'} · {candidate.previous_status}
          </p>
        </div>
        <DecisionPill decision={candidate.secretary_decision} promoted={Boolean(candidate.promoted_at)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidate.detected_reasons.map(reason => (
          <span key={reason} className="rounded-full bg-surface-container-lowest px-3 py-1 text-[10px] font-black uppercase tracking-[0.1rem] text-on-surface-variant">
            {reason}
          </span>
        ))}
      </div>
      {candidate.member_response && (
        <div className="mt-4 rounded-xl bg-surface-container-lowest px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-secondary">Member Response</p>
          <p className="mt-1 text-sm font-black text-on-surface">{formatLabel(candidate.member_response)}</p>
          {candidate.response_note && <p className="mt-1 text-xs font-semibold text-on-surface-variant">{candidate.response_note}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-semibold text-on-surface-variant md:grid-cols-3">
            <span><Mail size={12} className="mr-1 inline text-primary" />{candidate.confirmed_personal_email || 'No email'}</span>
            <span>{candidate.confirmed_phone || 'No phone'}</span>
            <span>{candidate.confirmed_linkedin || 'No LinkedIn'}</span>
          </div>
        </div>
      )}
      {!candidate.member_response && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3 text-xs font-bold text-on-surface-variant">
          <Clock size={14} className="text-primary" />
          Waiting for this member to send a graduation response.
        </div>
      )}
    </div>

    <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-container-lowest p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <DecisionButton label="Approve Alumni Move" active={candidate.secretary_decision === 'promote'} saving={saving} onClick={() => onDecision('promote')} />
        <DecisionButton label="Keep on Active Roster" active={candidate.secretary_decision === 'keep_active'} saving={saving} onClick={() => onDecision('keep_active')} />
        <DecisionButton label="Needs Follow-up" active={candidate.secretary_decision === 'defer'} saving={saving} onClick={() => onDecision('defer')} />
      </div>
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant">Secretary note</span>
        <textarea
          value={secretaryNote}
          onChange={event => onSecretaryNoteChange(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border-none bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-primary/40"
          placeholder="Example: Confirmed May graduation with registrar list."
        />
      </label>
      {candidate.promoted_at && (
        <p className="text-xs font-bold text-secondary">Promoted {formatDateTime(candidate.promoted_at)}</p>
      )}
    </div>
  </article>
);

const CandidatePreview = ({ member, reasons }: { member: SecretaryMemberProfile; reasons: string[] }) => (
  <div className="rounded-xl bg-surface-container-lowest px-4 py-3">
    <p className="text-sm font-black text-on-surface">{getDisplayName(member)}</p>
    <p className="mt-1 text-[11px] font-bold text-on-surface-variant">{reasons.join(', ')}</p>
  </div>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl bg-surface-container-lowest px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className="mt-1 text-xl font-black text-on-surface">{value}</p>
  </div>
);

const WorkflowStep = ({
  icon,
  label,
  value,
  active
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active: boolean;
}) => (
  <div className={cn(
    'flex items-center gap-3 rounded-xl px-4 py-3',
    active ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-on-surface-variant'
  )}>
    <span className={cn(
      'flex h-8 w-8 items-center justify-center rounded-full',
      active ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
    )}>
      {icon}
    </span>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12rem]">{label}</p>
      <p className="mt-0.5 text-lg font-black text-on-surface">{value}</p>
    </div>
  </div>
);

const DecisionButton = ({
  label,
  active,
  saving,
  onClick
}: {
  label: string;
  active: boolean;
  saving: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={saving}
    className={cn(
      'flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] disabled:opacity-50',
      active ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
    )}
  >
    {saving ? <Loader2 size={13} className="animate-spin" /> : active ? <CheckCircle2 size={13} /> : <UserRound size={13} />}
    {label}
  </button>
);

const DecisionPill = ({ decision, promoted }: { decision: GraduationSecretaryDecision; promoted: boolean }) => (
  <span className={cn(
    'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12rem]',
    promoted && 'bg-secondary/15 text-secondary',
    !promoted && decision === 'promote' && 'bg-primary/10 text-primary',
    !promoted && decision !== 'promote' && 'bg-surface-container-lowest text-on-surface-variant'
  )}>
    {promoted ? 'Promoted' : formatLabel(decision)}
  </span>
);

const PromotionConfirmDialog = ({
  open,
  candidates,
  memberById,
  saving,
  onCancel,
  onConfirm
}: {
  open: boolean;
  candidates: GraduationCandidate[];
  memberById: Map<string, SecretaryMemberProfile>;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Confirm alumni promotion"
        className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-container-low p-6 shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Final Roster Change</p>
            <h2 className="mt-1 text-2xl font-black text-on-surface">Promote {candidates.length} approved member{candidates.length === 1 ? '' : 's'} to alumni?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-on-surface-variant">
              This changes each member's roster status to alumni and closes any active officer positions. Review the list before continuing.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {candidates.map(candidate => {
            const member = memberById.get(candidate.member_id);
            return (
              <div key={candidate.id} className="rounded-xl bg-surface-container-lowest px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-on-surface">{member ? getDisplayName(member) : candidate.member_id}</p>
                    <p className="mt-1 text-[11px] font-bold text-on-surface-variant">
                      {formatLabel(candidate.member_response ?? 'no_response')} · {candidate.previous_status}
                    </p>
                  </div>
                  <ContactCompleteness candidate={candidate} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full bg-surface-container-high px-5 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || candidates.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Promote to Alumni
          </button>
        </div>
      </section>
    </div>
  );
};

const CloseCycleConfirmDialog = ({
  open,
  candidates,
  saving,
  onCancel,
  onConfirm
}: {
  open: boolean;
  candidates: GraduationCandidate[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  const waitingCount = candidates.filter(candidate => !candidate.member_response && !candidate.promoted_at).length;
  const unpromotedApprovedCount = candidates.filter(candidate => candidate.secretary_decision === 'promote' && !candidate.promoted_at).length;
  const undecidedCount = candidates.filter(candidate => candidate.secretary_decision === 'pending' && !candidate.promoted_at).length;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Close graduation cycle"
        className="w-full max-w-xl rounded-2xl bg-surface-container-low p-6 shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <AlertCircle size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Close Graduation Cycle</p>
            <h2 className="mt-1 text-2xl font-black text-on-surface">End this review now?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-on-surface-variant">
              Closing stops this graduation review. It does not promote anyone who has not already been promoted.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Metric label="Waiting" value={waitingCount} />
          <Metric label="Undecided" value={undecidedCount} />
          <Metric label="Approved" value={unpromotedApprovedCount} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full bg-surface-container-high px-5 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface disabled:opacity-50"
          >
            Keep Review Open
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Close Graduation Cycle
          </button>
        </div>
      </section>
    </div>
  );
};

const ContactCompleteness = ({ candidate }: { candidate: GraduationCandidate }) => {
  const completeCount = [
    candidate.confirmed_personal_email,
    candidate.confirmed_phone,
    candidate.confirmed_linkedin
  ].filter(Boolean).length;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08rem]',
      completeCount >= 2 ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'
    )}>
      {completeCount >= 2 ? <CheckCircle2 size={12} /> : <Mail size={12} />}
      {completeCount}/3 contacts
    </span>
  );
};

function getDisplayName(member: SecretaryMemberProfile) {
  return member.preferred_name?.trim() || `${member.legal_first_name} ${member.legal_last_name}`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function getEmptyViewMessage(view: GraduationView) {
  if (view === 'waiting') return 'No members are waiting on a graduation response.';
  if (view === 'responses') return 'No member responses are waiting for review.';
  if (view === 'ready') return 'No graduates have been approved for alumni promotion.';
  if (view === 'completed') return 'No members have been promoted in this workflow.';
  return 'No candidates are in this workflow.';
}

function getDefaultGraduationTerm() {
  const now = new Date();
  const month = now.getMonth();
  const season = month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall';
  return `${season} ${now.getFullYear()}`;
}

function getDefaultGraduationDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return due.toISOString().slice(0, 10);
}
