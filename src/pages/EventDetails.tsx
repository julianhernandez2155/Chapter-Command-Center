import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  QrCode, 
  Users, 
  Clock, 
  MapPin, 
  FileText, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  UserPlus,
  Download,
  Search,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MOCK_EVENTS, MOCK_MEMBERS } from '@/src/constants';
import { useParams, useNavigate } from 'react-router-dom';

export const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = MOCK_EVENTS.find(e => e.id === id) || MOCK_EVENTS[0];
  const [activeTab, setActiveTab] = useState('Attendance');

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/events')}
          className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Event Protocol</span>
          <h1 className="text-4xl font-black tracking-tighter uppercase">{event.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Expected" value={event.expectedCount} icon={<Users size={16} />} />
            <StatCard label="Present" value={event.actualCount} icon={<CheckCircle2 size={16} />} color="text-green-500" />
            <StatCard label="Excused" value={12} icon={<FileText size={16} />} color="text-secondary" />
            <StatCard label="Absent" value={event.expectedCount - event.actualCount - 12} icon={<XCircle size={16} />} color="text-red-500" />
          </div>

          <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex border-b border-white/5">
              {['Attendance', 'Event Details', 'Officer Notes'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-5 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'Attendance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                      <input 
                        className="w-full bg-surface-container-lowest border-none rounded-full py-2.5 pl-12 pr-4 text-xs focus:ring-1 focus:ring-primary/50" 
                        placeholder="Search roster..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-surface-bright transition-colors">
                        <UserPlus size={14} /> Add Guest
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-surface-bright transition-colors">
                        <Download size={14} /> Export
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {MOCK_MEMBERS.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <img src={member.avatar} className="w-10 h-10 rounded-full" alt={member.firstName} />
                          <div>
                            <p className="text-sm font-bold">{member.firstName} {member.lastName}</p>
                            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">{member.suid} • {member.major}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-green-500">Present</span>
                            <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">19:02 EST</span>
                          </div>
                          <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-surface-container-lowest rounded-xl border border-white/5 opacity-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                        <div>
                          <p className="text-sm font-bold">Marcus Thorne</p>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">882944103 • Finance</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Not Checked In</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Event Details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <DetailItem icon={<CalendarIcon size={18} />} label="Date & Time" value={`${event.date} @ ${event.time}`} />
                    <DetailItem icon={<MapPin size={18} />} label="Location" value={event.location} />
                    <DetailItem icon={<Clock size={18} />} label="Duration" value="90 Minutes" />
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2rem] text-on-surface-variant/40">Attendance Policies</h4>
                    <div className="space-y-3">
                      <PolicyBadge label="Mandatory" active={event.isMandatory} />
                      <PolicyBadge label="QR Check-In" active={event.qrEnabled} />
                      <PolicyBadge label="Excusals Allowed" active={event.allowExcusals} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Officer Notes' && (
                <div className="space-y-6">
                  <div className="p-6 bg-surface-container-lowest rounded-xl border border-primary/20 relative">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full">Executive Note</div>
                    <p className="text-sm leading-relaxed text-on-surface/80 italic">
                      "{event.officerNotes}"
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Posted by Julian Sterling • 2h ago</span>
                      <button className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline">Edit Note</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl shadow-2xl shadow-primary/20 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xl font-black uppercase tracking-tighter">Live Check-In</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Active</span>
              </div>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">The QR Check-In portal is currently open. Members can check in via their mobile command center.</p>
            <div className="flex flex-col gap-3">
              <button className="w-full py-4 bg-white text-primary rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/90 transition-all">
                <QrCode size={18} /> Open QR Portal
              </button>
              <button className="w-full py-4 bg-primary-container border border-white/20 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all">
                <XCircle size={18} /> Close Check-In
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-lg font-bold uppercase tracking-tight">Recent Activity</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-green-500" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-medium"><span className="font-bold">Elias Wood</span> checked in</p>
                    <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">Just now • QR Scanner</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2">
              View All Activity <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-surface-container-low p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
    <div className="flex items-center justify-between text-on-surface-variant/40">
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    <span className={cn("text-3xl font-black tracking-tighter", color || "text-on-surface")}>{value}</span>
  </div>
);

const DetailItem = ({ icon, label, value }: any) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary border border-white/5">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  </div>
);

const PolicyBadge = ({ label, active }: any) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest",
    active ? "bg-primary/5 border-primary/20 text-primary" : "bg-surface-container-lowest border-white/5 text-on-surface-variant/40"
  )}>
    <span>{label}</span>
    {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
  </div>
);

const CalendarIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
