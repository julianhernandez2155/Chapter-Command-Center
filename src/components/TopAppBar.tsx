import React, { useState } from 'react';
import { Bell, Settings, Search, LogOut, ChevronDown, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface TopAppBarProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
}

export const TopAppBar = ({ title = "Chapter Command Center", subtitle, showSearch = true }: TopAppBarProps) => {
  const { member, roles, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const getInitials = () => {
    if (!member) return 'CC';
    const first = member.preferred_name || member.legal_first_name;
    const last = member.legal_last_name;
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const displayName = member
    ? `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`
    : 'Chapter User';

  const roleName = roles && roles.length > 0
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1)
    : 'Member';

  return (
    <header className="fixed top-0 right-0 left-20 z-40 flex items-center justify-between px-12 h-20 bg-surface/80 backdrop-blur-md font-sans">
      <div className="flex flex-col">
        <span className={cn(
          "font-black tracking-tighter text-on-surface transition-all duration-300",
          subtitle ? "text-2xl" : "text-xs uppercase tracking-[0.3em] text-on-surface-variant"
        )}>
          {title}
        </span>
        {subtitle && (
          <span className="text-on-surface-variant uppercase tracking-widest font-medium text-[10px] mt-1">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-8">
        {showSearch && (
          <div className="relative group hidden md:block">
            <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant/40">
              <Search size={16} />
            </span>
            <input 
              className="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-primary/50 transition-all text-on-surface placeholder:text-on-surface-variant/40" 
              placeholder="Search Command Center..." 
              type="text"
            />
          </div>
        )}

        <div className="flex items-center space-x-6">
          <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            <Bell size={20} />
          </button>
          
          {/* User profile dropdown trigger */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20 text-primary font-bold text-xs shadow-inner">
                {getInitials()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text transition-colors" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-3 w-56 bg-surface border border-border/60 rounded-2xl p-3 shadow-2xl z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-border/40 mb-2">
                    <p className="text-xs font-bold text-text truncate">{displayName}</p>
                    <p className="text-[10px] text-text-muted font-mono mt-0.5 uppercase tracking-wider">{roleName}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      // navigate to settings (future scope)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text hover:bg-surface-nav/30 transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-text-muted" />
                    System Settings
                  </button>

                  <button 
                    onClick={async () => {
                      setShowMenu(false);
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-error hover:bg-error/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Terminate Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
