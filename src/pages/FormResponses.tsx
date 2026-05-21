import React from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Lock, 
  Search, 
  Star,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const FormResponses = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Hero Header Section */}
      <div className="mb-16">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-secondary font-black text-sm tracking-[0.2rem] uppercase mb-4 block">BROTHERHOOD CHAIRMAN</span>
            <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-4 uppercase">Weekly Form — Week 8 Responses</h2>
            <div className="flex items-center space-x-4">
              <span className="bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Collection Active</span>
              <span className="text-zinc-500 text-sm font-medium tracking-wide uppercase">87 responses total</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-6">
            <button className="bg-primary-container text-on-primary-container px-8 py-4 rounded-full font-black text-[10px] tracking-widest uppercase active:scale-95 transition-all shadow-lg shadow-primary-container/20">
              Export Responses
            </button>
            <div className="text-right">
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">Participation Status</p>
              <p className="text-4xl font-black text-white tracking-tighter">87 / 92 Responses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Responses Per-Question Layout */}
      <div className="grid grid-cols-1 gap-12 mb-16">
        {/* Question 1: Multiple Choice */}
        <div className="bg-surface-container-low rounded-2xl p-10 border border-white/5">
          <div className="flex justify-between items-start mb-10">
            <div className="max-w-2xl">
              <h3 className="text-zinc-500 text-[10px] font-black tracking-widest uppercase mb-2">Question 1 (Multiple Choice)</h3>
              <p className="text-3xl font-black text-on-surface leading-tight mb-6 uppercase tracking-tight">Which date works best for the brotherhood retreat?</p>
              {/* Leading Response Highlight */}
              <div className="flex items-center gap-4 bg-surface-container-highest/30 p-5 rounded-2xl border-l-4 border-secondary">
                <Star className="text-secondary" size={24} fill="currentColor" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Leading Preference (64%)</p>
                  <p className="text-xl font-black text-white uppercase tracking-tight">November 12-14</p>
                </div>
              </div>
            </div>
            <button className="text-secondary text-[10px] font-black uppercase tracking-widest hover:underline transition-all">View Full Breakdown</button>
          </div>
          
          <div className="space-y-2">
            <ResponseRow name="Jameson Avery" initial="JA" answer="Nov 12-14" active />
            <ResponseRow name="Elias Miller" initial="EM" answer="Nov 19-21" />
            <ResponseRow name="Trenton Brooks" initial="TB" answer="Nov 12-14" active />
            <ResponseRow name="Lucas Hayes" initial="LH" answer="Nov 12-14" active />
          </div>
          
          <div className="mt-8 flex justify-center">
            <button className="text-[10px] font-black text-zinc-600 hover:text-secondary tracking-[0.2rem] uppercase transition-colors">Expand 83 More Responses</button>
          </div>
        </div>

        {/* Question 2: Anonymous */}
        <div className="bg-surface-container-low rounded-2xl p-10 border border-white/5">
          <div className="flex justify-between items-start mb-10">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-zinc-500 text-[10px] font-black tracking-widest uppercase">Question 2</h3>
                <div className="flex items-center bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[9px] font-black tracking-widest border border-secondary/20">
                  <Lock size={10} className="mr-1.5" fill="currentColor" />
                  ANONYMOUS
                </div>
              </div>
              <p className="text-3xl font-black text-on-surface leading-tight uppercase tracking-tight">General feedback or suggestions for the retreat?</p>
            </div>
            <button className="bg-surface-container-highest text-on-surface hover:bg-zinc-700 px-6 py-3 rounded-full font-black text-[10px] tracking-widest uppercase active:scale-95 transition-all shrink-0">
              Export Feedback Report
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnonymousCard text="The current venue is too far from campus for some of the younger brothers without cars." />
            <AnonymousCard text="Great food options last time, we should definitely use the same catering service." />
            <AnonymousCard text="Let's try to incorporate more outdoor activities this year. The bonfire was the highlight." />
            <AnonymousCard text="Communication about the packing list was a bit late last year. Can we get it 2 weeks prior?" />
            <AnonymousCard text="Can we ensure there is enough space for everyone to sleep comfortably this time?" />
            <AnonymousCard text="The budget needs to be clearer. I'm happy to pay more if the quality of the stay is better." />
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponseRow = ({ name, initial, answer, active }: any) => (
  <div className="flex items-center justify-between p-4 bg-surface-container/30 hover:bg-surface-container/60 transition-colors rounded-xl group border border-white/[0.03]">
    <div className="flex items-center space-x-4">
      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-black text-secondary text-xs border border-secondary/20 uppercase tracking-tighter">{initial}</div>
      <span className="font-bold text-on-surface uppercase tracking-tight">{name}</span>
    </div>
    <div className="flex items-center space-x-6">
      <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest">{answer}</span>
      <div className={cn("w-2 h-2 rounded-full", active ? "bg-secondary shadow-[0_0_8px_rgba(230,195,100,0.5)]" : "bg-zinc-700")} />
    </div>
  </div>
);

const AnonymousCard = ({ text }: { text: string }) => (
  <div className="p-6 bg-surface-container/50 rounded-2xl border-l-2 border-secondary/30 border-y border-r border-white/5">
    <p className="text-on-surface-variant text-sm font-medium leading-relaxed italic">"{text}"</p>
  </div>
);
