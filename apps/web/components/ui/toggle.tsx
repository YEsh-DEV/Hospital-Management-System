'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

// PDF Module 3: 36×20px, 14px thumb, rounded-full, 200ms transition
// OFF: gray-200 (#E5E7EB), ON: primary-600 (#2563EB)
export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
  const toggleId = id || React.useId();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-lg transform transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <label htmlFor={toggleId} className="text-sm font-medium text-[#374151] cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
