import {
  Inject,
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Permissions, PermissionsGuard } from '../rbac/rbac.guard';
import { NotificationsService, SendNotificationDto } from './notifications.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Permissions('notification:send')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Permissions('notification:send')
  @Get()
  async findByRecipient(@Query('recipient') recipient: string) {
    return this.notificationsService.findByRecipient(recipient);
  }
}
