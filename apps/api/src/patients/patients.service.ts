import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { stripSecrets } from '../common/utils/secret-stripper';

export interface CreatePatientDto {
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  allowDuplicate?: boolean;
}

export interface UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
}

@Injectable()
export class PatientsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  public normalizePhone(phone: string): string {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  }

  public generateMrn(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MRN-${timestamp}-${random}`;
  }

  async checkDuplicate(phone: string, email?: string) {
    const normalized = this.normalizePhone(phone);
    const orConditions: any[] = [{ normalizedPhone: normalized }, { phone: phone }];
    if (email && email.trim()) {
      orConditions.push({ email: email.trim().toLowerCase() });
    }
    return this.prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: orConditions,
      },
    });
  }

  async findAll(search?: string) {
    const where: any = { deletedAt: null };
    if (search && search.trim()) {
      const q = search.trim();
      const norm = this.normalizePhone(q);
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { mrn: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        ...(norm ? [{ normalizedPhone: { contains: norm } }] : []),
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        appointments: {
          where: { deletedAt: null },
          include: { doctor: { select: { name: true, specialization: true } } },
          orderBy: { scheduledStart: 'desc' },
        },
      },
    });
    if (!patient) throw new NotFoundException('Patient record not found');
    return patient;
  }

  async create(dto: CreatePatientDto, userId?: string, ip?: string, ua?: string) {
    const normalizedPhone = this.normalizePhone(dto.phone);

    if (!dto.allowDuplicate) {
      const existing = await this.checkDuplicate(dto.phone, dto.email);
      if (existing) {
        throw new ConflictException({
          message: 'A patient with this phone or email already exists.',
          existingPatientId: existing.id,
          existingMrn: existing.mrn,
          existingName: `${existing.firstName} ${existing.lastName}`,
        });
      }
    }

    const mrn = dto.mrn && dto.mrn.trim() ? dto.mrn.trim() : this.generateMrn();

    const patient = await this.prisma.patient.create({
      data: {
        mrn,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone.trim(),
        normalizedPhone,
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        address: dto.address,
      },
    });

    await this.auditService.log({
      userId,
      action: 'PATIENT_CREATE',
      auditableType: 'Patient',
      auditableId: patient.id,
      newValues: stripSecrets(patient),
      ipAddress: ip,
      userAgent: ua,
    });

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, userId?: string, ip?: string, ua?: string) {
    const existing = await this.findById(id);

    const data: any = { ...dto, updatedAt: new Date() };
    if (dto.phone) {
      data.normalizedPhone = this.normalizePhone(dto.phone);
    }
    if (dto.email) {
      data.email = dto.email.trim().toLowerCase();
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId,
      action: 'PATIENT_UPDATE',
      auditableType: 'Patient',
      auditableId: id,
      oldValues: stripSecrets(existing),
      newValues: stripSecrets(updated),
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  async remove(id: string, userId?: string, ip?: string, ua?: string) {
    const existing = await this.findById(id);

    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'PATIENT_DELETE',
      auditableType: 'Patient',
      auditableId: id,
      oldValues: stripSecrets(existing),
      ipAddress: ip,
      userAgent: ua,
    });

    return { message: 'Patient record deleted successfully' };
  }

  async softDelete(id: string, userId?: string, ip?: string, ua?: string) {
    return this.remove(id, userId, ip, ua);
  }
}
