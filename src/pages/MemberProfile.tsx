import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Home,
  IdCard,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  UsersRound
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { AddressInput } from '../components/AddressInput';
import { supabase } from '../lib/supabase';
import {
  GuardianContactInput,
  HousingType,
  MemberVerificationContacts,
  MemberVerificationSelfProfile,
  fetchMyVerificationContacts,
  fetchMyVerificationSelfProfile,
  saveMyVerificationContacts,
  updateMyVerificationProfile
} from '../lib/memberVerification';
import { NormalizationError } from '../lib/normalizers';
import {
  APPAREL_SIZE_OPTIONS,
  GRADUATION_TERM_OPTIONS,
  GUARDIAN_RELATIONSHIP_OPTIONS,
  HOUSING_TYPE_OPTIONS,
  US_STATE_OPTIONS
} from '../lib/profileOptions';

type ProfileTab = 'identity' | 'contact' | 'housing' | 'academic' | 'family' | 'social';

type ProfileForm = {
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
  avatar_url: string;
  bio: string;
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
};

type ProfileFieldErrors = Partial<Record<keyof ProfileForm, string>>;
type AvatarCropDraft = {
  file: File;
  url: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const TABS: Array<{ id: ProfileTab; label: string; icon: React.ReactNode }> = [
  { id: 'identity', label: 'Identity', icon: <IdCard size={15} /> },
  { id: 'contact', label: 'Contact', icon: <Phone size={15} /> },
  { id: 'housing', label: 'Housing', icon: <Home size={15} /> },
  { id: 'academic', label: 'Academic', icon: <BookOpen size={15} /> },
  { id: 'family', label: 'Family', icon: <UsersRound size={15} /> },
  { id: 'social', label: 'Social', icon: <Sparkles size={15} /> }
];

const HOUSING_OPTIONS: Array<{ value: '' | HousingType; label: string }> = [
  { value: '', label: 'Select housing type' },
  ...HOUSING_TYPE_OPTIONS.map(option => ({ value: option.value, label: option.label }))
];

const AVATAR_CROP_FRAME_SIZE = 320;

export const MemberProfile = () => {
  const { member, positions, roles, refreshProfile, verificationStatus } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<MemberVerificationSelfProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarCrop, setAvatarCrop] = useState<AvatarCropDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const selfProfile = await fetchMyVerificationSelfProfile();
        const contacts = selfProfile ? await fetchMyVerificationContacts(selfProfile.id) : emptyContacts();

        if (!isMounted) return;
        setProfile(selfProfile);
        setForm(selfProfile ? toForm(selfProfile, contacts) : null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Unable to load member profile:', err);
        setError('Profile could not load. Refresh and try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarCrop?.url) {
        URL.revokeObjectURL(avatarCrop.url);
      }
    };
  }, [avatarCrop?.url]);

  const missingFields = useMemo(() => form ? getMissingFields(form) : [], [form]);
  const readinessTotal = useMemo(() => form ? getRequiredFields(form).length : 0, [form]);
  const readinessComplete = Math.max(readinessTotal - missingFields.length, 0);
  const displayName = member
    ? `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`
    : 'Member Profile';
  const initials = member
    ? `${(member.preferred_name || member.legal_first_name).charAt(0)}${member.legal_last_name.charAt(0)}`.toUpperCase()
    : 'CC';
  const primaryRole = positions[0]?.display_name ?? formatRole(roles[0]) ?? 'Member';
  const hasActiveGate = Boolean(verificationStatus?.is_gate_required && !verificationStatus.is_complete);

  const updateForm = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm(current => current ? { ...current, [key]: value } : current);
    setFieldErrors(current => ({ ...current, [key]: undefined }));
    setError(null);
  };

  const saveProfile = async () => {
    if (!profile || !form) return;

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      await updateMyVerificationProfile(profile.id, toProfileUpdate(form));
      await saveMyVerificationContacts(profile.id, toGuardianInputs(form));
      await refreshProfile();
      const freshProfile = await fetchMyVerificationSelfProfile();
      const freshContacts = freshProfile ? await fetchMyVerificationContacts(freshProfile.id) : emptyContacts();
      setProfile(freshProfile);
      setForm(freshProfile ? toForm(freshProfile, freshContacts) : form);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      console.error('Unable to save profile:', err);
      if (err instanceof NormalizationError) {
        setFieldErrors({ [err.field]: err.message } as ProfileFieldErrors);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Unable to save profile changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  const openAvatarCropper = (file: File) => {
    if (!profile || !form) return;

    if (!file.type.startsWith('image/')) {
      setError('Upload an image file for your profile photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photos must be under 5 MB.');
      return;
    }

    setError(null);
    setAvatarCrop(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return {
        file,
        url: URL.createObjectURL(file),
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      };
    });
  };

  const cancelAvatarCrop = () => {
    setAvatarCrop(current => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const uploadCroppedAvatar = async () => {
    if (!avatarCrop) return;

    setUploading(true);
    setError(null);

    try {
      const blob = await cropImageToSquareBlob(avatarCrop.url, {
        zoom: avatarCrop.zoom,
        offsetX: avatarCrop.offsetX,
        offsetY: avatarCrop.offsetY
      });
      await uploadAvatarBlob(blob);
      cancelAvatarCrop();
    } catch (err) {
      console.error('Unable to crop avatar:', err);
      setError(err instanceof Error ? err.message : 'Unable to crop profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    if (!profile || !form) return;

    setUploading(true);
    setError(null);

    try {
      const path = `${profile.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('member-avatars')
        .upload(path, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('member-avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await updateMyVerificationProfile(profile.id, {
        avatar_url: publicUrl,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : null
      });
      await refreshProfile();
      setForm(current => current ? { ...current, avatar_url: publicUrl } : current);
      setProfile(current => current ? { ...current, avatar_url: publicUrl } : current);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      console.error('Unable to upload avatar:', err);
      setError(err instanceof Error ? err.message : 'Unable to upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] pb-20">
      <header className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28rem] text-secondary">
            <ShieldCheck size={16} />
            Member Record
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-on-surface md:text-6xl">My Profile</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-surface-container-low px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">
            {savedAt ? `Saved ${formatTime(savedAt)}` : `Updated ${member?.updated_at ? formatDate(member.updated_at) : 'after save'}`}
          </span>
          <button
            onClick={() => void saveProfile()}
            disabled={saving || loading || !form}
            className="min-h-12 rounded-full bg-primary px-6 text-xs font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </span>
          </button>
        </div>
      </header>

      {error && (
        <section className="mb-8 flex gap-3 rounded-[1.5rem] bg-error/10 p-5 text-sm font-bold text-error">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </section>
      )}

      {loading && (
        <section className="rounded-[2rem] bg-surface-container-low p-10">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <Loader2 className="animate-spin text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.2rem]">Loading profile workspace</span>
          </div>
        </section>
      )}

      {!loading && form && profile && (
        <section className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <aside className="h-fit rounded-[2rem] bg-surface-container-low p-6 xl:sticky xl:top-24">
            <div className="relative mx-auto h-52 w-52">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover shadow-2xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container-high text-5xl font-black text-secondary shadow-2xl">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-transform hover:scale-105 disabled:opacity-60"
                aria-label="Upload profile photo"
                title="Upload profile photo"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) openAvatarCropper(file);
                }}
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-secondary">{primaryRole}</p>
              <h2 className="mt-3 text-4xl font-black leading-none tracking-tight text-on-surface">{displayName}</h2>
              <p className="mt-3 text-sm font-bold text-on-surface-variant">
                {profile.google_email}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <StatusPill>{profile.status.replace('_', ' ')}</StatusPill>
              {profile.graduation_year && <StatusPill>{profile.graduation_year}</StatusPill>}
              {hasActiveGate && <StatusPill tone="primary">Verify due</StatusPill>}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-container-high text-xs font-black uppercase tracking-[0.16rem] text-on-surface transition-colors hover:bg-surface-bright"
            >
              <Upload size={16} />
              Swap Photo
            </button>
          </aside>

          <div className="min-w-0 rounded-[2rem] bg-surface-container-low p-4 md:p-6">
            <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar rounded-full bg-surface-container-lowest p-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.14rem] transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] bg-surface p-5 md:p-7">
              {activeTab === 'identity' && (
                <ProfileSection eyebrow="Identity" title="How the chapter sees you">
                  <ReadonlyField label="Legal name" value={`${profile.legal_first_name} ${profile.legal_last_name}`} />
                  <ReadonlyField label="SUID" value={profile.suid} />
                  <ReadonlyField label="School email" value={profile.google_email} icon={<Mail size={15} />} />
                  <TextField label="Preferred name" value={form.preferred_name} error={fieldErrors.preferred_name} onChange={value => updateForm('preferred_name', value)} />
                  <TextAreaField label="Bio" value={form.bio} error={fieldErrors.bio} onChange={value => updateForm('bio', value)} />
                </ProfileSection>
              )}

              {activeTab === 'contact' && (
                <ProfileSection eyebrow="Contact" title="Reachable information">
                  <TextField required label="Personal email" value={form.personal_email} error={fieldErrors.personal_email} onChange={value => updateForm('personal_email', value)} />
                  <TextField required label="Phone" value={form.phone} error={fieldErrors.phone} onChange={value => updateForm('phone', value)} />
                  <TextField required label="Home city" value={form.home_city} error={fieldErrors.home_city} onChange={value => updateForm('home_city', value)} />
                  <SelectField required label="Home state" value={form.home_state} error={fieldErrors.home_state} options={[{ value: '', label: 'Select state' }, ...US_STATE_OPTIONS]} onChange={value => updateForm('home_state', value)} />
                </ProfileSection>
              )}

              {activeTab === 'housing' && (
                <ProfileSection eyebrow="Housing" title="Current local address">
                  <SelectField required label="Housing type" value={form.housing_type} error={fieldErrors.housing_type} options={HOUSING_OPTIONS} onChange={value => updateForm('housing_type', value as '' | HousingType)} />
                  {form.housing_type === 'on_campus' && (
                    <AddressInput required label="Dorm / building name" value={form.campus_housing} mode="campus" error={fieldErrors.campus_housing} onChange={value => updateForm('campus_housing', value)} />
                  )}
                  {form.housing_type === 'off_campus' && (
                    <>
                      <AddressInput required label="Local street address" value={form.local_address} mode="street" error={fieldErrors.local_address} onChange={value => updateForm('local_address', value)} />
                      <AddressInput label="Apartment / building name" value={form.campus_housing} mode="campus" error={fieldErrors.campus_housing} onChange={value => updateForm('campus_housing', value)} />
                    </>
                  )}
                  {form.housing_type === 'chapter_housing' && (
                    <AddressInput required label="Room number" value={form.campus_housing} mode="chapter_room" error={fieldErrors.campus_housing} onChange={value => updateForm('campus_housing', value)} />
                  )}
                </ProfileSection>
              )}

              {activeTab === 'academic' && (
                <ProfileSection eyebrow="Academic" title="School and apparel record">
                  <TextField required label="School" value={form.school} error={fieldErrors.school} onChange={value => updateForm('school', value)} />
                  <TextField required label="Major" value={form.major} error={fieldErrors.major} onChange={value => updateForm('major', value)} />
                  <TextField required label="Graduation year" value={form.graduation_year} inputMode="numeric" error={fieldErrors.graduation_year} onChange={value => updateForm('graduation_year', value)} />
                  <SelectField
                    required
                    label="Expected grad term"
                    value={form.expected_graduation_term.split(' ')[0]}
                    error={fieldErrors.expected_graduation_term}
                    options={[{ value: '', label: 'Select term' }, ...GRADUATION_TERM_OPTIONS.map(term => ({ value: term, label: term }))]}
                    onChange={value => updateForm('expected_graduation_term', value && form.graduation_year ? `${value} ${form.graduation_year}` : value)}
                  />
                  <StringSelectField required label="T-shirt size" value={form.tshirt_size} error={fieldErrors.tshirt_size} options={['', ...APPAREL_SIZE_OPTIONS]} onChange={value => updateForm('tshirt_size', value)} />
                  <StringSelectField required label="Hoodie size" value={form.hoodie_size} error={fieldErrors.hoodie_size} options={['', ...APPAREL_SIZE_OPTIONS]} onChange={value => updateForm('hoodie_size', value)} />
                </ProfileSection>
              )}

              {activeTab === 'family' && (
                <ProfileSection eyebrow="Family" title="Parent and guardian contacts">
                  <ContactGroup title="Parent / Guardian 1">
                    <TextField required label="First name" value={form.guardian_1_first_name} error={fieldErrors.guardian_1_first_name} onChange={value => updateForm('guardian_1_first_name', value)} />
                    <TextField required label="Last name" value={form.guardian_1_last_name} error={fieldErrors.guardian_1_last_name} onChange={value => updateForm('guardian_1_last_name', value)} />
                    <TextField required label="Phone" value={form.guardian_1_phone} error={fieldErrors.guardian_1_phone} onChange={value => updateForm('guardian_1_phone', value)} />
                    <TextField required label="Email" value={form.guardian_1_email} error={fieldErrors.guardian_1_email} onChange={value => updateForm('guardian_1_email', value)} />
                    <SelectField required label="Relationship" value={form.guardian_1_relationship} error={fieldErrors.guardian_1_relationship} options={[{ value: '', label: 'Select relationship' }, ...GUARDIAN_RELATIONSHIP_OPTIONS.map(option => ({ value: option, label: option }))]} onChange={value => updateForm('guardian_1_relationship', value)} />
                    <CheckboxField label="Outreach consent" checked={form.guardian_1_outreach_consent} onChange={value => updateForm('guardian_1_outreach_consent', value)} />
                  </ContactGroup>
                  <ContactGroup title="Parent / Guardian 2">
                    <TextField label="First name" value={form.guardian_2_first_name} error={fieldErrors.guardian_2_first_name} onChange={value => updateForm('guardian_2_first_name', value)} />
                    <TextField label="Last name" value={form.guardian_2_last_name} error={fieldErrors.guardian_2_last_name} onChange={value => updateForm('guardian_2_last_name', value)} />
                    <TextField label="Phone" value={form.guardian_2_phone} error={fieldErrors.guardian_2_phone} onChange={value => updateForm('guardian_2_phone', value)} />
                    <TextField label="Email" value={form.guardian_2_email} error={fieldErrors.guardian_2_email} onChange={value => updateForm('guardian_2_email', value)} />
                    <SelectField label="Relationship" value={form.guardian_2_relationship} error={fieldErrors.guardian_2_relationship} options={[{ value: '', label: 'Select relationship' }, ...GUARDIAN_RELATIONSHIP_OPTIONS.map(option => ({ value: option, label: option }))]} onChange={value => updateForm('guardian_2_relationship', value)} />
                    <CheckboxField label="Outreach consent" checked={form.guardian_2_outreach_consent} onChange={value => updateForm('guardian_2_outreach_consent', value)} />
                  </ContactGroup>
                </ProfileSection>
              )}

              {activeTab === 'social' && (
                <ProfileSection eyebrow="Social" title="Public directory links">
                  <TextField label="Instagram" value={form.instagram} error={fieldErrors.instagram} onChange={value => updateForm('instagram', value)} />
                  <TextField label="Snapchat" value={form.snapchat} error={fieldErrors.snapchat} onChange={value => updateForm('snapchat', value)} />
                  <TextField label="LinkedIn" value={form.linkedin} error={fieldErrors.linkedin} onChange={value => updateForm('linkedin', value)} />
                  <TextField label="Avatar URL" value={form.avatar_url} error={fieldErrors.avatar_url} onChange={value => updateForm('avatar_url', value)} />
                </ProfileSection>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] bg-surface-container-low p-6 xl:sticky xl:top-24">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Profile Readiness</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-black text-on-surface">{readinessComplete}</span>
              <span className="pb-2 text-sm font-black text-on-surface-variant">/ {readinessTotal}</span>
            </div>
            <div className="mt-6 space-y-2">
              {missingFields.length === 0 ? (
                <ReadinessRow label="Required fields complete" complete />
              ) : (
                missingFields.slice(0, 10).map(field => (
                  <React.Fragment key={field.key}>
                    <ReadinessRow label={field.label} onClick={() => setActiveTab(field.tab)} />
                  </React.Fragment>
                ))
              )}
            </div>
            <div className="mt-8 rounded-[1.5rem] bg-surface-container-lowest p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Last verified</p>
              <p className="mt-2 text-sm font-black text-on-surface">{member?.updated_at ? formatDate(member.updated_at) : 'Not recorded'}</p>
            </div>
            <button
              onClick={() => void saveProfile()}
              disabled={saving}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </aside>
        </section>
      )}

      {avatarCrop && (
        <AvatarCropModal
          draft={avatarCrop}
          saving={uploading}
          onChange={setAvatarCrop}
          onCancel={cancelAvatarCrop}
          onSave={() => void uploadCroppedAvatar()}
        />
      )}
    </div>
  );
};

const ProfileSection = ({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section>
    <p className="text-[10px] font-black uppercase tracking-[0.24rem] text-secondary">{eyebrow}</p>
    <h2 className="mt-2 text-3xl font-black tracking-tight text-on-surface">{title}</h2>
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  </section>
);

const TextField = ({
  label,
  value,
  onChange,
  required,
  inputMode,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: string;
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      {label}{required && <span className="text-primary"> *</span>}
    </span>
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      inputMode={inputMode}
      className="mt-2 min-h-12 w-full rounded-2xl bg-surface-container-lowest px-4 py-3 font-bold text-on-surface outline-none transition-shadow focus:ring-2 focus:ring-primary/70"
    />
    {error && <span className="mt-1 block text-xs font-bold text-error">{error}</span>}
  </label>
);

const TextAreaField = ({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => (
  <label className="block md:col-span-2">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      rows={5}
      className="mt-2 w-full resize-none rounded-2xl bg-surface-container-lowest px-4 py-3 font-bold leading-7 text-on-surface outline-none transition-shadow focus:ring-2 focus:ring-primary/70"
    />
    {error && <span className="mt-1 block text-xs font-bold text-error">{error}</span>}
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
  required,
  error
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      {label}{required && <span className="text-primary"> *</span>}
    </span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="mt-2 min-h-12 w-full cursor-pointer rounded-2xl bg-surface-container-lowest px-4 py-3 font-bold text-on-surface outline-none transition-shadow focus:ring-2 focus:ring-primary/70"
    >
      {options.map(option => (
        <option key={option.value || 'blank'} value={option.value}>{option.label}</option>
      ))}
    </select>
    {error && <span className="mt-1 block text-xs font-bold text-error">{error}</span>}
  </label>
);

const StringSelectField = ({
  label,
  value,
  options,
  onChange,
  required,
  error
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) => (
  <SelectField
    label={label}
    value={value}
    options={options.map(option => ({ value: option, label: option || 'Select' }))}
    onChange={onChange}
    required={required}
    error={error}
  />
);

const ReadonlyField = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => (
  <div className="min-h-12 rounded-2xl bg-surface-container-lowest px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <div className="mt-1 flex items-center gap-2 font-black text-on-surface">
      {icon && <span className="text-primary">{icon}</span>}
      {value || 'Missing'}
    </div>
  </div>
);

const ContactGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] bg-surface-container-low p-4 md:col-span-2 md:grid-cols-2">
    <h3 className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface md:col-span-2">{title}</h3>
    {children}
  </div>
);

const CheckboxField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest px-4 py-3">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="h-5 w-5 cursor-pointer accent-primary"
    />
  </label>
);

const StatusPill = ({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'primary' }) => (
  <span className={cn(
    'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14rem]',
    tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
  )}>
    {children}
  </span>
);

const ReadinessRow = ({ label, complete, onClick }: { label: string; complete?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-xs font-black transition-colors',
      complete ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
    )}
  >
    <span>{label}</span>
    {complete ? <CheckCircle2 size={15} /> : <ChevronRight size={15} />}
  </button>
);

const AvatarCropModal = ({
  draft,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: AvatarCropDraft;
  saving: boolean;
  onChange: React.Dispatch<React.SetStateAction<AvatarCropDraft | null>>;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const imageLayout = useMemo(() => {
    if (!naturalSize) {
      return { width: AVATAR_CROP_FRAME_SIZE, height: AVATAR_CROP_FRAME_SIZE };
    }

    const baseScale = Math.max(
      AVATAR_CROP_FRAME_SIZE / naturalSize.width,
      AVATAR_CROP_FRAME_SIZE / naturalSize.height
    );

    return {
      width: naturalSize.width * baseScale * draft.zoom,
      height: naturalSize.height * baseScale * draft.zoom
    };
  }, [draft.zoom, naturalSize]);

  const clampCropOffset = (offsetX: number, offsetY: number, zoom = draft.zoom) => {
    if (!naturalSize) return { offsetX, offsetY };

    const baseScale = Math.max(
      AVATAR_CROP_FRAME_SIZE / naturalSize.width,
      AVATAR_CROP_FRAME_SIZE / naturalSize.height
    );
    const width = naturalSize.width * baseScale * zoom;
    const height = naturalSize.height * baseScale * zoom;
    const maxX = Math.max(0, (width - AVATAR_CROP_FRAME_SIZE) / 2);
    const maxY = Math.max(0, (height - AVATAR_CROP_FRAME_SIZE) / 2);

    return {
      offsetX: clamp(offsetX, -maxX, maxX),
      offsetY: clamp(offsetY, -maxY, maxY)
    };
  };

  const updateCrop = (patch: Partial<Pick<AvatarCropDraft, 'zoom' | 'offsetX' | 'offsetY'>>) => {
    onChange(current => {
      if (!current) return current;

      const next = { ...current, ...patch };
      const clamped = clampCropOffset(next.offsetX, next.offsetY, next.zoom);
      return { ...next, ...clamped };
    });
  };

  useEffect(() => {
    if (!naturalSize) return;

    onChange(current => {
      if (!current) return current;
      const clamped = clampCropOffset(current.offsetX, current.offsetY, current.zoom);
      if (clamped.offsetX === current.offsetX && clamped.offsetY === current.offsetY) return current;
      return { ...current, ...clamped };
    });
    // The clamp depends on naturalSize and zoom changes; onChange is stable from React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.zoom, naturalSize]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: draft.offsetX,
      originY: draft.offsetY
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    const clamped = clampCropOffset(nextX, nextY);
    updateCrop(clamped);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextZoom = clamp(draft.zoom + (event.deltaY > 0 ? -0.06 : 0.06), 1, 3);
    updateCrop({ zoom: nextZoom });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl rounded-[2rem] bg-surface-container-lowest p-6 shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.24rem] text-secondary">Profile Photo</p>
          <h2 className="text-3xl font-black tracking-tight text-on-surface">Frame your photo</h2>
        </div>

        <div className="mt-7 grid gap-7 md:grid-cols-[360px_minmax(0,1fr)] md:items-center">
          <div
            className={cn(
              'relative mx-auto h-80 w-80 touch-none overflow-hidden rounded-[1.5rem] bg-surface-container-high shadow-2xl outline-none ring-1 ring-white/10',
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
            aria-label="Drag photo to position it inside the square crop frame"
            role="application"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onWheel={handleWheel}
          >
            <img
              src={draft.url}
              alt="Profile crop preview"
              draggable={false}
              onLoad={event => {
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight
                });
              }}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                height: `${imageLayout.height}px`,
                left: `${(AVATAR_CROP_FRAME_SIZE - imageLayout.width) / 2 + draft.offsetX}px`,
                top: `${(AVATAR_CROP_FRAME_SIZE - imageLayout.height) / 2 + draft.offsetY}px`,
                width: `${imageLayout.width}px`
              }}
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.92),0_0_0_999px_rgba(0,0,0,0.22)]" />
            <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-secondary" />
            <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-secondary" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-secondary" />
            <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-secondary" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/15" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/15" />
          </div>

          <div className="space-y-5">
            <CropSlider
              label="Zoom"
              min={1}
              max={3}
              step={0.01}
              value={draft.zoom}
              onChange={value => updateCrop({ zoom: value })}
            />
            <button
              type="button"
              onClick={() => updateCrop({ zoom: 1, offsetX: 0, offsetY: 0 })}
              className="min-h-11 rounded-full bg-surface-container-high px-5 text-xs font-black uppercase tracking-[0.16rem] text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Reset Frame
            </button>
            <p className="text-sm font-semibold leading-6 text-on-surface-variant">
              Drag the image inside the square. Use zoom or your trackpad wheel to tighten the frame before uploading.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="min-h-12 rounded-full bg-surface-container-high px-5 text-xs font-black uppercase tracking-[0.16rem] text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="min-h-12 rounded-full bg-primary px-6 text-xs font-black uppercase tracking-[0.16rem] text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Save Photo
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

const CropSlider = ({
  label,
  min,
  max,
  step,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label className="block">
    <span className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">
      {label}
      <span>{label === 'Zoom' ? value.toFixed(2) : value}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="w-full accent-primary"
    />
  </label>
);

function toForm(profile: MemberVerificationSelfProfile, contacts: MemberVerificationContacts): ProfileForm {
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
    avatar_url: profile.avatar_url ?? '',
    bio: profile.bio ?? '',
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
    guardian_2_outreach_consent: guardianTwo?.outreach_consent ?? false
  };
}

function toProfileUpdate(form: ProfileForm) {
  return {
    preferred_name: clean(form.preferred_name),
    personal_email: clean(form.personal_email),
    phone: clean(form.phone),
    graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
    expected_graduation_term: clean(form.expected_graduation_term),
    school: clean(form.school),
    major: clean(form.major),
    housing_type: clean(form.housing_type) as HousingType | null,
    local_address: clean(form.local_address),
    campus_housing: clean(form.campus_housing),
    home_city: clean(form.home_city),
    home_state: clean(form.home_state),
    instagram: clean(form.instagram),
    snapchat: clean(form.snapchat),
    linkedin: clean(form.linkedin),
    avatar_url: clean(form.avatar_url),
    bio: clean(form.bio),
    tshirt_size: clean(form.tshirt_size),
    hoodie_size: clean(form.hoodie_size),
    parent_outreach_consent: form.guardian_1_outreach_consent || form.guardian_2_outreach_consent
  };
}

function toGuardianInputs(form: ProfileForm): GuardianContactInput[] {
  return [
    {
      id: form.guardian_1_id,
      contactOrder: 1,
      firstName: form.guardian_1_first_name,
      lastName: form.guardian_1_last_name,
      relationship: form.guardian_1_relationship,
      phone: form.guardian_1_phone,
      email: form.guardian_1_email,
      outreachConsent: form.guardian_1_outreach_consent
    },
    {
      id: form.guardian_2_id,
      contactOrder: 2,
      firstName: form.guardian_2_first_name,
      lastName: form.guardian_2_last_name,
      relationship: form.guardian_2_relationship,
      phone: form.guardian_2_phone,
      email: form.guardian_2_email,
      outreachConsent: form.guardian_2_outreach_consent
    }
  ];
}

function getRequiredFields(form: ProfileForm) {
  const fields = [
    { key: 'personal_email', label: 'Personal email', tab: 'contact' as ProfileTab },
    { key: 'phone', label: 'Phone', tab: 'contact' as ProfileTab },
    { key: 'home_city', label: 'Home city', tab: 'contact' as ProfileTab },
    { key: 'home_state', label: 'Home state', tab: 'contact' as ProfileTab },
    { key: 'school', label: 'School', tab: 'academic' as ProfileTab },
    { key: 'major', label: 'Major', tab: 'academic' as ProfileTab },
    { key: 'graduation_year', label: 'Graduation year', tab: 'academic' as ProfileTab },
    { key: 'expected_graduation_term', label: 'Expected grad term', tab: 'academic' as ProfileTab },
    { key: 'housing_type', label: 'Housing type', tab: 'housing' as ProfileTab },
    { key: 'tshirt_size', label: 'T-shirt size', tab: 'academic' as ProfileTab },
    { key: 'hoodie_size', label: 'Hoodie size', tab: 'academic' as ProfileTab },
    { key: 'guardian_1_first_name', label: 'Guardian first name', tab: 'family' as ProfileTab },
    { key: 'guardian_1_last_name', label: 'Guardian last name', tab: 'family' as ProfileTab },
    { key: 'guardian_1_relationship', label: 'Guardian relationship', tab: 'family' as ProfileTab },
    { key: 'guardian_1_phone', label: 'Guardian phone', tab: 'family' as ProfileTab },
    { key: 'guardian_1_email', label: 'Guardian email', tab: 'family' as ProfileTab }
  ];

  if (form.housing_type === 'off_campus') {
    fields.push({ key: 'local_address', label: 'Local address', tab: 'housing' });
  }

  if (form.housing_type === 'on_campus' || form.housing_type === 'chapter_housing') {
    fields.push({ key: 'campus_housing', label: form.housing_type === 'chapter_housing' ? 'Room number' : 'Dorm / building', tab: 'housing' });
  }

  return fields;
}

function getMissingFields(form: ProfileForm) {
  return getRequiredFields(form).filter(field => {
    const value = form[field.key as keyof ProfileForm];
    return typeof value === 'string' ? value.trim().length === 0 : !value;
  });
}

function emptyContacts(): MemberVerificationContacts {
  return { guardians: [] };
}

function firstNameFallback(name?: string | null) {
  if (!name) return '';
  return name.trim().split(/\s+/)[0] ?? '';
}

function lastNameFallback(name?: string | null) {
  if (!name) return '';
  return name.trim().split(/\s+/).slice(1).join(' ');
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cropImageToSquareBlob(
  url: string,
  crop: { zoom: number; offsetX: number; offsetY: number },
  size = 900
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Image crop could not start.'));
        return;
      }

      const previewToOutputScale = size / AVATAR_CROP_FRAME_SIZE;
      const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const scale = baseScale * crop.zoom;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (size - drawWidth) / 2 + crop.offsetX * previewToOutputScale;
      const drawY = (size - drawHeight) / 2 + crop.offsetY * previewToOutputScale;

      context.fillStyle = '#131313';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Image crop failed.'));
          return;
        }

        resolve(blob);
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => reject(new Error('Image could not be loaded for cropping.'));
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatRole(role?: string | null) {
  if (!role) return null;
  return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
