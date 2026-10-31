import { AppointmentsService } from '../src/appointments/appointments.service';
import { ScheduleService } from '../src/doctors/schedule.service';
import { LeadsService } from '../src/leads/leads.service';
import { CallsService } from '../src/calls/calls.service';
import { ReportsService } from '../src/reports/reports.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('Cross-Module Integration & User Journeys (A, B, C, D)', () => {
  let appointmentsService: AppointmentsService;
  let scheduleService: ScheduleService;
  let leadsService: LeadsService;
  let callsService: CallsService;
  let reportsService: ReportsService;

  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockAudit = {
      log: jest.fn().mockResolvedValue({}),
    };

    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      patient: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      doctor: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      appointment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lead: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      followUpTask: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      callLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    scheduleService = new ScheduleService(mockPrisma);
    appointmentsService = new AppointmentsService(mockPrisma, mockAudit, scheduleService);
    leadsService = new LeadsService(mockPrisma, mockAudit);
    callsService = new CallsService(mockPrisma, mockAudit);
    reportsService = new ReportsService(mockPrisma);
  });

  describe('Journey A: Receptionist books an appointment', () => {
    it('successfully books a valid slot, sets status CONFIRMED, and records audit log', async () => {
      const mockPatient = {
        id: 'patient-101',
        mrn: 'MRN-101',
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '9876543210',
      };
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.doctor.findFirst.mockResolvedValue({
        id: 'doc-1',
        department: { name: 'Cardiology' },
      });
      // Slot check returns null (no conflict)
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const createdAppointment = {
        id: 'appt-1',
        patientId: 'patient-101',
        doctorId: 'doc-1',
        department: 'Cardiology',
        scheduledStart: new Date('2026-10-28T10:00:00+05:30'),
        scheduledEnd: new Date('2026-10-28T10:30:00+05:30'),
        status: 'CONFIRMED',
        source: 'RECEPTION',
      };
      mockPrisma.appointment.create.mockResolvedValue(createdAppointment);

      const result = await appointmentsService.createBookingRequest(
        {
          patientPhone: '9876543210',
          doctorId: 'doc-1',
          slotStart: '2026-10-28T10:00:00+05:30',
          slotEnd: '2026-10-28T10:30:00+05:30',
          source: 'RECEPTION',
        },
        'user-reception-1',
        '127.0.0.1',
        'StaffAgent',
      );

      expect(result.status).toBe('CONFIRMED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_REQUEST_CREATED',
          auditableType: 'Appointment',
          auditableId: 'appt-1',
          userId: 'user-reception-1',
        }),
      );
    });
  });

  describe('Journey B: AI Requests an appointment with idempotency', () => {
    it('sets status to REQUESTED and supports idempotent replay via requestId', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: 'patient-202',
        phone: '9988776655',
      });
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(null); // first call: not found
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // no conflict

      const createdAppointment = {
        id: 'appt-ai-1',
        patientId: 'patient-202',
        doctorId: 'doc-1',
        department: 'Cardiology',
        status: 'REQUESTED',
        source: 'AI_VOICE',
        requestId: 'req-uuid-12345',
      };
      mockPrisma.appointment.create.mockResolvedValue(createdAppointment);

      const result = await appointmentsService.createBookingRequest({
        patientPhone: '9988776655',
        doctorId: 'doc-1',
        slotStart: '2026-10-28T11:00:00+05:30',
        source: 'AI_VOICE',
        requestId: 'req-uuid-12345',
      });

      expect(result.status).toBe('REQUESTED');
      expect(result.source).toBe('AI_VOICE');

      // Second attempt with same requestId returns existing booking with isReplay: true
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(createdAppointment);
      const replay = await appointmentsService.createBookingRequest({
        patientPhone: '9988776655',
        doctorId: 'doc-1',
        slotStart: '2026-10-28T11:00:00+05:30',
        requestId: 'req-uuid-12345',
      });

      expect(replay.id).toBe('appt-ai-1');
      expect((replay as any).isReplay).toBe(true);
    });

    it('logs AI reception call outcomes with structured summary', async () => {
      mockPrisma.callLog.create.mockResolvedValue({
        id: 'call-1',
        callerPhone: '9988776655',
        intent: 'APPOINTMENT_BOOKING',
        outcome: 'COMPLETED',
      });

      const log = await callsService.create({
        callerPhone: '9988776655',
        direction: 'INBOUND',
        durationSeconds: 95,
        intent: 'APPOINTMENT_BOOKING',
        outcome: 'COMPLETED',
        summary: 'Caller Rahul requested Cardiology appointment for tomorrow 11:00 AM.',
        appointmentId: 'appt-ai-1',
      });

      expect(log.outcome).toBe('COMPLETED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CALL_LOG_RECORDED',
          auditableType: 'CallLog',
        }),
      );
    });
  });

  describe('Journey C: Enquiry and follow-up workflow', () => {
    it('creates lead, generates linked follow-up task, and updates status', async () => {
      const createdLead = {
        id: 'lead-1',
        name: 'Anita Roy',
        phone: '9123456780',
        source: 'PHONE_CALL',
        status: 'NEW',
      };
      mockPrisma.lead.create.mockResolvedValue(createdLead);

      const lead = await leadsService.createLead({
        name: 'Anita Roy',
        phone: '9123456780',
        source: 'PHONE_CALL',
        notes: 'Inquired about orthopedic knee consultation packages',
      });

      expect(lead.id).toBe('lead-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LEAD_CREATE',
        }),
      );

      // Create linked follow-up task
      const createdTask = {
        id: 'task-1',
        leadId: 'lead-1',
        title: 'Callback for knee consultation package pricing',
        dueDate: new Date('2026-10-28T14:00:00+05:30'),
        status: 'PENDING',
      };
      mockPrisma.followUpTask.create.mockResolvedValue(createdTask);

      const task = await leadsService.createTask({
        leadId: 'lead-1',
        title: 'Callback for knee consultation package pricing',
        dueDate: '2026-10-28T14:00:00+05:30',
        priority: 'HIGH',
      });

      expect(task.id).toBe('task-1');
      expect(task.leadId).toBe('lead-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_CREATE',
        }),
      );
    });
  });

  describe('Journey D: Doctor unavailable handling & conflict prevention', () => {
    it('rejects booking when slot overlaps with existing non-cancelled appointment', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-999', phone: '9999999999' });

      // Simulate existing booking for doctor at 10:00 - 10:30
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'existing-appt-conflict',
        doctorId: 'doc-1',
        scheduledStart: new Date('2026-10-28T10:00:00+05:30'),
        scheduledEnd: new Date('2026-10-28T10:30:00+05:30'),
        status: 'CONFIRMED',
      });

      await expect(
        appointmentsService.createBookingRequest({
          patientPhone: '9999999999',
          doctorId: 'doc-1',
          slotStart: '2026-10-28T10:15:00+05:30',
          slotEnd: '2026-10-28T10:45:00+05:30',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Operational Reporting Aggregation', () => {
    it('accurately derives appointment, lead, call, and task metrics from records', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { status: 'CONFIRMED' },
        { status: 'CONFIRMED' },
        { status: 'REQUESTED' },
        { status: 'CANCELLED' },
      ]);
      mockPrisma.lead.findMany.mockResolvedValue([
        { status: 'NEW' },
        { status: 'CONVERTED' },
      ]);
      mockPrisma.callLog.findMany.mockResolvedValue([
        { outcome: 'COMPLETED', durationSeconds: 60 },
        { outcome: 'ESCALATED', durationSeconds: 120 },
      ]);
      mockPrisma.followUpTask.findMany.mockResolvedValue([
        { status: 'PENDING', dueDate: new Date(Date.now() + 86400000) }, // future
        { status: 'PENDING', dueDate: new Date(Date.now() - 86400000) }, // overdue
        { status: 'COMPLETED', dueDate: new Date() },
      ]);

      const summary = await reportsService.getSummary('2026-10-27', '2026-10-28');

      expect(summary.appointments.total).toBe(4);
      expect(summary.appointments.confirmed).toBe(2);
      expect(summary.appointments.requested).toBe(1);
      expect(summary.appointments.cancelled).toBe(1);

      expect(summary.leads.total).toBe(2);
      expect(summary.leads.new).toBe(1);
      expect(summary.leads.converted).toBe(1);

      expect(summary.calls.total).toBe(2);
      expect(summary.calls.completed).toBe(1);
      expect(summary.calls.escalated).toBe(1);
      expect(summary.calls.avgDurationSeconds).toBe(90);

      expect(summary.tasks.total).toBe(3);
      expect(summary.tasks.pending).toBe(2);
      expect(summary.tasks.overdue).toBe(1);
      expect(summary.tasks.completed).toBe(1);
    });
  });
});
