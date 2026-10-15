import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CodeGenerator } from '../utils/codeGenerator.js';
import { CreateFirmInput, UpdateFirmInput } from '../schemas/master.schema.js';

export interface FirmQueryOptions {
  search?: string;
  areaId?: string;
  page?: number;
  limit?: number;
}

export class FirmService {
  public static async getAll(options: FirmQueryOptions = {}) {
    const { search, areaId, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (areaId) {
      where.areaId = areaId;
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { firmCode: { contains: term } },
        { firmName: { contains: term } },
        { address: { contains: term } },
      ];
    }

    const [total, firms] = await Promise.all([
      prisma.firm.count({ where }),
      prisma.firm.findMany({
        where,
        orderBy: { firmCode: 'asc' },
        skip,
        take: limit,
        include: {
          area: {
            select: { id: true, displayName: true },
          },
          _count: {
            select: { memberRecords: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      firms: firms.map((f) => ({
        id: f.id,
        firmCode: f.firmCode,
        firmName: f.firmName,
        areaId: f.areaId,
        areaName: f.area.displayName,
        pincode: f.pincode,
        address: f.address,
        familiesCount: f._count.memberRecords,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    };
  }

  public static async getById(id: string) {
    const firm = await prisma.firm.findUnique({
      where: { id },
      include: {
        area: true,
        memberRecords: {
          select: {
            id: true,
            memberCode: true,
            familyId: true,
            familyHeadName: true,
            memberType: true,
            male18PlusCount: true,
          },
        },
      },
    });

    if (!firm) {
      throw new AppError('Firm not found.', 404, 'NOT_FOUND');
    }

    return firm;
  }

  public static async create(input: CreateFirmInput, userId?: string) {
    // Validate Area exists
    const area = await prisma.area.findUnique({
      where: { id: input.areaId },
    });

    if (!area) {
      throw new AppError('Selected Area does not exist.', 400, 'INVALID_AREA');
    }

    // Auto-generate next code (F001, F002...) with gap reuse
    const firmCode = await CodeGenerator.getNextFirmCode();

    const firm = await prisma.firm.create({
      data: {
        firmCode,
        firmName: input.firmName.trim(),
        areaId: input.areaId,
        pincode: input.pincode.trim(),
        address: input.address.trim(),
      },
      include: { area: true },
    });

    await AuditService.log({
      userId,
      module: 'FIRM_MASTER',
      action: 'CREATE',
      entityType: 'Firm',
      entityId: firm.id,
      metadata: { firmCode: firm.firmCode, firmName: firm.firmName },
    });

    return firm;
  }

  public static async update(id: string, input: UpdateFirmInput, userId?: string) {
    const existing = await prisma.firm.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Firm not found.', 404, 'NOT_FOUND');
    }

    if (input.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: input.areaId },
      });
      if (!area) {
        throw new AppError('Selected Area does not exist.', 400, 'INVALID_AREA');
      }
    }

    // Note: firmCode is NOT editable per PRD Section 4
    const updated = await prisma.firm.update({
      where: { id },
      data: {
        firmName: input.firmName ? input.firmName.trim() : undefined,
        areaId: input.areaId,
        pincode: input.pincode ? input.pincode.trim() : undefined,
        address: input.address ? input.address.trim() : undefined,
      },
      include: { area: true },
    });

    await AuditService.log({
      userId,
      module: 'FIRM_MASTER',
      action: 'EDIT',
      entityType: 'Firm',
      entityId: updated.id,
      metadata: { firmCode: updated.firmCode, firmName: updated.firmName },
    });

    return updated;
  }

  public static async delete(id: string, userId?: string) {
    const firm = await prisma.firm.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberRecords: true },
        },
      },
    });

    if (!firm) {
      throw new AppError('Firm not found.', 404, 'NOT_FOUND');
    }

    // PRD Rule: A firm cannot be deleted while associated family/member records exist.
    if (firm._count.memberRecords > 0) {
      throw new AppError(
        `Cannot delete firm "${firm.firmName} (${firm.firmCode})" because ${firm._count.memberRecords} family record(s) are associated with it. Please reassign or migrate these families first.`,
        400,
        'FIRM_HAS_ASSOCIATED_RECORDS'
      );
    }

    await prisma.firm.delete({
      where: { id },
    });

    await AuditService.log({
      userId,
      module: 'FIRM_MASTER',
      action: 'DELETE',
      entityType: 'Firm',
      entityId: id,
      metadata: { firmCode: firm.firmCode, firmName: firm.firmName },
    });

    return {
      message: `Firm ${firm.firmCode} (${firm.firmName}) deleted successfully. The code is now freed for reuse.`,
    };
  }
}
