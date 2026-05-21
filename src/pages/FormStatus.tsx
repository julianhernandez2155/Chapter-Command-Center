import React from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const FormStatus = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <header className="mb-16">
        <p className="text-primary font-bold tracking-[0.2em] uppercase mb-4 text-xs">Chairman Section Submission</p>
        <h1 className="text-6xl font-black tracking-tighter text-on-surface uppercase leading-none">Weekly Form — Week 9</h1>
      </header>

      {/* Submission Grid */}
      <div className="space-y-12">
        {/* Pending Card */}
        <section className="bg-surface-container-low rounded-lg p-10 transition-all duration-300 hover:bg-surface-container border border-white/5">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Brotherhood Event Preferences</h2>
              <p className="text-zinc-500 font-medium">Last modified 2h ago</p>
            </div>
            <span className="px-6 py-2 bg-secondary/20 text-secondary rounded-full text-xs font-bold uppercase tracking-widest">Pending</span>
          </div>
          <div className="bg-surface-container-lowest rounded-md p-8 mb-8">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Current Draft</p>
            <p className="text-xl font-medium text-on-surface-variant italic leading-relaxed">
              "1. What venue do you prefer for the end-of-semester formal? (Short Answer, Anonymous)"
            </p>
          </div>
          <div className="flex gap-4">
            <button className="px-8 py-3 bg-primary text-white rounded-full font-bold text-sm tracking-wide hover:scale-105 transition-transform">
              Edit Submission
            </button>
            <button className="px-8 py-3 bg-surface-container-high text-on-surface rounded-full font-bold text-sm tracking-wide hover:bg-surface-bright transition-colors">
              Withdraw
            </button>
          </div>
        </section>

        <button className="w-full py-6 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center gap-2 text-primary font-bold hover:bg-primary/5 hover:border-primary transition-all group">
          <PlusCircle size={20} />
          <span>Add Another Section</span>
        </button>

        {/* Rejected Card */}
        <section className="bg-surface-container-low rounded-lg p-10 transition-all duration-300 hover:bg-surface-container border-l-8 border-primary border-y border-r border-white/5">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Chapter Recruitment Strategy</h2>
              <p className="text-zinc-500 font-medium">Action required</p>
            </div>
            <span className="px-6 py-2 bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-widest">Rejected</span>
          </div>
          <div className="bg-surface-container-lowest rounded-md p-8 mb-8">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Action required</p>
            <p className="text-xl font-medium text-on-surface-variant italic leading-relaxed opacity-50">
              "1. List three potential values-based qualities you seek in new associates? (Long Answer)"
            </p>
          </div>
          {/* Secretary Note Block */}
          <div className="bg-primary/10 rounded-md p-8 border-l-4 border-primary flex gap-6 items-start">
            <MessageSquare className="text-primary" size={32} />
            <div>
              <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">Secretary's Note</p>
              <p className="text-lg font-medium text-white leading-relaxed">
                Please consolidate these into a single multiple-choice question for brevity. We need to ensure the response rate remains high for this specific section.
              </p>
            </div>
          </div>
          <div className="mt-10 flex gap-4">
            <button className="px-8 py-3 bg-primary text-white rounded-full font-bold text-sm tracking-wide hover:scale-105 transition-transform">
              Revise Now
            </button>
          </div>
        </section>
      </div>

      {/* Past Submissions Section */}
      <section className="mt-24 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tight text-on-surface uppercase italic">Past Submissions</h2>
          <div className="flex items-center gap-4 text-sm font-bold">
            <span className="text-zinc-500">Week 9 Form: <span className="text-white">92% Chapter Completion</span></span>
            <button className="text-secondary hover:underline flex items-center gap-1 uppercase tracking-widest text-xs">
              View Responses <ArrowRight size={14} />
            </button>
          </div>
        </div>
        
        <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5">
              <tr>
                <th className="px-8 py-6">Week</th>
                <th className="px-8 py-6">Section Title</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Form Completion</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium divide-y divide-white/5">
              <PastSubmissionRow week="Week 8" title="Chapter Scholarship Report" status="Accepted" completion="98%" />
              <PastSubmissionRow week="Week 7" title="Alumni Relations Update" status="Accepted" completion="95%" />
              <PastSubmissionRow week="Week 6" title="Budget Allocation Request" status="Rejected" completion="89%" />
              <PastSubmissionRow week="Week 5" title="Community Service Tracker" status="Accepted" completion="100%" />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const PastSubmissionRow = ({ week, title, status, completion }: any) => (
  <tr className="hover:bg-surface-container-high transition-colors group">
    <td className="px-8 py-6 text-zinc-400">{week}</td>
    <td className="px-8 py-6 text-white font-bold">{title}</td>
    <td className="px-8 py-6">
      <span className={cn(
        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
        status === 'Accepted' ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
      )}>
        {status}
      </span>
    </td>
    <td className="px-8 py-6 text-zinc-400">{completion}</td>
  </tr>
);
