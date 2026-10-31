import {
  Inject,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DoctorsService, CreateDoctorDto, UpdateDoctorDto, DoctorScheduleItemDto } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, Permissions, PermissionsGuard } from '../rbac/rbac.guard';

@Controller('doctors')
export class DoctorsController {
  constructor(@Inject(DoctorsService) private readonly doctorsService: DoctorsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('departmentId') departmentId?: string) {
    return this.doctorsService.findAll(departmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.doctorsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('doctor:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('doctor:manage')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('doctor:manage')
  @Post(':id/schedules')
  @HttpCode(HttpStatus.OK)
  async setSchedules(
    @Param('id') id: string,
    @Body('schedules') schedules: DoctorScheduleItemDto[],
  ) {
    return this.doctorsService.setSchedules(id, schedules || []);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('doctor:manage')
  @Post(':id/leaves')
  @HttpCode(HttpStatus.CREATED)
  async addLeave(
    @Param('id') id: string,
    @Body() body: { startDate: string; endDate: string; reason?: string },
  ) {
    return this.doctorsService.addLeave(id, body.startDate, body.endDate, body.reason);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('availability:read')
  @Get(':id/availability')
  async getAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    const duration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;
    return this.doctorsService.getAvailability(id, date, duration);
  }
}
