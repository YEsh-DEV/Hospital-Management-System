import 'dotenv/config'; // Ensure ARGON2_PEPPER and DATABASE_URL match the backend runtime
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive database seed for unified HMS...');

  // 1. Permissions
  const permissionsList = [
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
  ];

  const permissionsMap = new Map<string, number>();
  for (const action of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { action },
      update: {},
      create: { action },
    });
    permissionsMap.set(action, perm.id);
  }

  // 2. Roles
  const rolesData: { name: string; permissions: string[] }[] = [
    {
      name: 'SUPER_ADMIN',
      permissions: permissionsList,
    },
    {
      name: 'ADMIN',
      permissions: [
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
    },
    {
      name: 'RECEPTIONIST',
      permissions: [
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
    },
    {
      name: 'DOCTOR',
      permissions: ['patient:read', 'appointment:read', 'appointment:update', 'availability:read'],
    },
    {
      name: 'NURSE',
      permissions: ['patient:read', 'appointment:read', 'appointment:update'],
    },
    {
      name: 'AI_SERVICE',
      permissions: ['availability:read', 'booking:create', 'call:manage'],
    },
  ];

  const rolesMap = new Map<string, number>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name },
    });
    rolesMap.set(r.name, role.id);

    // Link permissions
    for (const permAction of r.permissions) {
      const permId = permissionsMap.get(permAction);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  // 3. Seed Users
  const pepper = process.env.ARGON2_PEPPER || '';
  const defaultPassword = await argon2.hash('SuperSecret123#' + pepper, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const users = [
    { email: 'superadmin@hospital.com', fullName: 'Dr. Arthur Vance', role: 'SUPER_ADMIN' },
    { email: 'admin@hospital.com', fullName: 'Clara Oswald', role: 'ADMIN' },
    { email: 'reception@hospital.com', fullName: 'Emily Thorne', role: 'RECEPTIONIST' },
    { email: 'doctor@hospital.com', fullName: 'Dr. Sarah Jenkins', role: 'DOCTOR' },
    { email: 'nurse@hospital.com', fullName: 'Nurse Joy', role: 'NURSE' },
  ];

  const userMap = new Map<string, string>();
  for (const u of users) {
    const roleId = rolesMap.get(u.role);
    if (!roleId) continue;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId, fullName: u.fullName, passwordHash: defaultPassword, isActive: true },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash: defaultPassword,
        roleId,
        isActive: true,
      },
    });
    userMap.set(u.email, user.id);
  }

  // 4. Seed Departments
  const depts = [
    { code: 'CARD', name: 'Cardiology', description: 'Comprehensive heart & cardiovascular care' },
    { code: 'ORTH', name: 'Orthopedics', description: 'Bones, joints, and musculoskeletal health' },
    { code: 'PED', name: 'Pediatrics', description: 'Specialized healthcare for infants and children' },
    { code: 'GEN', name: 'General Medicine', description: 'Primary adult healthcare & diagnostics' },
  ];

  const deptMap = new Map<string, string>();
  for (const d of depts) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
    deptMap.set(d.code, dept.id);
  }

  // 5. Seed Services
  const services = [
    { deptCode: 'CARD', name: 'Cardiac Stress Assessment', duration: 45, price: 1500 },
    { deptCode: 'CARD', name: 'Standard ECG & Consultation', duration: 30, price: 800 },
    { deptCode: 'ORTH', name: 'Joint Pain & Mobility Evaluation', duration: 30, price: 900 },
    { deptCode: 'ORTH', name: 'Post-Fracture Rehabilitation Review', duration: 45, price: 1200 },
    { deptCode: 'PED', name: 'Child Wellness & Immunization', duration: 30, price: 600 },
    { deptCode: 'PED', name: 'Pediatric Developmental Check', duration: 45, price: 850 },
    { deptCode: 'GEN', name: 'Routine Clinical Consultation', duration: 30, price: 500 },
    { deptCode: 'GEN', name: 'Executive Full Body Health Screening', duration: 60, price: 2500 },
  ];

  const serviceMap = new Map<string, string>();
  for (const s of services) {
    const deptId = deptMap.get(s.deptCode);
    if (!deptId) continue;
    let service = await prisma.service.findFirst({
      where: { departmentId: deptId, name: s.name },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          departmentId: deptId,
          name: s.name,
          durationMinutes: s.duration,
          price: s.price,
        },
      });
    }
    serviceMap.set(s.name, service.id);
  }

  // 6. Seed 8 Doctors & Schedules (2 per department)
  const doctorsData = [
    {
      name: 'Dr. Sarah Jenkins',
      email: 'doctor@hospital.com',
      deptCode: 'CARD',
      specialization: 'Senior Cardiologist & Interventional Cardiology',
      fee: 1000,
      userEmail: 'doctor@hospital.com',
    },
    {
      name: 'Dr. Arthur Vance',
      email: 'superadmin@hospital.com',
      deptCode: 'CARD',
      specialization: 'Consultant Cardiologist & Heart Rhythm Specialist',
      fee: 1200,
      userEmail: 'superadmin@hospital.com',
    },
    {
      name: 'Dr. Rahul Mehta',
      email: 'dr.rahul@hospital.com',
      deptCode: 'ORTH',
      specialization: 'Orthopedic Surgeon & Joint Replacement Specialist',
      fee: 900,
    },
    {
      name: 'Dr. Liam Patel',
      email: 'dr.liam@hospital.com',
      deptCode: 'ORTH',
      specialization: 'Sports Injury & Arthroscopic Surgeon',
      fee: 950,
    },
    {
      name: 'Dr. Priya Nair',
      email: 'dr.priya@hospital.com',
      deptCode: 'PED',
      specialization: 'Pediatric Specialist & Neonatologist',
      fee: 750,
    },
    {
      name: 'Dr. Emily Rose',
      email: 'dr.emily@hospital.com',
      deptCode: 'PED',
      specialization: 'General Pediatrician & Child Immunization Lead',
      fee: 700,
    },
    {
      name: 'Dr. Vikram Seth',
      email: 'dr.vikram@hospital.com',
      deptCode: 'GEN',
      specialization: 'Internal Medicine Consultant & Diabetologist',
      fee: 600,
    },
    {
      name: 'Dr. Martha Jones',
      email: 'dr.martha@hospital.com',
      deptCode: 'GEN',
      specialization: 'General Physician & Preventative Healthcare',
      fee: 650,
    },
  ];

  const doctorMap = new Map<string, string>();
  for (const doc of doctorsData) {
    const deptId = deptMap.get(doc.deptCode);
    if (!deptId) continue;

    const userId = doc.userEmail ? userMap.get(doc.userEmail) : undefined;
    let doctor = await prisma.doctor.findFirst({
      where: { name: doc.name },
    });

    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId,
          departmentId: deptId,
          name: doc.name,
          email: doc.email,
          specialization: doc.specialization,
          consultationFee: doc.fee,
        },
      });
    }
    doctorMap.set(doc.name, doctor.id);

    // Seed weekly schedules (Monday to Friday, 09:00 - 17:00, lunch break 13:00 - 14:00)
    for (let day = 1; day <= 5; day++) {
      const existingSchedule = await prisma.doctorSchedule.findFirst({
        where: { doctorId: doctor.id, dayOfWeek: day },
      });
      if (!existingSchedule) {
        await prisma.doctorSchedule.create({
          data: {
            doctorId: doctor.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            slotDurationMinutes: 30,
            breakStart: '13:00',
            breakEnd: '14:00',
            maxCapacity: 1,
          },
        });
      }
    }
  }

  // 7. Seed 20 Patients
  const patientsData = [
    { mrn: 'MRN-2026-0001', firstName: 'Eleanor', lastName: 'Pond', dob: '1989-05-12', gender: 'Female', phone: '9876543210', email: 'eleanor.p@example.com' },
    { mrn: 'MRN-2026-0002', firstName: 'Marcus', lastName: 'Vance', dob: '1975-11-23', gender: 'Male', phone: '9876543211', email: 'marcus.v@example.com' },
    { mrn: 'MRN-2026-0003', firstName: 'Aarav', lastName: 'Patel', dob: '2018-03-15', gender: 'Male', phone: '9876543212', email: 'aarav.parent@example.com' },
    { mrn: 'MRN-2026-0004', firstName: 'Sunita', lastName: 'Rao', dob: '1982-08-30', gender: 'Female', phone: '9876543213', email: 'sunita.rao@example.com' },
    { mrn: 'MRN-2026-0005', firstName: 'Rahul', lastName: 'Sharma', dob: '1990-01-14', gender: 'Male', phone: '9876543214', email: 'rahul.sharma@example.com' },
    { mrn: 'MRN-2026-0006', firstName: 'Amelia', lastName: 'Williams', dob: '1995-04-18', gender: 'Female', phone: '9876543215', email: 'amelia.w@example.com' },
    { mrn: 'MRN-2026-0007', firstName: 'David', lastName: 'Tennant', dob: '1971-04-18', gender: 'Male', phone: '9876543216', email: 'david.t@example.com' },
    { mrn: 'MRN-2026-0008', firstName: 'Rose', lastName: 'Tyler', dob: '1987-07-24', gender: 'Female', phone: '9876543217', email: 'rose.t@example.com' },
    { mrn: 'MRN-2026-0009', firstName: 'Rory', lastName: 'Williams', dob: '1988-12-05', gender: 'Male', phone: '9876543218', email: 'rory.w@example.com' },
    { mrn: 'MRN-2026-0010', firstName: 'Meera', lastName: 'Deshmukh', dob: '1992-09-10', gender: 'Female', phone: '9876543219', email: 'meera.d@example.com' },
    { mrn: 'MRN-2026-0011', firstName: 'Anand', lastName: 'Verma', dob: '1965-06-25', gender: 'Male', phone: '9876543220', email: 'anand.v@example.com' },
    { mrn: 'MRN-2026-0012', firstName: 'Kavita', lastName: 'Menon', dob: '1985-02-14', gender: 'Female', phone: '9876543221', email: 'kavita.m@example.com' },
    { mrn: 'MRN-2026-0013', firstName: 'Rajesh', lastName: 'Gupta', dob: '1978-10-31', gender: 'Male', phone: '9876543222', email: 'rajesh.g@example.com' },
    { mrn: 'MRN-2026-0014', firstName: 'Pooja', lastName: 'Bansal', dob: '1998-11-09', gender: 'Female', phone: '9876543223', email: 'pooja.b@example.com' },
    { mrn: 'MRN-2026-0015', firstName: 'Sanjay', lastName: 'Kulkarni', dob: '1959-12-01', gender: 'Male', phone: '9876543224', email: 'sanjay.k@example.com' },
    { mrn: 'MRN-2026-0016', firstName: 'Deepa', lastName: 'Nair', dob: '2000-07-07', gender: 'Female', phone: '9876543225', email: 'deepa.n@example.com' },
    { mrn: 'MRN-2026-0017', firstName: 'Vikramaditya', lastName: 'Singhania', dob: '1972-03-22', gender: 'Male', phone: '9876543226', email: 'vikram.s@example.com' },
    { mrn: 'MRN-2026-0018', firstName: 'Ritu', lastName: 'Chawla', dob: '1993-08-19', gender: 'Female', phone: '9876543227', email: 'ritu.c@example.com' },
    { mrn: 'MRN-2026-0019', firstName: 'Aditya', lastName: 'Roy', dob: '2015-05-04', gender: 'Male', phone: '9876543228', email: 'aditya.parent@example.com' },
    { mrn: 'MRN-2026-0020', firstName: 'Fatima', lastName: 'Sheikh', dob: '1984-01-28', gender: 'Female', phone: '9876543229', email: 'fatima.s@example.com' },
  ];

  const patientMap = new Map<string, string>();
  for (const p of patientsData) {
    const patient = await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {},
      create: {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        gender: p.gender,
        phone: p.phone,
        normalizedPhone: p.phone,
        email: p.email,
        status: 'ACTIVE',
      },
    });
    patientMap.set(p.mrn, patient.id);
  }

  // 8. Seed 30 Appointments
  const doctorNames = Array.from(doctorMap.keys());
  const patientMrns = Array.from(patientMap.keys());
  const apptStatuses = [
    'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED',
    'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', // 10
    'REQUESTED', 'REQUESTED', 'REQUESTED', 'REQUESTED', 'REQUESTED', 'REQUESTED', // 6
    'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', // 6
    'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', // 5
    'NO_SHOW', 'NO_SHOW', 'NO_SHOW', // 3
  ];

  const baseToday = new Date();
  baseToday.setHours(9, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const docName = doctorNames[i % doctorNames.length];
    const docId = doctorMap.get(docName)!;
    const mrn = patientMrns[i % patientMrns.length];
    const patientId = patientMap.get(mrn)!;
    const status = apptStatuses[i];
    const isAi = i % 3 === 0;

    // Day offset (-2 to +5 days)
    const dayOffset = (i % 8) - 2;
    const hour = 9 + (i % 7); // 9:00 to 15:00
    const minute = (i % 2 === 0) ? 0 : 30;

    const start = new Date(baseToday);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const docObj = doctorsData.find((d) => d.name === docName);
    const deptObj = depts.find((d) => d.code === docObj?.deptCode);

    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: docId,
        scheduledStart: start,
      },
    });

    if (!existing) {
      await prisma.appointment.create({
        data: {
          patientId,
          doctorId: docId,
          department: deptObj?.name || 'General Medicine',
          scheduledStart: start,
          scheduledEnd: end,
          status,
          source: isAi ? 'AI_VOICE' : 'RECEPTION',
          notes: `Consultation session #${i + 1}`,
          cancellationReason: status === 'CANCELLED' ? 'Patient requested reschedule / cancellation' : null,
          requestId: isAi ? `req-seed-${i + 1}` : null,
        },
      });
    }
  }

  // 9. Seed 10 Leads & 10 Follow-up Tasks
  const receptionUserId = userMap.get('reception@hospital.com');
  const leadsData = [
    { name: 'Anita Roy', phone: '9123456780', source: 'PHONE_CALL', status: 'NEW', notes: 'Inquired about knee replacement surgery duration & package pricing' },
    { name: 'Kiran Bedi', phone: '9123456781', source: 'WEBSITE', status: 'NEW', notes: 'Interested in Executive Cardiac Health Checkup' },
    { name: 'Sameer Joshi', phone: '9123456782', source: 'AI_RECEPTIONIST', status: 'CONTACTED', notes: 'Requested callback regarding pediatric vaccination schedule' },
    { name: 'Geeta Phogat', phone: '9123456783', source: 'WALK_IN', status: 'CONTACTED', notes: 'Enquired about orthopedic sports injury physiotherapy' },
    { name: 'Harish Chandra', phone: '9123456784', source: 'PHONE_CALL', status: 'CONVERTED', notes: 'Converted to appointment for General Medicine with Dr. Seth' },
    { name: 'Shweta Tiwari', phone: '9123456785', source: 'WEBSITE', status: 'CONVERTED', notes: 'Booked consultation for child developmental screening' },
    { name: 'Alok Nath', phone: '9123456786', source: 'AI_RECEPTIONIST', status: 'NEW', notes: 'Inquired about weekend cardiology OPD availability' },
    { name: 'Pankaj Tripathi', phone: '9123456787', source: 'PHONE_CALL', status: 'CLOSED', notes: 'Referred to specialized government cancer hospital' },
    { name: 'Monika Geller', phone: '9123456788', source: 'WEBSITE', status: 'NEW', notes: 'Inquired about insurance cashless tie-ups' },
    { name: 'Chandler Bing', phone: '9123456789', source: 'AI_RECEPTIONIST', status: 'CONTACTED', notes: 'Requested quotation for laparoscopic hernia repair' },
  ];

  for (let idx = 0; idx < leadsData.length; idx++) {
    const l = leadsData[idx];
    let lead = await prisma.lead.findFirst({
      where: { phone: l.phone },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          name: l.name,
          phone: l.phone,
          source: l.source,
          status: l.status,
          assignedToUserId: receptionUserId,
          notes: l.notes,
        },
      });

      const due = new Date();
      due.setDate(due.getDate() + (idx % 3) + 1);
      due.setHours(11 + (idx % 5), 0, 0, 0);

      const taskPriorities = ['HIGH', 'MEDIUM', 'URGENT', 'LOW'];
      const taskStatuses = ['PENDING', 'PENDING', 'COMPLETED', 'PENDING'];

      await prisma.followUpTask.create({
        data: {
          leadId: lead.id,
          assignedToUserId: receptionUserId,
          title: `Follow up with ${l.name} regarding enquiry`,
          dueDate: due,
          priority: taskPriorities[idx % taskPriorities.length],
          status: taskStatuses[idx % taskStatuses.length],
          notes: `Staff callback note for lead ${l.name}`,
        },
      });
    }
  }

  // 10. Seed 6 Call Logs
  const callLogsData = [
    {
      callerPhone: '9123456780',
      callerName: 'Anita Roy',
      direction: 'INBOUND',
      durationSeconds: 142,
      intent: 'GENERAL_FAQ',
      outcome: 'COMPLETED',
      summary: 'Caller inquired regarding knee replacement pricing. Lead and callback task created.',
    },
    {
      callerPhone: '9123456782',
      callerName: 'Sameer Joshi',
      direction: 'INBOUND',
      durationSeconds: 98,
      intent: 'APPOINTMENT_BOOKING',
      outcome: 'COMPLETED',
      summary: 'Caller requested pediatric slot for tomorrow afternoon.',
    },
    {
      callerPhone: '9876543210',
      callerName: 'Eleanor Pond',
      direction: 'INBOUND',
      durationSeconds: 65,
      intent: 'DOCTOR_AVAILABILITY',
      outcome: 'COMPLETED',
      summary: 'Checked availability for Dr. Sarah Jenkins on Cardiology OPD.',
    },
    {
      callerPhone: '9988776655',
      callerName: 'Unknown Caller',
      direction: 'INBOUND',
      durationSeconds: 15,
      intent: 'GENERAL_FAQ',
      outcome: 'ABANDONED',
      summary: 'Call disconnected before triage.',
    },
    {
      callerPhone: '9123456786',
      callerName: 'Alok Nath',
      direction: 'INBOUND',
      durationSeconds: 210,
      intent: 'HUMAN_ESCALATION',
      outcome: 'ESCALATED',
      summary: 'Caller had complex billing insurance query transferred to duty supervisor.',
    },
    {
      callerPhone: '9876543214',
      callerName: 'Rahul Sharma',
      direction: 'OUTBOUND',
      durationSeconds: 110,
      intent: 'APPOINTMENT_BOOKING',
      outcome: 'COMPLETED',
      summary: 'Receptionist confirmed tomorrow consultation schedule with patient.',
    },
  ];

  for (const c of callLogsData) {
    const existing = await prisma.callLog.findFirst({
      where: { callerPhone: c.callerPhone, summary: c.summary },
    });
    if (!existing) {
      await prisma.callLog.create({
        data: c,
      });
    }
  }

  // 11. Initial Audit Log
  const existingAuditLog = await prisma.auditLog.findFirst({
    where: { auditableId: 'initial_seed' },
  });
  if (!existingAuditLog) {
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_SEED',
        auditableType: 'System',
        auditableId: 'initial_seed',
        newValues: { message: 'Canonical HMS full enterprise data set successfully loaded' },
        performedAt: new Date(),
      },
    });
  }

  console.log('✅ Canonical HMS seed completed successfully with 8 doctors, 20 patients, 30 appointments, 10 leads, 10 tasks, and 6 call logs!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
