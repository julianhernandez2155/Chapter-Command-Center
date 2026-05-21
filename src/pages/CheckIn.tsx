import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Camera, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  Maximize2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';

export const CheckIn = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'late' | 'closed'>('idle');
  const navigate = useNavigate();

  const simulateScan = () => {
    setStatus('scanning');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  if (status === 'success') return <CheckInSuccess onReset={() => setStatus('idle')} />;
  if (status === 'late') return <CheckInStatus type="late" onReset={() => setStatus('idle')} />;
  if (status === 'closed') return <CheckInStatus type="closed" onReset={() => setStatus('idle')} />;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="text-primary" size={32} />
          </div>
          <h1 className="text-xs font-bold tracking-[0.4em] text-on-surface-variant uppercase">Chapter Command</h1>
          <p className="text-3xl font-black tracking-tighter uppercase">QR Check-In</p>
        </div>

        <div className="relative aspect-square w-full max-w-[320px] mx-auto">
          <div className="absolute inset-0 border-2 border-primary/20 rounded-3xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            {status === 'scanning' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <motion.div 
                  animate={{ y: [0, 240, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(196,30,58,0.8)] z-10"
                />
                <div className="w-full h-full bg-surface-container-high rounded-2xl overflow-hidden relative">
                  <img 
                    src="https://picsum.photos/seed/scan/400/400" 
                    className="w-full h-full object-cover opacity-40 grayscale" 
                    alt="Camera Feed"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Scanning Protocol...</p>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={simulateScan}
                className="w-full h-full bg-surface-container-low rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 group hover:bg-surface-container-high transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="text-primary" size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest mb-1">Initialize Scanner</p>
                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-tighter">Access Camera for Check-In</p>
                </div>
              </button>
            )}
          </div>

          {/* Corner accents */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-secondary">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Current Event</p>
              <p className="text-sm font-bold">Spring Chapter Meeting</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Back to Command Center
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckInSuccess = ({ onReset }: { onReset: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md space-y-12">
        <div className="relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="w-32 h-32 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)]"
          >
            <CheckCircle2 className="text-white" size={64} />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-4 -right-4 bg-secondary text-surface px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            ON TIME
          </motion.div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tighter uppercase">Check-In Confirmed</h2>
          <p className="text-on-surface-variant font-medium leading-relaxed">Your attendance has been logged for the <span className="text-on-surface">Spring Chapter Meeting</span>. You are clear for entry.</p>
        </div>

        <div className="bg-surface-container-low p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Member</span>
            <span className="text-sm font-bold">Julian Sterling</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Timestamp</span>
            <span className="text-sm font-bold">19:04:22 EST</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Location</span>
            <span className="text-sm font-bold">Union Building 402</span>
          </div>
        </div>

        <button 
          onClick={onReset}
          className="w-full py-5 bg-surface-container-high text-on-surface rounded-full font-black uppercase tracking-widest text-sm hover:bg-surface-bright transition-all"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
};

const CheckInStatus = ({ type, onReset }: { type: 'late' | 'closed', onReset: () => void }) => {
  const isLate = type === 'late';
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md space-y-12">
        <div className={cn(
          "w-32 h-32 rounded-full mx-auto flex items-center justify-center shadow-2xl",
          isLate ? "bg-secondary shadow-secondary/20" : "bg-red-600 shadow-red-600/20"
        )}>
          {isLate ? <Clock className="text-surface" size={64} /> : <XCircle className="text-white" size={64} />}
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tighter uppercase">
            {isLate ? "Check-In Late" : "Check-In Closed"}
          </h2>
          <p className="text-on-surface-variant font-medium leading-relaxed">
            {isLate 
              ? "Your attendance has been logged as late. Please see the Secretary after the meeting." 
              : "Check-in for this event is now closed. You must submit a formal excuse form."}
          </p>
        </div>

        <button 
          onClick={onReset}
          className="w-full py-5 bg-surface-container-high text-on-surface rounded-full font-black uppercase tracking-widest text-sm hover:bg-surface-bright transition-all"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
};
