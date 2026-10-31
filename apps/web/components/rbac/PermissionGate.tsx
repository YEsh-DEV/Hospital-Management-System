'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { PermissionAction, RoleName } from '@hospital/shared-types';

interface PermissionGateProps {
  permission?: PermissionAction;
  role?: RoleName | RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  role,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { currentRole, currentUser } = useRole();

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(currentRole)) {
      return <>{fallback}</>;
    }
  }

  if (permission) {
    if (!currentUser.permissions.includes(permission)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
