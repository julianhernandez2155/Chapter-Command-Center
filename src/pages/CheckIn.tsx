import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  Shield,
  XCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { CheckInPreview, CheckInResult, checkInMemberByToken, previewCheckInToken } from '../lib/events';

type CheckInState = 'idle' | 'previewing' | 'ready' | 'submitting' | 'success' | 'late' | 'already_checked_in' | 'closed' | 'invalid' | 'error';

export const CheckIn = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { member } = useAuth();
  const [state, setState] = useState<CheckInState>(token ? 'previewing' : 'idle');
  const [preview, setPreview] = useState<CheckInPreview | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!token) {
      setState('idle');
      return;
    }

    setState('previewing');
    setPreview(null);
    setResult(null);
    setError(null);

    try {
      const checkInPreview = await previewCheckInToken(token);
      setPreview(checkInPreview);

      if (checkInPreview.result === 'ready') {
        setState('ready');
      } else {
        setError(checkInPreview.message ?? 'This QR token is no longer valid. Scan the current projected QR.');
        setState('invalid');
      }
    } catch (err) {
      console.error('Error loading check-in preview:', err);
      setError('Unable to load this check-in. Ask the Secretary to confirm check-in is open.');
      setState('error');
    }
  };

  const submitCheckIn = async () => {
    if (!token) {
      setState('idle');
      return;
    }

    setState('submitting');
    setError(null);

    try {
      const checkIn = await checkInMemberByToken(token);
      setResult(checkIn);

      if (checkIn.result === 'on_time') setState('success');
      else if (checkIn.result === 'late') setState('late');
      else if (checkIn.result === 'already_checked_in') setState('already_checked_in');
      else if (checkIn.result === 'closed') setState('closed');
      else setState('invalid');
    } catch (err) {
      console.error('Error checking in:', err);
      setError('Unable to complete check-in. Ask the Secretary to manually mark attendance.');
      setState('error');
    }
  };

  useEffect(() => {
    if (token) {
      void loadPreview();
    }
  }, [token]);

  if (state === 'previewing' || state === 'submitting') {
    return (
      <CheckInShell>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-surface-container-low">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">
              {state === 'previewing' ? 'Reading QR' : 'Checking In'}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter">
              {state === 'previewing' ? 'Stand By' : 'Hold Position'}
            </h1>
          </div>
        </div>
      </CheckInShell>
    );
  }

  if (state === 'idle') {
    return (
      <CheckInShell>
        <div className="space-y-10 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-primary/10">
            <QrCode className="text-primary" size={52} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-on-surface-variant">Chapter Command</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter">Scan The Event QR</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-7 text-on-surface-variant">
              Check-in starts from the event QR code. No event is selected on this screen.
            </p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="mx-auto flex items-center gap-2 rounded-full bg-surface-container-high px-6 py-4 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface"
          >
            <ArrowLeft size={14} /> Back To Events
          </button>
        </div>
      </CheckInShell>
    );
  }

  if (state === 'ready' && preview?.result === 'ready') {
    return (
      <CheckInShell>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 text-center"
        >
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-primary/10">
            <QrCode className="text-primary" size={52} />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">Event Found</p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter">{preview.event_name}</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-7 text-on-surface-variant">
              Confirm this is the event you are entering.
            </p>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-6 text-left space-y-4">
            <ReceiptRow label="Member" value={member ? `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}` : 'Signed-in member'} />
            {preview.starts_at && <ReceiptRow label="Starts" value={formatReceiptTime(preview.starts_at)} />}
            {preview.late_cutoff_time && <ReceiptRow label="Late After" value={formatReceiptTime(preview.late_cutoff_time)} />}
            {preview.location && <ReceiptRow label="Location" value={preview.location} />}
            {preview.token_grace_available && <ReceiptRow label="QR Window" value="Accepted during rotation" />}
          </div>

          {preview.current_social_ineligible && <SocialEligibilityWarning />}

          <button
            onClick={() => void submitCheckIn()}
            className="w-full rounded-full bg-primary px-6 py-5 text-xs font-black uppercase tracking-[0.18rem] text-white hover:bg-primary/90"
          >
            Confirm Check-In
          </button>

          <button
            onClick={() => navigate('/events')}
            className="mx-auto flex items-center gap-2 rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={14} /> Not This Event
          </button>
        </motion.div>
      </CheckInShell>
    );
  }

  const copy = getStateCopy(state, result, error);

  return (
    <CheckInShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-10 text-center"
      >
        <div className={cn(
          "mx-auto flex h-32 w-32 items-center justify-center rounded-full shadow-2xl",
          copy.tone === 'success' && "bg-green-500 shadow-green-500/25",
          copy.tone === 'late' && "bg-secondary shadow-secondary/20",
          copy.tone === 'error' && "bg-error shadow-error/20"
        )}>
          {copy.icon}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3rem] text-primary">{copy.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter">{copy.title}</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-7 text-on-surface-variant">{copy.body}</p>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-6 text-left space-y-4">
          <ReceiptRow label="Member" value={member ? `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}` : 'Signed-in member'} />
          <ReceiptRow label="Event" value={result?.event_name ?? 'Unknown event'} />
          <ReceiptRow label="Status" value={copy.receiptStatus} />
          {result?.checked_in_at && <ReceiptRow label="Timestamp" value={formatReceiptTime(result.checked_in_at)} />}
          {result?.location && <ReceiptRow label="Location" value={result.location} />}
          {result?.token_grace_used && <ReceiptRow label="QR Window" value="Accepted during rotation" />}
        </div>

        {result?.current_social_ineligible && <SocialEligibilityWarning />}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full rounded-full bg-surface-container-high px-6 py-5 text-xs font-black uppercase tracking-[0.18rem] text-on-surface hover:bg-surface-bright"
        >
          Return To Command
        </button>
      </motion.div>
    </CheckInShell>
  );
};

const CheckInShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
    <div className="w-full max-w-md space-y-12">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="text-primary" size={32} />
        </div>
        <p className="text-xs font-bold tracking-[0.4em] text-on-surface-variant uppercase">Chapter Command</p>
      </div>
      {children}
    </div>
  </div>
);

const SocialEligibilityWarning = () => (
  <div className="rounded-[1.5rem] bg-secondary/10 px-5 py-4 text-left text-secondary">
    <p className="text-[10px] font-black uppercase tracking-[0.16rem]">Social Eligibility Flag</p>
    <p className="mt-2 text-xs font-bold leading-5 text-on-surface-variant">
      The latest attendance-owned Ineligible List marks this account as social ineligible. Attendance check-in is still recorded.
    </p>
  </div>
);

const ReceiptRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest px-4 py-3">
    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant/50">
      {getReceiptIcon(label)}
      {label}
    </span>
    <span className="text-right text-sm font-black text-on-surface">{value}</span>
  </div>
);

const getReceiptIcon = (label: string) => {
  if (label === 'Starts' || label === 'Late After' || label === 'Timestamp') return <CalendarIcon size={12} />;
  if (label === 'Location') return <MapPin size={12} />;
  return null;
};

const getStateCopy = (state: CheckInState, result: CheckInResult | null, error: string | null) => {
  if (state === 'success') {
    return {
      tone: 'success',
      icon: <CheckCircle2 className="text-white" size={64} />,
      eyebrow: 'On Time',
      title: 'Check-In Confirmed',
      body: `Your attendance has been logged for ${result?.event_name ?? 'this event'}.`,
      receiptStatus: 'On time'
    };
  }

  if (state === 'late') {
    return {
      tone: 'late',
      icon: <Clock className="text-surface" size={64} />,
      eyebrow: 'Late',
      title: 'Logged Late',
      body: `Your attendance has been recorded as late for ${result?.event_name ?? 'this event'}.`,
      receiptStatus: 'Late'
    };
  }

  if (state === 'already_checked_in') {
    return {
      tone: 'success',
      icon: <CheckCircle2 className="text-white" size={64} />,
      eyebrow: 'Already Logged',
      title: 'Check-In Exists',
      body: `You were already checked in for ${result?.event_name ?? 'this event'}.`,
      receiptStatus: result?.status === 'late' ? 'Late' : 'On time'
    };
  }

  if (state === 'closed') {
    return {
      tone: 'error',
      icon: <XCircle className="text-white" size={64} />,
      eyebrow: 'Closed',
      title: 'Check-In Closed',
      body: result?.message ?? 'Ask the Secretary if this needs a manual correction.',
      receiptStatus: 'Closed'
    };
  }

  return {
    tone: 'error',
    icon: <AlertCircle className="text-white" size={64} />,
    eyebrow: 'Not Accepted',
    title: 'Invalid Check-In',
    body: error ?? result?.message ?? 'This QR token is no longer valid. Scan the current projected QR.',
    receiptStatus: 'Invalid'
  };
};

const formatReceiptTime = (isoDate: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoDate));
