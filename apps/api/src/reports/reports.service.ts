import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getSummary(from?: string, to?: string) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = from ? new Date(`${from}T00:00:00+05:30`) : new Date(`${todayStr}T00:00:00+05:30`);
    const endDate = to ? new Date(`${to}T23:59:59+05:30`) : new Date(`${todayStr}T23:59:59+05:30`);

    // 1. Appointments Aggregation
    const appointments = await this.prisma.appointment.findMany({
      where: {
        deletedAt: null,
        scheduledStart: { gte: startDate, lte: endDate },
      },
      select: { status: true },
    });

    const appointmentCounts = {
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'SCHEDULED').length,
      requested: appointments.filter((a) => a.status === 'REQUESTED').length,
      completed: appointments.filter((a) => a.status === 'COMPLETED').length,
      cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
      noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
    };

    // 2. Leads Aggregation
    const leads = await this.prisma.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { status: true },
    });

    const leadCounts = {
      total: leads.length,
      new: leads.filter((l) => l.status === 'NEW').length,
      contacted: leads.filter((l) => l.status === 'CONTACTED').length,
      converted: leads.filter((l) => l.status === 'CONVERTED').length,
    };

    // 3. Calls Aggregation
    const calls = await this.prisma.callLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { outcome: true, durationSeconds: true },
    });

    const callCounts = {
      total: calls.length,
      completed: calls.filter((c) => c.outcome === 'COMPLETED').length,
      escalated: calls.filter((c) => c.outcome === 'ESCALATED').length,
      abandoned: calls.filter((c) => c.outcome === 'ABANDONED').length,
      avgDurationSeconds: calls.length
        ? Math.round(calls.reduce((acc, c) => acc + c.durationSeconds, 0) / calls.length)
        : 0,
    };

    // 4. Tasks Aggregation
    const tasks = await this.prisma.followUpTask.findMany({
      where: {
        dueDate: { gte: startDate, lte: endDate },
      },
      select: { status: true, dueDate: true },
    });

    const now = new Date();
    const taskCounts = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      overdue: tasks.filter(
        (t) => t.status === 'PENDING' && new Date(t.dueDate) < now,
      ).length,
    };

    return {
      range: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      appointments: appointmentCounts,
      leads: leadCounts,
      calls: callCounts,
      tasks: taskCounts,
    };
  }
}
