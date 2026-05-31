import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Loader2,
  MapPin,
  Maximize2,
  Monitor,
  MoreVertical,
  QrCode,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  AttendanceRosterRow,
  archiveEvent,
  closeEventCheckIn,
  eventToFormValues,
  fetchAttendanceRoster,
  fetchEventById,
  formatAttendanceMode,
  formatEventCategory,
  formatEventDate,
  formatEventTimeRange,
  formatEventType,
  EventWithAttendance,
  LiveEvent,
  manualMarkAttendance,
  openEventCheckIn,
  publishWeeklyIneligibleList,
  recordQuorumSnapshot,
  restoreEvent,
  rotateEventCheckInToken,
  updateEvent
} from '../lib/events';
import {
  MemberExcusal,
  fetchMemberExcusalForEvent,
  submitExcusal
} from '../lib/excusals';
import {
  SocialMonitorAssignment,
  SocialMonitorCandidate,
  SocialMonitorCoverage,
  assignSocialMonitor,
  confirmSocialMonitorAssignment,
  fetchSocialMonitorAssignments,
  fetchSocialMonitorCoverage,
  removeSocialMonitorAssignment,
  searchSocialMonitorCandidates
} from '../lib/socialMonitors';
import { EventFormModal } from './Events';

export const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, roles, can } = useAuth();
  const [activeTab, setActiveTab] = useState('Event Details');
  const [event, setEvent] = useState<Awaited<ReturnType<typeof fetchEventById>>>(null);
  const [roster, setRoster] = useState<AttendanceRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [excusalSaving, setExcusalSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExcusalOpen, setIsExcusalOpen] = useState(false);
  const [memberExcusal, setMemberExcusal] = useState<MemberExcusal | null>(null);
  const [monitorAssignments, setMonitorAssignments] = useState<SocialMonitorAssignment[]>([]);
  const [monitorCoverage, setMonitorCoverage] = useState<SocialMonitorCoverage | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [monitorSaving, setMonitorSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const canManageOwnedEvent = Boolean(event && member?.id === event.created_by && can('events.create'));
  const canEditEvent = can('events.edit') || canManageOwnedEvent;
  const canArchiveEvent = can('events.archive') || canManageOwnedEvent;
  const canManageAttendance = canEditEvent;
  const canManageSocialMonitors = Boolean(
    event?.type === 'social'
    && (
      canManageOwnedEvent
      || roles.some(role => ['president', 'secretary', 'social_chairman'].includes(role))
    )
  );
  const hasSocialDoorRole = roles.some(role => [
    'president',
    'ivp',
    'evp',
    'secretary',
    'treasurer',
    'saa',
    'social_chairman',
    'hs_officer'
  ].includes(role));
  const hasActiveMonitorAccess = Boolean(
    member && monitorAssignments.some(assignment => assignment.member_id === member.id && assignment.access_active)
  );
  const canOpenSocialDoor = Boolean(
    event?.type === 'social'
    && event.guest_check_in_enabled
    && (hasSocialDoorRole || canManageOwnedEvent || hasActiveMonitorAccess)
  );

  const loadEvent = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      setEvent(await fetchEventById(id));
    } catch (err) {
      console.error('Error loading event detail:', err);
      setError('Unable to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [id]);

  const loadRoster = async () => {
    if (!id || !canManageAttendance) return;

    setRosterLoading(true);
    setRosterError(null);

    try {
      setRoster(await fetchAttendanceRoster(id));
    } catch (err) {
      console.error('Error loading attendance roster:', err);
      setRoster([]);
      setRosterError('Attendance roster is temporarily unavailable. Check the event policy, permissions, and Supabase connection before running check-in.');
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    if (event && canManageAttendance) {
      void loadRoster();
    }
  }, [event?.id, canManageAttendance]);

  const loadMonitors = async () => {
    if (!id || event?.type !== 'social') return;

    setMonitorLoading(true);
    setMonitorError(null);

    try {
      const [coverage, assignments] = await Promise.all([
        fetchSocialMonitorCoverage(id),
        fetchSocialMonitorAssignments(id)
      ]);
      setMonitorCoverage(coverage);
      setMonitorAssignments(assignments);
    } catch (err) {
      console.error('Error loading sober monitor assignments:', err);
      setMonitorCoverage(null);
      setMonitorAssignments([]);
      if (canManageSocialMonitors || canOpenSocialDoor) {
        setMonitorError('Sober monitor assignments are temporarily unavailable.');
      }
    } finally {
      setMonitorLoading(false);
    }
  };

  useEffect(() => {
    if (event?.type === 'social') {
      void loadMonitors();
    } else {
      setMonitorAssignments([]);
      setMonitorCoverage(null);
      setMonitorError(null);
    }
  }, [event?.id, event?.type, canManageSocialMonitors]);

  useEffect(() => {
    if (!event || !member || event.category !== 'mandatory') {
      setMemberExcusal(null);
      return;
    }

    let cancelled = false;

    const loadMemberExcusal = async () => {
      try {
        const excusal = await fetchMemberExcusalForEvent(member.id, event.id);
        if (!cancelled) setMemberExcusal(excusal);
      } catch (err) {
        console.error('Error loading member excusal:', err);
        if (!cancelled) setMemberExcusal(null);
      }
    };

    void loadMemberExcusal();

    return () => {
      cancelled = true;
    };
  }, [event?.id, event?.category, member?.id]);

  useEffect(() => {
    if (!event?.check_in_open || !canManageAttendance) return;

    const interval = window.setInterval(async () => {
      try {
        await rotateEventCheckInToken(event.id);
        const updated = await fetchEventById(event.id);
        setEvent(updated);
      } catch (err) {
        console.error('Error rotating check-in token:', err);
      }
    }, 45_000);

    return () => window.clearInterval(interval);
  }, [event?.id, event?.check_in_open, canManageAttendance]);

  const quorumStatus = useMemo(() => getQuorumStatus(roster), [roster]);
  const attendanceSummary = useMemo(() => {
    if (!event) return null;
    return getAttendanceDisplaySummary(roster, event.attendance);
  }, [event, roster]);

  const refreshEventAndRoster = async () => {
    if (!id) return;
    const updated = await fetchEventById(id);
    setEvent(updated);
    if (canManageAttendance) {
      try {
        setRoster(await fetchAttendanceRoster(id));
        setRosterError(null);
      } catch (err) {
        console.error('Error refreshing attendance roster:', err);
        setRoster([]);
        setRosterError('Attendance roster is temporarily unavailable. Check the event policy, permissions, and Supabase connection before running check-in.');
      }
    }
  };

  const handleUpdate = async (values: Parameters<typeof updateEvent>[1]) => {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateEvent(event.id, values);
      setEvent({ ...updated, attendance: event.attendance });
      setIsEditOpen(false);
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Unable to update event. Check your permissions and event fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      const updated = event.archived_at
        ? await restoreEvent(event.id)
        : await archiveEvent(event.id);
      setEvent({ ...updated, attendance: event.attendance });
    } catch (err) {
      console.error('Error changing archive state:', err);
      setError('Unable to change event archive state.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCheckIn = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const result = await openEventCheckIn(event.id);
      await refreshEventAndRoster();
      setActionMessage(`Check-in opened. Expected roster: ${result.expected_count}.`);
    } catch (err) {
      console.error('Error opening check-in:', err);
      setError('Unable to open check-in. Check your permissions and database migration state.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCheckIn = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const result = await closeEventCheckIn(event.id);
      await refreshEventAndRoster();
      setActionMessage(`Check-in closed. Present: ${result.present_count}. Unexcused absent: ${result.absent_count}.`);
    } catch (err) {
      console.error('Error closing check-in:', err);
      setError('Unable to close check-in.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualMark = async (memberId: string, status: 'on_time' | 'late', reason: string) => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      await manualMarkAttendance(event.id, memberId, status, reason);
      await refreshEventAndRoster();
      setActionMessage('Manual attendance correction saved.');
    } catch (err) {
      console.error('Error manually marking attendance:', err);
      setError('Unable to save manual attendance correction.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordQuorum = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const result = await recordQuorumSnapshot(event.id);
      setActionMessage(`Quorum snapshot recorded: ${result.present_count}/${result.threshold_count} present.`);
    } catch (err) {
      console.error('Error recording quorum:', err);
      setError('Unable to record quorum snapshot.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishIneligible = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const result = await publishWeeklyIneligibleList(event.id);
      setActionMessage(`Attendance-half Ineligible List published with ${result.published_count} members.`);
    } catch (err) {
      console.error('Error publishing ineligible list:', err);
      setError('Unable to publish the attendance-half Ineligible List.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitExcusal = async (reason: string, supportingNote: string) => {
    if (!event || !member) return;

    setExcusalSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const excusal = await submitExcusal(member.id, event.id, reason, supportingNote);
      setMemberExcusal(excusal);
      setIsExcusalOpen(false);
      setActionMessage('Excusal request submitted for officer review.');
    } catch (err) {
      console.error('Error submitting event excusal:', err);
      setError('Unable to submit this excusal. You may already have a request for this event.');
    } finally {
      setExcusalSaving(false);
    }
  };

  const handleAssignMonitor = async (memberId: string) => {
    if (!event) return;

    setMonitorSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      await assignSocialMonitor(event.id, memberId);
      await loadMonitors();
      setActionMessage('Sober monitor assigned with event-scoped door access.');
    } catch (err) {
      console.error('Error assigning sober monitor:', err);
      setError('Unable to assign sober monitor.');
    } finally {
      setMonitorSaving(false);
    }
  };

  const handleConfirmMonitor = async (assignmentId: string) => {
    setMonitorSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      await confirmSocialMonitorAssignment(assignmentId);
      await loadMonitors();
      setActionMessage('Sober monitor assignment confirmed.');
    } catch (err) {
      console.error('Error confirming sober monitor:', err);
      setError('Unable to confirm sober monitor assignment.');
    } finally {
      setMonitorSaving(false);
    }
  };

  const handleRemoveMonitor = async (assignmentId: string) => {
    setMonitorSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      await removeSocialMonitorAssignment(assignmentId, 'Removed from event coverage.');
      await loadMonitors();
      setActionMessage('Sober monitor removed and door access revoked.');
    } catch (err) {
      console.error('Error removing sober monitor:', err);
      setError('Unable to remove sober monitor.');
    } finally {
      setMonitorSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading event</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto bg-surface-container-low rounded-2xl border border-white/5 p-10 text-center">
        <AlertCircle className="w-10 h-10 text-error mx-auto mb-4" />
        <h1 className="text-2xl font-black tracking-tight">Event not found</h1>
        <button onClick={() => navigate('/events')} className="mt-6 text-primary text-xs font-black uppercase tracking-widest">Back to Events</button>
      </div>
    );
  }

  const displayedAttendance = attendanceSummary ?? event.attendance;
  const canRequestExcusal = Boolean(
    member
    && event.category === 'mandatory'
    && event.allow_excusals
    && !event.archived_at
    && !memberExcusal
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/events')}
            className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Event Protocol</span>
            <h1 className="text-4xl font-black tracking-tighter uppercase">{event.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge label={formatEventType(event.type)} />
              <Badge label={formatEventCategory(event.category)} tone={event.category === 'mandatory' ? 'danger' : 'default'} />
              {event.archived_at && <Badge label="Archived" />}
            </div>
          </div>
        </div>

        {(canEditEvent || canArchiveEvent) && (
          <div className="flex gap-3">
            {canEditEvent && (
              <button onClick={() => setIsEditOpen(true)} className="px-5 py-3 rounded-full bg-surface-container-low border border-white/5 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-surface-container-high">
                <Edit3 size={14} /> Edit
              </button>
            )}
            {canArchiveEvent && (
              <button
                onClick={handleArchiveToggle}
                disabled={saving}
                className="px-5 py-3 rounded-full bg-error/10 border border-error/20 text-error text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-error/20 disabled:opacity-50"
              >
                {event.archived_at ? <RotateCcw size={14} /> : <XCircle size={14} />}
                {event.archived_at ? 'Restore' : 'Archive'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <section className="bg-error/10 rounded-xl p-6 border border-error/20 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      {actionMessage && (
        <section className="bg-secondary/10 rounded-xl p-6 flex items-center gap-3 text-secondary">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">{actionMessage}</span>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Expected" value={displayedAttendance.expected} icon={<Users size={16} />} />
            <StatCard label="On Time" value={displayedAttendance.onTime} icon={<CheckCircle2 size={16} />} color="text-green-500" />
            <StatCard label="Late" value={displayedAttendance.late} icon={<Clock size={16} />} color="text-secondary" />
            <StatCard label="Excused" value={displayedAttendance.excused} icon={<FileText size={16} />} />
            <StatCard label="Unexcused" value={displayedAttendance.absent} icon={<XCircle size={16} />} color="text-red-500" />
            <StatCard
              label="Quorum"
              value={quorumStatus ? quorumStatus.label : 'Pending'}
              icon={<Users size={16} />}
              color={quorumStatus?.quorumMet ? 'text-green-500' : 'text-on-surface-variant'}
            />
          </div>

          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="flex bg-surface-container-lowest/45">
              {['Event Details', 'Officer Notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-5 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute inset-x-4 bottom-2 h-1 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'Event Details' && <EventDetailPanel event={event} />}
              {activeTab === 'Officer Notes' && <OfficerNotes event={event} canEdit={canEditEvent} onEdit={() => setIsEditOpen(true)} />}
            </div>
          </div>

          {canManageAttendance && (
            <AttendanceDesk
              event={event}
              attendanceSummary={displayedAttendance}
              roster={roster}
              loading={rosterLoading}
              error={rosterError}
              saving={saving}
              onManualMark={handleManualMark}
            />
          )}
        </div>

        <div className="space-y-6">
          {event.category === 'mandatory' && member && (
            <MemberExcusalCard
              event={event}
              existingExcusal={memberExcusal}
              canRequest={canRequestExcusal}
              onRequest={() => setIsExcusalOpen(true)}
            />
          )}

          <CheckInControlPanel
            event={event}
            attendanceSummary={displayedAttendance}
            quorumStatus={quorumStatus}
            canManageAttendance={canManageAttendance}
            saving={saving}
            onOpen={handleOpenCheckIn}
            onClose={handleCloseCheckIn}
          />

          {event.type === 'social' && (canManageSocialMonitors || monitorAssignments.length > 0 || monitorCoverage) && (
            <SoberMonitorPanel
              eventId={event.id}
              currentMemberId={member?.id ?? null}
              assignments={monitorAssignments}
              coverage={monitorCoverage}
              loading={monitorLoading}
              error={monitorError}
              saving={monitorSaving}
              canManage={canManageSocialMonitors}
              onAssign={handleAssignMonitor}
              onConfirm={handleConfirmMonitor}
              onRemove={handleRemoveMonitor}
            />
          )}

          <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-tight">Operations Status</h3>
            <div className="space-y-4">
              <StatusItem label="Live event record" active />
              <StatusItem label="Officer create/edit/archive" active={canEditEvent || canArchiveEvent} />
              <StatusItem label="Attendance writes" active={canManageAttendance} />
            </div>
            {canManageAttendance && event.type === 'chapter_meeting' && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleRecordQuorum}
                  disabled={saving}
                  className="w-full rounded-full bg-surface-container-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-bright disabled:opacity-50"
                >
                  Record Quorum Snapshot
                </button>
                <button
                  onClick={handlePublishIneligible}
                  disabled={saving}
                  className="w-full rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  Publish Ineligible List
                </button>
              </div>
            )}
            {canOpenSocialDoor && (
              <button
                onClick={() => navigate(`/events/${event.id}/door`)}
                className="w-full rounded-full bg-secondary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-secondary hover:bg-secondary/15"
              >
                Open Social Door List
              </button>
            )}
            <button onClick={() => navigate('/events')} className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2">
              Back to Event List <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditOpen && (
          <EventFormModal
            title="Edit Event"
            saving={saving}
            initialValues={eventToFormValues(event)}
            onClose={() => setIsEditOpen(false)}
            onSubmit={handleUpdate}
          />
        )}
        {isExcusalOpen && (
          <EventExcusalPanel
            event={event}
            saving={excusalSaving}
            onClose={() => setIsExcusalOpen(false)}
            onSubmit={handleSubmitExcusal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MemberExcusalCard = ({
  event,
  existingExcusal,
  canRequest,
  onRequest
}: {
  event: LiveEvent;
  existingExcusal: MemberExcusal | null;
  canRequest: boolean;
  onRequest: () => void;
}) => {
  const statusCopy = existingExcusal ? getExcusalStatusCopy(existingExcusal.status) : null;

  return (
    <section className="rounded-2xl border border-white/5 bg-surface-container-low p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-secondary">Member Excusal</p>
          <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-on-surface">Request Review</h3>
        </div>
        <FileText className="text-secondary" size={22} />
      </div>

      {existingExcusal ? (
        <div className="mt-5 rounded-2xl bg-surface-container-lowest p-4">
          <p className={cn('text-[10px] font-black uppercase tracking-[0.14rem]', statusCopy?.className)}>
            {statusCopy?.label}
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-on-surface-variant">
            Your excusal request for this mandatory event is on file.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-on-surface-variant">
          {event.allow_excusals
            ? 'Submit an absence request directly from this mandatory event.'
            : 'Excusal requests are disabled for this mandatory event.'}
        </p>
      )}

      <button
        onClick={onRequest}
        disabled={!canRequest}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-4 text-[10px] font-black uppercase tracking-[0.16rem] text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={15} />
        {existingExcusal ? 'Request Submitted' : 'Request Excusal'}
      </button>
    </section>
  );
};

const EventExcusalPanel = ({
  event,
  saving,
  onClose,
  onSubmit
}: {
  event: LiveEvent;
  saving: boolean;
  onClose: () => void;
  onSubmit: (reason: string, supportingNote: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const [supportingNote, setSupportingNote] = useState('');
  const canSubmit = reason.trim().length >= 12;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <motion.form
        onSubmit={formEvent => {
          formEvent.preventDefault();
          if (canSubmit) void onSubmit(reason, supportingNote);
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
          <div className="rounded-[2rem] bg-surface-container-low p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.18rem] text-primary">Mandatory Event</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-on-surface">{event.name}</h3>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14rem] text-on-surface-variant">
              {formatEventDate(event.event_date)} · {formatEventTimeRange(event.starts_at, event.ends_at)}
            </p>
          </div>

          <label className="block space-y-2">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/60">Reason</span>
            <textarea
              className="min-h-36 w-full resize-none sunken-input"
              placeholder="State the reason clearly enough for review."
              value={reason}
              onChange={textareaEvent => setReason(textareaEvent.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/60">Supporting Note</span>
            <textarea
              className="min-h-28 w-full resize-none sunken-input"
              placeholder="Optional context, documentation note, or contact."
              value={supportingNote}
              onChange={textareaEvent => setSupportingNote(textareaEvent.target.value)}
            />
          </label>
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

const SoberMonitorPanel = ({
  eventId,
  currentMemberId,
  assignments,
  coverage,
  loading,
  error,
  saving,
  canManage,
  onAssign,
  onConfirm,
  onRemove
}: {
  eventId: string;
  currentMemberId: string | null;
  assignments: SocialMonitorAssignment[];
  coverage: SocialMonitorCoverage | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  canManage: boolean;
  onAssign: (memberId: string) => Promise<void>;
  onConfirm: (assignmentId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<SocialMonitorCandidate[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!canManage || search.trim().length < 2) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchSocialMonitorCandidates(eventId, search);
        if (!cancelled) setCandidates(results);
      } catch (err) {
        console.error('Error searching sober monitor candidates:', err);
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [canManage, eventId, search]);

  const currentAssignment = currentMemberId
    ? assignments.find(assignment => assignment.member_id === currentMemberId)
    : null;

  return (
    <section className="rounded-2xl border border-white/5 bg-surface-container-low p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22rem] text-secondary">Sober Monitors</p>
          <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-on-surface">Door Coverage</h3>
        </div>
        <ShieldAlert className="text-secondary" size={22} />
      </div>

      {error && (
        <div className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">
          {error}
        </div>
      )}

      {coverage && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <CoverageMetric label="Required" value={coverage.required_monitors} active={coverage.monitor_coverage_met} />
          <CoverageMetric label="Assigned" value={coverage.assigned_monitors} active={coverage.monitor_coverage_met} />
          <CoverageMetric label="Exec" value={coverage.exec_monitors} active={coverage.exec_requirement_met} />
          <CoverageMetric label="Plan" value={coverage.planned_attendance} active />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-4 text-sm font-bold text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading monitor assignments
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest p-4">
            <p className="text-sm font-bold leading-6 text-on-surface-variant">
              No sober monitors assigned yet.
            </p>
          </div>
        ) : (
          assignments.map(assignment => (
            <MonitorAssignmentRow
              key={assignment.assignment_id}
              assignment={assignment}
              isCurrentMember={assignment.member_id === currentMemberId}
              saving={saving}
              canManage={canManage}
              onConfirm={() => onConfirm(assignment.assignment_id)}
              onRemove={() => onRemove(assignment.assignment_id)}
            />
          ))
        )}
      </div>

      {currentAssignment && currentAssignment.assignment_status !== 'confirmed' && (
        <button
          onClick={() => onConfirm(currentAssignment.assignment_id)}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-secondary/10 px-5 py-4 text-[10px] font-black uppercase tracking-[0.16rem] text-secondary hover:bg-secondary/15 disabled:opacity-40"
        >
          <CheckCircle2 size={15} />
          Confirm My Assignment
        </button>
      )}

      {canManage && (
        <div className="mt-6 rounded-2xl bg-surface-container-lowest p-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Add Monitor</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="min-h-12 w-full rounded-full bg-surface px-11 pr-4 text-sm font-semibold text-on-surface outline-none ring-1 ring-white/5 focus:ring-primary/40"
                placeholder="Search name, email, or SUID"
              />
              {searching && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>
          </label>

          <div className="mt-3 space-y-2">
            {candidates.map(candidate => (
              <MonitorCandidateRow
                key={candidate.member_id}
                candidate={candidate}
                saving={saving}
                onAssign={async () => {
                  await onAssign(candidate.member_id);
                  setSearch('');
                  setCandidates([]);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const CoverageMetric: React.FC<{ label: string; value: number; active: boolean }> = ({ label, value, active }) => (
  <div className="rounded-2xl bg-surface-container-lowest p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className={cn('mt-2 text-2xl font-black', active ? 'text-secondary' : 'text-primary')}>{value}</p>
  </div>
);

const MonitorAssignmentRow: React.FC<{
  assignment: SocialMonitorAssignment;
  isCurrentMember: boolean;
  saving: boolean;
  canManage: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}> = ({ assignment, isCurrentMember, saving, canManage, onConfirm, onRemove }) => (
  <article className="rounded-2xl bg-surface-container-lowest p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-black text-on-surface">{assignment.display_name}</h4>
          {assignment.is_exec_board && (
            <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1rem] text-secondary">Exec</span>
          )}
        </div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
          {assignment.suid} · {assignment.assignment_status}
        </p>
        <p className={cn(
          'mt-2 text-[10px] font-black uppercase tracking-[0.12rem]',
          assignment.access_active ? 'text-secondary' : 'text-primary'
        )}>
          {assignment.access_active ? 'Door Access Active' : 'Access Expired'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isCurrentMember && assignment.assignment_status !== 'confirmed' && (
          <button
            onClick={onConfirm}
            disabled={saving}
            className="rounded-full bg-secondary/10 p-2 text-secondary disabled:opacity-40"
            aria-label={`Confirm ${assignment.display_name}`}
          >
            <CheckCircle2 size={15} />
          </button>
        )}
        {canManage && (
          <button
            onClick={onRemove}
            disabled={saving}
            className="rounded-full bg-primary/10 p-2 text-primary disabled:opacity-40"
            aria-label={`Remove ${assignment.display_name}`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  </article>
);

const MonitorCandidateRow: React.FC<{
  candidate: SocialMonitorCandidate;
  saving: boolean;
  onAssign: () => Promise<void>;
}> = ({ candidate, saving, onAssign }) => (
  <button
    onClick={() => void onAssign()}
    disabled={saving || candidate.already_assigned}
    className="w-full rounded-2xl bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-45"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-on-surface">{candidate.display_name}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">{candidate.suid}</p>
      </div>
      <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.1rem] text-primary">
        <UserPlus size={13} />
        {candidate.already_assigned ? 'Assigned' : 'Assign'}
      </span>
    </div>
  </button>
);

const EventDetailPanel = ({ event }: { event: LiveEvent }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
    <div className="space-y-8">
      <DetailItem icon={<CalendarIcon size={18} />} label="Date" value={formatEventDate(event.event_date)} />
      <DetailItem icon={<Clock size={18} />} label="Time" value={formatEventTimeRange(event.starts_at, event.ends_at)} />
      <DetailItem icon={<MapPin size={18} />} label="Location" value={event.location} />
    </div>
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2rem] text-on-surface-variant/40">Attendance Policies</h4>
      <div className="space-y-3">
        <PolicyBadge label="Mandatory" active={event.category === 'mandatory'} />
        <PolicyBadge label={formatAttendanceMode(event.attendance_mode)} active />
        <PolicyBadge label="QR Check-In" active={event.qr_enabled} />
        <PolicyBadge label="Excusals Allowed" active={event.allow_excusals} />
        {event.late_cutoff_time && <PolicyBadge label={`Late After ${formatEventTime(event.late_cutoff_time)}`} active />}
      </div>
    </div>
  </div>
);

const CheckInControlPanel = ({
  event,
  attendanceSummary,
  quorumStatus,
  canManageAttendance,
  saving,
  onOpen,
  onClose
}: {
  event: LiveEvent;
  attendanceSummary: AttendanceSummary;
  quorumStatus: QuorumStatus | null;
  canManageAttendance: boolean;
  saving: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const checkInUrl = useMemo(() => {
    if (!event.check_in_token) return '';
    return `${window.location.origin}/check-in/${event.check_in_token}`;
  }, [event.check_in_token]);

  useEffect(() => {
    let cancelled = false;

    const renderQr = async () => {
      if (!checkInUrl) {
        setQrDataUrl(null);
        return;
      }

      const dataUrl = await QRCode.toDataURL(checkInUrl, {
        margin: 1,
        width: 280,
        color: {
          dark: '#1C1B1B',
          light: '#F4EEE8'
        }
      });

      if (!cancelled) {
        setQrDataUrl(dataUrl);
      }
    };

    void renderQr();

    return () => {
      cancelled = true;
    };
  }, [checkInUrl]);

  const copyLink = async () => {
    if (!checkInUrl) return;
    await navigator.clipboard.writeText(checkInUrl);
  };

  return (
    <div className={cn(
      "p-8 rounded-2xl shadow-2xl space-y-6",
      event.check_in_open ? "bg-primary shadow-primary/20" : "bg-surface-container-low border border-white/5"
    )}>
      <div className="flex items-center justify-between">
        <h3 className={cn("text-xl font-black uppercase tracking-tighter", event.check_in_open ? "text-white" : "text-on-surface")}>Check-In State</h3>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", event.check_in_open ? "bg-white animate-pulse" : "bg-on-surface-variant/30")} />
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", event.check_in_open ? "text-white/80" : "text-on-surface-variant")}>
            {event.check_in_open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      <p className={cn("text-xs leading-relaxed", event.check_in_open ? "text-white/70" : "text-on-surface-variant")}>
        {event.check_in_open
          ? 'Project this QR during check-in. The token rotates while this panel is open.'
          : 'Open check-in when the Secretary or event owner is ready to accept scans.'}
      </p>

      {event.check_in_open && qrDataUrl && (
        <div className="rounded-3xl bg-[#F4EEE8] p-4">
          <img src={qrDataUrl} alt={`QR check-in for ${event.name}`} className="w-full rounded-2xl" />
        </div>
      )}

      {event.check_in_open && checkInUrl && (
        <div className="space-y-3">
          {quorumStatus && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-3 text-white">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-white/60">Present</p>
                <p className="mt-1 text-xl font-black">{attendanceSummary.present}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14rem] text-white/60">Threshold</p>
                <p className="mt-1 text-xl font-black">{quorumStatus.thresholdCount}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => void copyLink()}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white hover:bg-white/15"
          >
            Copy Check-In Link
          </button>
          <button
            onClick={() => setProjectorOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-primary hover:bg-white/90"
          >
            <Maximize2 size={15} />
            Projector Mode
          </button>
        </div>
      )}

      {canManageAttendance ? (
        <button
          onClick={event.check_in_open ? onClose : onOpen}
          disabled={saving || !event.qr_enabled}
          className={cn(
            "w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50",
            event.check_in_open ? "bg-white text-primary" : "bg-primary text-white"
          )}
        >
          <QrCode size={18} /> {event.check_in_open ? 'Close Check-In' : 'Open Check-In'}
        </button>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest p-4 text-xs font-bold text-on-surface-variant">
          Officer attendance controls are hidden for this persona.
        </div>
      )}

      <AnimatePresence>
        {projectorOpen && event.check_in_open && (
          <ProjectorMode
            event={event}
            qrDataUrl={qrDataUrl}
            checkInUrl={checkInUrl}
            attendanceSummary={attendanceSummary}
            quorumStatus={quorumStatus}
            onClose={() => setProjectorOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ProjectorMode = ({
  event,
  qrDataUrl,
  checkInUrl,
  attendanceSummary,
  quorumStatus,
  onClose
}: {
  event: LiveEvent;
  qrDataUrl: string | null;
  checkInUrl: string;
  attendanceSummary: AttendanceSummary;
  quorumStatus: QuorumStatus | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-surface text-on-surface"
    >
      <div className="flex min-h-screen flex-col p-8 lg:p-12">
        <header className="flex items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 text-secondary">
              <Monitor size={24} />
              <p className="text-[11px] font-black uppercase tracking-[0.32rem]">Live Check-In</p>
            </div>
            <h1 className="mt-4 max-w-5xl text-5xl font-black uppercase tracking-tighter lg:text-7xl">
              {event.name}
            </h1>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.18rem] text-on-surface-variant">
              {formatEventDate(event.event_date)} · {formatEventTimeRange(event.starts_at, event.ends_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            aria-label="Close projector mode"
          >
            <X size={22} />
          </button>
        </header>

        <main className="grid flex-1 grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[minmax(24rem,42rem)_1fr]">
          <section className="mx-auto w-full max-w-[42rem] rounded-[2.5rem] bg-[#F4EEE8] p-6 shadow-2xl shadow-black/40">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR check-in for ${event.name}`} className="w-full rounded-[2rem]" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-[2rem] bg-surface-container-lowest text-primary">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            )}
          </section>

          <section className="space-y-8">
            <div className="rounded-[2rem] bg-surface-container-low p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.24rem] text-primary">Scan Route</p>
              <p className="mt-4 text-3xl font-black tracking-tight text-on-surface">
                Scan with a chapter account.
              </p>
              <p className="mt-4 break-all text-xs font-bold leading-5 text-on-surface-variant">
                {checkInUrl}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProjectorMetric label="Status" value="Open" tone="good" />
              <ProjectorMetric label="Late After" value={event.late_cutoff_time ? formatEventTime(event.late_cutoff_time) : formatEventTime(event.starts_at)} />
              <ProjectorMetric
                label="Token"
                value={event.check_in_token_rotated_at ? formatEventTime(event.check_in_token_rotated_at) : 'Fresh'}
                tone="gold"
              />
            </div>

            {quorumStatus && (
              <div className="grid grid-cols-3 gap-4">
                <ProjectorMetric label="Present" value={attendanceSummary.present} />
                <ProjectorMetric label="Threshold" value={quorumStatus.thresholdCount} tone="gold" />
                <ProjectorMetric label="Quorum" value={quorumStatus.quorumMet ? 'Met' : 'Pending'} tone={quorumStatus.quorumMet ? 'good' : 'neutral'} />
              </div>
            )}
          </section>
        </main>

        <footer className="flex flex-col gap-3 text-[11px] font-black uppercase tracking-[0.18rem] text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
          <span>Authenticated members scan only</span>
          <span>Token rotates while check-in remains open</span>
        </footer>
      </div>
    </motion.div>
  );
};

const ProjectorMetric = ({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'good' | 'gold';
}) => (
  <div className="rounded-[2rem] bg-surface-container-low p-6">
    <p className="text-[9px] font-black uppercase tracking-[0.16rem] text-on-surface-variant/50">{label}</p>
    <p className={cn(
      'mt-2 text-3xl font-black tracking-tighter',
      tone === 'good' && 'text-green-500',
      tone === 'gold' && 'text-secondary',
      tone === 'neutral' && 'text-on-surface'
    )}>
      {value}
    </p>
  </div>
);

const AttendanceDesk = ({
  event,
  attendanceSummary,
  roster,
  loading,
  error,
  saving,
  onManualMark
}: {
  event: EventWithAttendance;
  attendanceSummary: AttendanceSummary;
  roster: AttendanceRosterRow[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  onManualMark: (memberId: string, status: 'on_time' | 'late', reason: string) => Promise<void>;
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'expected' | 'present' | 'absent' | 'excused'>('all');

  const filteredRoster = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return roster.filter(row => {
      const matchesQuery = normalized.length === 0
        || row.display_name.toLowerCase().includes(normalized)
        || row.suid.includes(normalized);
      const matchesFilter =
        filter === 'all'
        || (filter === 'expected' && row.expected)
        || (filter === 'present' && Boolean(row.attendance_status))
        || (filter === 'absent' && row.expected && !row.attendance_status && !row.is_excused)
        || (filter === 'excused' && row.is_excused);

      return matchesQuery && matchesFilter;
    });
  }, [filter, query, roster]);

  const emptyRosterMessage = roster.length === 0 && attendanceSummary.expected > 0
    ? 'Expected attendance is loaded, but live roster rows have not been synced for this event yet. Open check-in when ready to build the live roster.'
    : 'No members match this attendance view.';

  return (
    <section className="rounded-[2rem] bg-surface-container-low p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24rem] text-primary">Secretary Attendance Desk</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-on-surface">{event.name}</h2>
        </div>
        <div className="flex rounded-full bg-surface-container-lowest p-1">
          {(['all', 'expected', 'present', 'absent', 'excused'] as const).map(value => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.12rem]",
                filter === value ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <input
        className="w-full sunken-input"
        placeholder="Search member or SUID"
        value={query}
        onChange={inputEvent => setQuery(inputEvent.target.value)}
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-6 text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.18rem]">Loading roster</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-primary/10 p-6 text-sm font-bold leading-6 text-primary">
          {error}
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-6 text-sm font-bold text-on-surface-variant">
          {emptyRosterMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRoster.map(row => (
            <React.Fragment key={row.member_id}>
              <AttendanceDeskRow
                row={row}
                saving={saving}
                onManualMark={onManualMark}
              />
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
};

const AttendanceDeskRow = ({
  row,
  saving,
  onManualMark
}: {
  row: AttendanceRosterRow;
  saving: boolean;
  onManualMark: (memberId: string, status: 'on_time' | 'late', reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const statusLabel = row.is_excused
    ? 'Excused'
    : row.attendance_status === 'on_time'
      ? 'On Time'
      : row.attendance_status === 'late'
        ? 'Late'
        : row.expected
          ? 'Not Checked In'
          : 'Walk-In';

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-on-surface">{row.display_name}</p>
            <Badge label={row.suid} />
            {row.expected && <Badge label="Expected" />}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            {statusLabel}{row.attendance_method ? ` via ${row.attendance_method}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.1rem] text-on-surface-variant/60">
            {row.checked_in_at && <span>{formatEventTime(row.checked_in_at)}</span>}
            {row.logged_by_name && <span>Logged by {row.logged_by_name}</span>}
            {row.override_reason && <span>Reason: {row.override_reason}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="min-h-10 rounded-full bg-surface px-4 text-xs font-bold text-on-surface outline-none placeholder:text-on-surface-variant/40"
            placeholder="Reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
          />
          <button
            disabled={saving || reason.trim().length < 4}
            onClick={() => void onManualMark(row.member_id, 'on_time', reason)}
            className="rounded-full bg-surface-container-high px-4 py-3 text-[9px] font-black uppercase tracking-[0.12rem] text-on-surface disabled:opacity-40"
          >
            On Time
          </button>
          <button
            disabled={saving || reason.trim().length < 4}
            onClick={() => void onManualMark(row.member_id, 'late', reason)}
            className="rounded-full bg-secondary/15 px-4 py-3 text-[9px] font-black uppercase tracking-[0.12rem] text-secondary disabled:opacity-40"
          >
            Late
          </button>
        </div>
      </div>
    </div>
  );
};

const OfficerNotes = ({ event, canEdit, onEdit }: { event: LiveEvent; canEdit: boolean; onEdit: () => void }) => (
  <div className="space-y-6">
    <div className="p-6 bg-surface-container-lowest rounded-xl relative">
      <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full">Executive Note</div>
      <p className="text-sm leading-relaxed text-on-surface/80 italic">
        "{event.officer_notes || 'No officer notes recorded.'}"
      </p>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Stored in Supabase</span>
        {canEdit && <button onClick={onEdit} className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline">Edit Note</button>}
      </div>
    </div>
  </div>
);

type QuorumStatus = {
  eligibleCount: number;
  presentCount: number;
  thresholdCount: number;
  quorumMet: boolean;
  label: string;
};

type AttendanceSummary = EventWithAttendance['attendance'];

const getAttendanceDisplaySummary = (
  roster: AttendanceRosterRow[],
  fallback: AttendanceSummary
): AttendanceSummary => {
  if (roster.length === 0) return fallback;

  const expectedRows = roster.filter(row => row.expected);
  const onTime = roster.filter(row => row.attendance_status === 'on_time').length;
  const late = roster.filter(row => row.attendance_status === 'late').length;
  const excused = expectedRows.filter(row => row.is_excused).length;
  const absent = expectedRows.filter(row => !row.attendance_status && !row.is_excused).length;

  return {
    expected: expectedRows.length,
    onTime,
    late,
    present: onTime + late,
    excused,
    absent
  };
};

const getQuorumStatus = (roster: AttendanceRosterRow[]): QuorumStatus | null => {
  const votingRows = roster.filter(row => row.member_status === 'active');
  if (votingRows.length === 0) return null;

  const presentCount = votingRows.filter(row => Boolean(row.attendance_status)).length;
  const eligibleCount = votingRows.length;
  const thresholdCount = Math.floor(eligibleCount / 2) + 1;

  return {
    eligibleCount,
    presentCount,
    thresholdCount,
    quorumMet: presentCount >= thresholdCount,
    label: `${presentCount}/${thresholdCount}`
  };
};

const getExcusalStatusCopy = (status: MemberExcusal['status']) => {
  if (status === 'approved') {
    return {
      label: 'Approved',
      className: 'text-green-500'
    };
  }

  if (status === 'denied') {
    return {
      label: 'Denied',
      className: 'text-primary'
    };
  }

  return {
    label: 'Pending Review',
    className: 'text-secondary'
  };
};

const StatCard = ({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color?: string }) => (
  <div className="bg-surface-container-low p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
    <div className="flex items-center justify-between text-on-surface-variant/40">
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    <span className={cn("text-3xl font-black tracking-tighter", color || "text-on-surface")}>{value}</span>
  </div>
);

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary border border-white/5">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  </div>
);

const formatEventTime = (isoDate: string) =>
  new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoDate));

const PolicyBadge = ({ label, active }: { label: string; active: boolean }) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest",
    active ? "bg-primary/5 border-primary/20 text-primary" : "bg-surface-container-lowest border-white/5 text-on-surface-variant/40"
  )}>
    <span>{label}</span>
    {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
  </div>
);

const Badge = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'danger' }) => (
  <span className={cn(
    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
    tone === 'danger' ? "bg-red-600/20 text-red-500" : "bg-surface-container-high text-on-surface-variant"
  )}>
    {label}
  </span>
);

const StatusItem = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
      {active ? <CheckCircle2 size={14} className="text-green-500" /> : <MoreVertical size={14} className="text-on-surface-variant" />}
    </div>
    <div className="flex flex-col justify-center">
      <p className="text-xs font-medium">{label}</p>
      <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">{active ? 'Active' : 'Future sprint'}</span>
    </div>
  </div>
);
