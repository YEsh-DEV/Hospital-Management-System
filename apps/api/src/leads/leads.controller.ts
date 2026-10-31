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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Permissions, PermissionsGuard } from '../rbac/rbac.guard';
import {
  LeadsService,
  CreateLeadDto,
  UpdateLeadDto,
  CreateFollowUpTaskDto,
  UpdateFollowUpTaskDto,
} from './leads.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api')
export class LeadsController {
  constructor(@Inject(LeadsService) private readonly leadsService: LeadsService) {}

  @Permissions('lead:manage')
  @Get('leads')
  async findAllLeads(
    @Query('status') status?: string,
    @Query('source') source?: string,
  ) {
    return this.leadsService.findAllLeads(status, source);
  }

  @Permissions('lead:manage')
  @Get('leads/:id')
  async findLeadById(@Param('id') id: string) {
    return this.leadsService.findLeadById(id);
  }

  @Permissions('lead:manage')
  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  async createLead(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.leadsService.createLead(dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @Permissions('lead:manage')
  @Patch('leads/:id')
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.leadsService.updateLead(id, dto, user?.id, req.ip, req.headers['user-agent']);
  }

  // ─── Follow-up Tasks ──────────────────────────────────────────────────────
  @Permissions('task:manage')
  @Get('follow-up-tasks')
  async findAllTasks(
    @Query('status') status?: string,
    @Query('leadId') leadId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    return this.leadsService.findAllTasks({ status, leadId, assignedToUserId });
  }

  @Permissions('task:manage')
  @Post('follow-up-tasks')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Body() dto: CreateFollowUpTaskDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.leadsService.createTask(dto, user?.id, req.ip, req.headers['user-agent']);
  }

  @Permissions('task:manage')
  @Patch('follow-up-tasks/:id')
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpTaskDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.leadsService.updateTask(id, dto, user?.id, req.ip, req.headers['user-agent']);
  }
}
