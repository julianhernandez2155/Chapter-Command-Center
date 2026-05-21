import React from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  HelpCircle, 
  Search, 
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  User,
  School,
  Home
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const SecretaryHub = () => {
  return (
    <div className="max-w-[1400px] mx-auto space-y-12">
      {/* Hero Header Section */}
      <div className="flex justify-between items-end mb-16">
        <div>
          <h1 className="text-7xl font-black tracking-tighter text-on-surface leading-none mb-4 uppercase">Weekly Forms</h1>
          <p className="text-secondary font-black uppercase tracking-[0.3rem] text-sm">Spring 2026 — Week 8</p>
        </div>
        <button className="bg-primary-container text-on-primary-container px-10 py-5 rounded-full font-black text-sm tracking-widest uppercase flex items-center gap-3 active:scale-95 transition-transform shadow-2xl shadow-primary/20">
          <Layers size={20} />
          Assemble This Week's Form
        </button>
      </div>

      <div className="space-y-24">
        {/* Section 1: Incoming Sections */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Incoming Sections</h2>
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">3 Pending</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Chairman Submission Card */}
            <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] text-secondary uppercase tracking-[0.2rem] font-black mb-1">Brotherhood Chairman</p>
                    <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">Brotherhood Event Preferences</h3>
                  </div>
                  <HelpCircle className="text-on-surface-variant/40" size={20} />
                </div>
                <div className="space-y-6 mb-10">
                  <IncomingQuestion number={1} type="Short Answer" text="What venue do you prefer for the end-of-semester formal?" />
                  <IncomingQuestion number={2} type="Multiple Choice" text="Which date works best for the brotherhood retreat?" isAnonymous />
                </div>
              </div>
              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                  Reject
                </button>
                <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/30 text-green-500 text-center hover:bg-green-500/5 transition-colors">
                  Accept
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <IncomingPlaceholder icon={<School size={24} />} title="Study Hours Log" chair="Scholarship Chair" questions={4} />
            {/* Card 3 */}
            <IncomingPlaceholder icon={<Home size={24} />} title="Maintenance Request" chair="House Manager" questions={2} opacity="opacity-60" />
          </div>
        </section>

        {/* Section 2: Published Forms Table */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Published Forms</h2>
            <button className="flex items-center gap-2 text-on-surface-variant text-[10px] font-black uppercase tracking-widest hover:text-on-surface transition-colors">
              <Filter size={14} />
              Filter History
            </button>
          </div>
          <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-[0.2rem] font-black border-b border-white/5">
                  <th className="px-8 py-6">Week</th>
                  <th className="px-8 py-6">Form Name</th>
                  <th className="px-8 py-6">Sections</th>
                  <th className="px-8 py-6 w-1/4">Completion Rate</th>
                  <th className="px-8 py-6">Deadline</th>
                  <th className="px-8 py-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium divide-y divide-white/5">
                <PublishedFormRow 
                  week="Week 8" 
                  name="Standard Weekly Report" 
                  sections={5} 
                  completed={128} 
                  total={142} 
                  deadline="Mar 20, 8:00 PM" 
                  isLate 
                  status="Open" 
                />
                <PublishedFormRow 
                  week="Week 7" 
                  name="Standard Weekly Report" 
                  sections={4} 
                  completed={142} 
                  total={142} 
                  deadline="Mar 13, 8:00 PM" 
                  status="Complete" 
                />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

const IncomingQuestion = ({ number, type, text, isAnonymous }: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-widest font-black">
      <span>Question {number}</span>
      <span className="bg-surface-container-lowest px-2 py-0.5 rounded italic">{type}</span>
    </div>
    <p className="text-sm text-on-surface-variant font-bold leading-tight">{text}</p>
    {isAnonymous && (
      <div className="flex gap-2 items-center mt-2 text-[9px] text-secondary font-black uppercase tracking-widest">
        <Lock size={10} fill="currentColor" />
        <span>Anonymous</span>
      </div>
    )}
  </div>
);

const IncomingPlaceholder = ({ icon, title, chair, questions, opacity }: any) => (
  <div className={cn("bg-surface-container-low p-8 rounded-2xl border border-white/5 flex flex-col", opacity)}>
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-[10px] text-secondary uppercase tracking-[0.2rem] font-black mb-1">{chair}</p>
        <h3 className="text-xl font-black text-on-surface uppercase tracking-tight">{title}</h3>
      </div>
      <div className="text-on-surface-variant/40">{icon}</div>
    </div>
    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl min-h-[120px]">
      <p className="text-[10px] text-zinc-500 italic font-black uppercase tracking-widest">{questions} Questions Attached</p>
    </div>
    <div className="flex gap-4 mt-10">
      <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/30 text-primary">Reject</button>
      <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/30 text-green-500">Accept</button>
    </div>
  </div>
);

const PublishedFormRow = ({ week, name, sections, completed, total, deadline, isLate, status }: any) => (
  <tr className="hover:bg-surface-container-high transition-colors cursor-pointer group">
    <td className="px-8 py-6 text-secondary font-black">{week}</td>
    <td className="px-8 py-6 font-black text-on-surface uppercase tracking-tight">{name}</td>
    <td className="px-8 py-6 text-on-surface-variant font-bold text-xs uppercase tracking-widest">{sections} Sections</td>
    <td className="px-8 py-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
          <div 
            className={cn("h-full", status === 'Complete' ? "bg-green-500" : "bg-secondary")} 
            style={{ width: `${(completed / total) * 100}%` }} 
          />
        </div>
        <span className="text-[10px] font-black text-on-surface tracking-tighter">{completed}/{total}</span>
      </div>
    </td>
    <td className="px-8 py-6">
      <div className="flex flex-col">
        <span className="text-on-surface font-bold text-xs">{deadline.split(',')[0]}</span>
        <span className={cn("text-[9px] font-black uppercase tracking-tighter", isLate ? "text-primary" : "text-zinc-500")}>
          {deadline.split(',')[1]} {isLate && "(LATE)"}
        </span>
      </div>
    </td>
    <td className="px-8 py-6 text-right">
      <span className={cn(
        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
        status === 'Open' ? "bg-secondary/10 text-secondary border-secondary/20" : "bg-green-500/10 text-green-500 border-green-500/20"
      )}>
        {status}
      </span>
    </td>
  </tr>
);
