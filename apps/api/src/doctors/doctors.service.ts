import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';

export interface CreateDoctorDto {
  userId?: string;
  departmentId: string;
  name: string;
  email?: string;
  phone?: string;
  specialization: string;
  consultationFee?: number;
}

export interface UpdateDoctorDto {
  departmentId?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  consultationFee?: number;
  isActive?: boolean;
}

export interface DoctorScheduleItemDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  breakStart?: string;
  breakEnd?: string;
  maxCapacity?: number;
}

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ScheduleService) private readonly scheduleService: ScheduleService,
  ) {}

  async findAll(departmentId?: string) {
    return this.prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        schedules: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        department: true,
        schedules: { where: { isActive: true } },
        leaves: true,
      },
    });
    if (!doctor) throw new NotFoundException(`Doctor ${id} not found`);
    return doctor;
  }

  async create(dto: CreateDoctorDto) {
    return this.prisma.doctor.create({
      data: {
        userId: dto.userId,
        departmentId: dto.departmentId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        specialization: dto.specialization,
        consultationFee: dto.consultationFee ?? 0,
      },
      include: { department: true },
    });
  }

  async update(id: string, dto: UpdateDoctorDto) {
    await this.findById(id);
    return this.prisma.doctor.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async setSchedules(doctorId: string, schedules: DoctorScheduleItemDto[]) {
    await this.findById(doctorId);
    return this.prisma.$transaction(async (tx) => {
      // Remove existing schedules
      await tx.doctorSchedule.deleteMany({ where: { doctorId } });
      // Insert new schedules
      return tx.doctorSchedule.createMany({
        data: schedules.map((s) => ({
          doctorId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes ?? 30,
          breakStart: s.breakStart,
          breakEnd: s.breakEnd,
          maxCapacity: s.maxCapacity ?? 1,
        })),
      });
    });
  }

  async addLeave(doctorId: string, startDate: string, endDate: string, reason?: string) {
    await this.findById(doctorId);
    return this.prisma.doctorLeave.create({
      data: {
        doctorId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      },
    });
  }

  async getAvailability(doctorId: string, date: string, serviceDurationMinutes?: number) {
    return this.scheduleService.getDoctorAvailability(doctorId, date, serviceDurationMinutes);
  }
}
