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
  HousingType,
  MemberVerificationContacts,
  MemberVerificationSelfProfile,
  VerificationGateStatus,
  VerificationOptionalReviewField,
  VerificationRequiredField,
  fetchMyVerificationContacts,
  fetchMyVerificationGateStatus,
  fetchMyVerificationSelfProfile,
  saveMyVerificationContacts,
  saveMyVerificationSubmission,
  updateMyVerificationProfile
} from '../lib/memberVerification';

type VerificationForm = {
  preferred_name: string;
  personal_email: string;
  phone: string;
  graduation_year: string;
  expected_graduation_term: string;
  school: string;
  major: string;
  housing_type: '' | HousingType;
  local_address: string;
  campus_housing: string;
  home_city: string;
  home_state: string;
  instagram: string;
  snapchat: string;
  linkedin: string;
  tshirt_size: string;
  hoodie_size: string;
  guardian_1_id: string | null;
  guardian_1_first_name: string;
  guardian_1_last_name: string;
  guardian_1_relationship: string;
  guardian_1_phone: string;
  guardian_1_email: string;
  guardian_1_outreach_consent: boolean;
  guardian_2_id: string | null;
  guardian_2_first_name: string;
  guardian_2_last_name: string;
  guardian_2_relationship: string;
  guardian_2_phone: string;
  guardian_2_email: string;
  guardian_2_outreach_consent: boolean;
  correction_notes: string;
};

const REQUIRED_FIELD_LABELS: Record<VerificationRequiredField, string> = {
  personal_email: 'Personal email',
  phone: 'Phone',
  graduation_year: 'Graduation year',
  expected_graduation_term: 'Expected grad term',
  school: 'School',
  major: 'Major',
  housing_type: 'Housing type',
  local_address: 'Local address',
  campus_housing: 'Building',
  guardian_1_first_name: 'Parent/guardian first name',
  guardian_1_last_name: 'Parent/guardian last name',
  guardian_1_relationship: 'Parent/guardian relationship',
  guardian_1_phone: 'Parent/guardian phone',
  guardian_1_email: 'Parent/guardian email',
  home_city: 'Home city',
  home_state: 'Home state',
  tshirt_size: 'T-shirt size',
  hoodie_size: 'Hoodie size'
};

const OPTIONAL_FIELD_LABELS: Record<VerificationOptionalReviewField, string> = {
  parent_outreach_consent: 'Parent contact consent'
};

const SIZE_OPTIONS = ['', 'S', 'M', 'L', 'XL', 'XXL'];
const HOUSING_TYPE_OPTIONS: Array<{ value: '' | HousingType; label: string }> = [
  { value: '', label: 'Select housing type' },
  { value: 'on_campus', label: 'On Campus' },
  { value: 'off_campus', label: 'Off-campus' },
  { value: 'chapter_housing', label: 'Chapter Housing' }
];

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
        const contacts = selfProfile ? await fetchMyVerificationContacts(selfProfile.id) : emptyVerificationContacts();
        const nextForm = selfProfile ? toForm(selfProfile, contacts) : null;

        if (!isMounted) return;
        setGateStatus(freshGate);
        setProfile(selfProfile);
        setForm(nextForm);

        if (freshGate?.is_gate_required && selfProfile && nextForm) {
          await saveMyVerificationSubmission({
            cycleId: freshGate.cycle_id,
            memberId: freshGate.member_id,
            status: 'in_progress',
            missingRequiredFields: computeMissingRequiredFields(nextForm),
            optionalReviewFlags: computeOptionalReviewFlags(nextForm),
            changedFields: [],
            confirmedFields: [],
            correctionNotes: null,
            snapshot: buildSnapshot(nextForm, selfProfile)
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
  const activeRequiredFields = useMemo(
    () => form && gateStatus ? getActiveRequiredFields(form, gateStatus.required_fields) : [],
    [form, gateStatus]
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
      await saveMyVerificationContacts(profile.id, toGuardianContactInputs(form));
      await saveMyVerificationSubmission({
        cycleId: gateStatus.cycle_id,
        memberId: gateStatus.member_id,
        status: 'in_progress',
        missingRequiredFields: computeMissingRequiredFields(form),
        optionalReviewFlags: computeOptionalReviewFlags(form),
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
      setError(`Complete required fields first: ${missing.map(field => getRequiredFieldLabel(field, form)).join(', ')}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateMyVerificationProfile(profile.id, toProfileUpdate(form));
      await saveMyVerificationContacts(profile.id, toGuardianContactInputs(form));
      await saveMyVerificationSubmission({
        cycleId: gateStatus.cycle_id,
        memberId: gateStatus.member_id,
        status: 'submitted',
        missingRequiredFields: [],
        optionalReviewFlags: computeOptionalReviewFlags(form),
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
                <TextField required label="Home city" value={form.home_city} onChange={value => updateForm('home_city', value)} />
                <TextField required label="Home state" value={form.home_state} onChange={value => updateForm('home_state', value)} />
              </VerificationSection>

              <VerificationSection title="Housing">
                <HousingTypeField value={form.housing_type} onChange={value => updateForm('housing_type', value)} />
                {form.housing_type === 'on_campus' && (
                  <TextField
                    required
                    label="Dorm / building name"
                    value={form.campus_housing}
                    placeholder="Haven Hall, Sadler Hall, etc."
                    onChange={value => updateForm('campus_housing', value)}
                  />
                )}
                {form.housing_type === 'off_campus' && (
                  <>
                    <TextField
                      required
                      label="Local street address"
                      value={form.local_address}
                      placeholder="Street address or apartment address"
                      onChange={value => updateForm('local_address', value)}
                    />
                    <TextField
                      label="Apartment / building name"
                      value={form.campus_housing}
                      placeholder="Optional"
                      onChange={value => updateForm('campus_housing', value)}
                    />
                  </>
                )}
                {form.housing_type === 'chapter_housing' && (
                  <TextField
                    required
                    label="Room number"
                    value={form.campus_housing}
                    placeholder="Room 204, 3B, etc."
                    onChange={value => updateForm('campus_housing', value)}
                  />
                )}
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

              <VerificationSection title="Parent / Guardian Contact">
                <ContactGroup title="Parent / Guardian 1">
                  <TextField required label="First name" value={form.guardian_1_first_name} onChange={value => updateForm('guardian_1_first_name', value)} />
                  <TextField required label="Last name" value={form.guardian_1_last_name} onChange={value => updateForm('guardian_1_last_name', value)} />
                  <TextField required label="Phone" value={form.guardian_1_phone} onChange={value => updateForm('guardian_1_phone', value)} />
                  <TextField required label="Email" value={form.guardian_1_email} onChange={value => updateForm('guardian_1_email', value)} />
                  <TextField required label="Relationship" value={form.guardian_1_relationship} placeholder="Parent, guardian, etc." onChange={value => updateForm('guardian_1_relationship', value)} />
                  <ConsentField checked={form.guardian_1_outreach_consent} onChange={value => updateForm('guardian_1_outreach_consent', value)} />
                </ContactGroup>

                <ContactGroup title="Parent / Guardian 2">
                  <TextField label="First name" value={form.guardian_2_first_name} onChange={value => updateForm('guardian_2_first_name', value)} />
                  <TextField label="Last name" value={form.guardian_2_last_name} onChange={value => updateForm('guardian_2_last_name', value)} />
                  <TextField label="Phone" value={form.guardian_2_phone} onChange={value => updateForm('guardian_2_phone', value)} />
                  <TextField label="Email" value={form.guardian_2_email} onChange={value => updateForm('guardian_2_email', value)} />
                  <TextField label="Relationship" value={form.guardian_2_relationship} placeholder="Parent, guardian, etc." onChange={value => updateForm('guardian_2_relationship', value)} />
                  <ConsentField checked={form.guardian_2_outreach_consent} onChange={value => updateForm('guardian_2_outreach_consent', value)} />
                </ContactGroup>
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
                <span className="text-5xl font-black">{activeRequiredFields.length - missingFields.length}</span>
                <span className="pb-2 text-on-surface-variant font-black">/ {activeRequiredFields.length}</span>
              </div>

              <div className="mt-6 space-y-2">
                {activeRequiredFields.map(field => (
                  <div key={field} className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>{getRequiredFieldLabel(field, form)}</span>
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

const ContactGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
    <h3 className="md:col-span-2 text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface">{title}</h3>
    {children}
  </div>
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

const HousingTypeField = ({
  value,
  onChange
}: {
  value: '' | HousingType;
  onChange: (value: '' | HousingType) => void;
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      Housing type<span className="text-primary"> *</span>
    </span>
    <select
      value={value}
      onChange={event => onChange(event.target.value as '' | HousingType)}
      className="mt-2 w-full min-h-12 rounded-2xl bg-surface-container-lowest px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary/70 cursor-pointer"
    >
      {HOUSING_TYPE_OPTIONS.map(option => (
        <option key={option.value || 'blank'} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const ConsentField = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <CheckboxField
    label="Consent for newsletters and emergency outreach"
    checked={checked}
    onChange={onChange}
  />
);

const CheckboxField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="rounded-2xl bg-surface-container-low px-4 py-3 min-h-12 flex items-center justify-between gap-4 cursor-pointer">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="h-5 w-5 accent-primary cursor-pointer"
    />
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

function toForm(profile: MemberVerificationSelfProfile, contacts: MemberVerificationContacts): VerificationForm {
  const guardianOne = contacts.guardians.find(contact => contact.contact_order === 1);
  const guardianTwo = contacts.guardians.find(contact => contact.contact_order === 2);

  return {
    preferred_name: profile.preferred_name ?? '',
    personal_email: profile.personal_email ?? '',
    phone: profile.phone ?? '',
    graduation_year: profile.graduation_year ? String(profile.graduation_year) : '',
    expected_graduation_term: profile.expected_graduation_term ?? '',
    school: profile.school ?? profile.college ?? '',
    major: profile.major ?? '',
    housing_type: profile.housing_type ?? '',
    local_address: profile.local_address ?? '',
    campus_housing: profile.campus_housing ?? '',
    home_city: profile.home_city ?? '',
    home_state: profile.home_state ?? '',
    instagram: profile.instagram ?? '',
    snapchat: profile.snapchat ?? '',
    linkedin: profile.linkedin ?? '',
    tshirt_size: profile.tshirt_size ?? '',
    hoodie_size: profile.hoodie_size ?? '',
    guardian_1_id: guardianOne?.id ?? null,
    guardian_1_first_name: guardianOne?.first_name ?? firstNameFallback(guardianOne?.contact_name),
    guardian_1_last_name: guardianOne?.last_name ?? lastNameFallback(guardianOne?.contact_name),
    guardian_1_relationship: guardianOne?.relationship ?? '',
    guardian_1_phone: guardianOne?.phone ?? '',
    guardian_1_email: guardianOne?.email ?? '',
    guardian_1_outreach_consent: guardianOne?.outreach_consent ?? false,
    guardian_2_id: guardianTwo?.id ?? null,
    guardian_2_first_name: guardianTwo?.first_name ?? firstNameFallback(guardianTwo?.contact_name),
    guardian_2_last_name: guardianTwo?.last_name ?? lastNameFallback(guardianTwo?.contact_name),
    guardian_2_relationship: guardianTwo?.relationship ?? '',
    guardian_2_phone: guardianTwo?.phone ?? '',
    guardian_2_email: guardianTwo?.email ?? '',
    guardian_2_outreach_consent: guardianTwo?.outreach_consent ?? false,
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
    housing_type: form.housing_type || null,
    local_address: clean(form.local_address),
    campus_housing: clean(form.campus_housing),
    home_city: clean(form.home_city),
    home_state: clean(form.home_state),
    instagram: clean(form.instagram),
    snapchat: clean(form.snapchat),
    linkedin: clean(form.linkedin),
    tshirt_size: clean(form.tshirt_size),
    hoodie_size: clean(form.hoodie_size),
    parent_outreach_consent: hasParentOutreachConsent(form)
  };
}

function computeMissingRequiredFields(form: VerificationForm): VerificationRequiredField[] {
  const missing: VerificationRequiredField[] = [];

  for (const field of Object.keys(REQUIRED_FIELD_LABELS) as VerificationRequiredField[]) {
    if (field === 'local_address' || field === 'campus_housing') continue;
    const value = form[field as keyof VerificationForm];
    if (typeof value === 'string' && value.trim() === '') {
      missing.push(field);
    }
  }

  if (form.housing_type === 'on_campus' && form.campus_housing.trim() === '') {
    missing.push('campus_housing');
  }

  if (form.housing_type === 'off_campus' && form.local_address.trim() === '') {
    missing.push('local_address');
  }

  if (form.housing_type === 'chapter_housing' && form.campus_housing.trim() === '') {
    missing.push('campus_housing');
  }

  if (form.graduation_year && Number.isNaN(Number(form.graduation_year))) {
    missing.push('graduation_year');
  }

  return [...new Set(missing)];
}

function getRequiredFieldLabel(field: VerificationRequiredField, form: VerificationForm) {
  if (field === 'campus_housing' && form.housing_type === 'chapter_housing') return 'Room number';
  if (field === 'campus_housing' && form.housing_type === 'on_campus') return 'Dorm / building name';
  if (field === 'local_address' && form.housing_type === 'off_campus') return 'Local street address';
  return REQUIRED_FIELD_LABELS[field];
}

function getActiveRequiredFields(form: VerificationForm, baseFields: VerificationRequiredField[]) {
  const fields: VerificationRequiredField[] = baseFields.filter(field => field !== 'local_address' && field !== 'campus_housing');

  if (form.housing_type === 'on_campus') {
    fields.push('campus_housing');
  }

  if (form.housing_type === 'off_campus') {
    fields.push('local_address');
  }

  if (form.housing_type === 'chapter_housing') {
    fields.push('campus_housing');
  }

  return [...new Set(fields)];
}

function computeOptionalReviewFlags(form: VerificationForm): VerificationOptionalReviewField[] {
  return [
    !hasParentOutreachConsent(form) ? 'parent_outreach_consent' : null
  ].filter(Boolean) as VerificationOptionalReviewField[];
}

function getChangedFields(profile: MemberVerificationSelfProfile, form: VerificationForm) {
  const initial = toForm(profile, emptyVerificationContacts());
  return (Object.keys(form) as Array<keyof VerificationForm>).filter(key => key !== 'correction_notes' && form[key] !== initial[key]);
}

function getConfirmedFields(form: VerificationForm) {
  return (Object.keys(form) as Array<keyof VerificationForm>)
    .filter(key => key !== 'correction_notes' && form[key] !== false && form[key] !== null && String(form[key]).trim() !== '')
    .map(String);
}

function buildSnapshot(form: VerificationForm, profile: MemberVerificationSelfProfile) {
  return {
    member_id: profile.id,
    legal_name: `${profile.legal_first_name} ${profile.legal_last_name}`,
    google_email: profile.google_email,
    ...toProfileUpdate(form),
    parent_guardian_contacts: toGuardianContactInputs(form),
    optional_status: {
      has_parent_guardian_contact: hasParentGuardianContact(form),
      parent_outreach_consent: hasParentOutreachConsent(form)
    }
  };
}

function toGuardianContactInputs(form: VerificationForm) {
  return [
    {
      id: form.guardian_1_id,
      contactOrder: 1 as const,
      firstName: form.guardian_1_first_name,
      lastName: form.guardian_1_last_name,
      relationship: form.guardian_1_relationship,
      phone: form.guardian_1_phone,
      email: form.guardian_1_email,
      outreachConsent: form.guardian_1_outreach_consent
    },
    {
      id: form.guardian_2_id,
      contactOrder: 2 as const,
      firstName: form.guardian_2_first_name,
      lastName: form.guardian_2_last_name,
      relationship: form.guardian_2_relationship,
      phone: form.guardian_2_phone,
      email: form.guardian_2_email,
      outreachConsent: form.guardian_2_outreach_consent
    }
  ];
}

function hasParentGuardianContact(form: VerificationForm) {
  return [
    form.guardian_1_first_name,
    form.guardian_1_last_name,
    form.guardian_1_phone,
    form.guardian_1_email,
    form.guardian_2_first_name,
    form.guardian_2_last_name,
    form.guardian_2_phone,
    form.guardian_2_email
  ].some(value => value.trim().length > 0);
}

function hasParentOutreachConsent(form: VerificationForm) {
  return form.guardian_1_outreach_consent || form.guardian_2_outreach_consent;
}

function emptyVerificationContacts(): MemberVerificationContacts {
  return {
    guardians: []
  };
}

function firstNameFallback(contactName?: string | null) {
  return contactName?.split(/\s+/)[0] ?? '';
}

function lastNameFallback(contactName?: string | null) {
  if (!contactName) return '';
  return contactName.split(/\s+/).slice(1).join(' ');
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
