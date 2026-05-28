import React from 'react';

type AddressInputMode = 'street' | 'campus' | 'chapter_room';

const PLACEHOLDERS: Record<AddressInputMode, string> = {
  street: 'Street address or apartment address',
  campus: 'Dorm / building name',
  chapter_room: 'Room number'
};

export const AddressInput = ({
  label,
  value,
  mode,
  onChange,
  required,
  error,
  note
}: {
  label: string;
  value: string;
  mode: AddressInputMode;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  note?: string;
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
      {label}{required && <span className="text-primary"> *</span>}
    </span>
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={PLACEHOLDERS[mode]}
      autoComplete={mode === 'street' ? 'street-address' : 'off'}
      className="mt-2 w-full min-h-12 rounded-2xl bg-surface-container-lowest px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary/70"
    />
    {error && <span className="mt-1 block text-xs font-bold text-error">{error}</span>}
    {note?.trim() && (
      <div className="mt-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-on-surface">
        <span className="text-primary font-black">Secretary note:</span> {note.trim()}
      </div>
    )}
  </label>
);
