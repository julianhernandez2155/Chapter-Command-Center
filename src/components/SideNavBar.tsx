import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronDown,
  Shield, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  LogOut,
  UserRound,
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
  const { can, canAny, member, roles, signOut, verificationStatus } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const canManageRecords = canAny(['attendance.import', 'forms.builder.manage', 'positions.manage']);
  const canReviewExcusals = can('excusals.review');
  const canViewFinance = can('finance.dues.view');
  const canUseOfficerWorkflows = canAny(['forms.intake', 'reports.submit', 'reports.view_all', 'forms.responses.view']);
  const displayName = member
    ? `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`
    : 'Chapter User';
  const roleName = roles && roles.length > 0
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1)
    : 'Member';
  const needsVerification = Boolean(verificationStatus?.is_gate_required && !verificationStatus.is_complete);
  const initials = member
    ? `${(member.preferred_name || member.legal_first_name).charAt(0)}${member.legal_last_name.charAt(0)}`.toUpperCase()
    : 'CC';

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

        <div className="relative pt-2">
          <button
            onClick={() => {
              setProfileOpen(current => !current);
            }}
            className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-on-surface"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
              {initials}
            </span>
            <span className="min-w-0 flex-1 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="block truncate text-xs font-black text-on-surface">{displayName}</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12rem] text-on-surface-variant">{roleName}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>

          {profileOpen && (
            <>
              <button
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setProfileOpen(false)}
              />
              <div className="fixed bottom-6 left-24 z-50 w-72 rounded-3xl bg-surface-container-low p-4 shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
                <div className="mb-3 px-2">
                  <p className="truncate text-sm font-black text-on-surface">{displayName}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14rem] text-on-surface-variant">{roleName}</p>
                </div>
                <NavLink
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-[0.12rem] text-on-surface hover:bg-surface-container-high"
                >
                  <UserRound size={15} />
                  My Profile
                </NavLink>
                {needsVerification && (
                  <NavLink
                    to="/verify"
                    onClick={() => setProfileOpen(false)}
                    className="mt-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-[0.12rem] text-on-surface hover:bg-surface-container-high"
                  >
                    <Settings size={15} />
                    Verify Profile
                  </NavLink>
                )}
                <button
                  onClick={async () => {
                    setProfileOpen(false);
                    await signOut();
                  }}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12rem] text-primary hover:bg-primary/10"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
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
