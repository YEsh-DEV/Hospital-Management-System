'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      const result = await apiClient.forgotPassword(email);

      // Do NOT reveal whether the account exists — always show success
      // unless there is a definitive server/network error.
      if (result.status === 0 || result.status >= 500) {
        setApiError('Unable to connect to the server. Please try again shortly.');
        setLoading(false);
        return;
      }

      if (result.status === 429) {
        setApiError('Too many requests. Please wait a moment before trying again.');
        setLoading(false);
        return;
      }

      // Show success for any other response (200, 404 treated identically)
      setSubmitted(true);
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-sm text-[#6B7280] mt-1">Password recovery</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#F3F4F6] bg-white shadow-sm p-6 sm:p-8">

          {submitted ? (
            /* Success state */
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-4">
                <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#15803D]">Check your email</p>
                  <p className="text-xs text-[#166534] leading-relaxed">
                    If an account is associated with <span className="font-medium">{email}</span>,
                    a reset link has been sent. The link expires in 60 minutes.
                  </p>
                </div>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Sign In
                </Button>
              </Link>

              <p className="text-center text-xs text-[#9CA3AF]">
                Security controls enabled.
              </p>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[#111827]">Forgot your password?</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {/* API Error Banner */}
              {apiError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-[#374151]">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    disabled={loading}
                    placeholder="you@hospital.com"
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-invalid={!!emailError}
                    className={emailError ? 'border-[#FECACA] focus-visible:ring-[#DC2626]' : ''}
                  />
                  {emailError && (
                    <p id="email-error" role="alert" className="text-xs text-[#DC2626]">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button type="submit" disabled={loading} className="w-full" aria-busy={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Sending reset link…
                    </>
                  ) : (
                    'Send reset link'
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
      </div>
    </div>
  );
}
