import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  FileText,
  Calendar,
  Users,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ReportContent {
  accomplishments: string;
  plannedActions: string;
  smartGoalProgress: string;
  supportNeeded: string;
  recognitions: string;
  concerns: string;
  upcomingEvents: string;
  budgetUpdate: string;
  agendaItems: string;
}

interface ReportState {
  id: string;
  positionId: string;
  positionTitle: string;
  submittedBy: string;
  semester: string;
  weekNumber: number;
  submittedAt?: string;
  status: 'draft' | 'submitted';
  meetingDate: string;
  attendancePresent: string;
  attendanceAbsent: string;
  content: ReportContent;
}

const ALL_POSITIONS = [
  { id: 'pos_scholarship', title: 'Scholarship Chairman', overseenBy: 'Internal VP' },
  { id: 'pos_brotherhood', title: 'Brotherhood Chairman', overseenBy: 'Internal VP' },
  { id: 'pos_recruitment', title: 'Recruitment Chairman', overseenBy: 'President' },
  { id: 'pos_social', title: 'Social Chairman', overseenBy: 'External VP' },
  { id: 'pos_housing', title: 'Housing Manager', overseenBy: 'President' },
  { id: 'pos_health_safety', title: 'Health & Safety Officer', overseenBy: 'President' }
];

export const AdminReports = () => {
  const [week, setWeek] = useState(9);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'draft' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<ReportState[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Load all reports from localStorage for selected week
  useEffect(() => {
    const loadedReports: ReportState[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ccc_report_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const report = JSON.parse(raw) as ReportState;
          if (report.weekNumber === week) {
            loadedReports.push(report);
          }
        }
      }
    }
    setReports(loadedReports);
  }, [week]);

  // Derive compliance status for all positions
  const positionReportStatus = ALL_POSITIONS.map(pos => {
    const report = reports.find(r => r.positionId === pos.id);
    return {
      position: pos,
      report: report || null,
      status: report ? report.status : 'missing' as 'submitted' | 'draft' | 'missing'
    };
  });

  const submittedCount = positionReportStatus.filter(p => p.status === 'submitted').length;
  const draftCount = positionReportStatus.filter(p => p.status === 'draft').length;
  const missingCount = positionReportStatus.filter(p => p.status === 'missing').length;

  const filteredItems = positionReportStatus.filter(item => {
    // Filter by status tab
    if (filter === 'submitted' && item.status !== 'submitted') return false;
    if (filter === 'draft' && item.status !== 'draft') return false;
    if (filter === 'missing' && item.status !== 'missing') return false;

    // Search by position or author name
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const posTitle = item.position.title.toLowerCase();
      const overseen = item.position.overseenBy.toLowerCase();
      const author = item.report?.submittedBy?.toLowerCase() || '';
      return posTitle.includes(query) || overseen.includes(query) || author.includes(query);
    }
    return true;
  });

  const toggleExpand = (reportId: string | null) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
    } else {
      setExpandedReportId(reportId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Compliance Protocol</span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-2">Secretary Report Hub</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-xl">
            Monitor weekly chairman submissions, review committee metrics, and track officer compliance.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl border border-white/5">
          <label className="text-[10px] font-black uppercase text-on-surface-variant/70 ml-2 tracking-wider">Target Cycle</label>
          <select 
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="sunken-input py-2 px-6 appearance-none bg-surface-container-lowest font-bold text-xs"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Compliance Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submitted Card */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Submitted Reports</span>
            <p className="text-4xl font-black text-white mt-1">{submittedCount} / {ALL_POSITIONS.length}</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">Locked and ready for compilation</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Drafts Card */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Saved Drafts</span>
            <p className="text-4xl font-black text-white mt-1">{draftCount}</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">Pending submission finalize</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
        </div>

        {/* Missing Card */}
        <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Missing Reports</span>
            <p className="text-4xl font-black text-white mt-1">{missingCount}</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">Requires immediate follow-up</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Critical Alert if there are missing reports */}
      {missingCount > 0 && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-5 flex items-start gap-4">
          <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-red-500 text-sm uppercase tracking-wide">Missing Weekly Submissions</h4>
            <p className="text-xs text-on-surface-variant/75 mt-1 leading-relaxed">
              The following chairmen have not submitted their Week {week} report: 
              <span className="font-bold text-white ml-1">
                {positionReportStatus.filter(p => p.status === 'missing').map(p => p.position.title).join(', ')}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-surface-container-low/30 p-4 rounded-2xl border border-white/5 shadow-md">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border-none rounded-full py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-primary/50 text-white placeholder:text-zinc-600" 
              placeholder="Search reports or oversee..."
            />
          </div>
        </div>
        
        <div className="flex bg-surface-container-lowest p-1 rounded-full border border-white/5 overflow-x-auto w-full md:w-auto">
          {(['all', 'submitted', 'draft', 'missing'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                filter === tab 
                  ? "bg-surface-container-high text-white shadow-sm" 
                  : "text-on-surface-variant/50 hover:text-on-surface"
              )}
            >
              {tab === 'all' ? 'All Roles' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Reports compliance list */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-low border border-white/5 p-12 text-center text-on-surface-variant/50">
            <ClipboardList className="mx-auto text-zinc-700 mb-4" size={48} />
            <p className="text-lg font-bold">No reports found matching criteria</p>
            <p className="text-xs">Adjust your status tabs or try searching for another keyword.</p>
          </div>
        ) : (
          filteredItems.map(({ position, report, status }) => {
            const hasContent = status !== 'missing';
            const isOpen = report && expandedReportId === report.id;
            
            return (
              <div 
                key={position.id}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden bg-surface-container-low/50 shadow-md",
                  isOpen ? "border-primary/20 bg-surface-container-low" : "border-white/5 hover:bg-surface-container-high/30"
                )}
              >
                {/* Header Row */}
                <div 
                  onClick={() => hasContent && report && toggleExpand(report.id)}
                  className={cn(
                    "p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none",
                    hasContent ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border font-bold text-xs uppercase shrink-0",
                      status === 'submitted' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                      status === 'draft' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {status === 'submitted' ? <UserCheck size={18} /> : 
                       status === 'draft' ? <Clock size={18} /> : 
                       <AlertCircle size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold tracking-tight text-white">{position.title}</h3>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                          Oversight: {position.overseenBy}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-on-surface-variant text-xs mt-1 font-medium">
                        {report ? (
                          <>
                            <span>Author: <span className="text-white font-bold">{report.submittedBy}</span></span>
                            {report.meetingDate && (
                              <span className="flex items-center gap-1.5"><Calendar size={13} /> Met: {report.meetingDate}</span>
                            )}
                            {report.submittedAt && (
                              <span className="flex items-center gap-1.5"><Clock size={13} /> Submitted: {report.submittedAt}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-red-500/80 font-bold uppercase tracking-wide text-[9px]">No submission recorded for week {week}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <span className={cn(
                      "badge font-black uppercase text-[8px] tracking-wider shrink-0",
                      status === 'submitted' ? "bg-green-500/15 text-green-500" :
                      status === 'draft' ? "bg-amber-500/15 text-amber-500" :
                      "bg-red-500/15 text-red-500"
                    )}>
                      {status}
                    </span>
                    {hasContent && report && (
                      <button className="text-on-surface-variant/40 hover:text-white transition-colors">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                <AnimatePresence>
                  {isOpen && report && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/5 bg-surface-container-lowest"
                    >
                      <div className="p-8 space-y-8">
                        {/* Attendance summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-low p-4 rounded-xl border border-white/5">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Users size={12} /> Present Members
                            </span>
                            <p className="text-sm font-medium text-white">{report.attendancePresent || 'None recorded'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Users size={12} /> Absent Members
                            </span>
                            <p className="text-sm font-medium text-white">{report.attendanceAbsent || 'None recorded'}</p>
                          </div>
                        </div>

                        {/* 9 Structured Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                          <DetailCard title="1. Accomplishments This Week" content={report.content.accomplishments} />
                          <DetailCard title="2. Planned Actions Next Week" content={report.content.plannedActions} />
                          <DetailCard title="3. SMART Goal Progress" content={report.content.smartGoalProgress} />
                          <DetailCard title="4. Exec Support & Resources Needed" content={report.content.supportNeeded} />
                          <DetailCard title="5. Member Recognitions" content={report.content.recognitions} />
                          <DetailCard title="6. Concerns or Issues" content={report.content.concerns} />
                          <DetailCard title="7. Upcoming Events" content={report.content.upcomingEvents} />
                          <DetailCard title="8. Budget Update" content={report.content.budgetUpdate} />
                        </div>
                        
                        <div className="bg-surface-container-low/40 p-5 rounded-xl border border-white/5 text-left">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">9. Chapter Meeting Agenda Items</span>
                          <p className="text-sm font-medium text-white mt-1 leading-relaxed whitespace-pre-line">{report.content.agendaItems || 'None requested'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const DetailCard = ({ title, content }: { title: string; content: string }) => (
  <div className="space-y-1 bg-surface-container-low/20 p-4 rounded-xl border border-white/5 hover:bg-surface-container-low/40 transition-colors">
    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{title}</span>
    <p className="text-sm font-medium text-white leading-relaxed whitespace-pre-line">{content || 'None reported'}</p>
  </div>
);
