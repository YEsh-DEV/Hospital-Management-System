import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

// PDF Module 3: p-5, 48px icon box, 24px bold value, 12px title
export function StatCard({ title, value, subtitle, icon, iconBg = 'bg-[#EFF6FF]', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#F3F4F6] bg-white shadow-sm p-5',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{title}</p>
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#111827] leading-none">{value}</div>
      {subtitle && (
        <p className="text-xs text-[#6B7280] mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
