export type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'RECEPTIONIST'
  | 'DOCTOR'
  | 'NURSE'
  | 'AI_SERVICE';

export type PermissionAction =
  | 'availability:read'
  | 'booking:create'
  | 'patient:read'
  | 'patient:create'
  | 'patient:update'
  | 'patient:delete'
  | 'appointment:read'
  | 'appointment:create'
  | 'appointment:update'
  | 'appointment:cancel'
  | 'audit:read'
  | 'user:manage'
  | 'report:read'
  | 'department:manage'
  | 'doctor:manage'
  | 'lead:manage'
  | 'task:manage'
  | 'call:manage'
  | 'notification:send';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  permissions: PermissionAction[];
}

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  departmentId: string;
  name: string;
  durationMinutes: number;
  price: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorScheduleRecord {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDurationMinutes: number;
  breakStart?: string | null;
  breakEnd?: string | null;
  maxCapacity: number;
  isActive: boolean;
}

export interface DoctorLeaveRecord {
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdAt: string;
}

export interface DoctorRecord {
  id: string;
  userId?: string | null;
  departmentId: string;
  departmentName?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization: string;
  consultationFee: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schedules?: DoctorScheduleRecord[];
  leaves?: DoctorLeaveRecord[];
}

export interface PatientRecord {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  normalizedPhone?: string | null;
  email?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentSource =
  | 'RECEPTION'
  | 'AI_VOICE'
  | 'ONLINE'
  | 'ENQUIRY';

export interface AppointmentRecord {
  id: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName?: string;
  serviceId?: string | null;
  serviceName?: string;
  department: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes?: string | null;
  cancellationReason?: string | null;
  requestId?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
export type LeadSource = 'PHONE_CALL' | 'WEBSITE' | 'WALK_IN' | 'AI_RECEPTIONIST';

export interface LeadRecord {
  id: string;
  patientId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  source: LeadSource;
  status: LeadStatus;
  assignedToUserId?: string | null;
  assignedToName?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface FollowUpTaskRecord {
  id: string;
  leadId?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CallOutcome = 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'ABANDONED';

export interface CallLogRecord {
  id: string;
  callerPhone: string;
  callerName?: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  durationSeconds: number;
  intent?: string | null;
  outcome: CallOutcome;
  summary?: string | null;
  patientId?: string | null;
  leadId?: string | null;
  appointmentId?: string | null;
  recordingConsent: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  appointmentId?: string | null;
  leadId?: string | null;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  recipient: string;
  templateId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  providerResponse?: Record<string, unknown> | null;
  retryCount: number;
  createdAt: string;
  sentAt?: string | null;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userName?: string;
  userRole?: string;
  action: string;
  auditableType: string;
  auditableId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  performedAt: string;
}

export interface AvailabilitySlot {
  start: string; // ISO 8601 string
  end: string;   // ISO 8601 string
}

export interface DoctorAvailabilityResponse {
  doctorId: string;
  doctorName?: string;
  date: string; // YYYY-MM-DD
  timezone: string; // e.g. "Asia/Kolkata"
  slots: AvailabilitySlot[];
}

export interface OperationalReportsSummary {
  range: { from: string; to: string };
  appointments: {
    total: number;
    confirmed: number;
    requested: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  leads: {
    total: number;
    new: number;
    contacted: number;
    converted: number;
  };
  calls: {
    total: number;
    completed: number;
    escalated: number;
    abandoned: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
}

export interface RoleDefinition {
  id: number;
  name: RoleName;
  description: string;
  permissions: PermissionAction[];
}

export const ROLE_PERMISSIONS: Record<RoleName, PermissionAction[]> = {
  SUPER_ADMIN: [
    'availability:read',
    'booking:create',
    'patient:read',
    'patient:create',
    'patient:update',
    'patient:delete',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'audit:read',
    'user:manage',
    'report:read',
    'department:manage',
    'doctor:manage',
    'lead:manage',
    'task:manage',
    'call:manage',
    'notification:send',
  ],
  ADMIN: [
    'patient:read',
    'patient:create',
    'patient:update',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'report:read',
    'user:manage',
    'department:manage',
    'doctor:manage',
    'lead:manage',
    'task:manage',
    'call:manage',
    'notification:send',
  ],
  RECEPTIONIST: [
    'patient:read',
    'patient:create',
    'patient:update',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'availability:read',
    'booking:create',
    'lead:manage',
    'task:manage',
    'call:manage',
  ],
  DOCTOR: [
    'patient:read',
    'appointment:read',
    'appointment:update',
    'availability:read',
  ],
  NURSE: [
    'patient:read',
    'appointment:read',
    'appointment:update',
  ],
  AI_SERVICE: [
    'availability:read',
    'booking:create',
    'call:manage',
  ],
};

export function hasPermission(role: RoleName, action: PermissionAction): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(action) : false;
}
