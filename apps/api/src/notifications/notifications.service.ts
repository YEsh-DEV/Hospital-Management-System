import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendNotificationDto {
  recipient: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  templateId: string;
  appointmentId?: string;
  leadId?: string;
  variables?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public renderTemplate(templateId: string, variables?: Record<string, string>): string {
    const vars = variables || {};
    switch (templateId) {
      case 'APPOINTMENT_CONFIRMED':
        return `Dear ${vars.patientName || 'Patient'}, your appointment with Dr. ${vars.doctorName || 'Doctor'} is confirmed for ${vars.time || 'scheduled time'}.`;
      case 'APPOINTMENT_REQUESTED':
        return `Dear ${vars.patientName || 'Patient'}, your appointment request for ${vars.time || 'requested time'} has been received and is pending staff confirmation.`;
      case 'APPOINTMENT_CANCELLED':
        return `Dear ${vars.patientName || 'Patient'}, your appointment scheduled for ${vars.time || 'scheduled time'} has been cancelled.`;
      case 'FOLLOW_UP_REMINDER':
        return `Follow-up reminder: enquiry from ${vars.contactName || 'Lead'} regarding ${vars.service || 'hospital service'}.`;
      default:
        return `Notification from HMS: ${vars.message || 'hospital update'}`;
    }
  }

  async send(dto: SendNotificationDto) {
    const messageText = this.renderTemplate(dto.templateId, dto.variables);

    // Mock Provider Execution: structured log & record in database
    this.logger.log(`[MOCK NOTIFICATION] [${dto.channel}] to ${dto.recipient}: "${messageText}"`);

    const notification = await this.prisma.notification.create({
      data: {
        recipient: dto.recipient,
        channel: dto.channel,
        templateId: dto.templateId,
        appointmentId: dto.appointmentId || null,
        leadId: dto.leadId || null,
        status: 'SENT',
        sentAt: new Date(),
        providerResponse: {
          mockProvider: true,
          message: messageText,
          timestamp: new Date().toISOString(),
          status: 'DELIVERED',
        },
      },
    });

    return notification;
  }

  async findByRecipient(recipient: string) {
    return this.prisma.notification.findMany({
      where: { recipient },
      orderBy: { createdAt: 'desc' },
    });
  }
}
