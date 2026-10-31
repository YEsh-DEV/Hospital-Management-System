import {
  Controller,
  Get,
  Query,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  Req,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Roles, RolesGuard, RequirePermissions } from '../rbac/rbac.guard';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/audit-logs')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  // ─── GET /api/audit-logs ─────────────────────────────────────────────────
  @Roles('SUPER_ADMIN')
  @Get()
  async getAuditLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('action') action?: string,
    @Query('auditableType') auditableType?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: any,
    @Req() req?: Request,
  ) {
    // Also log that the audit trail itself was viewed (self-referential audit)
    await this.auditService.log({
      userId: user?.id,
      action: 'AUDIT_LOGS_VIEWED',
      auditableType: 'AuditLog',
      auditableId: 'LIST',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    return this.auditService.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      action,
      auditableType,
      userId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  // ─── DELETE /api/audit-logs/:id — ALWAYS 405 ─────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  deleteAuditLog(@Param('id') _id: string) {
    // Audit logs are immutable — DELETE is permanently disabled
    throw new MethodNotAllowedException(
      'Audit logs are immutable. DELETE operations are not permitted.',
    );
  }
}
