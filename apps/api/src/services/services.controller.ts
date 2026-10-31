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
import { HospitalServicesService, CreateServiceDto, UpdateServiceDto } from './services.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Permissions, PermissionsGuard } from '../rbac/rbac.guard';

@Controller('services')
export class HospitalServicesController {
  constructor(@Inject(HospitalServicesService) private readonly servicesService: HospitalServicesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('departmentId') departmentId?: string) {
    return this.servicesService.findAll(departmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('department:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('department:manage')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }
}
