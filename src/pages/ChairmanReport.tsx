import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Clock, 
  Send, 
  Save, 
  CheckCircle2, 
  Lock, 
  Printer, 
  AlertCircle,
  HelpCircle,
  Calendar,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MOCK_MEMBERS } from '@/src/constants';

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

const REPORT_POSITIONS = [
  { id: 'pos_scholarship', title: 'Scholarship Chairman', overseenBy: 'Internal VP' },
  { id: 'pos_brotherhood', title: 'Brotherhood Chairman', overseenBy: 'Internal VP' },
  { id: 'pos_recruitment', title: 'Recruitment Chairman', overseenBy: 'President' },
  { id: 'pos_social', title: 'Social Chairman', overseenBy: 'External VP' },
  { id: 'pos_housing', title: 'Housing Manager', overseenBy: 'President' },
  { id: 'pos_health_safety', title: 'Health & Safety Officer', overseenBy: 'President' }
];

const emptyContent = (): ReportContent => ({
  accomplishments: '',
  plannedActions: '',
  smartGoalProgress: '',
  supportNeeded: '',
  recognitions: '',
  concerns: '',
  upcomingEvents: '',
  budgetUpdate: '',
  agendaItems: ''
});

export const ChairmanReport = () => {
  const [selectedPos, setSelectedPos] = useState(REPORT_POSITIONS[0]);
  const [week, setWeek] = useState(9);
  const [semester] = useState('Spring 2026');
  
  const [meetingDate, setMeetingDate] = useState('');
  const [attendancePresent, setAttendancePresent] = useState('');
  const [attendanceAbsent, setAttendanceAbsent] = useState('');
  const [content, setContent] = useState<ReportContent>(emptyContent());
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | undefined>(undefined);
  
  const [certify, setCertify] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  // Load report from localStorage when selected position or week changes
  useEffect(() => {
    const key = `ccc_report_${selectedPos.id}_w${week}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as ReportState;
      setMeetingDate(parsed.meetingDate || '');
      setAttendancePresent(parsed.attendancePresent || '');
      setAttendanceAbsent(parsed.attendanceAbsent || '');
      setContent(parsed.content || emptyContent());
      setStatus(parsed.status || 'draft');
      setSubmittedAt(parsed.submittedAt);
      setCertify(parsed.status === 'submitted');
    } else {
      // Clear inputs for new report
      setMeetingDate('');
      setAttendancePresent('');
      setAttendanceAbsent('');
      setContent(emptyContent());
      setStatus('draft');
      setSubmittedAt(undefined);
      setCertify(false);
    }
  }, [selectedPos, week]);

  // Live Wednesday 11:59 PM deadline countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday, 3 is Wednesday
      
      // Calculate target date (this week's Wednesday at 11:59:59 PM)
      const target = new Date(now);
      target.setHours(23, 59, 59, 999);
      
      const daysUntilWednesday = (3 - currentDay + 7) % 7;
      
      if (daysUntilWednesday === 0 && now.getHours() >= 23 && now.getMinutes() >= 59) {
        // Wednesday after deadline, target next Wednesday
        target.setDate(now.getDate() + 7);
      } else {
        target.setDate(now.getDate() + daysUntilWednesday);
      }

      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('OVERDUE');
        setIsOverdue(true);
      } else {
        setIsOverdue(false);
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        let timeStr = '';
        if (d > 0) timeStr += `${d}d `;
        timeStr += `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
        setTimeLeft(timeStr);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (field: keyof ReportContent, value: string) => {
    if (status === 'submitted') return;
    setContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveDraft = () => {
    if (status === 'submitted') return;
    
    const key = `ccc_report_${selectedPos.id}_w${week}`;
    const reportData: ReportState = {
      id: crypto.randomUUID(),
      positionId: selectedPos.id,
      positionTitle: selectedPos.title,
      submittedBy: `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
      semester,
      weekNumber: week,
      status: 'draft',
      meetingDate,
      attendancePresent,
      attendanceAbsent,
      content
    };

    localStorage.setItem(key, JSON.stringify(reportData));
    showToast('Draft successfully saved locally.');
  };

  const handleSubmitReport = () => {
    if (status === 'submitted') return;
    if (!certify) {
      showToast('Please check the certification box before submitting.');
      return;
    }
    
    const submissionTime = new Date().toLocaleString();
    const key = `ccc_report_${selectedPos.id}_w${week}`;
    const reportData: ReportState = {
      id: crypto.randomUUID(),
      positionId: selectedPos.id,
      positionTitle: selectedPos.title,
      submittedBy: `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
      semester,
      weekNumber: week,
      status: 'submitted',
      submittedAt: submissionTime,
      meetingDate,
      attendancePresent,
      attendanceAbsent,
      content
    };

    localStorage.setItem(key, JSON.stringify(reportData));
    
    // Track index of all submitted reports to facilitate listing in Secretary Hub
    const indexKey = 'ccc_all_reports';
    const existingIndex = localStorage.getItem(indexKey);
    const index = existingIndex ? JSON.parse(existingIndex) : [];
    
    // Replace if already exist in index, otherwise append
    const updatedIndex = index.filter((item: any) => !(item.positionId === selectedPos.id && item.weekNumber === week));
    updatedIndex.push({
      id: reportData.id,
      positionId: selectedPos.id,
      positionTitle: selectedPos.title,
      submittedBy: reportData.submittedBy,
      weekNumber: week,
      semester,
      status: 'submitted',
      submittedAt: submissionTime
    });
    localStorage.setItem(indexKey, JSON.stringify(updatedIndex));

    setStatus('submitted');
    setSubmittedAt(submissionTime);
    showToast('Weekly report submitted and locked.');
  };

  const handlePrint = () => {
    window.print();
  };

  const isSubmitted = status === 'submitted';

  return (
    <div className="max-w-6xl mx-auto space-y-10 print:bg-white print:text-black">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-primary px-6 py-4 rounded-full text-white font-bold text-sm tracking-wide shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 size={18} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Governance Protocol</span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-2">Weekly Chairman Report</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-xl">
            Article III Governance: Submit your committee's weekly actions to the Secretary & overseen Executive Officer.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrint}
            className="p-4 bg-surface-container-high rounded-full text-on-surface hover:text-white border border-white/5 transition-all shadow-md active:scale-95"
            title="Print Report"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Grid of details, deadline and settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Settings Selectors Card */}
        <section className="bg-surface-container-low p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Report Context</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-2">Position Reporting For</label>
              <select 
                disabled={isSubmitted}
                value={selectedPos.id}
                onChange={(e) => {
                  const found = REPORT_POSITIONS.find(p => p.id === e.target.value);
                  if (found) setSelectedPos(found);
                }}
                className="w-full sunken-input appearance-none bg-surface-container-lowest"
              >
                {REPORT_POSITIONS.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.title}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-2">Week</label>
                <select 
                  disabled={isSubmitted}
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="w-full sunken-input appearance-none bg-surface-container-lowest"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 ml-2">Semester</label>
                <input 
                  type="text" 
                  disabled 
                  value={semester} 
                  className="w-full sunken-input bg-surface-container-lowest text-on-surface/40 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] font-bold uppercase text-on-surface-variant/65">
              <span>Supervised By:</span>
              <span className="text-primary tracking-wide">{selectedPos.overseenBy}</span>
            </div>
          </div>
        </section>

        {/* Live Countdown Card */}
        <section className="bg-surface-container-low p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-on-surface-variant/60" size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Intake Deadline</h3>
            </div>
            <span className="bg-white/5 border border-white/5 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider text-zinc-400">Weekly</span>
          </div>
          <div className="py-4">
            <p className={cn(
              "text-3xl font-black tracking-tight",
              isOverdue ? "text-red-500" : "text-white"
            )}>
              {timeLeft}
            </p>
            <p className="text-[10px] text-on-surface-variant/60 mt-1 uppercase tracking-widest">Wednesday at 11:59 PM</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-on-surface-variant/60 bg-surface-container-lowest p-2 rounded-lg">
            <AlertCircle size={14} className="text-secondary shrink-0" />
            <span>Late submissions trigger a warning on the compliance list.</span>
          </div>
        </section>

        {/* Submission Status Card */}
        <section className={cn(
          "p-6 rounded-2xl border transition-all flex flex-col justify-between",
          isSubmitted 
            ? "bg-primary/5 border-primary/20 text-white" 
            : "bg-surface-container-low border-white/5 text-on-surface"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Report Status</h3>
              <p className={cn(
                "text-2xl font-black uppercase tracking-wider mt-2",
                isSubmitted ? "text-primary" : "text-zinc-500"
              )}>
                {status}
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border",
              isSubmitted ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-zinc-500"
            )}>
              {isSubmitted ? <Lock size={20} /> : <FileText size={20} />}
            </div>
          </div>
          <div className="text-[10px] text-on-surface-variant/75 mt-4">
            {isSubmitted ? (
              <div className="space-y-1">
                <p>Submitted by <span className="font-bold text-white">{MOCK_MEMBERS[0].firstName} {MOCK_MEMBERS[0].lastName}</span></p>
                <p>Recorded at: <span className="text-primary font-bold">{submittedAt}</span></p>
              </div>
            ) : (
              <p>Work is automatically saved when "Save Draft" is clicked. Unsubmitted drafts will not appear in the Secretary compilation.</p>
            )}
          </div>
        </section>
      </div>

      {/* Main Form Fields Container */}
      <section className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden p-8 md:p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/5 pb-8 mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{selectedPos.title}</h2>
              <p className="text-xs text-on-surface-variant/70 uppercase tracking-widest mt-1">Week {week} Submission Form</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-surface-container-lowest p-2 rounded-xl border border-white/5 text-xs font-semibold text-on-surface-variant">
            <span>Author:</span>
            <span className="text-white font-bold">{MOCK_MEMBERS[0].firstName} {MOCK_MEMBERS[0].lastName}</span>
          </div>
        </div>

        {/* Metadata Inputs (Meeting Date and Attendance) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
              <Calendar size={12} className="text-primary" />
              Committee Meeting Date
            </label>
            <input 
              type="date"
              disabled={isSubmitted}
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full sunken-input bg-surface-container-lowest focus:ring-1 focus:ring-primary/45 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
            />
          </div>
          
          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
              <Users size={12} className="text-green-500" />
              Members Present
            </label>
            <input 
              type="text"
              disabled={isSubmitted}
              value={attendancePresent}
              onChange={(e) => setAttendancePresent(e.target.value)}
              placeholder="e.g. John D., Alex M., Zach S."
              className="w-full sunken-input bg-surface-container-lowest focus:ring-1 focus:ring-primary/45 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
            />
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
              <Users size={12} className="text-red-500" />
              Members Absent
            </label>
            <input 
              type="text"
              disabled={isSubmitted}
              value={attendanceAbsent}
              onChange={(e) => setAttendanceAbsent(e.target.value)}
              placeholder="e.g. Kyle W. (unexcused)"
              className="w-full sunken-input bg-surface-container-lowest focus:ring-1 focus:ring-primary/45 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
            />
          </div>
        </div>

        {/* 9 Structured Committee Report Fields */}
        <div className="space-y-8">
          <div className="h-px bg-white/5"></div>
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-primary italic mb-2">9 Required Manual Content Sections</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Field 1: Accomplishments */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">1. Accomplishments This Week</label>
                <HelpCircle className="text-on-surface-variant/30 hover:text-on-surface transition-colors cursor-help" size={14} title="MGM Art. III: Document what your committee completed." />
              </div>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.accomplishments}
                onChange={(e) => handleInputChange('accomplishments', e.target.value)}
                placeholder="List completed projects, study groups, recruitment events, or budget audits accomplished..."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 2: Planned Actions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">2. Planned Actions Next Week</label>
                <HelpCircle className="text-on-surface-variant/30 hover:text-on-surface transition-colors cursor-help" size={14} title="MGM Art. III: Target work items for the upcoming cycle." />
              </div>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.plannedActions}
                onChange={(e) => handleInputChange('plannedActions', e.target.value)}
                placeholder="What specific tasks are scheduled for execution next week? Assign members to actions."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 3: SMART Goal Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">3. SMART Goal Progress</label>
                <HelpCircle className="text-on-surface-variant/30 hover:text-on-surface transition-colors cursor-help" size={14} title="MGM Art. III: Update status of current metrics-driven targets." />
              </div>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.smartGoalProgress}
                onChange={(e) => handleInputChange('smartGoalProgress', e.target.value)}
                placeholder="E.g. Raise chapter average GPA to 3.4 (currently hosting 2 review sessions/week, study hours logged by 85% of active members)."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 4: Exec Support Needed */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">4. Exec Support & Resources Needed</label>
                <HelpCircle className="text-on-surface-variant/30 hover:text-on-surface transition-colors cursor-help" size={14} title="MGM Art. III: Blockers, funding requests, or assistance needed." />
              </div>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.supportNeeded}
                onChange={(e) => handleInputChange('supportNeeded', e.target.value)}
                placeholder="List any help needed from President, VPs, or funding approval required from Treasurer."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 5: Member Recognitions */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">5. Member Recognitions</label>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.recognitions}
                onChange={(e) => handleInputChange('recognitions', e.target.value)}
                placeholder="Shout out brothers who went above and beyond this week to be highlighted in chapter..."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 6: Concerns or Issues */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">6. Concerns or Issues</label>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.concerns}
                onChange={(e) => handleInputChange('concerns', e.target.value)}
                placeholder="List any member attendance issues, committee conflicts, or safety concerns..."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 7: Upcoming Events */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">7. Upcoming Events (Name, Date, Type)</label>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.upcomingEvents}
                onChange={(e) => handleInputChange('upcomingEvents', e.target.value)}
                placeholder="Event: Scholarship Workshop | Date: Nov 12 | Type: Governance..."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>

            {/* Field 8: Budget Update */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">8. Budget Update</label>
              <textarea 
                rows={4}
                disabled={isSubmitted}
                value={content.budgetUpdate}
                onChange={(e) => handleInputChange('budgetUpdate', e.target.value)}
                placeholder="Amount spent this week, remaining committee allocation, or expense reports filed..."
                className="w-full sunken-textarea bg-surface-container-lowest"
              />
            </div>
          </div>

          {/* Field 9: Chapter Meeting Agenda Items */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider text-primary">9. Items for Chapter Meeting Agenda</label>
              <HelpCircle className="text-on-surface-variant/30 hover:text-on-surface transition-colors cursor-help" size={14} title="MGM Art. III: Requests for floor time or announcement slots." />
            </div>
            <textarea 
              rows={3}
              disabled={isSubmitted}
              value={content.agendaItems}
              onChange={(e) => handleInputChange('agendaItems', e.target.value)}
              placeholder="E.g. Request 3 minutes to present scholarship award results. Proposal to vote on scholarship study space..."
              className="w-full sunken-textarea bg-surface-container-lowest"
            />
          </div>
        </div>

        {/* Footer Actions / Form Locks */}
        <div className="pt-10 mt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox"
              id="certify"
              disabled={isSubmitted}
              checked={certify}
              onChange={(e) => setCertify(e.target.checked)}
              className="w-5 h-5 rounded border-white/10 bg-surface-container-lowest text-primary focus:ring-0 cursor-pointer disabled:opacity-50"
            />
            <label htmlFor="certify" className="text-xs text-on-surface-variant font-medium cursor-pointer select-none">
              I certify that this report is an accurate summary of committee actions.
            </label>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {!isSubmitted && (
              <>
                <button 
                  onClick={handleSaveDraft}
                  className="w-full md:w-auto px-6 py-4 rounded-full font-bold uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <Save size={16} />
                  Save Draft
                </button>
                <button 
                  onClick={handleSubmitReport}
                  className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Submit Report
                </button>
              </>
            )}
            {isSubmitted && (
              <div className="bg-primary/10 border border-primary/25 text-primary px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Lock size={14} />
                Locked & Submitted
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
