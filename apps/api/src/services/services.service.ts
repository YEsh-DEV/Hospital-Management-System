import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateServiceDto {
  departmentId: string;
  name: string;
  durationMinutes?: number;
  price?: number;
}

export interface UpdateServiceDto {
  name?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

@Injectable()
export class HospitalServicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(departmentId?: string) {
    return this.prisma.service.findMany({
      where: {
        isActive: true,
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!service) throw new NotFoundException(`Service ${id} not found`);
    return service;
  }

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name,
        durationMinutes: dto.durationMinutes ?? 30,
        price: dto.price ?? 0,
      },
      include: { department: true },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findById(id);
    return this.prisma.service.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }
}
