import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { stripSecrets } from '../common/utils/secret-stripper';

export interface CreateLeadDto {
  patientId?: string;
  name: string;
  phone: string;
  email?: string;
  source?: 'PHONE_CALL' | 'WEBSITE' | 'WALK_IN' | 'AI_RECEPTIONIST';
  assignedToUserId?: string;
  notes?: string;
}

export interface UpdateLeadDto {
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  status?: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  assignedToUserId?: string;
  notes?: string;
}

export interface CreateFollowUpTaskDto {
  leadId?: string;
  assignedToUserId?: string;
  title: string;
  dueDate: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
}

export interface UpdateFollowUpTaskDto {
  title?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  assignedToUserId?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  async findAllLeads(status?: string, source?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (source) where.source = source;

    return this.prisma.lead.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLeadById(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        patient: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
        tasks: true,
        callLogs: true,
      },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async createLead(dto: CreateLeadDto, userId?: string, ip?: string, ua?: string) {
    const lead = await this.prisma.lead.create({
      data: {
        patientId: dto.patientId || null,
        name: dto.name,
        phone: dto.phone,
        email: dto.email || null,
        source: dto.source || 'PHONE_CALL',
        assignedToUserId: dto.assignedToUserId || null,
        notes: dto.notes || null,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'LEAD_CREATE',
      auditableType: 'Lead',
      auditableId: lead.id,
      newValues: stripSecrets(lead),
      ipAddress: ip,
      userAgent: ua,
    });

    return lead;
  }

  async updateLead(id: string, dto: UpdateLeadDto, userId?: string, ip?: string, ua?: string) {
    const existing = await this.findLeadById(id);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: dto,
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'LEAD_UPDATE',
      auditableType: 'Lead',
      auditableId: id,
      oldValues: stripSecrets(existing),
      newValues: stripSecrets(updated),
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  // ─── Follow-Up Tasks ──────────────────────────────────────────────────────
  async findAllTasks(filters?: { status?: string; leadId?: string; assignedToUserId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;

    return this.prisma.followUpTask.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createTask(dto: CreateFollowUpTaskDto, userId?: string, ip?: string, ua?: string) {
    const task = await this.prisma.followUpTask.create({
      data: {
        leadId: dto.leadId || null,
        assignedToUserId: dto.assignedToUserId || null,
        title: dto.title,
        dueDate: new Date(dto.dueDate),
        priority: dto.priority || 'MEDIUM',
        notes: dto.notes || null,
      },
      include: {
        lead: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'TASK_CREATE',
      auditableType: 'FollowUpTask',
      auditableId: task.id,
      newValues: stripSecrets(task),
      ipAddress: ip,
      userAgent: ua,
    });

    return task;
  }

  async updateTask(id: string, dto: UpdateFollowUpTaskDto, userId?: string, ip?: string, ua?: string) {
    const existing = await this.prisma.followUpTask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.completedAt = new Date();
    }

    const updated = await this.prisma.followUpTask.update({
      where: { id },
      data,
      include: {
        lead: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: 'TASK_UPDATE',
      auditableType: 'FollowUpTask',
      auditableId: id,
      oldValues: stripSecrets(existing),
      newValues: stripSecrets(updated),
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }
}
