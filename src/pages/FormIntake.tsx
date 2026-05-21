import React from 'react';
import { motion } from 'motion/react';
import { 
  FileEdit, 
  Lock, 
  PlusCircle, 
  Send, 
  Save,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const FormIntake = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Hero Header Section */}
      <div className="mb-20">
        <div className="flex items-center gap-4 mb-4">
          <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase rounded-full tracking-widest">Active Intake</span>
          <span className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Due in 2 Days</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none uppercase">Weekly Form — Week 9</h1>
        <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl font-light leading-relaxed">
          Submit your section for this week's chapter form. The Secretary will review and merge all sections.
        </p>
      </div>

      {/* Editor Section */}
      <div className="space-y-12">
        {/* Section Title Card */}
        <div className="bg-surface-container-low p-10 rounded-lg">
          <label className="block text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-4">Section Title</label>
          <div className="bg-surface-container-lowest rounded-md p-6">
            <input 
              className="bg-transparent border-none text-2xl font-bold text-white w-full focus:ring-0 placeholder:text-zinc-700" 
              placeholder="e.g. Social Chair" 
              defaultValue="Brotherhood Chairman"
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-8">
          <div className="flex justify-between items-end mb-4 px-2">
            <h3 className="text-2xl font-bold text-white tracking-tight uppercase italic">Form Content</h3>
            <div className="flex gap-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auto-saved 2m ago</span>
            </div>
          </div>

          {/* Question Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start group">
            <div className="lg:col-span-7 bg-surface-container-low p-8 rounded-lg">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Question 01</label>
              <input 
                className="bg-surface-container-lowest border-none w-full p-4 rounded-md text-white focus:ring-1 focus:ring-primary/30" 
                defaultValue="What venue do you prefer for the end-of-semester formal?"
              />
            </div>
            <div className="lg:col-span-3 bg-surface-container-low p-8 rounded-lg">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Response Type</label>
              <div className="relative">
                <select className="bg-surface-container-lowest border-none w-full p-4 rounded-md text-white appearance-none focus:ring-1 focus:ring-primary/30">
                  <option>Short Answer</option>
                  <option>Multiple Choice</option>
                  <option>Paragraph</option>
                  <option>File Upload</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={18} />
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-surface-container-low p-6 rounded-lg flex flex-col items-center justify-center relative group/tooltip">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Anonymous</label>
                <button className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary active:scale-95 transition-all">
                  <Lock size={20} fill="currentColor" />
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 p-3 bg-surface-container-highest text-[10px] text-on-surface leading-tight rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity shadow-xl pointer-events-none z-10 text-center">
                  Members' answers won't be linked to their name.
                </div>
              </div>
            </div>
          </div>

          {/* Add Question Link */}
          <div className="flex justify-center py-8">
            <button className="flex items-center gap-3 text-primary font-bold uppercase tracking-widest text-sm hover:gap-5 transition-all">
              <PlusCircle size={20} />
              Add Another Question
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-16 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              <img className="w-10 h-10 rounded-full border-2 border-surface shadow-lg" src="https://picsum.photos/seed/sec/100/100" alt="Secretary" />
              <div className="w-10 h-10 rounded-full border-2 border-surface shadow-lg bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-zinc-400">+2</div>
            </div>
            <p className="text-zinc-500 text-sm italic">Secretary and 2 others will be notified</p>
          </div>
          <div className="flex gap-6 items-center">
            <button className="text-zinc-500 font-bold uppercase tracking-widest text-sm hover:text-white transition-colors">Save as Draft</button>
            <button className="bg-primary-container text-on-primary-container px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-3">
              Submit to Secretary
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
