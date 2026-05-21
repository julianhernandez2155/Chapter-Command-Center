import React from 'react';
import { motion } from 'motion/react';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronUp, 
  Info,
  Send
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const ExcusalReview = () => {
  return (
    <div className="max-w-screen-2xl mx-auto space-y-12">
      {/* Amber Countdown Banner */}
      <div className="bg-secondary-container text-on-secondary-container px-8 py-5 rounded-2xl flex items-center justify-between shadow-2xl shadow-secondary/10 border border-secondary/20">
        <div className="flex items-center gap-4">
          <Timer size={24} fill="currentColor" />
          <p className="font-black uppercase tracking-widest text-sm">Ineligible List posts in 1d 14h 22m</p>
        </div>
        <button className="bg-on-secondary-container text-secondary-container px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2rem] transition-transform active:scale-95">
          Preview List
        </button>
      </div>

      {/* Page Header Section */}
      <section className="space-y-4">
        <h2 className="text-7xl font-black tracking-tighter uppercase leading-none text-on-surface">Excusal Requests</h2>
        <p className="text-on-surface-variant max-w-2xl text-lg font-medium leading-relaxed">
          Review absence requests before Monday 9:00 PM Ineligible List. Data is processed in real-time.
        </p>
      </section>

      {/* Pending Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(196,30,58,0.8)]"></span>
          <h3 className="tracking-[0.3rem] uppercase text-[10px] font-black text-primary">Pending Review (3)</h3>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Request Card 1 */}
          <div className="bg-surface-container-low p-10 rounded-2xl border border-white/5 flex flex-col gap-8 group transition-all duration-300 hover:bg-surface-container-high">
            <div className="flex items-start justify-between">
              <div className="flex gap-6">
                <img className="w-16 h-16 rounded-full object-cover border-2 border-white/10" src="https://picsum.photos/seed/member1/200/200" alt="Member" />
                <div>
                  <h4 className="text-2xl font-black tracking-tight uppercase">Julian Thorne</h4>
                  <p className="text-zinc-500 font-black text-[10px] tracking-[0.2rem] uppercase mt-1">Junior • Class of '25</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-secondary/20">Chapter Meeting</span>
                <p className="text-[9px] text-zinc-500 mt-3 tracking-widest uppercase font-bold">Dec 12, 7:00 PM</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-zinc-500 text-[9px] tracking-[0.3rem] uppercase font-black">Reason for Absence</p>
              <p className="text-on-surface text-lg leading-relaxed italic font-medium">
                "I have a mandatory biology lab final review session that was scheduled at the last minute by Professor Miller. Attendance is required for the curve. I can provide the syllabus screenshot if needed."
              </p>
            </div>
            <div className="flex gap-4 pt-8 border-t border-white/5">
              <button className="flex-1 bg-green-500/10 text-green-500 h-14 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 hover:bg-green-500/20 flex items-center justify-center gap-3 border border-green-500/20">
                <CheckCircle2 size={18} />
                Approve
              </button>
              <button className="flex-1 bg-primary/10 text-primary h-14 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 hover:bg-primary/20 flex items-center justify-center gap-3 border border-primary/20">
                <XCircle size={18} />
                Deny
              </button>
            </div>
          </div>

          {/* Request Card 2 (Deny state mock) */}
          <div className="bg-surface-container-low p-10 rounded-2xl border border-white/5 flex flex-col gap-8">
            <div className="flex items-start justify-between">
              <div className="flex gap-6">
                <img className="w-16 h-16 rounded-full object-cover border-2 border-white/10" src="https://picsum.photos/seed/member2/200/200" alt="Member" />
                <div>
                  <h4 className="text-2xl font-black tracking-tight uppercase">Marcus Vane</h4>
                  <p className="text-zinc-500 font-black text-[10px] tracking-[0.2rem] uppercase mt-1">Senior • Class of '24</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-secondary/20">Formal Dinner</span>
                <p className="text-[9px] text-zinc-500 mt-3 tracking-widest uppercase font-bold">Dec 14, 6:00 PM</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-zinc-500 text-[9px] tracking-[0.3rem] uppercase font-black">Reason for Absence</p>
              <p className="text-on-surface text-lg leading-relaxed italic font-medium">
                "Family vacation started early. We're heading to the mountains and my flight leaves Thursday afternoon."
              </p>
            </div>
            {/* Denial Input Logic Simulation */}
            <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-primary/20">
                <p className="text-[9px] tracking-[0.2rem] uppercase text-primary mb-3 font-black">Denial Reason (Required)</p>
                <textarea 
                  className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm p-0 placeholder:text-zinc-800 resize-none h-20 font-bold" 
                  placeholder="Explain why this request is being denied..."
                />
              </div>
              <div className="flex gap-4">
                <button className="flex-1 bg-primary text-white h-14 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                  Confirm Denial
                </button>
                <button className="px-8 text-zinc-500 font-black text-xs uppercase tracking-widest hover:text-on-surface transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviewed Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <span className="w-3 h-3 rounded-full bg-zinc-800"></span>
            <h3 className="tracking-[0.3rem] uppercase text-[10px] font-black text-zinc-500">Reviewed Requests (14)</h3>
          </div>
          <button className="text-zinc-500 hover:text-on-surface transition-colors flex items-center gap-2 font-black text-[10px] tracking-widest uppercase">
            Hide Details
            <ChevronUp size={14} />
          </button>
        </div>
        
        <div className="space-y-2">
          <ReviewedRow name="Elara Vance" event="Recruitment Workshop" status="Approved" reviewer="IVP Sterling" date="Dec 10 • 4:12 PM" />
          <ReviewedRow name="Leo Cassian" event="Philanthropy Night" status="Denied" reviewer="IVP Sterling" date="Dec 09 • 11:30 AM" />
          <ReviewedRow name="Silas Thorne" event="Chapter Meeting" status="Approved" reviewer="IVP Sterling" date="Dec 09 • 9:15 AM" />
        </div>
        
        <div className="flex justify-center pt-8">
          <button className="bg-surface-container-high px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2rem] hover:bg-zinc-800 transition-colors border border-white/5">
            Load Full History
          </button>
        </div>
      </section>
    </div>
  );
};

const ReviewedRow = ({ name, event, status, reviewer, date }: any) => (
  <div className="grid grid-cols-12 gap-4 items-center px-8 py-5 hover:bg-surface-container-low transition-colors rounded-2xl border border-transparent hover:border-white/5 group">
    <div className="col-span-3 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
        <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" src={`https://picsum.photos/seed/${name}/100/100`} alt={name} />
      </div>
      <span className="font-black text-sm uppercase tracking-tight">{name}</span>
    </div>
    <div className="col-span-2 text-[10px] font-black tracking-widest uppercase text-zinc-500">{event}</div>
    <div className="col-span-2">
      <span className={cn(
        "font-black text-[10px] tracking-widest uppercase flex items-center gap-2",
        status === 'Approved' ? "text-green-500" : "text-primary"
      )}>
        {status === 'Approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {status}
      </span>
    </div>
    <div className="col-span-3 text-[10px] font-black tracking-widest uppercase text-zinc-500">Reviewed by {reviewer}</div>
    <div className="col-span-2 text-right text-[10px] font-black tracking-widest uppercase text-zinc-800">{date}</div>
  </div>
);
