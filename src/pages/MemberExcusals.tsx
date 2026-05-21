import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Info, 
  X, 
  Send, 
  Upload, 
  ChevronRight,
  Shield,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const MemberExcusals = () => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Hero Header Section */}
      <section className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-7xl font-black tracking-tighter uppercase leading-none text-white mb-4">Excusals</h2>
          <p className="text-lg text-slate-400 font-medium max-w-xl leading-relaxed">
            Track your absence requests for mandatory events. Maintain your standing through proactive communication.
          </p>
        </div>
        <button 
          onClick={() => setIsRequestModalOpen(true)}
          className="bg-primary text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={20} />
          New Request
        </button>
      </section>

      {/* Status Summary Bar */}
      <section className="flex flex-wrap gap-4 mb-20">
        <StatusBadge color="bg-secondary" label="2 Pending" />
        <StatusBadge color="bg-green-500" label="1 Approved" />
        <StatusBadge color="bg-primary" label="1 Denied" />
      </section>

      {/* Event List */}
      <section className="space-y-12">
        <ExcusalCard 
          month="OCT" 
          day="14" 
          title="Formal Chapter Meeting" 
          location="Main Hall • 7:00 PM" 
          status="Approved" 
        />
        <ExcusalCard 
          month="OCT" 
          day="22" 
          title="Philanthropy Gala Prep" 
          location="Commons • 5:30 PM" 
          status="Pending" 
        />
        <ExcusalCard 
          month="OCT" 
          day="07" 
          title="Ritual Workshop" 
          location="Inner Sanctuary • 8:00 PM" 
          status="Denied" 
          note="The reason provided (study group) does not meet the threshold for a mandatory Ritual Workshop. Attendance is required for all active members not currently in exams."
        />
        <ExcusalCard 
          month="OCT" 
          day="30" 
          title="Homecoming Cleanup" 
          location="Chapter Grounds • 9:00 AM" 
          status="No Request" 
          isActionable
        />
      </section>

      {/* Footer Deadline Note */}
      <footer className="mt-24 pb-12">
        <div className="flex items-start max-w-lg bg-surface-container-low p-6 rounded-2xl border border-white/5">
          <Info className="text-slate-600 mr-4 mt-0.5 shrink-0" size={20} />
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Reminder: All excusal requests must be submitted through the portal no later than <span className="text-slate-300 font-bold">Monday at 9:00 PM</span> for events occuring that same week. Late submissions will automatically be marked as ineligible.
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {isRequestModalOpen && (
          <SubmitExcusalModal onClose={() => setIsRequestModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusBadge = ({ color, label }: any) => (
  <div className="flex items-center bg-surface-container-low px-6 py-3 rounded-full border border-white/5">
    <span className={cn("w-2 h-2 rounded-full mr-3", color)}></span>
    <span className="font-black tracking-widest uppercase text-[10px] text-slate-300">{label}</span>
  </div>
);

const ExcusalCard = ({ month, day, title, location, status, note, isActionable }: any) => (
  <div className="flex flex-col bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:bg-surface-container-high">
    <div className="flex items-center p-8">
      <div className="flex flex-col items-center justify-center min-w-[80px] mr-12 text-center">
        <span className="font-black text-[10px] tracking-[0.2rem] uppercase text-secondary mb-1">{month}</span>
        <span className="text-5xl font-black text-white tracking-tighter">{day}</span>
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{title}</h3>
        <p className="text-slate-500 font-black text-[10px] tracking-widest uppercase">{location}</p>
      </div>
      <div className="flex items-center space-x-8">
        <div className={cn(
          "px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
          status === 'Approved' ? "bg-green-500/10 text-green-500 border-green-500/20" :
          status === 'Pending' ? "bg-secondary/10 text-secondary border-secondary/20" :
          status === 'Denied' ? "bg-primary/10 text-primary border-primary/20" :
          "border-dashed border-slate-600 text-slate-500"
        )}>
          {status}
        </div>
        {isActionable && (
          <button className="bg-white text-black px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all">Request Excusal</button>
        )}
      </div>
    </div>
    {note && (
      <div className="px-8 pb-8 pt-0 flex">
        <div className="w-20 mr-12"></div>
        <div className="flex-1 bg-primary/5 border-l-2 border-primary p-6 rounded-r-2xl">
          <p className="text-primary italic font-medium text-sm leading-relaxed">
            "{note}"
          </p>
          <p className="mt-3 font-black text-[9px] text-slate-500 uppercase tracking-[0.15em]">— Standards Board</p>
        </div>
      </div>
    )}
  </div>
);

const SubmitExcusalModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-full w-full max-w-xl bg-surface shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col border-l border-white/5"
      >
        <div className="p-10 pb-6">
          <div className="flex justify-between items-start mb-4">
            <span className="text-secondary font-black tracking-widest uppercase text-[10px]">Weekly Chapter Meeting · Oct 24</span>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <h2 className="text-[40px] font-black leading-tight text-white uppercase tracking-tighter">Request Excusal</h2>
        </div>

        <div className="px-10 mb-8">
          <div className="bg-secondary/10 border-l-4 border-secondary p-5 flex items-center gap-4 rounded-r-2xl">
            <AlertCircle className="text-secondary shrink-0" size={24} />
            <p className="text-secondary text-xs font-bold uppercase tracking-tight">Submit by Thursday 11:59 PM to ensure processing before the meeting.</p>
          </div>
        </div>

        <div className="flex-1 px-10 overflow-y-auto no-scrollbar space-y-10">
          <div className="space-y-3">
            <label className="tracking-widest uppercase text-[10px] text-slate-500 font-black px-2">Reason for Absence</label>
            <textarea 
              className="w-full bg-surface-container-lowest border-none rounded-2xl p-6 text-on-surface placeholder:text-zinc-800 focus:ring-1 focus:ring-primary/20 transition-all resize-none font-bold text-lg" 
              placeholder="Detail the primary reason for your request..." 
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <label className="tracking-widest uppercase text-[10px] text-slate-500 font-black px-2">Supporting Note (Optional)</label>
            <textarea 
              className="w-full bg-surface-container-lowest border-none rounded-2xl p-6 text-on-surface placeholder:text-zinc-800 focus:ring-1 focus:ring-primary/20 transition-all resize-none font-bold text-lg" 
              placeholder="Any additional context for the secretary..." 
              rows={2}
            />
          </div>

          <div className="group cursor-pointer flex items-center gap-4 p-6 rounded-2xl border border-white/5 bg-surface-container-low hover:bg-surface-container-high transition-colors">
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-tight">Attach Evidence</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Medical notes, flight tickets, or work schedules.</p>
            </div>
            <ChevronRight className="ml-auto text-slate-600 group-hover:text-white transition-colors" size={20} />
          </div>
        </div>

        <div className="p-10 mt-auto border-t border-white/5 bg-surface">
          <div className="flex items-center justify-between gap-6">
            <button onClick={onClose} className="text-slate-400 hover:text-white font-black tracking-widest uppercase text-xs py-4 px-6 transition-colors">
              Cancel
            </button>
            <button className="flex-1 bg-primary-container hover:brightness-110 text-on-primary-container py-5 rounded-full font-black text-sm uppercase tracking-[0.2rem] shadow-2xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              Submit Request
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
