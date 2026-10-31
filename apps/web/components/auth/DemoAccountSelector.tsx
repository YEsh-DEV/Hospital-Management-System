'use client';

import React from 'react';
import { RoleName } from '@hospital/shared-types';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Activity,
  Check,
} from 'lucide-react';

export interface DemoAccount {
  role: RoleName;
  title: string;
  email: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'SUPER_ADMIN',
    title: 'Super Admin',
    email: 'superadmin@hospital.com',
    description: 'System configuration & role/permission management',
    icon: ShieldAlert,
  },
  {
    role: 'ADMIN',
    title: 'Operations Admin',
    email: 'admin@hospital.com',
    description: 'Staff account management & hospital operational reports',
    icon: ShieldCheck,
  },
  {
    role: 'RECEPTIONIST',
    title: 'Lead Receptionist',
    email: 'reception@hospital.com',
    description: 'Patient registration, appointment booking & scheduling',
    icon: UserCheck,
  },
  {
    role: 'DOCTOR',
    title: 'Attending Doctor',
    email: 'doctor@hospital.com',
    description: 'Assigned patients, duty schedule & clinical records',
    icon: Stethoscope,
  },
  {
    role: 'NURSE',
    title: 'Care Nurse',
    email: 'nurse@hospital.com',
    description: 'Triage queue, vitals logging & patient care workflows',
    icon: Activity,
  },
];

interface DemoAccountSelectorProps {
  selectedEmail: string;
  onSelectAccount: (email: string) => void;
  disabled?: boolean;
}

export function DemoAccountSelector({
  selectedEmail,
  onSelectAccount,
  disabled = false,
}: DemoAccountSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Demo Accounts
          </h3>
          <p className="text-[11px] text-[#9CA3AF]">
            Click a persona to auto-fill email and password.
          </p>
        </div>
        <span className="text-[10px] font-medium bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
          Demo Mode
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" role="group" aria-label="Demo accounts selector">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = account.icon;
          const isSelected = selectedEmail === account.email;

          return (
            <div
              key={account.role}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-label={`Select demo account ${account.title}`}
              onClick={() => {
                if (!disabled) {
                  onSelectAccount(account.email);
                }
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAccount(account.email);
                }
              }}
              className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                disabled ? 'opacity-50 pointer-events-none' : ''
              } ${
                isSelected
                  ? 'bg-[#EFF6FF] border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
                  : 'bg-white border-[#E5E7EB] hover:border-[#BFDBFE] hover:bg-[#F9FAFB]'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              {/* Account Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-[#111827] truncate">
                    {account.title}
                  </span>
                  {isSelected && (
                    <span className="h-4 w-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-[#2563EB] truncate mt-0.5">
                  {account.email}
                </p>
                <p className="text-[10px] text-[#6B7280] line-clamp-2 mt-1 leading-tight">
                  {account.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
