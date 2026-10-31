import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GeneratedSlot {
  start: string; // ISO 8601 string
  end: string;   // ISO 8601 string
}

export interface DoctorAvailabilityResult {
  doctorId: string;
  doctorName?: string;
  departmentId?: string;
  departmentName?: string;
  date: string; // YYYY-MM-DD
  timezone: string;
  slots: GeneratedSlot[];
}

@Injectable()
export class ScheduleService {
  public static readonly TIMEZONE = 'Asia/Kolkata';
  public static readonly TIMEZONE_OFFSET = '+05:30';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Converts a "HH:MM" string into minutes from start of day (0..1439).
   */
  public timeToMinutes(timeStr: string): number {
    const parts = (timeStr || '').trim().split(':');
    if (parts.length < 2) return NaN;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
    return h * 60 + m;
  }

  /**
   * Formats minutes (0..1439) into "HH:MM".
   */
  public minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Returns day of week (0=Sun..6=Sat) in Asia/Kolkata for a "YYYY-MM-DD" date string.
   */
  public getDayOfWeek(dateStr: string): number {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
    }
    return d.getDay();
  }

  /**
   * Builds an ISO 8601 string with Asia/Kolkata offset for a given date and time string.
   */
  public buildIsoTimestamp(dateStr: string, timeStr: string): string {
    return `${dateStr}T${timeStr}:00${ScheduleService.TIMEZONE_OFFSET}`;
  }

  /**
   * Retrieves available slots for a doctor on a specific date.
   */
  async getDoctorAvailability(
    doctorId: string,
    dateStr: string,
    serviceDurationMinutes?: number,
  ): Promise<DoctorAvailabilityResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        department: true,
        schedules: { where: { isActive: true } },
        leaves: true,
      },
    });

    if (!doctor || !doctor.isActive) {
      throw new BadRequestException('Doctor not found or inactive');
    }

    const dayOfWeek = this.getDayOfWeek(dateStr);
    const targetDateStart = new Date(`${dateStr}T00:00:00+05:30`);
    const targetDateEnd = new Date(`${dateStr}T23:59:59+05:30`);

    // 1. Check if doctor is on leave
    const isOnLeave = doctor.leaves.some((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return targetDateEnd >= leaveStart && targetDateStart <= leaveEnd;
    });

    if (isOnLeave) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        departmentId: doctor.departmentId,
        departmentName: doctor.department.name,
        date: dateStr,
        timezone: ScheduleService.TIMEZONE,
        slots: [],
      };
    }

    // 2. Find schedule for this day of week
    const daySchedules = doctor.schedules.filter((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedules.length) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        departmentId: doctor.departmentId,
        departmentName: doctor.department.name,
        date: dateStr,
        timezone: ScheduleService.TIMEZONE,
        slots: [],
      };
    }

    // 3. Retrieve existing non-cancelled appointments for this doctor on this date
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        deletedAt: null,
        scheduledStart: { gte: targetDateStart, lte: targetDateEnd },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    });

    // 4. Generate discrete slots
    const generatedSlots: GeneratedSlot[] = [];

    for (const schedule of daySchedules) {
      const shiftStartMin = this.timeToMinutes(schedule.startTime);
      const shiftEndMin = this.timeToMinutes(schedule.endTime);
      const duration = serviceDurationMinutes && serviceDurationMinutes > 0
        ? serviceDurationMinutes
        : schedule.slotDurationMinutes || 30;

      const breakStartMin = schedule.breakStart ? this.timeToMinutes(schedule.breakStart) : null;
      const breakEndMin = schedule.breakEnd ? this.timeToMinutes(schedule.breakEnd) : null;

      let currentMin = shiftStartMin;
      while (currentMin + duration <= shiftEndMin) {
        const slotStartMin = currentMin;
        const slotEndMin = currentMin + duration;

        // Advance to next slot boundary
        currentMin += duration;

        // Skip if overlaps with break window
        if (
          breakStartMin !== null &&
          breakEndMin !== null &&
          slotStartMin < breakEndMin &&
          slotEndMin > breakStartMin
        ) {
          continue;
        }

        const slotStartIso = this.buildIsoTimestamp(dateStr, this.minutesToTime(slotStartMin));
        const slotEndIso = this.buildIsoTimestamp(dateStr, this.minutesToTime(slotEndMin));

        const slotStartDate = new Date(slotStartIso);
        const slotEndDate = new Date(slotEndIso);

        // Check if slot overlaps with an existing appointment
        const hasConflict = existingAppointments.some((appt) => {
          const apptStart = new Date(appt.scheduledStart);
          const apptEnd = new Date(appt.scheduledEnd);
          return slotStartDate < apptEnd && slotEndDate > apptStart;
        });

        if (!hasConflict) {
          generatedSlots.push({
            start: slotStartIso,
            end: slotEndIso,
          });
        }
      }
    }

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      departmentId: doctor.departmentId,
      departmentName: doctor.department.name,
      date: dateStr,
      timezone: ScheduleService.TIMEZONE,
      slots: generatedSlots,
    };
  }
}
