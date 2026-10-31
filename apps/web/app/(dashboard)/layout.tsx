'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';
import { useRole } from '@/context/RoleContext';
import { apiClient } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setUser, currentUser } = useRole();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      // Check active tab session beacon
      const hasActiveSessionBeacon =
        typeof window !== 'undefined' &&
        sessionStorage.getItem('advfiction_active_session') === 'true';

      try {
        const res = await apiClient.getMe();
        if (!isMounted) return;

        if (res.status === 200 && res.data?.user) {
          // If in an active in-tab session or valid session cookie, set user
          const verifiedUser = {
            id: res.data.user.id,
            email: res.data.user.email,
            fullName: res.data.user.fullName,
            role: res.data.user.role,
            permissions: res.data.user.permissions || [],
          };
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('advfiction_active_session', 'true');
            sessionStorage.setItem('advfiction_user', JSON.stringify(verifiedUser));
          }
          setUser(verifiedUser);
          setIsVerifying(false);
          return;
        }

        // If backend returned non-200 (e.g. status 0 from CORS/network error, or standalone Vercel demo)
        // Retain the active in-tab session if present
        if (hasActiveSessionBeacon) {
          try {
            const savedUserStr = sessionStorage.getItem('advfiction_user');
            if (savedUserStr) {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.role) {
                setUser(savedUser);
                setIsVerifying(false);
                return;
              }
            }
          } catch {
            // fallback
          }
          setIsVerifying(false);
          return;
        }

        // Unauthenticated and no active session beacon -> redirect to login
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('advfiction_active_session');
          sessionStorage.removeItem('advfiction_user');
        }
        router.replace('/login');
      } catch {
        // Backend offline or error -> check if we have a demo session
        if (hasActiveSessionBeacon) {
          setIsVerifying(false);
          return;
        }
        router.replace('/login');
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router, setUser]);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar: fixed, dark slate, 256px */}
      <Sidebar />

      {/* Main area: flex-1 column with header + content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />

        {/* Page workspace */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
