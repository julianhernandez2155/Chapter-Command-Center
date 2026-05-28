import React, { useState } from 'react';
import { Bell } from 'lucide-react';

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-12 top-8 z-40">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        title="Notifications"
      >
        <Bell size={19} />
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-14 z-50 w-80 rounded-3xl bg-surface-container-low p-5 shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Notifications</p>
            <p className="mt-3 text-sm font-bold text-on-surface">No urgent chapter alerts.</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-on-surface-variant">
              Verification and workflow updates will appear here when they need attention.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
