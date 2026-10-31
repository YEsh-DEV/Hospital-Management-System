'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Stethoscope,
  ShieldAlert,
  Settings,
  HelpCircle,
  Activity,
  PhoneCall,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // which roles can see this item
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
  },
  {
    title: 'Patients',
    href: '/patients',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
  },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: CalendarCheck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
  },
  {
    title: 'Doctors & Schedules',
    href: '/doctors',
    icon: Stethoscope,
    roles: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'],
  },
  {
    title: 'Leads & Calls',
    href: '/leads-calls',
    icon: PhoneCall,
    roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'],
  },
  {
    title: 'Audit Logs',
    href: '/audit-logs',
    icon: ShieldAlert,
    roles: ['SUPER_ADMIN'], // ONLY Super Admin sees this
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();

  // Filter nav items to only those accessible by current role
  const visibleItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(currentRole)
  );

  return (
    // PDF Module 3: #0F172A sidebar, fixed full height, 256px wide
    <aside
      className="w-64 shrink-0 flex flex-col bg-[#0F172A] min-h-screen"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        {/* Logo tile: 36×36px, rounded-xl, #2563EB background */}
        <div className="h-9 w-9 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          {/* Brand title: text-sm font-bold white */}
          <p className="text-sm font-bold text-white truncate leading-tight">Advfiction HMS</p>
          {/* Subtitle: 10px text-white/50 */}
          <p className="text-[10px] text-white/50 truncate leading-tight">Hospital Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Sidebar navigation">
        {/* Module label: 10px uppercase tracking-widest text-white/40 */}
        <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-white/40 select-none">
          Clinical Operations
        </p>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          type="button"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors duration-150"
          aria-label="Help and support"
        >
          <HelpCircle className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>Help & Support</span>
        </button>
        {/* Version info */}
        <p className="px-3 text-[10px] text-white/30 select-none mt-2">Advfiction HMS v1.0</p>
      </div>
    </aside>
  );
}
