import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CreateSurnameInput } from '../schemas/master.schema.js';

export class SurnameService {
  public static async getAll() {
    const surnames = await prisma.surname.findMany({
      orderBy: { displayName: 'asc' },
      include: {
        _count: {
          select: {
            memberRecords: true,
            individualMembers: true,
          },
        },
      },
    });

    return surnames.map((s) => ({
      id: s.id,
      name: s.displayName,
      nameNormalized: s.nameNormalized,
      familiesCount: s._count.memberRecords,
      individualMembersCount: s._count.individualMembers,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  public static async create(input: CreateSurnameInput, userId?: string) {
    const normalized = input.name.trim().toLowerCase();

    const existing = await prisma.surname.findUnique({
      where: { nameNormalized: normalized },
    });

    if (existing) {
      throw new AppError('Surname already inserted.', 400, 'DUPLICATE_SURNAME');
    }

    const surname = await prisma.surname.create({
      data: {
        displayName: input.name.trim(),
        nameNormalized: normalized,
      },
    });

    await AuditService.log({
      userId,
      module: 'SURNAME_MASTER',
      action: 'CREATE',
      entityType: 'Surname',
      entityId: surname.id,
      metadata: { surname: surname.displayName },
    });

    return surname;
  }

  public static async delete(id: string, userId?: string) {
    const surname = await prisma.surname.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            memberRecords: true,
            individualMembers: true,
          },
        },
      },
    });

    if (!surname) {
      throw new AppError('Surname not found.', 404, 'NOT_FOUND');
    }

    const totalUsage = surname._count.memberRecords + surname._count.individualMembers;
    if (totalUsage > 0) {
      throw new AppError(
        `Cannot delete surname "${surname.displayName}" because it is associated with ${surname._count.memberRecords} family record(s) and ${surname._count.individualMembers} individual member(s).`,
        400,
        'SURNAME_IN_USE'
      );
    }

    await prisma.surname.delete({
      where: { id },
    });

    await AuditService.log({
      userId,
      module: 'SURNAME_MASTER',
      action: 'DELETE',
      entityType: 'Surname',
      entityId: id,
      metadata: { surname: surname.displayName },
    });

    return { message: 'Surname deleted successfully.' };
  }
}
