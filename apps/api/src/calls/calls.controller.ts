import {
  Inject,
  Controller,
  Get,
  Post,
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
import { CallsService, CreateCallLogDto } from './calls.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api')
export class CallsController {
  constructor(@Inject(CallsService) private readonly callsService: CallsService) {}

  @Permissions('call:manage')
  @Get('call-logs')
  async findAll(
    @Query('callerPhone') callerPhone?: string,
    @Query('outcome') outcome?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.callsService.findAll({ callerPhone, outcome, patientId, from, to });
  }

  @Permissions('call:manage')
  @Post('call-logs')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCallLogDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.callsService.create(dto, user?.id, req.ip, req.headers['user-agent']);
  }
}
