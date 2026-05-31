import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Info, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const SignIn: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href
        }
      });
      if (oAuthError) throw oAuthError;
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google authentication');
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[radial-gradient(circle_at_center,_#1c1b1b_0%,_#131313_100%)] relative overflow-hidden font-sans">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center text-center space-y-8 z-10"
      >
        <div className="relative">
          <div className="relative w-28 h-28 flex items-center justify-center bg-surface-container-low border border-border/40 rounded-3xl shadow-2xl backdrop-blur-md">
            <Shield className="text-primary w-12 h-12 fill-current" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-[10px] font-bold tracking-[0.4em] text-on-surface-variant/80 uppercase">
            CHAPTER COMMAND CENTER
          </h1>
          <p className="text-3xl font-black tracking-tight text-on-surface">
            Syracuse University
          </p>
        </div>

        {error && (
          <div className="w-full p-4 bg-error/10 border border-error/20 rounded-2xl text-left text-sm text-error flex items-start gap-2.5">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="w-full space-y-4">
          {/* Google Sign In */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface h-16 rounded-full transition-all duration-300 group active:scale-98 border border-outline-variant shadow-lg cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            <span className="text-base font-semibold tracking-tight">Sign in with Google</span>
          </button>

          {/* Credentials toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-xs text-text-muted hover:text-text hover:underline transition-colors flex items-center gap-1.5 font-mono cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {showCredentials ? 'Hide credentials form' : 'Sign in with credentials'}
            </button>
          </div>

          <AnimatePresence>
            {showCredentials && (
              <motion.form
                onSubmit={handleCredentialsSubmit}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden w-full text-left space-y-4 pt-2"
              >
                <div className="space-y-3 p-5 rounded-3xl bg-surface-container-low border border-border/40 backdrop-blur-md">
                  <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-text-muted mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Officer Secure Access
                  </h3>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@g.syr.edu"
                        className="w-full pl-12 pr-5 h-12 bg-surface-container-high border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-text transition-colors"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-5 h-12 bg-surface-container-high border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-text transition-colors"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/95 text-on-primary font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>{loading ? 'Verifying...' : 'Authorize Session'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-lowest/50 rounded-2xl border border-outline-variant/60 backdrop-blur-sm">
            <Info className="text-secondary w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-semibold text-on-surface-variant">
              Authorized <span className="text-secondary">@g.syr.edu</span> accounts only
            </p>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant/40 italic">
          The Modern Legacy — Establishing authority through digital excellence.
        </p>
      </motion.div>

      <footer className="absolute bottom-0 w-full py-10 px-8 flex flex-col md:flex-row items-center justify-between text-[10px] tracking-[0.15rem] text-on-surface-variant/50 uppercase font-bold">
        <div className="mb-4 md:mb-0">
          © 2026 Chapter Command Center
        </div>
        <div className="flex gap-8">
          <a className="hover:text-primary transition-colors" href="#">Privacy Protocol</a>
          <a className="hover:text-primary transition-colors" href="#">Internal Directives</a>
          <a className="hover:text-primary transition-colors" href="#">Support</a>
        </div>
      </footer>
    </main>
  );
};
