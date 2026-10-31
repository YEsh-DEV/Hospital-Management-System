'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const urlError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(
    urlError === 'expired'
      ? 'This reset link has expired or is invalid. Please request a new one.'
      : null
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isTokenInvalid = !token || urlError === 'expired';

  const validate = (): boolean => {
    const errors: { password?: string; confirm?: string } = {};
    if (!password) {
      errors.password = 'New password is required.';
    } else if (password.length < 12) {
      errors.password = 'Password must be at least 12 characters.';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirm = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      const result = await apiClient.resetPassword(token, password);

      if (result.status === 400 || result.status === 401 || result.status === 410) {
        setApiError('This reset link is invalid or has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      if (result.status === 0 || result.status >= 500) {
        setApiError('Unable to connect to the server. Please try again shortly.');
        setLoading(false);
        return;
      }

      if (result.error || !result.data) {
        setApiError(result.error || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F3F4F6] bg-white shadow-sm p-6 sm:p-8">

      {success ? (
        /* Success state */
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#15803D]">Password reset successfully</p>
              <p className="text-xs text-[#166534] leading-relaxed">
                Your password has been updated. You can now sign in with your new credentials.
              </p>
            </div>
          </div>

          <Link href="/login">
            <Button className="w-full">Sign in</Button>
          </Link>

          <p className="text-center text-xs text-[#9CA3AF]">
            Security controls enabled.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#111827]">Reset your password</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Enter your new password below.</p>
          </div>

          {/* Expired / invalid token banner */}
          {isTokenInvalid && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-sm text-[#C2410C]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {urlError === 'expired'
                  ? 'This reset link has expired. Please '
                  : 'No reset token found. Please '}
                <Link href="/forgot-password" className="underline font-medium hover:text-[#9A3412]">
                  request a new link
                </Link>
                .
              </span>
            </div>
          )}

          {/* API error banner */}
          {apiError && !isTokenInvalid && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* New password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                New password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  disabled={loading || isTokenInvalid}
                  placeholder="At least 12 characters"
                  className={`pr-10 ${fieldErrors.password ? 'border-[#FECACA] focus-visible:ring-[#DC2626]' : ''}`}
                  aria-describedby="password-hint password-error"
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isTokenInvalid}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded disabled:cursor-not-allowed"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {/* Password requirements hint */}
              <p id="password-hint" className="text-xs text-[#6B7280]">
                Must be at least 12 characters (backend security policy).
              </p>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-[#DC2626]">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[#374151]">
                Confirm new password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm) setFieldErrors((f) => ({ ...f, confirm: undefined }));
                  }}
                  disabled={loading || isTokenInvalid}
                  placeholder="Re-enter your password"
                  className={`pr-10 ${fieldErrors.confirm ? 'border-[#FECACA] focus-visible:ring-[#DC2626]' : ''}`}
                  aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
                  aria-invalid={!!fieldErrors.confirm}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  disabled={loading || isTokenInvalid}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded disabled:cursor-not-allowed"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirm && (
                <p id="confirm-error" role="alert" className="text-xs text-[#DC2626]">
                  {fieldErrors.confirm}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || isTokenInvalid}
              className="w-full"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Resetting password…
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            {/* Back link */}
            <p className="text-center text-xs text-[#6B7280]">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded"
              >
                Sign in
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-[#9CA3AF]">
            Security controls enabled.
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F9FAFB] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-xl bg-[#2563EB] items-center justify-center shadow-sm mx-auto">
            <Activity className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827]">Advfiction HMS</h1>
            <p className="text-sm text-[#6B7280] mt-1">Reset your password</p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[#F3F4F6] bg-white shadow-sm p-8 text-center text-sm text-[#6B7280]">
              Loading…
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
