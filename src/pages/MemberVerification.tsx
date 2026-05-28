import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  MemberVerificationSelfProfile,
  VerificationGateStatus,
  VerificationOptionalReviewField,
  VerificationRequiredField,
  fetchMyVerificationGateStatus,
  fetchMyVerificationSelfProfile,
  saveMyVerificationSubmission,
  updateMyVerificationProfile
} from '../lib/memberVerification';
import { cn } from '../lib/utils';

type VerificationForm = {
  preferred_name: string;
  personal_email: string;
  phone: string;
  graduation_year: string;
  expected_graduation_term: string;
  school: string;
  major: string;
  local_address: string;
  campus_housing: string;
  home_city: string;
  home_state: string;
  instagram: string;
  snapchat: string;
  linkedin: string;
  tshirt_size: string;
  hoodie_size: string;
  parent_outreach_consent: boolean;
  correction_notes: string;
};

const REQUIRED_FIELD_LABELS: Record<VerificationRequiredField, string> = {
  personal_email: 'Personal email',
  phone: 'Phone',
  graduation_year: 'Graduation year',
  expected_graduation_term: 'Expected grad term',
  school: 'School',
  major: 'Major',
  local_address: 'Local address',
  campus_housing: 'Campus housing',
  home_city: 'Home city',
  home_state: 'Home state',
  tshirt_size: 'T-shirt size',
  hoodie_size: 'Hoodie size'
};

const OPTIONAL_FIELD_LABELS: Record<VerificationOptionalReviewField, string> = {
  parent_guardian_contact: 'Parent/guardian contact',
  emergency_contact: 'Emergency contact',
  parent_outreach_consent: 'Parent outreach consent'
};

const SIZE_OPTIONS = ['', 'S', 'M', 'L', 'XL', 'XXL'];

export const MemberVerification = () => {
  const { member, verificationStatus, refreshProfile, refreshVerificationStatus, signOut } = useAuth();
  const navigate = useNavigate();
  const [gateStatus, setGateStatus] = useState<VerificationGateStatus | null>(verificationStatus);
  const [profile, setProfile] = useState<MemberVerificationSelfProfile | null>(null);
  const [form, setForm] = useState<VerificationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [freshGate, selfProfile] = await Promise.all([
          fetchMyVerificationGateStatus(),
          fetchMyVerificationSelfProfile()
        ]);

        if (!isMounted) return;
        setGateStatus(freshGate);
        setProfile(selfProfile);
        setForm(selfProfile ? toForm(selfProfile) : null);

        if (freshGate?.is_gate_required && selfProfile) {
          await saveMyVerificationSubmission({
            cycleId: freshGate.cycle_id,
            memberId: freshGate.member_id,
            status: 'in_progress',
            missingRequiredFields: computeMissingRequiredFields(toForm(selfProfile)),
            optionalReviewFlags: computeOptionalReviewFlags(selfProfile),
            changedFields: [],
            confirmedFields: [],
            correctionNotes: null,
            snapshot: buildSnapshot(toForm(selfProfile), selfProfile)
          });
          await refreshVerificationStatus();
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Unable to load verification gate:', err);
        setError('Verification could not load. Refresh and try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [refreshVerificationStatus]);

  const missingFields = useMemo(
    () => form ? computeMissingRequiredFields(form) : [],
    [form]
  );

  if (!member) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!loading && (!gateStatus || !gateStatus.is_gate_required || submitted)) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateForm = <K extends keyof VerificationForm>(key: K, value: VerificationForm[K]) => {
    setForm(current => current ? { ...current, [key]: value } : current);
    setError(null);
  };

  const saveProgress = async () => {
    if (!form || !profile || !gateStatus) return;

    setSaving(true);
    setError(null);
    try {
      await updateMyVerificationProfile(profile.id, toProfileUpdate(form));
      await saveMyVerificationSubmission({
        cycleId: gateStatus.cycle_id,
        memberId: gateStatus.member_id,
        status: 'in_progress',
        missingRequiredFields: computeMissingRequiredFields(form),
        optionalReviewFlags: computeOptionalReviewFlags({ ...profile, parent_outreach_consent: form.parent_outreach_consent }),
        changedFields: getChangedFields(profile, form),
        confirmedFields: getConfirmedFields(form),
        correctionNotes: form.correction_notes || null,
        snapshot: buildSnapshot(form, profile)
      });
      await refreshProfile();
      const freshGate = await fetchMyVerificationGateStatus();
      setGateStatus(freshGate);
    } catch (err) {
      console.error('Unable to save verification progress:', err);
      setError('Progress could not be saved. Check the highlighted fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async () => {
    if (!form || !profile || !gateStatus) return;

    const missing = computeMissingRequiredFields(form);
    if (missing.length > 0) {
      setError(`Complete required fields first: ${missing.map(field => REQUIRED_FIELD_LABELS[field]).join(', ')}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateMyVerificationProfile(profile.id, toProfileUpdate(form));
      await saveMyVerificationSubmission({
        cycleId: gateStatus.cycle_id,
        memberId: gateStatus.member_id,
        status: 'submitted',
        missingRequiredFields: [],
        optionalReviewFlags: computeOptionalReviewFlags({ ...profile, parent_outreach_consent: form.parent_outreach_consent }),
        changedFields: getChangedFields(profile, form),
        confirmedFields: getConfirmedFields(form),
        correctionNotes: form.correction_notes || null,
        snapshot: buildSnapshot(form, profile)
      });
      await refreshProfile();
      await refreshVerificationStatus();
      setSubmitted(true);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Unable to submit verification:', err);
      setError('Verification could not be submitted. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-on-surface px-6 py-8 md:px-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-secondary text-[11px] font-black uppercase tracking-[0.32rem] flex items-center gap-2">
              <ShieldCheck size={16} />
              Semester Verification
            </p>
            <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-normal">Verify Your Profile</h1>
            <p className="mt-4 max-w-2xl text-on-surface-variant font-semibold leading-7">
              {gateStatus?.term_label ?? 'Current term'} profile verification is required before normal app access.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-[2rem] px-6 py-5 min-w-[260px]">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Cycle</p>
            <p className="mt-2 text-2xl font-black">{gateStatus?.term_label ?? 'Loading'}</p>
            <p className="mt-2 text-sm font-bold text-on-surface-variant flex items-center gap-2">
              <Clock size={15} />
              Due {gateStatus?.due_at ? formatDate(gateStatus.due_at) : 'not set'}
            </p>
          </div>
        </header>

        {loading && (
          <section className="mt-16 bg-surface-container-low rounded-[2rem] p-10 flex items-center gap-4">
            <Loader2 className="animate-spin text-primary" />
            <p className="font-black uppercase tracking-[0.16rem] text-sm">Loading verification</p>
          </section>
        )}

        {!loading && form && profile && gateStatus && (
          <section className="mt-12 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
            <div className="space-y-8">
              {error && (
                <div className="bg-error-container/20 text-error rounded-[1.5rem] p-5 flex gap-3 font-bold">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <VerificationSection title="Identity">
                <ReadonlyField label="Legal name" value={`${profile.legal_first_name} ${profile.legal_last_name}`} />
                <ReadonlyField label="SUID" value={profile.suid} />
                <ReadonlyField label="School email" value={profile.google_email} />
                <TextField label="Preferred name" value={form.preferred_name} onChange={value => updateForm('preferred_name', value)} />
              </VerificationSection>

              <VerificationSection title="Contact">
                <TextField required label="Personal email" value={form.personal_email} onChange={value => updateForm('personal_email', value)} />
                <TextField required label="Phone" value={form.phone} onChange={value => updateForm('phone', value)} />
                <TextField required label="Local address" value={form.local_address} onChange={value => updateForm('local_address', value)} />
                <TextField required label="Campus housing" value={form.campus_housing} onChange={value => updateForm('campus_housing', value)} />
                <TextField required label="Home city" value={form.home_city} onChange={value => updateForm('home_city', value)} />
                <TextField required label="Home state" value={form.home_state} onChange={value => updateForm('home_state', value)} />
              </VerificationSection>

              <VerificationSection title="Academic">
                <TextField required label="School" value={form.school} onChange={value => updateForm('school', value)} />
                <TextField required label="Major" value={form.major} onChange={value => updateForm('major', value)} />
                <TextField required label="Graduation year" value={form.graduation_year} inputMode="numeric" onChange={value => updateForm('graduation_year', value)} />
                <TextField required label="Expected grad term" value={form.expected_graduation_term} placeholder="Spring 2027" onChange={value => updateForm('expected_graduation_term', value)} />
              </VerificationSection>

              <VerificationSection title="Apparel & Social">
                <SelectField required label="T-shirt size" value={form.tshirt_size} options={SIZE_OPTIONS} onChange={value => updateForm('tshirt_size', value)} />
                <SelectField required label="Hoodie size" value={form.hoodie_size} options={SIZE_OPTIONS} onChange={value => updateForm('hoodie_size', value)} />
                <TextField label="Instagram" value={form.instagram} onChange={value => updateForm('instagram', value)} />
                <TextField label="Snapchat" value={form.snapchat} onChange={value => updateForm('snapchat', value)} />
                <TextField label="LinkedIn" value={form.linkedin} onChange={value => updateForm('linkedin', value)} />
              </VerificationSection>

              <VerificationSection title="Optional Review">
                <StatusField label="Parent/guardian contact" complete={profile.has_parent_guardian_contact} />
                <StatusField label="Emergency contact" complete={profile.has_emergency_contact} />
                <ToggleField label="Parent outreach consent" checked={form.parent_outreach_consent} onChange={value => updateForm('parent_outreach_consent', value)} />
              </VerificationSection>

              <VerificationSection title="Secretary Review">
                <TextAreaField
                  label="Correction notes"
                  value={form.correction_notes}
                  placeholder="Anything the Secretary should correct, like pledge class or initiation date."
                  onChange={value => updateForm('correction_notes', value)}
                />
              </VerificationSection>
            </div>

            <aside className="xl:sticky xl:top-8 h-fit bg-surface-container-low rounded-[2rem] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Completion</p>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-black">{gateStatus.required_fields.length - missingFields.length}</span>
                <span className="pb-2 text-on-surface-variant font-black">/ {gateStatus.required_fields.length}</span>
              </div>

              <div className="mt-6 space-y-2">
                {gateStatus.required_fields.map(field => (
                  <div key={field} className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>{REQUIRED_FIELD_LABELS[field]}</span>
                    {missingFields.includes(field) ? (
                      <span className="text-primary text-[10px] uppercase tracking-[0.12rem]">Needed</span>
                    ) : (
                      <CheckCircle2 size={16} className="text-secondary" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => void submitVerification()}
                  disabled={saving}
                  className="w-full min-h-12 rounded-full bg-primary text-white text-xs font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                  Submit Verification
                </button>
                <button
                  onClick={() => void saveProgress()}
                  disabled={saving}
                  className="w-full min-h-12 rounded-full bg-surface-container-high text-on-surface text-xs font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  Save Progress
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => void signOut()}
                  className="w-full min-h-12 rounded-full bg-surface-container-lowest text-on-surface-variant text-xs font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
};

const VerificationSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-surface-container-low rounded-[2rem] p-5 md:p-7">
    <h2 className="text-[11px] font-black uppercase tracking-[0.22rem] text-secondary mb-5">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </section>
);

const TextField = ({
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      {label}{required && <span className="text-primary"> *</span>}
    </span>
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="mt-2 w-full min-h-12 rounded-2xl bg-surface-container-lowest px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary/70"
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
  required
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      {label}{required && <span className="text-primary"> *</span>}
    </span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="mt-2 w-full min-h-12 rounded-2xl bg-surface-container-lowest px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary/70 cursor-pointer"
    >
      {options.map(option => (
        <option key={option || 'blank'} value={option}>{option || 'Select'}</option>
      ))}
    </select>
  </label>
);

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="md:col-span-2 block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="mt-2 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary/70 resize-none"
    />
  </label>
);

const ReadonlyField = ({ label, value }: { label: string; value: string | null }) => (
  <div className="rounded-2xl bg-surface-container-lowest px-4 py-3 min-h-12">
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className="mt-1 font-black text-on-surface">{value || 'Missing'}</p>
  </div>
);

const StatusField = ({ label, complete }: { label: string; complete: boolean }) => (
  <div className="rounded-2xl bg-surface-container-lowest px-4 py-3 min-h-12">
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className={cn('mt-1 font-black', complete ? 'text-secondary' : 'text-on-surface')}>
      {complete ? 'On file' : 'Not on file'}
    </p>
  </div>
);

const ToggleField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="rounded-2xl bg-surface-container-lowest px-4 py-3 min-h-12 flex items-center justify-between gap-4 cursor-pointer">
    <span>
      <span className="block text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
      <span className={cn('mt-1 block font-black', checked ? 'text-secondary' : 'text-on-surface')}>{checked ? 'Consent yes' : 'Consent no'}</span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="h-5 w-5 accent-primary cursor-pointer"
    />
  </label>
);

function toForm(profile: MemberVerificationSelfProfile): VerificationForm {
  return {
    preferred_name: profile.preferred_name ?? '',
    personal_email: profile.personal_email ?? '',
    phone: profile.phone ?? '',
    graduation_year: profile.graduation_year ? String(profile.graduation_year) : '',
    expected_graduation_term: profile.expected_graduation_term ?? '',
    school: profile.school ?? profile.college ?? '',
    major: profile.major ?? '',
    local_address: profile.local_address ?? '',
    campus_housing: profile.campus_housing ?? '',
    home_city: profile.home_city ?? '',
    home_state: profile.home_state ?? '',
    instagram: profile.instagram ?? '',
    snapchat: profile.snapchat ?? '',
    linkedin: profile.linkedin ?? '',
    tshirt_size: profile.tshirt_size ?? '',
    hoodie_size: profile.hoodie_size ?? '',
    parent_outreach_consent: profile.parent_outreach_consent,
    correction_notes: ''
  };
}

function toProfileUpdate(form: VerificationForm) {
  return {
    preferred_name: clean(form.preferred_name),
    personal_email: clean(form.personal_email),
    phone: clean(form.phone),
    graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
    expected_graduation_term: clean(form.expected_graduation_term),
    school: clean(form.school),
    major: clean(form.major),
    local_address: clean(form.local_address),
    campus_housing: clean(form.campus_housing),
    home_city: clean(form.home_city),
    home_state: clean(form.home_state),
    instagram: clean(form.instagram),
    snapchat: clean(form.snapchat),
    linkedin: clean(form.linkedin),
    tshirt_size: clean(form.tshirt_size),
    hoodie_size: clean(form.hoodie_size),
    parent_outreach_consent: form.parent_outreach_consent
  };
}

function computeMissingRequiredFields(form: VerificationForm): VerificationRequiredField[] {
  const missing: VerificationRequiredField[] = [];

  for (const field of Object.keys(REQUIRED_FIELD_LABELS) as VerificationRequiredField[]) {
    const value = form[field as keyof VerificationForm];
    if (typeof value === 'string' && value.trim() === '') {
      missing.push(field);
    }
  }

  if (form.graduation_year && Number.isNaN(Number(form.graduation_year))) {
    missing.push('graduation_year');
  }

  return [...new Set(missing)];
}

function computeOptionalReviewFlags(profile: Pick<MemberVerificationSelfProfile, 'has_parent_guardian_contact' | 'has_emergency_contact' | 'parent_outreach_consent'>): VerificationOptionalReviewField[] {
  return [
    !profile.has_parent_guardian_contact ? 'parent_guardian_contact' : null,
    !profile.has_emergency_contact ? 'emergency_contact' : null,
    !profile.parent_outreach_consent ? 'parent_outreach_consent' : null
  ].filter(Boolean) as VerificationOptionalReviewField[];
}

function getChangedFields(profile: MemberVerificationSelfProfile, form: VerificationForm) {
  const initial = toForm(profile);
  return (Object.keys(form) as Array<keyof VerificationForm>).filter(key => key !== 'correction_notes' && form[key] !== initial[key]);
}

function getConfirmedFields(form: VerificationForm) {
  return (Object.keys(form) as Array<keyof VerificationForm>)
    .filter(key => key !== 'correction_notes' && String(form[key]).trim() !== '')
    .map(String);
}

function buildSnapshot(form: VerificationForm, profile: MemberVerificationSelfProfile) {
  return {
    member_id: profile.id,
    legal_name: `${profile.legal_first_name} ${profile.legal_last_name}`,
    google_email: profile.google_email,
    ...toProfileUpdate(form),
    optional_status: {
      has_parent_guardian_contact: profile.has_parent_guardian_contact,
      has_emergency_contact: profile.has_emergency_contact,
      parent_outreach_consent: form.parent_outreach_consent
    }
  };
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
