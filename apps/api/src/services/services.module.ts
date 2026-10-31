import { Module } from '@nestjs/common';
import { HospitalServicesController } from './services.controller';
import { HospitalServicesService } from './services.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HospitalServicesController],
  providers: [HospitalServicesService],
  exports: [HospitalServicesService],
})
export class HospitalServicesModule {}
