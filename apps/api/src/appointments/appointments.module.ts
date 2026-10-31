import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [PrismaModule, AuditModule, DoctorsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
