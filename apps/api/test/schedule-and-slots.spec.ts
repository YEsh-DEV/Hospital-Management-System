import { ScheduleService } from '../src/doctors/schedule.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ScheduleService Unit Tests', () => {
  let service: ScheduleService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      doctor: {
        findUnique: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
      },
    };
    service = new ScheduleService(mockPrisma as PrismaService);
  });

  describe('Time arithmetic & formatting', () => {
    it('converts HH:MM to minutes correctly', () => {
      expect(service.timeToMinutes('09:00')).toBe(540);
      expect(service.timeToMinutes('17:30')).toBe(1050);
      expect(service.timeToMinutes('00:00')).toBe(0);
      expect(service.timeToMinutes('23:59')).toBe(1439);
      expect(isNaN(service.timeToMinutes('invalid'))).toBe(true);
    });

    it('converts minutes to HH:MM correctly', () => {
      expect(service.minutesToTime(540)).toBe('09:00');
      expect(service.minutesToTime(1050)).toBe('17:30');
      expect(service.minutesToTime(0)).toBe('00:00');
    });

    it('computes correct day of week for Asia/Kolkata date', () => {
      // 2026-10-26 was Monday (1), 2026-10-27 is Tuesday (2)
      expect(service.getDayOfWeek('2026-10-27')).toBe(2);
      expect(service.getDayOfWeek('2026-11-01')).toBe(0); // Sunday
    });
  });

  describe('Slot generation & availability logic', () => {
    const mockDoctor = {
      id: 'doc-1',
      name: 'Dr. Meera Patel',
      departmentId: 'dept-cardio',
      department: { name: 'Cardiology' },
      isActive: true,
      leaves: [],
      schedules: [
        {
          id: 'sch-1',
          doctorId: 'doc-1',
          dayOfWeek: 2, // Tuesday
          startTime: '09:00',
          endTime: '11:00',
          slotDurationMinutes: 30,
          breakStart: '10:00',
          breakEnd: '10:30',
          isActive: true,
        },
      ],
    };

    it('generates slots excluding break periods', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getDoctorAvailability('doc-1', '2026-10-27');

      expect(result.doctorId).toBe('doc-1');
      expect(result.timezone).toBe('Asia/Kolkata');
      // Shift is 09:00-11:00, break is 10:00-10:30
      // Expected slots: 09:00-09:30, 09:30-10:00, 10:30-11:00 (3 slots total, 10:00-10:30 skipped)
      expect(result.slots.length).toBe(3);
      expect(result.slots[0].start).toContain('09:00:00+05:30');
      expect(result.slots[0].end).toContain('09:30:00+05:30');
      expect(result.slots[1].start).toContain('09:30:00+05:30');
      expect(result.slots[2].start).toContain('10:30:00+05:30');
    });

    it('returns empty slots when doctor is on leave', async () => {
      const doctorOnLeave = {
        ...mockDoctor,
        leaves: [
          {
            startDate: new Date('2026-10-26T00:00:00+05:30'),
            endDate: new Date('2026-10-28T23:59:59+05:30'),
            reason: 'Annual Leave',
          },
        ],
      };
      mockPrisma.doctor.findUnique.mockResolvedValue(doctorOnLeave);

      const result = await service.getDoctorAvailability('doc-1', '2026-10-27');
      expect(result.slots.length).toBe(0);
    });

    it('subtracts existing booked appointments from available slots', async () => {
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      // Existing booking for 09:00 - 09:30
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          scheduledStart: new Date('2026-10-27T09:00:00+05:30'),
          scheduledEnd: new Date('2026-10-27T09:30:00+05:30'),
        },
      ]);

      const result = await service.getDoctorAvailability('doc-1', '2026-10-27');

      // 09:00 slot is booked, only 09:30 and 10:30 remain
      expect(result.slots.length).toBe(2);
      expect(result.slots[0].start).toContain('09:30:00+05:30');
      expect(result.slots[1].start).toContain('10:30:00+05:30');
    });
  });
});
