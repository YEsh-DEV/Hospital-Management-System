'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
  visible?: boolean;
}

// PDF Module 3: bottom-right, dark gray bg + white text, rounded-xl, shadow-2xl
// Auto-dismiss 3 seconds but remains accessible
export function Toast({ message, variant = 'info', onClose, visible = true }: ToastProps) {
  React.useEffect(() => {
    if (visible && onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-[#34D399] shrink-0" />,
    error: <XCircle className="h-4 w-4 text-[#F87171] shrink-0" />,
    info: <CheckCircle2 className="h-4 w-4 text-[#60A5FA] shrink-0" />,
    warning: <CheckCircle2 className="h-4 w-4 text-[#FBBF24] shrink-0" />,
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-xl bg-[#111827] px-4 py-3 text-sm text-white shadow-2xl max-w-sm',
        'animate-in slide-in-from-bottom-4 fade-in-0 duration-200'
      )}
    >
      {icons[variant]}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-0.5 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = React.useState<{
    message: string;
    variant: ToastVariant;
    visible: boolean;
  } | null>(null);

  const show = React.useCallback((message: string, variant: ToastVariant = 'info') => {
    setToast({ message, variant, visible: true });
  }, []);

  const hide = React.useCallback(() => {
    setToast(null);
  }, []);

  return { toast, show, hide };
}
