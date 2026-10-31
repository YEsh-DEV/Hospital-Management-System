import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, RequirePermissions } from '../rbac/rbac.guard';
import {
  AppointmentsService,
  CreateBookingRequestDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
} from './appointments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api')
export class AppointmentsController {
  constructor(@Inject(AppointmentsService) private readonly appointmentsService: AppointmentsService) {}

  @RequirePermissions('appointment:read')
  @Get('appointments')
  async findAll(
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.appointmentsService.findAll({ doctorId, patientId, department, status, date });
  }

  @RequirePermissions('appointment:read')
  @Get('appointments/:id')
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  // Contract: /api/availability (AI Scoped Token or Web User)
  @RequirePermissions('availability:read')
  @Get('availability')
  async getAvailability(
    @Query('date') date?: string,
    @Query('department') department?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.appointmentsService.getAvailability(date, department, doctorId);
  }

  // Contract: /api/booking-requests (AI Scoped Token or Web User)
  @RequirePermissions('booking:create')
  @Post('booking-requests')
  @HttpCode(HttpStatus.CREATED)
  async createBookingRequest(
    @Body() dto: CreateBookingRequestDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.appointmentsService.createBookingRequest(
      dto,
      user?.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // PRD Standard Contract: POST /api/appointments
  @RequirePermissions('booking:create')
  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @Body() dto: CreateBookingRequestDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.appointmentsService.createBookingRequest(
      dto,
      user?.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @RequirePermissions('appointment:update')
  @Patch('appointments/:id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.appointmentsService.reschedule(id, dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @RequirePermissions('appointment:cancel')
  @Post('appointments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.appointmentsService.cancel(id, dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @RequirePermissions('appointment:update')
  @Patch('appointments/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.appointmentsService.updateStatus(id, status, user?.id, req.ip, req.headers['user-agent']);
  }
}
