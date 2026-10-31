import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { stripSecrets } from '../common/utils/secret-stripper';

export interface CreateCallLogDto {
  callerPhone: string;
  callerName?: string;
  direction?: 'INBOUND' | 'OUTBOUND';
  durationSeconds?: number;
  intent?: string;
  outcome?: 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'ABANDONED';
  summary?: string;
  patientId?: string;
  leadId?: string;
  appointmentId?: string;
  recordingConsent?: boolean;
}

@Injectable()
export class CallsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async findAll(filters?: {
    callerPhone?: string;
    outcome?: string;
    patientId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {};
    if (filters?.callerPhone) {
      where.callerPhone = { contains: filters.callerPhone };
    }
    if (filters?.outcome) {
      where.outcome = filters.outcome;
    }
    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    return this.prisma.callLog.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        lead: { select: { id: true, name: true, status: true } },
        appointment: { select: { id: true, scheduledStart: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateCallLogDto, userId?: string, ip?: string, ua?: string) {
    // If patientId not explicitly supplied, attempt fuzzy match by phone
    let patientId = dto.patientId || null;
    if (!patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { phone: dto.callerPhone },
            { normalizedPhone: dto.callerPhone.replace(/\D/g, '') },
          ],
        },
      });
      if (patient) patientId = patient.id;
    }

    const log = await this.prisma.callLog.create({
      data: {
        callerPhone: dto.callerPhone,
        callerName: dto.callerName || null,
        direction: dto.direction || 'INBOUND',
        durationSeconds: dto.durationSeconds || 0,
        intent: dto.intent || null,
        outcome: dto.outcome || 'COMPLETED',
        summary: dto.summary || null,
        patientId,
        leadId: dto.leadId || null,
        appointmentId: dto.appointmentId || null,
        recordingConsent: dto.recordingConsent || false,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CALL_LOG_RECORDED',
      auditableType: 'CallLog',
      auditableId: log.id,
      newValues: stripSecrets({
        callerPhone: log.callerPhone,
        outcome: log.outcome,
        intent: log.intent,
      }),
      ipAddress: ip,
      userAgent: ua,
    });

    return log;
  }
}
