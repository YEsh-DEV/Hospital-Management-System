import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// PDF Module 3: rounded-full, 12px medium, horizontal padding 10px, vertical 2px, approved semantic tokens only
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[#2563EB] text-white border-transparent',
        secondary:
          'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]',
        outline:
          'border border-[#E5E7EB] text-[#374151] bg-transparent',
        // Semantic: success/active
        success:
          'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
        // Semantic: danger/error
        danger:
          'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
        // Semantic: warning/pending
        warning:
          'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
        // Semantic: info
        info:
          'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
        // Diagnostic/high-privilege (Super Admin)
        superadmin:
          'bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]',
        // Procedure/operational
        procedure:
          'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
