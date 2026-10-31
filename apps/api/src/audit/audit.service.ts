import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { stripSecrets } from '../common/utils/secret-stripper';

export interface AuditEntry {
  userId?: string;
  action: string;
  auditableType: string;
  auditableId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  action?: string;
  auditableType?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Write a single audit log entry.
   * Always strips secrets from old/new values before persisting.
   * Fire-and-forget friendly: errors are swallowed so they never crash callers.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          auditableType: entry.auditableType,
          auditableId: entry.auditableId,
          oldValues: entry.oldValues
            ? (stripSecrets(entry.oldValues) as object)
            : undefined,
          newValues: entry.newValues
            ? (stripSecrets(entry.newValues) as object)
            : undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // Audit writes must NEVER crash primary operations
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  /**
   * Paginated audit log query — SUPER_ADMIN only.
   */
  async findAll(opts: AuditQueryOptions) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 100); // cap at 100
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts.action) where.action = { contains: opts.action, mode: 'insensitive' };
    if (opts.auditableType) where.auditableType = opts.auditableType;
    if (opts.userId) where.userId = opts.userId;
    if (opts.from || opts.to) {
      where.performedAt = {};
      if (opts.from) where.performedAt.gte = opts.from;
      if (opts.to) where.performedAt.lte = opts.to;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id.toString(),
        userId: l.userId,
        userName: l.user?.fullName ?? 'AI Service / System',
        userRole: l.user?.role?.name ?? null,
        action: l.action,
        auditableType: l.auditableType,
        auditableId: l.auditableId,
        oldValues: l.oldValues,
        newValues: l.newValues,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        performedAt: l.performedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
