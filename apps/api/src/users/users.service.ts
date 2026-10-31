import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  }

  async findByEmailWithHash(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  }
}
