import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DepartmentsModule } from './departments/departments.module';
import { HospitalServicesModule } from './services/services.module';
import { DoctorsModule } from './doctors/doctors.module';
import { LeadsModule } from './leads/leads.module';
import { CallsModule } from './calls/calls.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // standard authenticated threshold
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RbacModule,
    AuditModule,
    EmailModule,
    PatientsModule,
    DepartmentsModule,
    HospitalServicesModule,
    DoctorsModule,
    AppointmentsModule,
    LeadsModule,
    CallsModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
