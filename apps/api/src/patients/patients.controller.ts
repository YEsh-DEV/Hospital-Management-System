import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, RequirePermissions } from '../rbac/rbac.guard';
import { PatientsService, CreatePatientDto, UpdatePatientDto } from './patients.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PHIInterceptor } from '../audit/phi.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/patients')
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patientsService: PatientsService) {}

  @RequirePermissions('patient:read')
  @UseInterceptors(PHIInterceptor)
  @Get()
  async findAll(@Query('search') search?: string) {
    return this.patientsService.findAll(search);
  }

  @RequirePermissions('patient:read')
  @UseInterceptors(PHIInterceptor)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }

  @RequirePermissions('patient:create')
  @Post()
  async create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.patientsService.create(dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @RequirePermissions('patient:update')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.patientsService.update(id, dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @RequirePermissions('patient:delete')
  @Delete(':id')
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.patientsService.softDelete(id, user?.id, req.ip, req.headers['user-agent']);
  }
}
