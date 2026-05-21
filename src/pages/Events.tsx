import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MOCK_EVENTS } from '@/src/constants';
import { useNavigate } from 'react-router-dom';

export const Events = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <section className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-on-surface mb-2">Chapter Events</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-lg">Schedule and manage attendance for all chapter activities.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-white px-8 py-4 rounded-full font-black tracking-widest uppercase text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={20} />
          Create Event
        </button>
      </section>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-surface-container-low/30 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
            <input 
              className="w-full bg-surface-container-lowest border-none rounded-full py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-primary/50" 
              placeholder="Search events..."
            />
          </div>
          <button className="p-3 bg-surface-container-lowest rounded-full text-on-surface-variant hover:text-on-surface border border-white/5">
            <Filter size={18} />
          </button>
        </div>
        <div className="flex bg-surface-container-lowest p-1 rounded-full border border-white/5">
          {['Upcoming', 'Past', 'Archived'].map((tab, i) => (
            <button 
              key={tab}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                i === 0 ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant/50 hover:text-on-surface"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_EVENTS.map((event) => (
          <motion.button 
            key={event.id}
            onClick={() => navigate(`/events/${event.id}`)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-surface-container-low p-6 rounded-2xl border border-white/5 hover:bg-surface-container-high transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 text-left"
          >
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex flex-col items-center justify-center border",
                event.type === 'Chapter Meeting' ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/10 border-secondary/20 text-secondary"
              )}>
                <span className="text-[10px] font-black uppercase leading-none mb-1">{event.date.split(' ')[0]}</span>
                <span className="text-2xl font-black leading-none">{event.date.split(' ')[1].replace(',', '')}</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold tracking-tight">{event.name}</h3>
                  {event.isMandatory && (
                    <span className="bg-red-600/20 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Mandatory</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-on-surface-variant text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {event.time}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>
                  <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {event.type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">Attendance</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${(event.actualCount / event.expectedCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{event.actualCount}/{event.expectedCount}</span>
                </div>
              </div>
              <ChevronRight className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateEventModal onClose={() => setIsCreateModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateEventModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl h-full bg-surface border-l border-white/5 shadow-2xl overflow-y-auto no-scrollbar"
      >
        <div className="p-12 space-y-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="text-primary" size={24} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Create Event</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Basic Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">Event Name</label>
                  <input className="w-full sunken-input" placeholder="e.g. Spring Chapter Meeting" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">Event Type</label>
                    <select className="w-full sunken-input appearance-none">
                      <option>Chapter Meeting</option>
                      <option>Committee</option>
                      <option>Social</option>
                      <option>Philanthropy</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">Location</label>
                    <input className="w-full sunken-input" placeholder="e.g. Union 402" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Attendance Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PolicyToggle label="Mandatory Attendance" description="Absences require formal excusal." defaultChecked />
                <PolicyToggle label="QR Check-In Enabled" description="Generate dynamic QR for entry." defaultChecked />
                <PolicyToggle label="Allow Excusals" description="Members can submit excuse forms." defaultChecked />
                <PolicyToggle label="Guest List Allowed" description="Allow non-members to be added." />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-white/5 pb-2">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">Date</label>
                  <input type="date" className="w-full sunken-input" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-4">Start Time</label>
                  <input type="time" className="w-full sunken-input" />
                </div>
              </div>
            </section>
          </div>

          <div className="pt-12 flex gap-4">
            <button onClick={onClose} className="flex-1 py-5 rounded-full font-bold uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
            <button className="flex-[2] py-5 bg-primary text-white rounded-full font-black uppercase tracking-[0.2rem] text-sm shadow-xl shadow-primary/20">Establish Event</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PolicyToggle = ({ label, description, defaultChecked }: any) => {
  const [checked, setChecked] = useState(defaultChecked || false);
  return (
    <button 
      onClick={() => setChecked(!checked)}
      className={cn(
        "p-5 rounded-2xl border text-left transition-all",
        checked ? "bg-primary/5 border-primary/20" : "bg-surface-container-low border-white/5"
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={cn("text-xs font-bold uppercase tracking-widest", checked ? "text-primary" : "text-on-surface")}>{label}</span>
        <div className={cn(
          "w-8 h-4 rounded-full relative transition-colors",
          checked ? "bg-primary" : "bg-surface-container-high"
        )}>
          <div className={cn(
            "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
            checked ? "left-5" : "left-1"
          )} />
        </div>
      </div>
      <p className="text-[10px] text-on-surface-variant leading-relaxed">{description}</p>
    </button>
  );
};
