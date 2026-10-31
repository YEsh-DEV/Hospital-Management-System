import * as React from 'react';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from './button';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  description = 'You do not have permission to view this page. Contact your administrator if you believe this is an error.',
  backHref = '/dashboard',
  backLabel = 'Return to Dashboard',
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mb-6">
        <ShieldX className="h-8 w-8 text-[#DC2626]" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-[#111827] mb-2">{title}</h1>
      <p className="text-sm text-[#6B7280] mb-8 max-w-md">{description}</p>
      <Link href={backHref}>
        <Button variant="outline">{backLabel}</Button>
      </Link>
    </div>
  );
}
