import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class DepartmentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        services: { where: { isActive: true } },
        doctors: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        services: true,
        doctors: true,
      },
    });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findById(id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }
}
