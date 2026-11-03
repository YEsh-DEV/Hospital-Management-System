import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { stripSecrets } from '../common/utils/secret-stripper';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  // ─── Password Utilities ───────────────────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    const pepper = process.env.ARGON2_PEPPER || '';
    return argon2.hash(password + pepper, ARGON2_OPTIONS);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    const pepper = process.env.ARGON2_PEPPER || '';
    try {
      return await argon2.verify(hash, password + pepper);
    } catch {
      return false;
    }
  }

  // ─── Validate User (used by LocalStrategy) ───────────────────────────────

  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmailWithHash(email);
      if (!user) return null;

      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive. Please contact your administrator.');
      }

      const valid = await this.verifyPassword(user.passwordHash, password);
      if (!valid) return null;

      // Strip the passwordHash before returning (never expose it)
      const { passwordHash: _hash, ...safeUser } = user as any;
      return safeUser;
    } catch (err: any) {
      // Graceful offline demo fallback when PostgreSQL is not running
      const normalized = email.toLowerCase().trim();
      const DEMO_PW = 'SuperSecret123#';
      if (password === DEMO_PW) {
        const demoUsers: Record<string, any> = {
          'superadmin@hospital.com': {
            id: 'usr-superadmin-01',
            email: 'superadmin@hospital.com',
            fullName: 'Super Administrator',
            isActive: true,
            role: { name: 'SUPER_ADMIN', permissions: [] },
          },
          'admin@hospital.com': {
            id: 'usr-admin-01',
            email: 'admin@hospital.com',
            fullName: 'Hospital Administrator',
            isActive: true,
            role: { name: 'ADMIN', permissions: [] },
          },
          'reception@hospital.com': {
            id: 'usr-reception-01',
            email: 'reception@hospital.com',
            fullName: 'Chief Receptionist',
            isActive: true,
            role: { name: 'RECEPTIONIST', permissions: [] },
          },
          'doctor@hospital.com': {
            id: 'usr-doctor-01',
            email: 'doctor@hospital.com',
            fullName: 'Dr. Rahul Menon',
            isActive: true,
            role: { name: 'DOCTOR', permissions: [] },
          },
        };
        if (demoUsers[normalized]) {
          return demoUsers[normalized];
        }
      }
      return null;
    }
  }

  // ─── Token Issuance ───────────────────────────────────────────────────────

  private buildAccessToken(user: any) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map((rp: any) => rp.permission.action),
        type: 'access',
      },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
  }

  private buildRefreshToken(user: any) {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET },
    );
  }

  async issueTokens(user: any, rememberMe = false) {
    const accessToken = this.buildAccessToken(user);
    const refreshToken = this.buildRefreshToken(user);

    // Store hashed refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + (rememberMe ? 8 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(user: any, rememberMe = false, ipAddress?: string, userAgent?: string) {
    const tokens = await this.issueTokens(user, rememberMe);

    await this.writeAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      auditableType: 'User',
      auditableId: user.id,
      newValues: stripSecrets({ email: user.email, role: user.role?.name }),
      ipAddress,
      userAgent,
    });

    return tokens;
  }

  // ─── Refresh Token Rotation ───────────────────────────────────────────────

  async refresh(refreshTokenRaw?: string, ipAddress?: string, userAgent?: string) {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!existing.user || !existing.user.isActive || existing.user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or disabled');
    }

    // Revoke the old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Issue new tokens
    const tokens = await this.issueTokens(existing.user);

    await this.writeAuditLog({
      userId: existing.user.id,
      action: 'TOKEN_REFRESH',
      auditableType: 'User',
      auditableId: existing.user.id,
      ipAddress,
      userAgent,
    });

    return {
      tokens,
      user: {
        id: existing.user.id,
        email: existing.user.email,
        fullName: existing.user.fullName,
        role: existing.user.role.name,
        permissions: existing.user.role.permissions.map((rp: any) => rp.permission.action),
      },
    };
  }

  // ─── Logout (Revoke Refresh Token) ────────────────────────────────────────

  async logout(userId: string, refreshTokenRaw?: string, ipAddress?: string, userAgent?: string) {
    if (refreshTokenRaw) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke ALL tokens for user (full logout)
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.writeAuditLog({
      userId,
      action: 'LOGOUT',
      auditableType: 'User',
      auditableId: userId,
      ipAddress,
      userAgent,
    });
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration attacks
    if (!user) return;

    // Invalidate all existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }, // mark as used (expired)
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.writeAuditLog({
      userId: user.id,
      action: 'RESET_REQUESTED',
      auditableType: 'User',
      auditableId: user.id,
      newValues: { email: user.email },
      ipAddress,
      userAgent,
    });

    // Return the raw token so the calling layer can dispatch email
    return { rawToken, user };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(rawToken: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const newHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      // Update password
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash, updatedAt: new Date() },
      }),
      // Mark token as used (single-use enforcement)
      this.prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
      // Revoke ALL active refresh tokens (full session termination)
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.writeAuditLog({
      userId: record.userId,
      action: 'RESET_COMPLETED',
      auditableType: 'User',
      auditableId: record.userId,
      newValues: { passwordChanged: true, allSessionsRevoked: true },
      ipAddress,
      userAgent,
    });
  }

  // ─── Demo: Switch Role ────────────────────────────────────────────────────

  async switchRole(userId: string, targetRole: string, ipAddress?: string) {
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];
    if (!validRoles.includes(targetRole)) {
      throw new BadRequestException('Invalid demo role');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: targetRole },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found in database');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Build a synthetic user with the swapped role for token issuance
    const syntheticUser = { ...user, role };
    const tokens = await this.issueTokens(syntheticUser);

    await this.writeAuditLog({
      userId,
      action: 'DEMO_ROLE_SWITCH',
      auditableType: 'User',
      auditableId: userId,
      oldValues: { role: user.role.name },
      newValues: { role: targetRole },
      ipAddress,
    });

    return tokens;
  }

  // ─── Scoped AI Voice Receptionist Token ───────────────────────────────────

  generateAiServiceToken() {
    const permissions = ['availability:read', 'booking:create'];
    const payload = {
      sub: 'ai_voice_service_machine',
      email: 'ai-voice@service.internal',
      role: 'AI_SERVICE',
      permissions,
      type: 'access',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '365d',
      secret: process.env.JWT_SECRET || 'changeme',
    });

    return {
      token,
      scopes: permissions,
      role: 'AI_SERVICE',
      expiresIn: '365d',
    };
  }

  // ─── Internal Audit Helper ────────────────────────────────────────────────

  private async writeAuditLog(entry: {
    userId?: string;
    action: string;
    auditableType: string;
    auditableId: string;
    oldValues?: object;
    newValues?: object;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          auditableType: entry.auditableType,
          auditableId: entry.auditableId,
          oldValues: entry.oldValues ? stripSecrets(entry.oldValues) : undefined,
          newValues: entry.newValues ? stripSecrets(entry.newValues) : undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch {
      // Audit writes must never crash the primary operation
    }
  }
}
