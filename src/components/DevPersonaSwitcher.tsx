import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, ShieldAlert, Sparkles, LogIn, ChevronUp, ChevronDown } from 'lucide-react';

interface Persona {
  name: string;
  email: string;
  role: string;
  color: string;
}

const PERSONAS: Persona[] = [
  { name: 'Grant Harriot', email: 'president@g.syr.edu', role: 'President', color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-200' },
  { name: 'Max Pollack', email: 'secretary@g.syr.edu', role: 'Secretary', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-200' },
  { name: 'Ben Marvin', email: 'treasurer@g.syr.edu', role: 'Treasurer', color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-200' },
  { name: 'Jack Rugarber', email: 'saa@g.syr.edu', role: 'Sergeant-at-Arms', color: 'from-rose-500/20 to-rose-600/20 border-rose-500/30 text-rose-200' },
  { name: 'Michael Ricci', email: 'chairman@g.syr.edu', role: 'Recruitment Chair', color: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-200' },
  { name: 'Sami Mulani', email: 'scholarship@g.syr.edu', role: 'Scholarship Chair', color: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-200' },
  { name: 'Julian Hernandez', email: 'member@g.syr.edu', role: 'Standard Member', color: 'from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-200' }
];

export const DevPersonaSwitcher: React.FC = () => {
  const { user, member, roles, signIn, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activePersona = PERSONAS.find(persona => persona.email === user?.email);
  const activeRoleLabel = activePersona?.role ?? roles[0] ?? 'Member';

  // Fail-closed condition
  const isEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PERSONAS === 'true';
  if (!isEnabled) return null;

  const handleImpersonate = async (persona: Persona) => {
    setSwitching(true);
    setError(null);
    try {
      // 1. Sign out first
      await signOut();

      // 2. Sign in as persona using the seeded password
      const { error: signInErr } = await signIn(persona.email, 'Password123!');
      if (signInErr) {
        setError(`Failed to log in: ${signInErr.message}`);
      } else {
        setIsOpen(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to switch personas');
    } finally {
      setSwitching(false);
    }
  };

  const getActivePersonaColor = () => {
    if (!user) return 'border-border/30 text-text-muted bg-surface-nav/40';
    if (activePersona) return `border border-solid ${activePersona.color} bg-gradient-to-br`;
    return 'border-primary/20 text-primary bg-primary/10';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <div className="relative">
        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 backdrop-blur-md cursor-pointer select-none hover:scale-102 active:scale-98 ${getActivePersonaColor()}`}
          disabled={switching}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            {switching ? 'Switching...' : member ? `${member.preferred_name || member.legal_first_name} (${activeRoleLabel})` : 'Select Persona'}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {/* Impersonation Panel */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-surface border border-border/60 rounded-3xl p-5 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h3 className="text-sm font-bold tracking-tight text-text flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Dev Persona Swapper
              </h3>
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-semibold">
                Dev Mode
              </span>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-error/10 border border-error/20 rounded-xl text-xs text-error flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {PERSONAS.map(persona => {
                const isActive = user?.email === persona.email;
                return (
                  <button
                    key={persona.email}
                    onClick={() => handleImpersonate(persona)}
                    disabled={switching || isActive}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 group cursor-pointer ${
                      isActive
                        ? 'border-primary/40 bg-primary/5 cursor-default'
                        : 'border-border/30 hover:border-border/80 hover:bg-surface-nav/30'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-text'}`}>
                        {persona.name}
                      </p>
                      <p className="text-[10px] text-text-muted font-mono mt-0.5">{persona.email}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-mono text-primary font-bold uppercase">Active</span>
                    ) : (
                      <LogIn className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <p className="text-[10px] text-text-muted max-w-[150px]">
                Auth operations execute against hosted Supabase tables via credentials.
              </p>
              <button
                onClick={() => signOut()}
                className="text-[10px] font-mono text-error hover:underline cursor-pointer bg-transparent border-0 font-bold"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
