'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RoleName, UserSession, ROLE_PERMISSIONS } from '@hospital/shared-types';
import apiClient from '@/lib/api-client';

interface RoleContextType {
  currentRole: RoleName;
  currentUser: UserSession;
  setRole: (role: RoleName) => void;
  setUser: (user: UserSession) => void;
  logout: () => Promise<void>;
  canAccessAuditLogs: boolean;
  canManageUsers: boolean;
  canEditPatients: boolean;
}

// Default unauthenticated state — used before login
const UNAUTHENTICATED_USER: UserSession = {
  id: '',
  email: '',
  fullName: 'Guest',
  role: 'RECEPTIONIST',
  permissions: [],
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession>(UNAUTHENTICATED_USER);
  const [currentRole, setCurrentRole] = useState<RoleName>('RECEPTIONIST');

  // Hydrate session from sessionStorage on mount (survives tab refreshes on Vercel)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const activeSession = sessionStorage.getItem('advfiction_active_session');
      const savedUserStr = sessionStorage.getItem('advfiction_user');
      if (activeSession === 'true' && savedUserStr) {
        const savedUser = JSON.parse(savedUserStr) as UserSession;
        if (savedUser && savedUser.role) {
          setCurrentUser(savedUser);
          setCurrentRole(savedUser.role);
        }
      }
    } catch {
      // Ignore parse errors or unavailable storage
    }
  }, []);

  const setRole = useCallback((role: RoleName) => {
    setCurrentRole(role);
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        role,
        permissions: ROLE_PERMISSIONS[role] || [],
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('advfiction_user', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const setUser = useCallback((user: UserSession) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('advfiction_user', JSON.stringify(user));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore errors — clear state regardless
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('advfiction_active_session');
      sessionStorage.removeItem('advfiction_user');
    }
    setCurrentUser(UNAUTHENTICATED_USER);
    setCurrentRole('RECEPTIONIST');
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const canAccessAuditLogs = currentRole === 'SUPER_ADMIN';
  const canManageUsers = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
  const canEditPatients = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentRole);

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUser,
        setRole,
        setUser,
        logout,
        canAccessAuditLogs,
        canManageUsers,
        canEditPatients,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
