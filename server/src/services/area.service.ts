import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CreateAreaInput } from '../schemas/master.schema.js';

export class AreaService {
  public static async getAll() {
    const areas = await prisma.area.findMany({
      orderBy: { displayName: 'asc' },
      include: {
        _count: {
          select: { firms: true },
        },
      },
    });

    return areas.map((a) => ({
      id: a.id,
      name: a.displayName,
      nameNormalized: a.nameNormalized,
      firmsCount: a._count.firms,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  public static async create(input: CreateAreaInput, userId?: string) {
    const normalized = input.name.trim().toLowerCase();

    const existing = await prisma.area.findUnique({
      where: { nameNormalized: normalized },
    });

    if (existing) {
      throw new AppError('Area already inserted.', 400, 'DUPLICATE_AREA');
    }

    const area = await prisma.area.create({
      data: {
        displayName: input.name.trim(),
        nameNormalized: normalized,
      },
    });

    await AuditService.log({
      userId,
      module: 'AREA_MASTER',
      action: 'CREATE',
      entityType: 'Area',
      entityId: area.id,
      metadata: { areaName: area.displayName },
    });

    return area;
  }

  public static async delete(id: string, userId?: string) {
    const area = await prisma.area.findUnique({
      where: { id },
      include: {
        _count: {
          select: { firms: true },
        },
      },
    });

    if (!area) {
      throw new AppError('Area not found.', 404, 'NOT_FOUND');
    }

    if (area._count.firms > 0) {
      throw new AppError(
        `Cannot delete area "${area.displayName}" because ${area._count.firms} firm(s) are linked to it.`,
        400,
        'AREA_IN_USE'
      );
    }

    await prisma.area.delete({
      where: { id },
    });

    await AuditService.log({
      userId,
      module: 'AREA_MASTER',
      action: 'DELETE',
      entityType: 'Area',
      entityId: id,
      metadata: { areaName: area.displayName },
    });

    return { message: 'Area deleted successfully.' };
  }
}
