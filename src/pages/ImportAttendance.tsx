import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Search,
  ChevronRight,
  UserCheck,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MOCK_MEMBERS } from '@/src/constants';

export const ImportAttendance = () => {
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Data Protocol</span>
        <h1 className="text-5xl font-black tracking-tighter uppercase">Import Attendance</h1>
      </div>

      <div className="flex items-center gap-4 mb-12">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
              step === i ? "bg-primary text-white scale-110 shadow-lg" : 
              step > i ? "bg-green-500 text-white" : "bg-surface-container-high text-on-surface-variant/40"
            )}>
              {step > i ? <CheckCircle2 size={16} /> : i}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              step === i ? "text-on-surface" : "text-on-surface-variant/40"
            )}>
              {i === 1 ? "Upload CSV" : i === 2 ? "Review Matches" : "Finalize"}
            </span>
            {i < 3 && <div className="w-12 h-px bg-white/5" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); setStep(2); }}
              className={cn(
                "dashed-border h-96 flex flex-col items-center justify-center gap-6 transition-all cursor-pointer",
                isDragging ? "bg-primary/5 border-primary/40 scale-[0.99]" : "bg-surface-container-low/30 hover:bg-surface-container-low/50"
              )}
            >
              <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
                <Upload size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold tracking-tight">Drag and drop your attendance CSV</p>
                <p className="text-sm text-on-surface-variant/60">Ensure columns include 'Name' or 'Email' for matching.</p>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-surface-container-high rounded-full text-xs font-bold uppercase tracking-widest hover:bg-surface-bright transition-all"
              >
                Browse Files
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TipCard icon={<FileText size={18} />} title="CSV Format" description="Standard UTF-8 encoded CSV files only." />
              <TipCard icon={<Search size={18} />} title="Fuzzy Matching" description="Our system matches names automatically." />
              <TipCard icon={<AlertCircle size={18} />} title="Data Integrity" description="Duplicates are flagged for manual review." />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold">Review Matches <span className="text-on-surface-variant font-normal text-sm ml-2">(142 Records Found)</span></h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest rounded-full">138 Auto-Matched</span>
                  <span className="px-3 py-1 bg-secondary/10 text-secondary text-[9px] font-black uppercase tracking-widest rounded-full">4 Needs Review</span>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {[1, 2].map(i => (
                  <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-secondary/5">
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">CSV Record</span>
                        <p className="text-sm font-bold">J. Sterling</p>
                      </div>
                      <ArrowRight className="text-on-surface-variant/20" size={16} />
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Suggested Match</span>
                          <div className="flex items-center gap-3">
                            <img src={MOCK_MEMBERS[0].avatar} className="w-8 h-8 rounded-full" alt="Match" />
                            <p className="text-sm font-bold">Julian Sterling</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-[8px] font-black rounded-full">92% Match</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-surface-container-high rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-surface-bright">Change</button>
                      <button className="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Confirm</button>
                    </div>
                  </div>
                ))}

                {[1, 2, 3].map(i => (
                  <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">CSV Record</span>
                        <p className="text-sm font-bold">Elias Wood</p>
                      </div>
                      <ArrowRight className="text-on-surface-variant/20" size={16} />
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Matched Member</span>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-container-high" />
                            <p className="text-sm font-bold">Elias Wood</p>
                          </div>
                        </div>
                        <CheckCircle2 className="text-green-500" size={16} />
                      </div>
                    </div>
                    <button className="p-2 text-on-surface-variant/20 hover:text-on-surface transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep(1)} className="text-on-surface-variant font-bold text-xs uppercase tracking-widest hover:text-on-surface">Back to Upload</button>
              <button onClick={() => setStep(3)} className="px-12 py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20">Finalize Import</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center space-y-8 py-12"
          >
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)]">
              <UserCheck className="text-white" size={64} />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tighter uppercase">Import Successful</h2>
              <p className="text-on-surface-variant font-medium max-w-md mx-auto">142 attendance records have been successfully merged into the <span className="text-on-surface">Spring Chapter Meeting</span> event.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-8 py-4 bg-surface-container-low rounded-full font-bold uppercase tracking-widest text-xs border border-white/5 hover:bg-surface-container-high transition-all">Import Another</button>
              <button className="px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">View Event Report</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TipCard = ({ icon, title, description }: any) => (
  <div className="bg-surface-container-low/50 p-6 rounded-2xl border border-white/5 space-y-3">
    <div className="text-primary">{icon}</div>
    <h4 className="font-bold text-sm uppercase tracking-tight">{title}</h4>
    <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>
  </div>
);
