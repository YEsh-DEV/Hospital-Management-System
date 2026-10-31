import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { stripSecrets } from '../common/utils/secret-stripper';
import { ScheduleService } from '../doctors/schedule.service';

export interface CreateBookingRequestDto {
  patientPhone: string;
  patientName?: string;
  department?: string;
  doctorId?: string;
  serviceId?: string;
  preferredDate?: string;
  slotStart?: string; // ISO 8601 string
  slotEnd?: string;   // ISO 8601 string
  notes?: string;
  source?: 'RECEPTION' | 'AI_VOICE' | 'ONLINE' | 'ENQUIRY';
  requestId?: string; // Idempotency key
}

export interface RescheduleAppointmentDto {
  newStart: string; // ISO 8601 string
  newEnd?: string;  // ISO 8601 string
  reason?: string;
}

export interface CancelAppointmentDto {
  reason?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED'],
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'CHECKED_IN'], // backward-compat with initial seed
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['COMPLETED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(ScheduleService) private readonly scheduleService: ScheduleService,
  ) {}

  async findAll(filters?: {
    doctorId?: string;
    patientId?: string;
    department?: string;
    status?: string;
    date?: string;
  }) {
    const where: any = { deletedAt: null };

    if (filters?.doctorId) where.doctorId = filters.doctorId;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.department) where.department = { contains: filters.department, mode: 'insensitive' };
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      const dayStart = new Date(`${filters.date}T00:00:00+05:30`);
      const dayEnd = new Date(`${filters.date}T23:59:59+05:30`);
      where.scheduledStart = { gte: dayStart, lte: dayEnd };
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        doctor: { include: { department: true } },
        service: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment record not found');
    return appointment;
  }

  // ─── Slot Availability ────────────────────────────────────────────────────
  async getAvailability(date?: string, department?: string, doctorId?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // If a specific doctor is requested
    if (doctorId) {
      return this.scheduleService.getDoctorAvailability(doctorId, targetDate);
    }

    // If department is provided, check if a doctor in that department exists
    if (department) {
      const doc = await this.prisma.doctor.findFirst({
        where: {
          department: { name: { contains: department, mode: 'insensitive' } },
          isActive: true,
        },
      });
      if (doc) {
        return this.scheduleService.getDoctorAvailability(doc.id, targetDate);
      }
    }

    // Fallback: Check first active doctor
    const firstDoc = await this.prisma.doctor.findFirst({
      where: { isActive: true },
    });
    if (firstDoc) {
      return this.scheduleService.getDoctorAvailability(firstDoc.id, targetDate);
    }

    // Fallback baseline format for backward compatibility
    return {
      date: targetDate,
      department: department || 'General Medicine',
      availableSlots: [
        '09:00 - 09:30',
        '10:00 - 10:30',
        '11:30 - 12:00',
        '14:00 - 14:30',
        '15:30 - 16:00',
      ],
      timezone: 'Asia/Kolkata',
    };
  }

  // ─── Create Booking with Conflict Prevention & Idempotency ────────────────
  async createBookingRequest(
    dto: CreateBookingRequestDto,
    userId?: string,
    ip?: string,
    ua?: string,
  ) {
    // 1. Idempotency check via requestId
    if (dto.requestId) {
      const existing = await this.prisma.appointment.findUnique({
        where: { requestId: dto.requestId },
        include: {
          patient: true,
          doctor: true,
        },
      });
      if (existing) {
        return { ...existing, isReplay: true };
      }
    }

    // 2. Resolve Doctor
    let doctorId = dto.doctorId;
    let deptName = dto.department || 'General Medicine';

    if (!doctorId) {
      const doc = await this.prisma.doctor.findFirst({
        where: {
          isActive: true,
          ...(dto.department
            ? { department: { name: { contains: dto.department, mode: 'insensitive' } } }
            : {}),
        },
        include: { department: true },
      });
      if (doc) {
        doctorId = doc.id;
        deptName = doc.department.name;
      }
    }

    if (!doctorId) {
      // Fallback stub doctor ID if no doctor in DB yet
      doctorId = 'doc_on_duty';
    }

    // 3. Resolve Patient
    let patient = await this.prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone: dto.patientPhone },
          { normalizedPhone: dto.patientPhone.replace(/\D/g, '') },
        ],
      },
    });

    if (!patient) {
      const norm = dto.patientPhone.replace(/\D/g, '');
      const firstName = dto.patientName ? dto.patientName.split(' ')[0] : 'Unknown';
      const lastName = dto.patientName && dto.patientName.includes(' ')
        ? dto.patientName.split(' ').slice(1).join(' ')
        : 'Caller';

      patient = await this.prisma.patient.create({
        data: {
          mrn: `MRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
          firstName,
          lastName,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Unspecified',
          phone: dto.patientPhone,
          normalizedPhone: norm,
        },
      });
    }

    // 4. Resolve Scheduled Interval
    let start: Date;
    let end: Date;

    if (dto.slotStart) {
      start = new Date(dto.slotStart);
      end = dto.slotEnd ? new Date(dto.slotEnd) : new Date(start.getTime() + 30 * 60 * 1000);
    } else if (dto.preferredDate) {
      start = new Date(dto.preferredDate);
      end = new Date(start.getTime() + 30 * 60 * 1000);
    } else {
      throw new BadRequestException('Preferred date or slotStart must be provided');
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid start or end timestamp');
    }

    // 5. Transactional Booking Lock (Atomic Conflict Prevention)
    const appointment = await this.prisma.$transaction(async (tx) => {
      // Check for overlapping active appointment for this doctor
      if (doctorId !== 'doc_on_duty') {
        const conflict = await tx.appointment.findFirst({
          where: {
            doctorId,
            deletedAt: null,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            scheduledStart: { lt: end },
            scheduledEnd: { gt: start },
          },
        });

        if (conflict) {
          throw new ConflictException({
            message: 'Selected doctor slot is no longer available',
            conflictId: conflict.id,
            scheduledStart: conflict.scheduledStart,
          });
        }
      }

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId,
          serviceId: dto.serviceId,
          department: deptName,
          scheduledStart: start,
          scheduledEnd: end,
          notes: dto.notes,
          source: dto.source || 'RECEPTION',
          status: dto.source === 'AI_VOICE' ? 'REQUESTED' : 'CONFIRMED',
          requestId: dto.requestId || null,
        },
        include: {
          patient: true,
          doctor: true,
          service: true,
        },
      });
    });

    // 6. Write Audit Log
    await this.auditService.log({
      userId: userId ?? null,
      action: 'BOOKING_REQUEST_CREATED',
      auditableType: 'Appointment',
      auditableId: appointment.id,
      newValues: stripSecrets({
        patientPhone: dto.patientPhone,
        department: appointment.department,
        scheduledStart: appointment.scheduledStart,
        status: appointment.status,
        requestId: dto.requestId,
      }),
      ipAddress: ip,
      userAgent: ua,
    });

    return appointment;
  }

  // ─── Status Transition State Machine ──────────────────────────────────────
  async updateStatus(
    id: string,
    newStatus: string,
    userId?: string,
    ip?: string,
    ua?: string,
  ) {
    const existing = await this.findById(id);

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${existing.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: newStatus },
      include: { patient: true, doctor: true },
    });

    await this.auditService.log({
      userId,
      action: 'APPOINTMENT_STATUS_CHANGE',
      auditableType: 'Appointment',
      auditableId: id,
      oldValues: { status: existing.status },
      newValues: { status: newStatus },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  // ─── Reschedule Appointment ───────────────────────────────────────────────
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    userId?: string,
    ip?: string,
    ua?: string,
  ) {
    const existing = await this.findById(id);

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existing.status)) {
      throw new BadRequestException(`Cannot reschedule an appointment in ${existing.status} status`);
    }

    const newStart = new Date(dto.newStart);
    const durationMs = existing.scheduledEnd.getTime() - existing.scheduledStart.getTime();
    const newEnd = dto.newEnd ? new Date(dto.newEnd) : new Date(newStart.getTime() + durationMs);

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newStart >= newEnd) {
      throw new BadRequestException('Invalid reschedule timestamp');
    }

    // Atomic conflict check
    const updated = await this.prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: existing.doctorId,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          scheduledStart: { lt: newEnd },
          scheduledEnd: { gt: newStart },
        },
      });

      if (conflict) {
        throw new ConflictException('Selected slot has a conflict with another appointment');
      }

      return tx.appointment.update({
        where: { id },
        data: {
          scheduledStart: newStart,
          scheduledEnd: newEnd,
          notes: dto.reason ? `${existing.notes || ''} [Rescheduled: ${dto.reason}]`.trim() : existing.notes,
        },
        include: { patient: true, doctor: true },
      });
    });

    await this.auditService.log({
      userId,
      action: 'APPOINTMENT_RESCHEDULE',
      auditableType: 'Appointment',
      auditableId: id,
      oldValues: { scheduledStart: existing.scheduledStart, scheduledEnd: existing.scheduledEnd },
      newValues: { scheduledStart: updated.scheduledStart, scheduledEnd: updated.scheduledEnd },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  // ─── Cancel Appointment ───────────────────────────────────────────────────
  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    userId?: string,
    ip?: string,
    ua?: string,
  ) {
    const existing = await this.findById(id);

    if (existing.status === 'CANCELLED') {
      return existing; // idempotent
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: dto.reason || null,
      },
      include: { patient: true, doctor: true },
    });

    await this.auditService.log({
      userId,
      action: 'APPOINTMENT_CANCEL',
      auditableType: 'Appointment',
      auditableId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'CANCELLED', reason: dto.reason },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }
}
