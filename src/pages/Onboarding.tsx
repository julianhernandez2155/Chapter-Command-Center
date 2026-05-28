import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ChevronRight, ArrowLeft, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { NormalizationError } from '../lib/normalizers';
import { saveOnboardingProfile } from '../lib/onboarding';
import { APPAREL_SIZE_OPTIONS, GUARDIAN_RELATIONSHIP_OPTIONS, getGraduationYearOptions } from '../lib/profileOptions';

type OnboardingFormData = {
  firstName: string;
  lastName: string;
  preferredName: string;
  suid: string;
  gradYear: string;
  school: string;
  major: string;
  dorm: string;
  room: string;
  tshirtSize: string;
  instagram: string;
  snapchat: string;
  linkedin: string;
  venmo: string;
  primaryContactName: string;
  primaryContactRelation: string;
  primaryContactPhone: string;
  parentConsent: boolean;
};

type OnboardingFieldErrors = Partial<Record<keyof OnboardingFormData, string>>;

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<OnboardingFieldErrors>({});

  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: '',
    lastName: '',
    preferredName: '',
    suid: '',
    gradYear: '2027',
    school: '',
    major: '',
    dorm: '',
    room: '',
    tshirtSize: 'M',
    instagram: '',
    snapchat: '',
    linkedin: '',
    venmo: '',
    primaryContactName: '',
    primaryContactRelation: 'Guardian',
    primaryContactPhone: '',
    parentConsent: false
  });

  const nextStep = () => {
    // Basic field validation per step
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First Name and Last Name are required.');
        return;
      }
      if (!formData.suid.trim() || !/^\d{9}$/.test(formData.suid.trim())) {
        setError('SUID must be exactly 9 digits.');
        setFieldErrors({ suid: 'SUID must be exactly 9 digits.' });
        return;
      }
      if (!formData.school.trim() || !formData.major.trim()) {
        setError('Academic School and Major are required.');
        return;
      }
    }
    if (step === 3) {
      if (!formData.primaryContactName.trim() || !formData.primaryContactPhone.trim()) {
        setError('Primary Emergency Contact Name and Phone are required.');
        return;
      }
    }

    setError(null);
    setFieldErrors({});
    setStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleOnboardingSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      setFieldErrors({});
      await saveOnboardingProfile(user, formData);
      await refreshProfile();
      onComplete();
    } catch (err: any) {
      console.error('Error during onboarding submission:', err);
      if (err instanceof NormalizationError) {
        setFieldErrors({ [err.field]: err.message } as OnboardingFieldErrors);
        setError(err.message);
      } else {
        setError(err?.message || 'Failed to complete onboarding ritual. Please check your inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 font-sans">
      <header className="fixed top-0 w-full z-50 bg-surface flex items-center justify-between px-6 h-16 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Shield className="text-primary w-5 h-5 fill-current" />
          <span className="tracking-widest uppercase text-sm font-bold text-primary">CHAPTER COMMAND</span>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <span className="text-[10px] font-bold tracking-[0.1rem] uppercase text-on-surface-variant/50">STEP 0{step} / 04</span>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface mb-2 uppercase leading-none">
                {step === 1 && <>Personal<br/>Profile</>}
                {step === 2 && <>Logistics<br/>& Socials</>}
                {step === 3 && <>Emergency<br/>Contacts</>}
                {step === 4 && <>Review<br/>& Certify</>}
              </h1>
              <p className="text-on-surface-variant font-medium opacity-70">
                {step === 1 && "Begin your legacy. Establish your standing."}
                {step === 2 && "Step 2 of 4 — Finalizing your membership profile."}
                {step === 3 && "Securing your safety within the brotherhood."}
                {step === 4 && "Final Ritual — 98% Complete"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-secondary font-bold tracking-widest text-xs uppercase block mb-1">Ritual Progress</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn(
                    "h-1 w-8 rounded-full transition-colors duration-500",
                    i <= step ? "bg-secondary" : "bg-surface-container-high"
                  )} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-2xl text-sm text-error flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && <Step1 formData={formData} setFormData={setFormData} fieldErrors={fieldErrors} />}
            {step === 2 && <Step2 formData={formData} setFormData={setFormData} fieldErrors={fieldErrors} />}
            {step === 3 && <Step3 formData={formData} setFormData={setFormData} fieldErrors={fieldErrors} />}
            {step === 4 && (
              <Step4 
                formData={formData} 
                onSubmit={handleOnboardingSubmit} 
                submitting={submitting} 
              />
            )}
          </motion.div>
        </AnimatePresence>

        {step < 4 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-white/5 mt-12">
            <button 
              onClick={prevStep}
              className={cn(
                "flex items-center gap-2 text-on-surface-variant/50 font-bold tracking-widest text-xs uppercase hover:text-on-surface transition-colors cursor-pointer",
                step === 1 && "invisible"
              )}
            >
              <ArrowLeft size={14} />
              Previous Step
            </button>
            <button 
              onClick={nextStep}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/95 text-white px-12 py-5 rounded-full font-black tracking-widest uppercase text-sm shadow-xl active:scale-95 transition-transform cursor-pointer"
            >
              Next: {step === 1 ? "Logistics" : step === 2 ? "Contacts" : "Review"}
            </button>
          </div>
        )}
      </main>

      <footer className="py-12 px-6 opacity-30 text-center">
        <p className="text-[10px] font-bold tracking-[0.2rem] uppercase">Ritual Integrity • Legacy Systems • MCMXIX</p>
      </footer>
    </div>
  );
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs font-bold text-error ml-4">{message}</p> : null;

const Step1 = ({ formData, setFormData, fieldErrors }: any) => (
  <div className="space-y-12">
    <section>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-secondary font-black text-2xl opacity-20 font-mono">01</span>
        <h2 className="text-xl font-bold tracking-tight uppercase border-l-2 border-primary pl-4">Identification</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Legal First Name</label>
          <input 
            className="w-full sunken-input" 
            placeholder="e.g. Alexander" 
            value={formData.firstName}
            onChange={e => setFormData({...formData, firstName: e.target.value})}
          />
          <FieldError message={fieldErrors.firstName} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Legal Last Name</label>
          <input 
            className="w-full sunken-input" 
            placeholder="e.g. Hamilton" 
            value={formData.lastName}
            onChange={e => setFormData({...formData, lastName: e.target.value})}
          />
          <FieldError message={fieldErrors.lastName} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Preferred Name / Alias</label>
          <input 
            className="w-full sunken-input" 
            placeholder="What should we call you?" 
            value={formData.preferredName}
            onChange={e => setFormData({...formData, preferredName: e.target.value})}
          />
        </div>
      </div>
    </section>

    <section>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-secondary font-black text-2xl opacity-20 font-mono">02</span>
        <h2 className="text-xl font-bold tracking-tight uppercase border-l-2 border-primary pl-4">Academic Standing</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">SUID (9-Digit)</label>
          <input 
            className="w-full sunken-input font-mono tracking-widest" 
            maxLength={9}
            inputMode="numeric"
            placeholder="000000000"
            value={formData.suid}
            onChange={e => setFormData({...formData, suid: e.target.value})}
          />
          <FieldError message={fieldErrors.suid} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Graduation Year</label>
          <select 
            className="w-full sunken-input appearance-none cursor-pointer"
            value={formData.gradYear}
            onChange={e => setFormData({...formData, gradYear: e.target.value})}
          >
            {getGraduationYearOptions(2024, 9).map(year => (
              <option key={year}>{year}</option>
            ))}
          </select>
          <FieldError message={fieldErrors.gradYear} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">School / College</label>
          <input
            className="w-full sunken-input"
            placeholder="e.g. Whitman School of Management"
            value={formData.school}
            onChange={e => setFormData({...formData, school: e.target.value})}
          />
          <FieldError message={fieldErrors.school} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Academic Major</label>
          <input 
            className="w-full sunken-input" 
            placeholder="e.g. Political Science" 
            value={formData.major}
            onChange={e => setFormData({...formData, major: e.target.value})}
          />
          <FieldError message={fieldErrors.major} />
        </div>
      </div>
    </section>
  </div>
);

const Step2 = ({ formData, setFormData, fieldErrors }: any) => (
  <div className="space-y-16">
    <section>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-secondary font-black text-2xl opacity-20 font-mono">01</span>
        <h2 className="text-xl font-bold tracking-tight uppercase border-l-2 border-primary pl-4">Logistics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Dorm Building</label>
          <select 
            className="w-full sunken-input appearance-none cursor-pointer"
            value={formData.dorm}
            onChange={e => setFormData({...formData, dorm: e.target.value})}
          >
            <option value="" disabled>Select Building</option>
            <option>Founders Hall</option>
            <option>Legacy Towers</option>
            <option>North Quad</option>
            <option>West Wing Residence</option>
            <option>Lawrinson Hall</option>
            <option>Day Hall</option>
            <option>Flint Hall</option>
            <option>Sadler Hall</option>
            <option>Ernie Davis Hall</option>
            <option>Off Campus</option>
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Room Number / Address</label>
          <input 
            className="w-full sunken-input" 
            placeholder="e.g. 402B" 
            value={formData.room}
            onChange={e => setFormData({...formData, room: e.target.value})}
          />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">T-Shirt Size</label>
          <div className="grid grid-cols-6 gap-2 bg-surface-container-lowest p-1.5 rounded-lg h-14">
            {APPAREL_SIZE_OPTIONS.map(size => (
              <button 
                key={size}
                type="button"
                onClick={() => setFormData({...formData, tshirtSize: size})}
                className={cn(
                  "flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer",
                  formData.tshirtSize === size 
                    ? "bg-primary text-white shadow-lg animate-pulse-subtle" 
                    : "hover:bg-surface-container-high text-on-surface-variant"
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <FieldError message={fieldErrors.tshirtSize} />
        </div>
      </div>
    </section>

    <section>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-secondary font-black text-2xl opacity-20 font-mono">02</span>
        <h2 className="text-xl font-bold tracking-tight uppercase border-l-2 border-primary pl-4">Social Presence</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-4 text-primary font-bold">@</span>
            <input 
              className="w-full sunken-input pl-10" 
              placeholder="handle" 
              value={formData.instagram}
              onChange={e => setFormData({...formData, instagram: e.target.value})}
            />
            <FieldError message={fieldErrors.instagram} />
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Snapchat</label>
          <input 
            className="w-full sunken-input" 
            placeholder="username" 
            value={formData.snapchat}
            onChange={e => setFormData({...formData, snapchat: e.target.value})}
          />
          <FieldError message={fieldErrors.snapchat} />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">LinkedIn URL</label>
          <input 
            className="w-full sunken-input" 
            placeholder="linkedin.com/in/yourname" 
            value={formData.linkedin}
            onChange={e => setFormData({...formData, linkedin: e.target.value})}
          />
          <FieldError message={fieldErrors.linkedin} />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Venmo Handle</label>
          <div className="relative">
            <span className="absolute left-4 top-4 text-primary font-bold">@</span>
            <input 
              className="w-full sunken-input pl-10" 
              placeholder="venmo_id" 
              value={formData.venmo}
              onChange={e => setFormData({...formData, venmo: e.target.value})}
            />
          </div>
        </div>
      </div>
    </section>
  </div>
);

const Step3 = ({ formData, setFormData, fieldErrors }: any) => (
  <div className="space-y-12">
    <section>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-secondary font-black text-2xl opacity-20 font-mono">01</span>
        <h2 className="text-xl font-bold tracking-tight uppercase border-l-2 border-primary pl-4">Primary Contact</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Full Name</label>
          <input 
            className="w-full sunken-input" 
            placeholder="Legal Name" 
            value={formData.primaryContactName}
            onChange={e => setFormData({...formData, primaryContactName: e.target.value})}
          />
          <FieldError message={fieldErrors.primaryContactName} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Relationship</label>
          <select 
            className="w-full sunken-input"
            value={formData.primaryContactRelation}
            onChange={e => setFormData({...formData, primaryContactRelation: e.target.value})}
          >
            {GUARDIAN_RELATIONSHIP_OPTIONS.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <FieldError message={fieldErrors.primaryContactRelation} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold uppercase text-on-surface-variant/50 ml-4">Phone Number</label>
          <input 
            className="w-full sunken-input" 
            placeholder="+1 (555) 000-0000" 
            value={formData.primaryContactPhone}
            onChange={e => setFormData({...formData, primaryContactPhone: e.target.value})}
          />
          <FieldError message={fieldErrors.primaryContactPhone} />
        </div>
      </div>
    </section>

    <section className="bg-surface-container-low p-8 rounded-lg border border-white/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-secondary mb-2 uppercase tracking-tight">Parent Outreach Consent</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed opacity-80">Do you grant the Chapter Executives permission to include your parents/guardians in legacy communications, newsletters, and formal invitations?</p>
        </div>
        <div className="flex bg-surface-container-lowest p-1 rounded-full w-fit">
          <button 
            onClick={() => setFormData({...formData, parentConsent: true})}
            className={cn(
              "px-8 py-2 rounded-full font-bold text-xs tracking-widest uppercase transition-all cursor-pointer",
              formData.parentConsent ? "bg-primary text-white" : "text-on-surface-variant/50 hover:text-on-surface"
            )}
          >YES</button>
          <button 
            onClick={() => setFormData({...formData, parentConsent: false})}
            className={cn(
              "px-8 py-2 rounded-full font-bold text-xs tracking-widest uppercase transition-all cursor-pointer",
              !formData.parentConsent ? "bg-primary text-white" : "text-on-surface-variant/50 hover:text-on-surface"
            )}
          >NO</button>
        </div>
      </div>
    </section>
  </div>
);

const Step4 = ({ formData, onSubmit, submitting }: { formData: any; onSubmit: () => void; submitting: boolean }) => (
  <div className="flex flex-col gap-12">
    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
      <div className="h-full bg-primary w-[98%] rounded-full shadow-[0_0_15px_rgba(196,30,58,0.4)]"></div>
    </div>

    <div className="flex flex-col gap-12">
      <ReviewSection number="01" title="PERSONAL PROFILE">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 p-8 bg-surface-container-low rounded-lg border border-outline-variant">
          <ReviewItem label="Full Legal Name" value={`${formData.firstName} ${formData.lastName}`} />
          <ReviewItem label="Student Identifier (SUID)" value={formData.suid} />
          <ReviewItem label="School / College" value={formData.school} />
          <ReviewItem label="Academic Major" value={formData.major} />
          <ReviewItem label="Graduation Year" value={`Class of ${formData.gradYear}`} />
        </div>
      </ReviewSection>

      <ReviewSection number="02" title="LOGISTICS">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-8 bg-surface-container-low rounded-lg border border-outline-variant">
          <ReviewItem label="Residential Dorm" value={formData.dorm} />
          <ReviewItem label="Room / Address" value={formData.room} />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant/40 editorial-spacing">T-Shirt Size</label>
            <span className="w-fit px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-black uppercase tracking-tighter">
              {formData.tshirtSize}
            </span>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection number="03" title="SOCIAL PRESENCE">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <SocialCard label="Instagram" value={formData.instagram} />
          <SocialCard label="Snapchat" value={formData.snapchat} />
          <SocialCard label="LinkedIn" value={formData.linkedin} />
          <SocialCard label="Venmo" value={formData.venmo} highlight />
        </div>
      </ReviewSection>
    </div>

    <div className="mt-8 flex flex-col items-center gap-6">
      <button 
        onClick={onSubmit}
        disabled={submitting}
        className="w-full py-6 bg-primary hover:brightness-110 text-white text-xl font-black uppercase tracking-[0.3rem] rounded-full shadow-[0_24px_48px_rgba(196,30,58,0.3)] active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            Certifying Ritual Data...
          </>
        ) : (
          'CERTIFY & SUBMIT'
        )}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-on-surface-variant max-w-md opacity-60">
        By submitting, I certify that all information is accurate and I agree to the Chapter's Data Privacy Protocol. I understand this information is held with the highest level of fraternity confidentiality.
      </p>
    </div>
  </div>
);

const ReviewSection = ({ number, title, children }: any) => (
  <section className="flex flex-col md:flex-row gap-8 items-start">
    <div className="w-12 h-12 flex-shrink-0 bg-surface-container-high rounded-full flex items-center justify-center border border-outline-variant">
      <span className="text-lg font-black text-secondary font-mono">{number}</span>
    </div>
    <div className="flex-grow">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.2rem] text-on-surface-variant mb-6 editorial-spacing">{title}</h3>
      {children}
    </div>
  </section>
);

const ReviewItem = ({ label, value }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase text-on-surface-variant/40 editorial-spacing">{label}</label>
    <p className="text-xl font-medium">{value || '—'}</p>
  </div>
);

const SocialCard = ({ label, value, highlight }: any) => (
  <div className="flex flex-col gap-3 p-6 bg-surface-container-lowest rounded-lg border border-outline-variant">
    <label className="text-[9px] font-bold uppercase text-on-surface-variant/40 tracking-widest">{label}</label>
    <p className={cn("text-sm font-semibold truncate", highlight && "text-secondary")}>{value || '—'}</p>
  </div>
);
