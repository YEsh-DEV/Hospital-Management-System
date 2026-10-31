import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
  const SetMetadata = require('@nestjs/common').SetMetadata;
  return SetMetadata(ROLES_KEY, roles);
};

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => {
  const SetMetadata = require('@nestjs/common').SetMetadata;
  return SetMetadata(PERMISSIONS_KEY, permissions);
};

// Aliases used by new feature modules (departments, doctors, leads, calls, etc.)
export const Permissions = RequirePermissions;

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Access denied');

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    if (requiredPermissions) {
      const userPerms: string[] = user.permissions || [];
      const missing = requiredPermissions.filter((p) => !userPerms.includes(p));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Access denied. Missing permissions: ${missing.join(', ')}`,
        );
      }
    }

    return true;
  }
}

// PermissionsGuard is an alias for RolesGuard (same logic, handles both roles & permissions)
export const PermissionsGuard = RolesGuard;

@Injectable()
export class AuditLogImmutabilityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method.toUpperCase();

    // Block any mutating method on audit logs
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new ForbiddenException('Audit logs are immutable. Modification is not permitted.');
    }
    return true;
  }
}
