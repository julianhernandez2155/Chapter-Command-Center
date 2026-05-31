import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Search,
  ShieldAlert,
  UserPlus,
  Users
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import {
  addAndCheckInSocialDoorGuest,
  checkInSocialDoorGuest,
  DoorGuestGender,
  fetchSocialDoorGuests,
  fetchSocialDoorSummary,
  searchSocialDoorMembers,
  SocialDoorGuest,
  SocialDoorMemberResult,
  SocialDoorSummary
} from '../lib/socialDoor';

const EMPTY_GUEST_FORM = {
  firstName: '',
  lastName: '',
  schoolEmail: '',
  gender: 'female' as DoorGuestGender,
  overrideReason: ''
};

export const SocialDoorList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SocialDoorSummary | null>(null);
  const [guests, setGuests] = useState<SocialDoorGuest[]>([]);
  const [memberResults, setMemberResults] = useState<SocialDoorMemberResult[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<SocialDoorMemberResult | null>(null);
  const [guestForm, setGuestForm] = useState(EMPTY_GUEST_FORM);
  const [loading, setLoading] = useState(true);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [savingGuestId, setSavingGuestId] = useState<string | null>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const eventId = id ?? '';
  const canSubmitGuest = guestForm.firstName.trim().length > 0
    && guestForm.lastName.trim().length > 0
    && (guestForm.gender !== 'male' || guestForm.overrideReason.trim().length >= 8);

  const checkedInCount = useMemo(
    () => guests.filter(guest => guest.checked_in_at).length,
    [guests]
  );

  const loadDoor = async (search = guestSearch) => {
    if (!eventId) return;

    setError(null);

    try {
      const [nextSummary, nextGuests] = await Promise.all([
        fetchSocialDoorSummary(eventId),
        fetchSocialDoorGuests(eventId, search)
      ]);

      setSummary(nextSummary);
      setGuests(nextGuests);
    } catch (err) {
      console.error('Error loading social door list:', err);
      setError('Door list unavailable. Check event type, guest policy, and access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDoor('');
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    const timeout = window.setTimeout(() => {
      void loadDoor(guestSearch);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [eventId, guestSearch]);

  useEffect(() => {
    if (!eventId || memberSearch.trim().length < 2) {
      setMemberResults([]);
      return;
    }

    let cancelled = false;
    setSearchingMembers(true);

    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchSocialDoorMembers(eventId, memberSearch);
        if (!cancelled) setMemberResults(results);
      } catch (err) {
        console.error('Error searching door members:', err);
        if (!cancelled) setMemberResults([]);
      } finally {
        if (!cancelled) setSearchingMembers(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [eventId, memberSearch]);

  const handleCheckInGuest = async (guest: SocialDoorGuest) => {
    setSavingGuestId(guest.id);
    setError(null);
    setActionMessage(null);

    try {
      await checkInSocialDoorGuest(guest.id);
      setActionMessage(`${guest.first_name} ${guest.last_name} checked in.`);
      await loadDoor();
    } catch (err) {
      console.error('Error checking in guest:', err);
      setError('Guest check-in failed.');
    } finally {
      setSavingGuestId(null);
    }
  };

  const handleAddGuest = async () => {
    if (!eventId || !canSubmitGuest) return;

    setAddingGuest(true);
    setError(null);
    setActionMessage(null);

    try {
      await addAndCheckInSocialDoorGuest({
        eventId,
        firstName: guestForm.firstName,
        lastName: guestForm.lastName,
        schoolEmail: guestForm.schoolEmail,
        gender: guestForm.gender,
        hostMemberId: selectedHost?.member_id ?? null,
        overrideReason: guestForm.overrideReason
      });

      setActionMessage(`${guestForm.firstName.trim()} ${guestForm.lastName.trim()} added and checked in.`);
      setGuestForm(EMPTY_GUEST_FORM);
      setSelectedHost(null);
      await loadDoor();
    } catch (err) {
      console.error('Error adding guest:', err);
      setError(guestForm.gender === 'male'
        ? 'Override failed. Confirm role access and reason.'
        : 'Guest add/check-in failed.');
    } finally {
      setAddingGuest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl bg-surface-container-low p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 text-2xl font-black text-on-surface">Door List Locked</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-on-surface-variant">
          {error ?? 'This social event is not available for door operations.'}
        </p>
        <button
          onClick={() => navigate('/events')}
          className="mt-6 rounded-full bg-surface-container-high px-6 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface"
        >
          Back To Events
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 overflow-x-hidden">
      <section className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/events/${summary.event_id}`)}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={14} />
            Event
          </button>
          <p className="text-[11px] font-black uppercase tracking-[0.18rem] text-primary">Social Door</p>
          <h1 className="mt-3 max-w-3xl break-words text-3xl font-black leading-tight text-on-surface sm:text-4xl md:text-6xl">{summary.name}</h1>
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">
            {formatDoorDate(summary.starts_at)} {summary.location ? `at ${summary.location}` : ''}
          </p>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:min-w-80 sm:grid-cols-2 lg:w-auto">
          <Metric label="Guests" value={summary.guest_total} />
          <Metric label="Inside" value={Math.max(summary.checked_in_total, checkedInCount)} tone="gold" />
        </div>
      </section>

      {(error || actionMessage) && (
        <div className={cn(
          'rounded-3xl p-4 text-sm font-bold',
          error ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
        )}>
          {error ?? actionMessage}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-5">
          <div className="rounded-3xl bg-surface-container-low p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
              <input
                value={guestSearch}
                onChange={event => setGuestSearch(event.target.value)}
                className="min-h-14 w-full rounded-full bg-surface-container-lowest py-4 pl-12 pr-5 text-base font-semibold text-on-surface outline-none ring-1 ring-white/5 placeholder:text-on-surface-variant/50 focus:ring-primary/40"
                placeholder="Guest, email, brother, SUID"
              />
            </div>
          </div>

          <div className="space-y-3">
            {guests.length === 0 ? (
              <div className="rounded-3xl bg-surface-container-low p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-on-surface-variant" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.12rem] text-on-surface">No guests found</p>
              </div>
            ) : (
              guests.map(guest => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  saving={savingGuestId === guest.id}
                  onCheckIn={() => handleCheckInGuest(guest)}
                />
              ))
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-surface-container-low p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Brother Eligibility</p>
                <h2 className="mt-2 text-xl font-black text-on-surface">Sponsor Search</h2>
              </div>
              <ShieldAlert className="h-6 w-6 text-secondary" />
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
              <input
                value={memberSearch}
                onChange={event => setMemberSearch(event.target.value)}
                className="min-h-12 w-full rounded-full bg-surface-container-lowest py-3 pl-11 pr-4 text-sm font-semibold text-on-surface outline-none ring-1 ring-white/5 placeholder:text-on-surface-variant/50 focus:ring-primary/40"
                placeholder="Brother name or SUID"
              />
              {searchingMembers && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>

            <div className="mt-4 space-y-2">
              {selectedHost && (
                <SelectedHost member={selectedHost} onClear={() => setSelectedHost(null)} />
              )}
              {memberResults.map(member => (
                <MemberResult
                  key={member.member_id}
                  member={member}
                  selected={selectedHost?.member_id === member.member_id}
                  onSelect={() => setSelectedHost(member)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-surface-container-low p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-primary">Door Add</p>
                <h2 className="mt-2 text-xl font-black text-on-surface">Add And Check In</h2>
              </div>
              <UserPlus className="h-6 w-6 text-primary" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <DoorInput
                label="First"
                value={guestForm.firstName}
                onChange={value => setGuestForm(current => ({ ...current, firstName: value }))}
              />
              <DoorInput
                label="Last"
                value={guestForm.lastName}
                onChange={value => setGuestForm(current => ({ ...current, lastName: value }))}
              />
              <div className="col-span-2">
                <DoorInput
                  label="School Email"
                  value={guestForm.schoolEmail}
                  onChange={value => setGuestForm(current => ({ ...current, schoolEmail: value }))}
                />
              </div>
              <label className="col-span-2 block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Guest Type</span>
                <select
                  value={guestForm.gender}
                  onChange={event => setGuestForm(current => ({ ...current, gender: event.target.value as DoorGuestGender }))}
                  className="min-h-12 w-full rounded-2xl bg-surface-container-lowest px-4 text-sm font-black text-on-surface outline-none ring-1 ring-white/5 focus:ring-primary/40"
                >
                  <option value="female">Female Guest</option>
                  <option value="male">Male Guest Override</option>
                  <option value="other">Other Guest</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              {guestForm.gender === 'male' && (
                <label className="col-span-2 block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14rem] text-primary">Override Reason</span>
                  <textarea
                    value={guestForm.overrideReason}
                    onChange={event => setGuestForm(current => ({ ...current, overrideReason: event.target.value }))}
                    className="min-h-24 w-full resize-none rounded-2xl bg-surface-container-lowest p-4 text-sm font-semibold text-on-surface outline-none ring-1 ring-white/5 focus:ring-primary/40"
                    placeholder={summary.can_override_male_guest ? 'Required for unlisted male guest' : 'Restricted'}
                    disabled={!summary.can_override_male_guest}
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleAddGuest}
              disabled={!canSubmitGuest || addingGuest || (guestForm.gender === 'male' && !summary.can_override_male_guest)}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[11px] font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {addingGuest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
              Check In Guest
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};

const Metric = ({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'gold' }) => (
  <div className="rounded-3xl bg-surface-container-low p-5">
    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">{label}</p>
    <p className={cn('mt-2 text-4xl font-black', tone === 'gold' ? 'text-secondary' : 'text-on-surface')}>{value}</p>
  </div>
);

const GuestRow: React.FC<{
  guest: SocialDoorGuest;
  saving: boolean;
  onCheckIn: () => void;
}> = ({
  guest,
  saving,
  onCheckIn
}) => {
  const checkedIn = Boolean(guest.checked_in_at);

  return (
    <article className="rounded-3xl bg-surface-container-low p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-on-surface">{guest.first_name} {guest.last_name}</h3>
            <span className={cn(
              'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12rem]',
              guest.approval_status === 'override_approved'
                ? 'bg-primary/15 text-primary'
                : 'bg-secondary/10 text-secondary'
            )}>
              {guest.approval_status === 'override_approved' ? 'Override' : guest.gender}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-on-surface-variant">
            {guest.school_email || 'No email'}{guest.host_display_name ? ` - Host: ${guest.host_display_name}` : ''}
          </p>
          {checkedIn && (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12rem] text-secondary">
              Checked in {formatDoorTime(guest.checked_in_at)}
            </p>
          )}
        </div>

        <button
          onClick={onCheckIn}
          disabled={checkedIn || saving}
          className={cn(
            'flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[10px] font-black uppercase tracking-[0.14rem] transition-colors',
            checkedIn
              ? 'bg-secondary/10 text-secondary'
              : 'bg-primary text-white hover:bg-primary/90',
            saving && 'opacity-60',
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : checkedIn ? <CheckCircle2 size={16} /> : <Check size={16} />}
          {checkedIn ? 'Inside' : 'Check In'}
        </button>
      </div>
    </article>
  );
};

const MemberResult: React.FC<{
  member: SocialDoorMemberResult;
  selected: boolean;
  onSelect: () => void;
}> = ({
  member,
  selected,
  onSelect
}) => (
  <button
    onClick={onSelect}
    className={cn(
      'w-full rounded-2xl p-3 text-left transition-colors',
      selected ? 'bg-primary/10' : 'bg-surface-container-lowest hover:bg-surface-container-high'
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-on-surface">{member.display_name}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">{member.suid}</p>
      </div>
      <span className={cn(
        'shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.1rem]',
        member.current_social_ineligible ? 'bg-primary/15 text-primary' : 'bg-secondary/10 text-secondary'
      )}>
        {member.current_social_ineligible ? 'Ineligible' : 'Eligible'}
      </span>
    </div>
  </button>
);

const SelectedHost = ({ member, onClear }: { member: SocialDoorMemberResult; onClear: () => void }) => (
  <div className="rounded-2xl bg-secondary/10 p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-secondary">{member.display_name}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">Selected host</p>
      </div>
      <button
        onClick={onClear}
        className="rounded-full bg-surface-container-lowest px-3 py-2 text-[9px] font-black uppercase tracking-[0.12rem] text-on-surface-variant"
      >
        Clear
      </button>
    </div>
  </div>
);

const DoorInput = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      className="min-h-12 w-full rounded-2xl bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface outline-none ring-1 ring-white/5 placeholder:text-on-surface-variant/50 focus:ring-primary/40"
    />
  </label>
);

const formatDoorDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatDoorTime = (value: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
};
