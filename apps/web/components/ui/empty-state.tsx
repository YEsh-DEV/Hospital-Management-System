import * as React from 'react';
import { cn } from '@/lib/utils';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
        <InboxIcon className="h-6 w-6 text-[#9CA3AF]" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[#111827] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] mb-4 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
