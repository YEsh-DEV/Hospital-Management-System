import { stripSecrets } from '../src/common/utils/secret-stripper';
import * as argon2 from 'argon2';
import { RolesGuard, AuditLogImmutabilityGuard } from '../src/rbac/rbac.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, MethodNotAllowedException, UnauthorizedException } from '@nestjs/common';
import { AuditController } from '../src/audit/audit.controller';
import { AuthService } from '../src/auth/auth.service';

describe('Requirement Verification Matrix Tests', () => {
  describe('NFR-1.2: Argon2id Password Hashing & Security', () => {
    it('should hash passwords using Argon2id and verify match', async () => {
      const plain = 'VerySecureMedicalPassword123#';
      const hash = await argon2.hash(plain, { type: argon2.argon2id });

      expect(hash).toContain('$argon2id$');
      const matches = await argon2.verify(hash, plain);
      expect(matches).toBe(true);

      const wrongMatches = await argon2.verify(hash, 'WrongPassword!');
      expect(wrongMatches).toBe(false);
    });
  });

  describe('Secret Stripper for Audit Logging (Credential Leak Prevention)', () => {
    it('should recursively redact password, token, and secret fields from snapshots', () => {
      const rawPayload = {
        id: 'usr_123',
        email: 'doctor@hospital.com',
        password: 'PlainTextPassword123!',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
        apiKey: 'sk_live_secret123',
        nested: {
          refreshToken: 'secret_jwt_refresh_token',
          normalField: 'Cardiology',
        },
      };

      const sanitized = stripSecrets(rawPayload);

      expect(sanitized.id).toBe('usr_123');
      expect(sanitized.email).toBe('doctor@hospital.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.refreshToken).toBe('[REDACTED]');
      expect(sanitized.nested.normalField).toBe('Cardiology');
    });
  });

  describe('FR-2.1 / FR-2.2: RBAC Evaluation & Boundary Tests', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    const createMockContext = (user: any, requiredRoles?: string[], requiredPermissions?: string[]): ExecutionContext => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
        if (key === 'roles') return requiredRoles;
        if (key === 'permissions') return requiredPermissions;
        return undefined;
      });

      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    };

    it('RECEPTIONIST user attempting GET /api/audit-logs receives 403 Forbidden', () => {
      const receptionistUser = {
        id: 'usr_recept_01',
        role: 'RECEPTIONIST',
        permissions: ['patient:read', 'patient:create', 'appointment:read'],
      };

      const ctx = createMockContext(receptionistUser, ['SUPER_ADMIN']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('SUPER_ADMIN user attempting GET /api/audit-logs is allowed', () => {
      const superAdminUser = {
        id: 'usr_super_01',
        role: 'SUPER_ADMIN',
        permissions: ['audit:read'],
      };

      const ctx = createMockContext(superAdminUser, ['SUPER_ADMIN']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('FR-1.4: AI Receptionist token attempting /api/patients is blocked with 403 Forbidden', () => {
      const aiUser = {
        id: 'ai_service_01',
        role: 'AI_SERVICE',
        permissions: ['availability:read', 'booking:create'],
      };

      // /api/patients requires 'patient:read'
      const ctx = createMockContext(aiUser, undefined, ['patient:read']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('FR-1.4: AI Receptionist token accessing /api/availability is allowed', () => {
      const aiUser = {
        id: 'ai_service_01',
        role: 'AI_SERVICE',
        permissions: ['availability:read', 'booking:create'],
      };

      const ctx = createMockContext(aiUser, undefined, ['availability:read']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });
  });

  describe('NFR-1.1: Audit Log Immutability (Write-Only Guarantee)', () => {
    it('executing DELETE /api/audit-logs/:id throws MethodNotAllowedException (HTTP 405)', () => {
      const mockAuditService = {
        log: jest.fn(),
        findAll: jest.fn(),
      } as any;

      const controller = new AuditController(mockAuditService);

      expect(() => controller.deleteAuditLog('aud_12345')).toThrow(
        MethodNotAllowedException
      );
    });
  });

  describe('Demo Account Login & Auth Hardening (validateUser)', () => {
    let authService: AuthService;
    let mockUsersService: any;
    let validHash: string;

    beforeEach(async () => {
      mockUsersService = {
        findByEmailWithHash: jest.fn(),
      };
      const mockPrisma = {} as any;
      const mockJwt = {} as any;
      authService = new AuthService(mockPrisma, mockUsersService, mockJwt);
      validHash = await authService.hashPassword('SuperSecret123#');
    });

    it('should validate user when credentials are correct (role resolved from DB)', async () => {
      mockUsersService.findByEmailWithHash.mockResolvedValue({
        id: 'usr_doc_01',
        email: 'doctor@hospital.com',
        fullName: 'Dr. Sarah Jenkins',
        passwordHash: validHash,
        isActive: true,
        role: { name: 'DOCTOR' },
      });

      // Role is no longer passed to validateUser — it is resolved from the DB record
      const user = await authService.validateUser('doctor@hospital.com', 'SuperSecret123#');
      expect(user).toBeDefined();
      expect(user.id).toBe('usr_doc_01');
      expect(user.passwordHash).toBeUndefined(); // Never expose hash
    });

    it('should return the user regardless of which human role they have (role-gating moved to LocalStrategy)', async () => {
      mockUsersService.findByEmailWithHash.mockResolvedValue({
        id: 'usr_doc_01',
        email: 'doctor@hospital.com',
        fullName: 'Dr. Sarah Jenkins',
        passwordHash: validHash,
        isActive: true,
        role: { name: 'DOCTOR' },
      });

      // validateUser no longer enforces role matching — the resolved DB role is the truth.
      // Role-mismatch blocking (e.g. user tries wrong persona) is no longer a concern
      // because the role dropdown has been removed from the login UI.
      const user = await authService.validateUser('doctor@hospital.com', 'SuperSecret123#');
      expect(user).toBeDefined();
      expect(user.role.name).toBe('DOCTOR');
    });

    it('should throw UnauthorizedException when account is inactive (isActive: false)', async () => {
      mockUsersService.findByEmailWithHash.mockResolvedValue({
        id: 'usr_disabled_01',
        email: 'disabled@hospital.com',
        fullName: 'Inactive Staff',
        passwordHash: validHash,
        isActive: false,
        role: { name: 'NURSE' },
      });

      await expect(
        authService.validateUser('disabled@hospital.com', 'SuperSecret123#')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return the AI_SERVICE user from validateUser — AI blocking is enforced by LocalStrategy', async () => {
      // validateUser itself no longer blocks AI_SERVICE.
      // The LocalStrategy.validate() method checks user.role?.name === 'AI_SERVICE'
      // and throws UnauthorizedException before the controller is reached.
      mockUsersService.findByEmailWithHash.mockResolvedValue({
        id: 'usr_ai_01',
        email: 'ai@hospital.com',
        fullName: 'AI Voice Service',
        passwordHash: validHash,
        isActive: true,
        role: { name: 'AI_SERVICE' },
      });

      const user = await authService.validateUser('ai@hospital.com', 'SuperSecret123#');
      // validateUser returns the user; LocalStrategy is responsible for blocking AI_SERVICE
      expect(user).toBeDefined();
      expect(user.role.name).toBe('AI_SERVICE');
    });
  });
});
