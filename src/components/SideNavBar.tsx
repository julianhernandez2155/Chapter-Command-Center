import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  LogOut,
  History,
  CheckSquare,
  FileEdit,
  Clock,
  Layers,
  BarChart3,
  PenTool,
  TableProperties
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';

export const SideNavBar = () => {
  const { can, canAny, signOut } = useAuth();

  const canManageRecords = canAny(['attendance.import', 'forms.builder.manage', 'positions.manage']);
  const canReviewExcusals = can('excusals.review');
  const canViewFinance = can('finance.dues.view');
  const canUseOfficerWorkflows = canAny(['forms.intake', 'reports.submit', 'reports.view_all', 'forms.responses.view']);

  return (
    <aside className="h-screen w-20 hover:w-64 transition-all duration-300 ease-in-out fixed left-0 top-0 z-50 bg-surface-container-lowest border-r border-white/5 flex flex-col py-8 overflow-hidden group shadow-[24px_0_48px_rgba(0,0,0,0.4)]">
      <div className="px-6 mb-12 flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Shield className="text-white w-4 h-4 fill-current" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <p className="font-bold text-xs uppercase tracking-widest text-on-surface leading-none">Sigma Chi</p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mt-1">Alpha Chapter</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 overflow-y-auto no-scrollbar pb-10">
        <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Command" />
        {can('attendance.import') && <NavItem to="/attendance" icon={<CheckSquare size={20} />} label="Attendance" />}
        <NavItem to="/events" icon={<Calendar size={20} />} label="Events" />
        {can('roster.view') && <NavItem to="/roster" icon={<Users size={20} />} label="Members" />}
        
        <div className="py-2 opacity-20 group-hover:opacity-100 transition-opacity">
          <div className="h-px bg-white/10 mx-2 my-2" />
          <p className="text-[8px] font-black uppercase tracking-[0.3rem] text-zinc-500 px-3 hidden group-hover:block">Forms & Requests</p>
        </div>

        {can('forms.intake') && <NavItem to="/forms/intake" icon={<FileEdit size={20} />} label="Form Intake" />}
        {can('reports.submit') && <NavItem to="/dashboard/report" icon={<FileEdit size={20} />} label="Chairman Report" />}
        <NavItem to="/excusals/status" icon={<Clock size={20} />} label="My Excusals" />
        {canViewFinance && <NavItem to="/finance/dues" icon={<CreditCard size={20} />} label="Dues" />}

        {(canUseOfficerWorkflows || canManageRecords || canReviewExcusals) && (
          <div className="py-2 opacity-20 group-hover:opacity-100 transition-opacity">
            <div className="h-px bg-white/10 mx-2 my-2" />
            <p className="text-[8px] font-black uppercase tracking-[0.3rem] text-zinc-500 px-3 hidden group-hover:block">Admin Protocol</p>
          </div>
        )}

        {canManageRecords && <NavItem to="/forms/secretary" icon={<Layers size={20} />} label="Secretary Hub" />}
        {can('admin.members.view') && <NavItem to="/admin/members" icon={<TableProperties size={20} />} label="Member Registry" />}
        {can('reports.view_all') && <NavItem to="/admin/reports" icon={<Layers size={20} />} label="Reports View" />}
        {can('forms.builder.manage') && <NavItem to="/forms/builder" icon={<PenTool size={20} />} label="Form Builder" />}
        {can('forms.responses.view') && <NavItem to="/forms/responses" icon={<BarChart3 size={20} />} label="Responses" />}
        {canReviewExcusals && <NavItem to="/excusals/review" icon={<Shield size={20} />} label="Excusal Review" />}
        <NavItem to="/archive" icon={<History size={20} />} label="Archive" />
      </nav>

      <div className="mt-auto px-4 space-y-2">
        <NavItem to="/support" icon={<HelpCircle size={20} />} label="Support" />
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-4 p-3 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200 w-full text-left"
        >
          <LogOut size={20} />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </aside>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
      isActive 
        ? "bg-primary/10 text-primary border-r-2 border-primary" 
        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
    )}
  >
    <div className="shrink-0">{icon}</div>
    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-widest whitespace-nowrap">
      {label}
    </span>
  </NavLink>
);
