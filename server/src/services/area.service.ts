import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CreateAreaInput, CreateSubAreaInput } from '../schemas/master.schema.js';

export class AreaService {
  public static async getAll() {
    const areas = await prisma.area.findMany({
      orderBy: { displayName: 'asc' },
      include: {
        subAreas: {
          orderBy: { displayName: 'asc' },
          select: {
            id: true,
            displayName: true,
            nameNormalized: true,
            createdAt: true,
          },
        },
        _count: {
          select: { firms: true, subAreas: true },
        },
      },
    });

    return areas.map((a) => ({
      id: a.id,
      name: a.displayName,
      nameNormalized: a.nameNormalized,
      firmsCount: a._count.firms,
      subAreasCount: a._count.subAreas,
      subAreas: a.subAreas.map((sa) => ({
        id: sa.id,
        name: sa.displayName,
        nameNormalized: sa.nameNormalized,
        createdAt: sa.createdAt,
      })),
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
          select: { firms: true, subAreas: true },
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

  public static async getSubAreas(areaId: string) {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new AppError('Area not found.', 404, 'NOT_FOUND');
    }

    const subAreas = await prisma.subArea.findMany({
      where: { areaId },
      orderBy: { displayName: 'asc' },
      include: {
        _count: {
          select: { firms: true },
        },
      },
    });

    return subAreas.map((s) => ({
      id: s.id,
      areaId: s.areaId,
      name: s.displayName,
      nameNormalized: s.nameNormalized,
      firmsCount: s._count.firms,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  public static async createSubArea(areaId: string, input: CreateSubAreaInput, userId?: string) {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new AppError('Parent Main Area not found.', 404, 'NOT_FOUND');
    }

    const normalized = input.name.trim().toLowerCase();

    const existing = await prisma.subArea.findUnique({
      where: {
        areaId_nameNormalized: {
          areaId,
          nameNormalized: normalized,
        },
      },
    });

    if (existing) {
      throw new AppError(`Sub-area "${input.name.trim()}" already exists under ${area.displayName}.`, 400, 'DUPLICATE_SUB_AREA');
    }

    const subArea = await prisma.subArea.create({
      data: {
        areaId,
        displayName: input.name.trim(),
        nameNormalized: normalized,
      },
    });

    await AuditService.log({
      userId,
      module: 'AREA_MASTER',
      action: 'CREATE_SUB_AREA',
      entityType: 'SubArea',
      entityId: subArea.id,
      metadata: { mainArea: area.displayName, subAreaName: subArea.displayName },
    });

    return {
      id: subArea.id,
      areaId: subArea.areaId,
      name: subArea.displayName,
      nameNormalized: subArea.nameNormalized,
      createdAt: subArea.createdAt,
      updatedAt: subArea.updatedAt,
    };
  }

  public static async deleteSubArea(id: string, userId?: string) {
    const subArea = await prisma.subArea.findUnique({
      where: { id },
      include: {
        area: true,
        _count: {
          select: { firms: true },
        },
      },
    });

    if (!subArea) {
      throw new AppError('Sub-area not found.', 404, 'NOT_FOUND');
    }

    if (subArea._count.firms > 0) {
      throw new AppError(
        `Cannot delete sub-area "${subArea.displayName}" because ${subArea._count.firms} firm(s) are linked to it.`,
        400,
        'SUB_AREA_IN_USE'
      );
    }

    await prisma.subArea.delete({
      where: { id },
    });

    await AuditService.log({
      userId,
      module: 'AREA_MASTER',
      action: 'DELETE_SUB_AREA',
      entityType: 'SubArea',
      entityId: id,
      metadata: { mainArea: subArea.area.displayName, subAreaName: subArea.displayName },
    });

    return { message: 'Sub-area deleted successfully.' };
  }
}

