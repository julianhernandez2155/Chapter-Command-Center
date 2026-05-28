import React from 'react';
import { Search } from 'lucide-react';

interface TopAppBarProps {
  showSearch?: boolean;
}

export const TopAppBar = ({ showSearch = true }: TopAppBarProps) => {
  if (!showSearch) return null;

  return (
    <header className="fixed top-0 right-0 left-20 z-40 flex h-20 items-center justify-end bg-surface/80 px-12 font-sans backdrop-blur-md">
      <div className="flex items-center space-x-8">
        <div className="group relative hidden md:block">
          <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant/40">
            <Search size={16} />
          </span>
          <input
            className="w-64 rounded-full border-none bg-surface-container-low py-1.5 pl-10 pr-4 text-sm text-on-surface transition-all placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50"
            placeholder="Search app..."
            type="text"
          />
        </div>
      </div>
    </header>
  );
};
