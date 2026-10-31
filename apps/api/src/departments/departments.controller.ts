import {
  Inject,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService, CreateDepartmentDto, UpdateDepartmentDto } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Permissions, PermissionsGuard } from '../rbac/rbac.guard';

@Controller('departments')
export class DepartmentsController {
  constructor(@Inject(DepartmentsService) private readonly departmentsService: DepartmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.departmentsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('department:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('department:manage')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }
}
