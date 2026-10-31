'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DemoAccountSelector } from '@/components/auth/DemoAccountSelector';
import { Activity, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useRole } from '@/context/RoleContext';
import { RoleName, ROLE_PERMISSIONS } from '@hospital/shared-types';

const DEMO_PASSWORD = 'SuperSecret123#';

const DEMO_ACCOUNTS: Record<string, { role: RoleName; fullName: string; id: string }> = {
  'superadmin@hospital.com': {
    role: 'SUPER_ADMIN',
    fullName: 'Super Admin (System Owner)',
    id: 'demo-superadmin-01',
  },
  'admin@hospital.com': {
    role: 'ADMIN',
    fullName: 'Hospital Administrator',
    id: 'demo-admin-01',
  },
  'reception@hospital.com': {
    role: 'RECEPTIONIST',
    fullName: 'Reception Desk',
    id: 'demo-reception-01',
  },
  'doctor@hospital.com': {
    role: 'DOCTOR',
    fullName: 'Dr. Arthur Vance',
    id: 'demo-doctor-01',
  },
  'nurse@hospital.com': {
    role: 'NURSE',
    fullName: 'Nurse Joy',
    id: 'demo-nurse-01',
  },
};

type LoginState =
  | 'idle'
  | 'submitting'
  | 'invalid_input'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'server_error';

export default function LoginPage() {
  const router = useRouter();
  const { setRole, setUser } = useRole();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Enabled by default on local dev and Vercel deployments unless explicitly set to 'false'
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setLoginState('invalid_input');
      return;
    }

    setLoginState('submitting');
    setErrorMessage(null);

    const normalizedEmail = email.toLowerCase().trim();
    const demoAccount = DEMO_ACCOUNTS[normalizedEmail];

    try {
      // Call real API — sends email, password, rememberMe (role is resolved server-side)
      const result = await apiClient.login(email, password, rememberMe);

      if (result.status === 429) {
        setLoginState('rate_limited');
        setErrorMessage('Too many login attempts. Please wait a moment before trying again.');
        return;
      }

      if (result.status === 401 || result.status === 403) {
        setLoginState('invalid_credentials');
        setErrorMessage(
          result.error || 'Invalid credentials or account not authorized.'
        );
        return;
      }

      // Live backend response succeeded
      if (result.data?.user) {
        const serverRole = result.data.user?.role as RoleName;
        const serverUser = {
          id: result.data.user.id || (demoAccount ? demoAccount.id : 'usr-1'),
          email: result.data.user.email || email,
          fullName: result.data.user.fullName || (demoAccount ? demoAccount.fullName : 'Hospital Staff'),
          role: serverRole,
          permissions: result.data.user.permissions || ROLE_PERMISSIONS[serverRole] || [],
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('advfiction_active_session', 'true');
          sessionStorage.setItem('advfiction_user', JSON.stringify(serverUser));
        }

        setUser(serverUser);
        router.push('/dashboard');
        return;
      }

      // Backend unreachable (e.g. standalone Vercel frontend deployment without separate API host)
      if (isDemoMode && demoAccount) {
        if (password !== DEMO_PASSWORD) {
          setLoginState('invalid_credentials');
          setErrorMessage('Invalid credentials.');
          return;
        }

        const demoUser = {
          id: demoAccount.id,
          email: normalizedEmail,
          fullName: demoAccount.fullName,
          role: demoAccount.role,
          permissions: ROLE_PERMISSIONS[demoAccount.role] || [],
        };

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('advfiction_active_session', 'true');
          sessionStorage.setItem('advfiction_user', JSON.stringify(demoUser));
        }

        setUser(demoUser);
        router.push('/dashboard');
        return;
      }

      if (result.status === 0 || result.status >= 500) {
        setLoginState('server_error');
        setErrorMessage('Unable to connect to the server. Please try again shortly.');
        return;
      }

      if (result.error || !result.data) {
        setLoginState('invalid_credentials');
        setErrorMessage(result.error || 'Login failed. Please check your credentials.');
        return;
      }
    } catch {
      // Fallback for demo accounts when network throws (e.g. CORS or offline Vercel demo)
      if (isDemoMode && demoAccount && password === DEMO_PASSWORD) {
        const demoUser = {
          id: demoAccount.id,
          email: normalizedEmail,
          fullName: demoAccount.fullName,
          role: demoAccount.role,
          permissions: ROLE_PERMISSIONS[demoAccount.role] || [],
        };
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('advfiction_active_session', 'true');
          sessionStorage.setItem('advfiction_user', JSON.stringify(demoUser));
        }
        setUser(demoUser);
        router.push('/dashboard');
        return;
      }

      setLoginState('server_error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  const isSubmitting = loginState === 'submitting';

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F9FAFB] p-4 sm:p-6">
      <div className={`w-full ${isDemoMode ? 'max-w-2xl' : 'max-w-md'} space-y-6 transition-all duration-200`}>

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-xl bg-[#2563EB] items-center justify-center shadow-sm mx-auto">
            <Activity className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827]">Advfiction HMS</h1>
            <p className="text-sm text-[#6B7280] mt-1">Sign in to your dashboard</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#F3F4F6] bg-white shadow-sm p-6 sm:p-8 space-y-6">

          {/* Form Header */}
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Staff Sign In</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Enter your credentials to access the portal.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
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
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                disabled={isSubmitting}
                placeholder="you@hospital.com"
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                aria-invalid={!!fieldErrors.email}
                className={fieldErrors.email ? 'border-[#FECACA] focus-visible:ring-[#DC2626]' : ''}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-[#DC2626]">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded"
                  tabIndex={0}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className={`pr-10 ${fieldErrors.password ? 'border-[#FECACA] focus-visible:ring-[#DC2626]' : ''}`}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-[#DC2626]">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember session */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#2563EB] focus:ring-[#3B82F6] disabled:cursor-not-allowed"
              />
              <label htmlFor="remember-me" className="text-sm text-[#374151] select-none cursor-pointer">
                Remember session for 8 hours
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>

          </form>

          {/* Demo Accounts Selector — Placed at the bottom of the card */}
          {isDemoMode && (
            <div className="pt-6 border-t border-[#F3F4F6]">
              <DemoAccountSelector
                selectedEmail={email}
                onSelectAccount={handleSelectDemoAccount}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Footer */}
          <p className="pt-2 text-center text-xs text-[#9CA3AF]">
            Security controls enabled. This system is for authorized staff only.
          </p>
        </div>
      </div>
    </div>
  );
}
