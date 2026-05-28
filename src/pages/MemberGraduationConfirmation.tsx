import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  AlumniDirectoryVisibility,
  GraduationCandidate,
  GraduationCycle,
  GraduationMemberResponse,
  fetchMyGraduationCandidate,
  submitGraduationResponse
} from '../lib/memberGraduation';
import { cn } from '../lib/utils';

type GraduationForm = {
  response: '' | GraduationMemberResponse;
  responseNote: string;
  personalEmail: string;
  phone: string;
  linkedin: string;
  alumniCity: string;
  directoryVisibility: AlumniDirectoryVisibility;
};

const RESPONSE_OPTIONS: Array<{
  value: GraduationMemberResponse;
  label: string;
  detail: string;
}> = [
  { value: 'graduating', label: 'Yes, I am graduating', detail: 'The secretary can review me for alumni status.' },
  { value: 'delayed', label: 'My graduation was delayed', detail: 'Keep me active while the secretary updates my record.' },
  { value: 'not_graduating', label: 'I am not graduating', detail: 'I was included in this review by mistake.' },
  { value: 'unsure', label: 'I am not sure', detail: 'Use this if your status is unclear.' }
];

export const MemberGraduationConfirmation = () => {
  const { member } = useAuth();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<GraduationCycle | null>(null);
  const [candidate, setCandidate] = useState<GraduationCandidate | null>(null);
  const [form, setForm] = useState<GraduationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const record = await fetchMyGraduationCandidate(member?.id);
        if (!isMounted) return;

        setCycle(record?.cycle ?? null);
        setCandidate(record?.candidate ?? null);
        setForm(record?.candidate ? toForm(record.candidate, member) : null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Unable to load graduation confirmation:', err);
        setError('Graduation confirmation could not load. Refresh and try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [member]);

  const selectedResponse = useMemo(
    () => RESPONSE_OPTIONS.find(option => option.value === form?.response),
    [form?.response]
  );
  const existingResponse = Boolean(candidate?.member_response);

  const updateForm = <K extends keyof GraduationForm>(key: K, value: GraduationForm[K]) => {
    setForm(current => current ? { ...current, [key]: value } : current);
    setError(null);
  };

  const submit = async () => {
    if (!candidate || !form || !form.response) {
      setError('Choose your graduation status before submitting.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitGraduationResponse({
        candidateId: candidate.id,
        response: form.response,
        responseNote: form.responseNote.trim() || null,
        confirmedPersonalEmail: form.personalEmail.trim() || null,
        confirmedPhone: form.phone.trim() || null,
        confirmedLinkedin: form.linkedin.trim() || null,
        alumniCity: form.alumniCity.trim() || null,
        alumniDirectoryVisibility: form.directoryVisibility
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Unable to submit graduation confirmation:', err);
      setError('Graduation confirmation could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!member) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28rem] text-secondary">
            <GraduationCap size={16} />
            Graduation Review
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-normal text-on-surface md:text-6xl">Confirm Your Graduation Status</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-on-surface-variant">
            Tell the secretary whether you are graduating this term and confirm the contact details the chapter should keep after graduation.
          </p>
          <p className="mt-3 max-w-2xl rounded-2xl bg-surface-container-low px-4 py-3 text-xs font-bold leading-5 text-on-surface-variant">
            This does not move you automatically. The secretary reviews your response before any roster change.
          </p>
        </div>

        {cycle && (
          <div className="rounded-[1.5rem] bg-surface-container-low px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant">{cycle.term_label}</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-on-surface">
              <Clock size={15} className="text-primary" />
              {cycle.due_at ? `Due ${formatDate(cycle.due_at)}` : 'No deadline set'}
            </p>
          </div>
        )}
      </header>

      {error && (
        <section className="mt-6 flex items-center gap-3 rounded-2xl bg-error/10 p-4 text-error">
          <AlertCircle size={18} />
          <p className="text-sm font-bold">{error}</p>
        </section>
      )}

      {loading ? (
        <section className="mt-10 flex min-h-64 items-center justify-center gap-3 rounded-[2rem] bg-surface-container-low text-on-surface-variant">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-xs font-black uppercase tracking-[0.18rem]">Loading graduation confirmation</span>
        </section>
      ) : submitted ? (
        <section className="mt-10 rounded-[2rem] bg-surface-container-low p-8 text-center">
          <CheckCircle2 className="mx-auto text-secondary" size={34} />
          <h2 className="mt-4 text-3xl font-black text-on-surface">Response Sent</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-on-surface-variant">
            Your answer is recorded. The secretary still has to approve any move to alumni status.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-white"
          >
            Return to Dashboard
            <ArrowRight size={14} />
          </button>
        </section>
      ) : !candidate || !form ? (
        <section className="mt-10 rounded-[2rem] bg-surface-container-low p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">No Request Open</p>
          <h2 className="mt-2 text-2xl font-black text-on-surface">You do not have a graduation confirmation right now.</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-on-surface-variant">
            If you expected one, contact the chapter secretary. Confirmations only appear after the secretary starts a graduation review.
          </p>
        </section>
      ) : (
        <section className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            {existingResponse && (
              <section className="rounded-2xl bg-secondary/10 px-5 py-4 text-secondary">
                <p className="text-[10px] font-black uppercase tracking-[0.16rem]">Response Already Sent</p>
                <p className="mt-1 text-sm font-bold leading-6">
                  You can update your answer until the secretary closes this graduation review.
                </p>
              </section>
            )}
            <section className="rounded-[2rem] bg-surface-container-low p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Graduation Status</p>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {RESPONSE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('response', option.value)}
                    className={cn(
                      'min-h-[118px] rounded-2xl bg-surface-container-lowest p-4 text-left transition-colors',
                      form.response === option.value && 'bg-primary/15 ring-1 ring-primary/35'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-on-surface">
                      {form.response === option.value ? <CheckCircle2 size={16} className="text-primary" /> : <UserCheck size={16} className="text-on-surface-variant" />}
                      {option.label}
                    </span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-on-surface-variant">{option.detail}</span>
                  </button>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Note for Secretary</span>
                <textarea
                  value={form.responseNote}
                  onChange={event => updateForm('responseNote', event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border-none bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary/40"
                  placeholder="Example: I am finishing one class over the summer."
                />
              </label>
            </section>

            <section className="rounded-[2rem] bg-surface-container-low p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Contact After Graduation</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField label="Personal Email" icon={<Mail size={14} />} value={form.personalEmail} placeholder="name@example.com" onChange={value => updateForm('personalEmail', value)} />
                <TextField label="Phone" icon={<Phone size={14} />} value={form.phone} placeholder="(315) 555-0100" onChange={value => updateForm('phone', value)} />
                <TextField label="LinkedIn" icon={<UserCheck size={14} />} value={form.linkedin} placeholder="linkedin.com/in/name" onChange={value => updateForm('linkedin', value)} />
                <TextField label="Post-grad City" icon={<MapPin size={14} />} value={form.alumniCity} placeholder="Syracuse, NY" onChange={value => updateForm('alumniCity', value)} />
              </div>
              <label className="mt-5 block">
                <span className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Alumni Directory Visibility</span>
                <select
                  value={form.directoryVisibility}
                  onChange={event => updateForm('directoryVisibility', event.target.value as AlumniDirectoryVisibility)}
                  className="mt-2 w-full rounded-2xl border-none bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary/40"
                >
                  <option value="standard">Standard alumni directory</option>
                  <option value="limited">Limited contact visibility</option>
                  <option value="hidden">Do not show in alumni directory</option>
                </select>
                <span className="mt-2 block text-xs font-semibold leading-5 text-on-surface-variant">
                  This controls what alumni officers can share in future chapter networking tools.
                </span>
              </label>
            </section>
          </div>

          <aside className="h-fit rounded-[2rem] bg-surface-container-low p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">What Happens Next</p>
            <div className="mt-5 space-y-4">
              <Step number="1" label="You send your answer" active={Boolean(form.response)} />
              <Step number="2" label="Secretary reviews it" active={Boolean(candidate.member_response)} />
              <Step number="3" label="Approved graduates become alumni" active={Boolean(candidate.promoted_at)} />
            </div>
            <div className="mt-6 rounded-2xl bg-surface-container-lowest p-4">
              <p className="text-xs font-black text-on-surface">{selectedResponse?.label ?? 'No status selected'}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-on-surface-variant">
                {selectedResponse?.detail ?? 'Choose the option that best matches your current graduation plan.'}
              </p>
            </div>
            <button
              onClick={submit}
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {existingResponse ? 'Update Graduation Response' : 'Send Status to Secretary'}
            </button>
          </aside>
        </section>
      )}
    </div>
  );
};

const TextField = ({
  label,
  icon,
  value,
  placeholder,
  onChange
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <label className="block">
    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">
      {icon}
      {label}
    </span>
    <input
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      className="mt-2 w-full rounded-2xl border-none bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary/40"
    />
  </label>
);

const Step = ({ number, label, active }: { number: string; label: string; active: boolean }) => (
  <div className="flex items-center gap-3">
    <span className={cn(
      'flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black',
      active ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'
    )}>
      {number}
    </span>
    <span className="text-xs font-black text-on-surface">{label}</span>
  </div>
);

function toForm(candidate: GraduationCandidate, member: ReturnType<typeof useAuth>['member']): GraduationForm {
  return {
    response: candidate.member_response ?? '',
    responseNote: candidate.response_note ?? '',
    personalEmail: candidate.confirmed_personal_email ?? member?.personal_email ?? '',
    phone: candidate.confirmed_phone ?? member?.phone ?? '',
    linkedin: candidate.confirmed_linkedin ?? member?.linkedin ?? '',
    alumniCity: candidate.alumni_city ?? '',
    directoryVisibility: candidate.alumni_directory_visibility
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
