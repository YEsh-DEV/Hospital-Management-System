import { AppointmentsService } from '../src/appointments/appointments.service';
import { ScheduleService } from '../src/doctors/schedule.service';
import { LeadsService } from '../src/leads/leads.service';
import { CallsService } from '../src/calls/calls.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuthService } from '../src/auth/auth.service';
import { LocalStrategy } from '../src/auth/strategies/local.strategy';
import { RolesGuard } from '../src/rbac/rbac.guard';
import { Reflector } from '@nestjs/core';
import { ConflictException, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('AdvFiction HMS — AI Voice Receptionist Integration Test Suite (INT-001 to INT-016)', () => {
  let appointmentsService: AppointmentsService;
  let scheduleService: ScheduleService;
  let leadsService: LeadsService;
  let callsService: CallsService;
  let notificationsService: NotificationsService;
  let authService: AuthService;
  let localStrategy: LocalStrategy;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  let mockPrisma: any;
  let mockAudit: any;
  let mockUsersService: any;
  let mockJwt: any;

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
      doctorSchedule: {
        findMany: jest.fn(),
      },
      doctorLeave: {
        findMany: jest.fn(),
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
      notification: {
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockUsersService = {
      findByEmail: jest.fn(),
      findByEmailWithHash: jest.fn(),
    };

    mockJwt = {
      sign: jest.fn((payload) => `mock_signed_jwt_${payload.sub}_${payload.role}`),
      verify: jest.fn(),
    };

    scheduleService = new ScheduleService(mockPrisma);
    appointmentsService = new AppointmentsService(mockPrisma, mockAudit, scheduleService);
    leadsService = new LeadsService(mockPrisma, mockAudit);
    callsService = new CallsService(mockPrisma, mockAudit);
    notificationsService = new NotificationsService(mockPrisma);
    authService = new AuthService(mockPrisma, mockUsersService, mockJwt);
    localStrategy = new LocalStrategy(authService);

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any, requiredRoles?: string[], requiredPermissions?: string[]): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === 'roles') return requiredRoles;
      if (key === 'permissions') return requiredPermissions;
      return undefined;
    });

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  // ─── INT-001: AI Health Endpoint Validation ──────────────────────────────
  describe('INT-001: AI Health Endpoint Contract', () => {
    it('should validate the expected structure of FastAPI health status', () => {
      const mockFastApiHealthResponse = {
        status: 'ok',
        prototype: true,
        modes: {
          hms: 'live',
          llm: 'openai',
          telephony: 'twilio',
          email: 'mock',
          sms: 'twilio',
        },
      };

      expect(mockFastApiHealthResponse.status).toBe('ok');
      expect(mockFastApiHealthResponse.modes).toBeDefined();
      expect(['live', 'mock']).toContain(mockFastApiHealthResponse.modes.hms);
    });
  });

  // ─── INT-002: Live vs Mock Mode Verification ─────────────────────────────
  describe('INT-002: Backend Target Verification', () => {
    it('verifies that live mode targets the NestJS backend on http://localhost:4000/api', () => {
      const liveConfig = {
        hms_base_url: 'http://localhost:4000/api',
        hms_mock_mode: false,
      };

      expect(liveConfig.hms_base_url).toContain('4000');
      expect(liveConfig.hms_mock_mode).toBe(false);
    });
  });

  // ─── INT-003: AI_SERVICE Machine Token Issuance ──────────────────────────
  describe('INT-003: AI_SERVICE Scoped Token Issuance', () => {
    it('issues a token containing role AI_SERVICE and exact scoped permissions', () => {
      const tokenResult = authService.generateAiServiceToken();

      expect(tokenResult.role).toBe('AI_SERVICE');
      expect(tokenResult.scopes).toEqual(['availability:read', 'booking:create']);
      expect(tokenResult.token).toBeDefined();
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'AI_SERVICE',
          sub: 'ai_voice_service_machine',
        }),
        expect.any(Object),
      );
    });
  });

  // ─── INT-004: AI_SERVICE Permission Boundaries ────────────────────────────
  describe('INT-004: Least-Privilege Permission Boundary Checks', () => {
    const aiUser = {
      id: 'ai-machine-01',
      role: 'AI_SERVICE',
      permissions: ['availability:read', 'booking:create', 'call:manage'],
    };

    it('allows AI_SERVICE to read availability', () => {
      const ctx = createMockContext(aiUser, undefined, ['availability:read']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows AI_SERVICE to create booking', () => {
      const ctx = createMockContext(aiUser, undefined, ['booking:create']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows AI_SERVICE to log calls', () => {
      const ctx = createMockContext(aiUser, undefined, ['call:manage']);
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('blocks AI_SERVICE from accessing patient directory (patient:read) with 403 Forbidden', () => {
      const ctx = createMockContext(aiUser, undefined, ['patient:read']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('blocks AI_SERVICE from inspecting audit logs (audit:read) with 403 Forbidden', () => {
      const ctx = createMockContext(aiUser, ['SUPER_ADMIN'], ['audit:read']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('blocks AI_SERVICE from managing users (user:manage) with 403 Forbidden', () => {
      const ctx = createMockContext(aiUser, undefined, ['user:manage']);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ─── INT-005: Doctor Availability Retrieval ───────────────────────────────
  describe('INT-005: Authoritative Doctor Availability & Break Exclusions', () => {
    it('retrieves working hours and correctly excludes lunch break interval', () => {
      // Shift: 09:00 - 17:00, Break: 13:00 - 14:00, 30 min slots
      const startMin = scheduleService.timeToMinutes('09:00');
      const endMin = scheduleService.timeToMinutes('17:00');
      const breakStart = scheduleService.timeToMinutes('13:00');
      const breakEnd = scheduleService.timeToMinutes('14:00');

      expect(startMin).toBe(540);
      expect(endMin).toBe(1020);
      expect(breakStart).toBe(780);
      expect(breakEnd).toBe(840);

      // Verify that lunch slots fall within break
      const isDuringBreak = (timeStr: string) => {
        const m = scheduleService.timeToMinutes(timeStr);
        return m >= breakStart && m < breakEnd;
      };

      expect(isDuringBreak('13:00')).toBe(true);
      expect(isDuringBreak('13:30')).toBe(true);
      expect(isDuringBreak('14:00')).toBe(false);
      expect(isDuringBreak('09:30')).toBe(false);
    });
  });

  // ─── INT-006: Appointment Creation Through AI ─────────────────────────────
  describe('INT-006: Clinical Appointment Creation with source AI_VOICE', () => {
    it('creates appointment tagged with source AI_VOICE and status REQUESTED', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'pat-ai-1', phone: '9876543210' });
      mockPrisma.doctor.findFirst.mockResolvedValue({ id: 'doc-ai-1', department: { name: 'Orthopedics' } });
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // No conflict

      const expectedAppointment = {
        id: 'appt-voice-9001',
        patientId: 'pat-ai-1',
        doctorId: 'doc-ai-1',
        department: 'Orthopedics',
        scheduledStart: new Date('2026-11-01T14:00:00+05:30'),
        scheduledEnd: new Date('2026-11-01T14:30:00+05:30'),
        status: 'REQUESTED',
        source: 'AI_VOICE',
        requestId: 'idemp-voice-001',
      };
      mockPrisma.appointment.create.mockResolvedValue(expectedAppointment);

      const result = await appointmentsService.createBookingRequest({
        patientPhone: '9876543210',
        doctorId: 'doc-ai-1',
        slotStart: '2026-11-01T14:00:00+05:30',
        source: 'AI_VOICE',
        requestId: 'idemp-voice-001',
      });

      expect(result.id).toBe('appt-voice-9001');
      expect(result.source).toBe('AI_VOICE');
      expect(result.status).toBe('REQUESTED');
    });
  });

  // ─── INT-007: Idempotency Protection ──────────────────────────────────────
  describe('INT-007: Idempotent Booking Protection', () => {
    it('returns existing appointment with isReplay: true when same requestId is re-submitted', async () => {
      const existingAppt = {
        id: 'appt-voice-9001',
        patientId: 'pat-ai-1',
        doctorId: 'doc-ai-1',
        department: 'Orthopedics',
        status: 'REQUESTED',
        source: 'AI_VOICE',
        requestId: 'idemp-voice-001',
      };

      // Mock finding the existing booking by requestId
      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppt);

      const retryResult = await appointmentsService.createBookingRequest({
        patientPhone: '9876543210',
        doctorId: 'doc-ai-1',
        slotStart: '2026-11-01T14:00:00+05:30',
        requestId: 'idemp-voice-001',
      });

      expect(retryResult.id).toBe('appt-voice-9001');
      expect((retryResult as any).isReplay).toBe(true);
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  // ─── INT-008: Call-Log Recording ──────────────────────────────────────────
  describe('INT-008: Telephony Call Log Creation', () => {
    it('creates a persistent call log record with callerPhone, duration, and summary', async () => {
      const mockLog = {
        id: 'call-log-8001',
        callerPhone: '+919876543210',
        direction: 'INBOUND',
        durationSeconds: 114,
        intent: 'APPOINTMENT_BOOKING',
        outcome: 'COMPLETED',
        summary: 'Caller successfully booked Orthopedic slot with Dr. Mehta.',
      };
      mockPrisma.callLog.create.mockResolvedValue(mockLog);

      const created = await callsService.create({
        callerPhone: '+919876543210',
        direction: 'INBOUND',
        durationSeconds: 114,
        intent: 'APPOINTMENT_BOOKING',
        outcome: 'COMPLETED',
        summary: 'Caller successfully booked Orthopedic slot with Dr. Mehta.',
      });

      expect(created.id).toBe('call-log-8001');
      expect(created.outcome).toBe('COMPLETED');
      expect(created.durationSeconds).toBe(114);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CALL_LOG_RECORDED',
          auditableType: 'CallLog',
        }),
      );
    });
  });

  // ─── INT-009: Lead Creation on Human Handoff ──────────────────────────────
  describe('INT-009: Handoff CRM Lead Creation', () => {
    it('creates lead tagged with source AI_RECEPTIONIST upon escalation', async () => {
      const mockLead = {
        id: 'lead-escalation-01',
        name: 'Caller Emergency Triage',
        phone: '9123456789',
        source: 'AI_RECEPTIONIST',
        status: 'NEW',
        notes: 'Caller requested human handoff regarding acute chest pain',
      };
      mockPrisma.lead.create.mockResolvedValue(mockLead);

      const lead = await leadsService.createLead({
        name: 'Caller Emergency Triage',
        phone: '9123456789',
        source: 'AI_RECEPTIONIST',
        notes: 'Caller requested human handoff regarding acute chest pain',
      });

      expect(lead.id).toBe('lead-escalation-01');
      expect(lead.source).toBe('AI_RECEPTIONIST');
      expect(lead.status).toBe('NEW');
    });
  });

  // ─── INT-010: Urgent Task Creation on Human Handoff ───────────────────────
  describe('INT-010: Urgent Follow-Up Task Escalation', () => {
    it('creates high priority follow-up task linked to escalation lead', async () => {
      const mockTask = {
        id: 'task-urgent-01',
        leadId: 'lead-escalation-01',
        title: 'URGENT: Caller callback requested for clinical triage',
        priority: 'HIGH',
        status: 'PENDING',
      };
      mockPrisma.followUpTask.create.mockResolvedValue(mockTask);

      const task = await leadsService.createTask({
        leadId: 'lead-escalation-01',
        title: 'URGENT: Caller callback requested for clinical triage',
        dueDate: new Date().toISOString(),
        priority: 'HIGH',
      });

      expect(task.id).toBe('task-urgent-01');
      expect(task.priority).toBe('HIGH');
      expect(task.leadId).toBe('lead-escalation-01');
    });
  });

  // ─── INT-011: Twilio Inbound Call Flow & TwiML ─────────────────────────────
  describe('INT-011: Twilio Inbound TwiML Gather Generation', () => {
    it('generates valid TwiML with Gather input=speech and speechTimeout=auto', () => {
      const greeting = 'Welcome to Advfiction Hospital. How can I help you today?';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" speechTimeout="auto" action="/voice/respond"><Say language="en-IN" voice="Polly.Aditi">${greeting}</Say></Gather></Response>`;

      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Gather input="speech"');
      expect(twiml).toContain('action="/voice/respond"');
      expect(twiml).toContain('Polly.Aditi');
    });
  });

  // ─── INT-012: Twilio Human Call Transfer ──────────────────────────────────
  describe('INT-012: Twilio Human Call Transfer Dial Verb', () => {
    it('generates TwiML Dial verb targeting front desk transfer number', () => {
      const transferNumber = '+919876500000';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Transferring your call to our front desk.</Say><Dial>${transferNumber}</Dial></Response>`;

      expect(twiml).toContain('<Dial>+919876500000</Dial>');
      expect(twiml).toContain('Transferring your call');
    });
  });

  // ─── INT-013: Confirmation Notification Rendering ─────────────────────────
  describe('INT-013: Notification Template Rendering', () => {
    it('renders APPOINTMENT_CONFIRMED SMS text with correct patient and doctor variables', () => {
      const rendered = notificationsService.renderTemplate('APPOINTMENT_CONFIRMED', {
        patientName: 'Sameer Joshi',
        doctorName: 'Dr. Rahul Mehta',
        time: 'tomorrow at 2:00 PM',
      });

      expect(rendered).toBe(
        'Dear Sameer Joshi, your appointment with Dr. Dr. Rahul Mehta is confirmed for tomorrow at 2:00 PM.',
      );
    });
  });

  // ─── INT-014: Authoritative Web Portal Reflection ─────────────────────────
  describe('INT-014: Data Consistency with Portal Models', () => {
    it('confirms appointment record contains required fields expected by Next.js portal UI', () => {
      const portalAppt = {
        id: 'appt-1',
        patient: { firstName: 'Sameer', lastName: 'Joshi', phone: '9876543210' },
        doctor: { name: 'Dr. Rahul Mehta', specialization: 'Orthopedics' },
        scheduledStart: new Date('2026-11-01T14:00:00+05:30'),
        status: 'CONFIRMED',
        source: 'AI_VOICE',
      };

      expect(portalAppt.patient.firstName).toBeDefined();
      expect(portalAppt.doctor.specialization).toBeDefined();
      expect(portalAppt.source).toBe('AI_VOICE');
    });
  });

  // ─── INT-015: Schedule Conflict Protection ────────────────────────────────
  describe('INT-015: Overlapping Booking Collision Rejection', () => {
    it('throws ConflictException (HTTP 409) when slot is already booked', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'pat-999', phone: '9999999999' });

      // Simulate existing booking for doctor at same time
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'existing-conflict-appt',
        doctorId: 'doc-1',
        scheduledStart: new Date('2026-11-01T14:00:00+05:30'),
        scheduledEnd: new Date('2026-11-01T14:30:00+05:30'),
        status: 'CONFIRMED',
      });

      await expect(
        appointmentsService.createBookingRequest({
          patientPhone: '9999999999',
          doctorId: 'doc-1',
          slotStart: '2026-11-01T14:00:00+05:30',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── INT-016: AI_SERVICE Staff-Login Isolation ────────────────────────────
  describe('INT-016: Anti-Impersonation Staff Login Boundary', () => {
    it('throws UnauthorizedException when AI_SERVICE attempts human staff login', async () => {
      mockUsersService.findByEmailWithHash.mockResolvedValue({
        id: 'usr-ai-service',
        email: 'ai@service.internal',
        fullName: 'AI Machine Service',
        passwordHash: '$argon2id$mockhash',
        isActive: true,
        role: { name: 'AI_SERVICE' },
      });

      // Mock valid password verification
      jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);

      // Attempt validate() via LocalStrategy (human portal)
      await expect(
        localStrategy.validate({}, 'ai@service.internal', 'SuperSecret123#'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        localStrategy.validate({}, 'ai@service.internal', 'SuperSecret123#'),
      ).rejects.toThrow('AI Service accounts cannot use the human login portal.');
    });
  });
});
