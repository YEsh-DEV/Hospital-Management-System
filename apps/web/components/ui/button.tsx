import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base: rounded-xl (12px), 14px medium, 150ms transition, active:scale-95, 2px focus ring in #3B82F6
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        // Primary: #2563EB fill, #1D4ED8 hover — NEVER use #3B82F6 as fill
        default:
          'bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]',
        destructive:
          'bg-[#DC2626] text-white shadow-sm hover:bg-[#B91C1C]',
        outline:
          'border border-[#E5E7EB] bg-white text-[#374151] shadow-sm hover:bg-[#F3F4F6] hover:text-[#111827]',
        secondary:
          'bg-[#F3F4F6] text-[#374151] shadow-sm hover:bg-[#E5E7EB]',
        ghost:
          'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]',
        link:
          'text-[#2563EB] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
