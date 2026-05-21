import React from 'react';
import { motion } from 'motion/react';
import { 
  GripVertical, 
  Lock, 
  Trash2, 
  Plus, 
  PlusCircle, 
  ChevronDown, 
  X,
  Eye,
  Settings,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const FormBuilder = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex-1">
          <h1 className="text-[40px] font-black tracking-tighter text-on-surface mb-1 uppercase">Build Form — Week 9</h1>
          <div className="flex items-center gap-3">
            <p className="text-secondary font-bold tracking-tight uppercase text-sm">Chapter Meeting: Mar 25, 8:00 PM</p>
            <span className="w-1.5 h-1.5 rounded-full bg-surface-container-high"></span>
            <p className="text-xs text-on-surface-variant/60 tracking-normal italic">Deadline: Mar 26, 8:00 PM (auto-calculated)</p>
          </div>
        </div>

        {/* Reference Panel Component */}
        <div className="w-full md:w-80 bg-surface-container-low p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary">Accepted Submissions</h3>
            <ChevronsUpDown className="text-on-surface-variant cursor-pointer" size={14} />
          </div>
          <div className="space-y-2">
            <AcceptedItem label="Brotherhood Chairman" />
            <AcceptedItem label="Scholarship Chairman" />
          </div>
        </div>
      </header>

      {/* Form Builder Area */}
      <div className="space-y-10">
        {/* Section 1 */}
        <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-6 left-4 cursor-grab text-surface-container-highest">
            <GripVertical size={20} />
          </div>
          <div className="ml-8 mb-8">
            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.2em] mb-2">From: Brotherhood Chairman</p>
            <input 
              className="w-full bg-surface-container-lowest border-none rounded-xl text-2xl font-black p-4 focus:ring-1 focus:ring-primary/20 placeholder:text-surface-container-highest uppercase tracking-tight" 
              placeholder="Section Title" 
              defaultValue="Attendance & Excuses"
            />
          </div>

          {/* Question List */}
          <div className="ml-8 space-y-6">
            <QuestionRow label="Full Name" type="Short Answer" />
            <QuestionRow 
              label="In attendance at Chapter Meeting?" 
              type="Multiple Choice" 
              options={['Present', 'Excused Absence', 'Unexcused Absence']} 
            />
            <QuestionRow label="If absent, reason for excuse" type="Short Answer" />
            <QuestionRow label="Did you complete your brotherhood hours this week?" type="Checkbox" />
            <QuestionRow label="Anonymous feedback for the Chairman" type="Short Answer" isAnonymous />
          </div>

          <div className="mt-8 ml-8">
            <button className="w-full border-2 border-dashed border-surface-container-highest rounded-xl p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:border-outline-variant hover:text-on-surface-variant transition-all">
              Add Question
            </button>
          </div>
        </div>

        {/* Global Footer Action */}
        <button className="w-full h-32 border-2 border-dashed border-surface-container-low bg-surface-container-low/20 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:bg-surface-container-low/40 transition-all">
          <PlusCircle size={32} className="text-surface-container-high group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-container-highest group-hover:text-on-surface transition-colors">Add Section</span>
        </button>
      </div>

      {/* Visual Polish: Content Filter Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-24 bg-gradient-to-t from-surface to-transparent pointer-events-none z-30"></div>
    </div>
  );
};

const AcceptedItem = ({ label }: { label: string }) => (
  <div className="p-3 bg-surface-container-high rounded-xl cursor-pointer flex justify-between items-center group border border-white/5 hover:border-secondary/20 transition-all">
    <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    <ChevronDown className="text-on-surface-variant group-hover:text-secondary transition-colors" size={14} />
  </div>
);

const QuestionRow = ({ label, type, options, isAnonymous }: any) => (
  <div className="group flex gap-4 items-start">
    <GripVertical className="text-surface-container-highest mt-3 cursor-grab group-hover:text-on-surface-variant/30 transition-colors" size={18} />
    <div className="flex-1 space-y-3">
      <div className="flex gap-3">
        <input 
          className="flex-1 bg-surface-container-lowest border-none rounded-xl text-sm p-4 focus:ring-1 focus:ring-primary/20 font-bold" 
          defaultValue={label}
        />
        <div className="relative w-48">
          <select 
            className="w-full bg-surface-container-lowest border-none rounded-xl text-[10px] font-black uppercase tracking-wider p-4 appearance-none focus:ring-1 focus:ring-primary/20"
            defaultValue={type}
          >
            <option value="Short Answer">Short Answer</option>
            <option value="Multiple Choice">Multiple Choice</option>
            <option value="Checkbox">Checkbox</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={14} />
        </div>
      </div>
      {options && (
        <div className="pl-4 space-y-2">
          {options.map((opt: string) => (
            <div key={opt} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full border border-outline-variant"></span>
              <input 
                className="flex-1 bg-transparent border-none text-xs text-on-surface-variant p-0 focus:ring-0 font-medium" 
                defaultValue={opt}
              />
              <X className="text-surface-container-highest cursor-pointer hover:text-primary" size={14} />
            </div>
          ))}
          <button className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mt-2 hover:opacity-80">
            <Plus size={12} /> Add Option
          </button>
        </div>
      )}
    </div>
    <div className="flex items-center gap-4 mt-3">
      {isAnonymous ? (
        <div className="flex items-center gap-2 text-primary">
          <Lock size={18} fill="currentColor" />
          <div className="w-8 h-4 bg-primary/20 rounded-full relative">
            <div className="absolute right-1 top-0.5 w-3 h-3 bg-primary rounded-full"></div>
          </div>
        </div>
      ) : (
        <Lock className="text-surface-container-highest cursor-pointer hover:text-primary transition-colors" size={18} />
      )}
      <Trash2 className="text-surface-container-highest cursor-pointer hover:text-primary transition-colors" size={18} />
    </div>
  </div>
);
