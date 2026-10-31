'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { RoleName } from '@hospital/shared-types';

// Map route path to display title
function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname.startsWith('/patients')) return 'Patients';
  if (pathname.startsWith('/appointments')) return 'Appointments';
  if (pathname.startsWith('/doctors')) return 'Doctors & Schedules';
  if (pathname.startsWith('/audit-logs')) return 'Audit Trail Logs';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Advfiction HMS';
}

// Map role to badge variant
function getRoleBadgeVariant(role: RoleName): 'superadmin' | 'info' | 'warning' | 'success' | 'secondary' {
  switch (role) {
    case 'SUPER_ADMIN': return 'superadmin';
    case 'ADMIN': return 'info';
    case 'RECEPTIONIST': return 'warning';
    case 'DOCTOR': return 'success';
    case 'NURSE': return 'secondary';
    default: return 'secondary';
  }
}

// Format role for display
function formatRole(role: RoleName): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Header() {
  const pathname = usePathname();
  const { currentUser, currentRole, logout } = useRole();
  const pageTitle = getPageTitle(pathname);

  // Get user initials for avatar
  const initials = currentUser.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-[#F3F4F6] bg-white shadow-sm">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">

        {/* Left: Mobile menu toggle + Page title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger (sidebar drawer trigger — placeholder) */}
          <button
            type="button"
            className="lg:hidden -ml-1 rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Page title: 20px bold gray-900 */}
          <h1 className="text-xl font-bold text-[#111827] truncate">{pageTitle}</h1>
        </div>

        {/* Right: User info + Logout — NO role switcher */}
        <div className="flex items-center gap-3">
          {/* User name (hidden on small screens) */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-[#111827] leading-none">
              {currentUser.fullName.split('(')[0].trim()}
            </span>
            <Badge
              variant={getRoleBadgeVariant(currentRole)}
              className="mt-1 text-[10px] py-0 px-1.5"
            >
              {formatRole(currentRole)}
            </Badge>
          </div>

          {/* Avatar: 28×28px, rounded-lg, #2563EB background */}
          <div
            className="h-7 w-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold shrink-0"
            aria-hidden="true"
            title={currentUser.fullName}
          >
            {initials || '?'}
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] px-2"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline text-sm">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
