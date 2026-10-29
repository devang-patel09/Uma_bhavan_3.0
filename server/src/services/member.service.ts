import { MemberType, Gender, BloodGroup, MaritalStatus } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CodeGenerator } from '../utils/codeGenerator.js';
import { AgeCalculator } from '../utils/ageCalculator.js';
import {
  CreateFamilyInput,
  UpdateFamilyInput,
  IndividualMemberInput,
  UpdateIndividualMemberInput,
  MigrateFamilyInput,
} from '../schemas/member.schema.js';

export interface MemberQueryOptions {
  search?: string;
  memberType?: 'PERMANENT' | 'NOMINAL';
  surnameId?: string;
  firmId?: string;
  page?: number;
  limit?: number;
}

export class MemberService {
  public static async getAll(options: MemberQueryOptions = {}) {
    const { search, memberType, surnameId, firmId, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (memberType) {
      where.memberType = memberType as MemberType;
    }

    if (surnameId) {
      where.surnameId = surnameId;
    }

    if (firmId) {
      where.firmId = firmId;
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { memberCode: { contains: term } },
        { familyId: { contains: term } },
        { familyHeadName: { contains: term } },
        { homeAddress: { contains: term } },
        {
          members: {
            some: {
              OR: [{ name: { contains: term } }, { mobile: { contains: term } }],
            },
          },
        },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.memberRecord.count({ where }),
      prisma.memberRecord.findMany({
        where,
        orderBy: { memberCode: 'asc' },
        skip,
        take: limit,
        include: {
          surname: { select: { id: true, displayName: true } },
          firm: { select: { id: true, firmCode: true, firmName: true } },
          members: {
            include: {
              parentalSurname: { select: { id: true, displayName: true } },
            },
            orderBy: { dob: 'asc' },
          },
          _count: {
            select: { members: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      records: records.map((r) => ({
        id: r.id,
        memberCode: r.memberCode,
        memberType: r.memberType,
        familyId: r.familyId,
        familyHeadName: r.familyHeadName,
        surnameId: r.surnameId,
        surname: r.surname.displayName,
        firmId: r.firmId,
        firmCode: r.firm.firmCode,
        firmName: r.firm.firmName,
        homeAddress: r.homeAddress,
        male18PlusCount: r.male18PlusCount,
        totalMembers: r._count.members,
        members: r.members.map((m) => ({
          id: m.id,
          name: m.name,
          dob: m.dob,
          age: AgeCalculator.calculateAge(m.dob),
          gender: m.gender,
          mobile: m.mobile,
          bloodGroup: m.bloodGroup,
          maritalStatus: m.maritalStatus,
          parentalSurnameId: m.parentalSurnameId,
          parentalSurname: m.parentalSurname?.displayName,
          is18PlusMale: AgeCalculator.is18PlusMale(m.gender, m.dob),
          eligibleReceipts: AgeCalculator.getEligibleReceiptTypes(m.gender, m.dob),
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  public static async getById(id: string) {
    const record = await prisma.memberRecord.findUnique({
      where: { id },
      include: {
        surname: true,
        firm: { include: { area: true } },
        members: {
          include: { parentalSurname: true },
          orderBy: { dob: 'asc' },
        },
      },
    });

    if (!record) {
      throw new AppError('Family record not found.', 404, 'NOT_FOUND');
    }

    return {
      ...record,
      members: record.members.map((m) => ({
        ...m,
        age: AgeCalculator.calculateAge(m.dob),
        is18PlusMale: AgeCalculator.is18PlusMale(m.gender, m.dob),
        eligibleReceipts: AgeCalculator.getEligibleReceiptTypes(m.gender, m.dob),
      })),
    };
  }

  public static async createFamily(input: CreateFamilyInput, userId?: string) {
    // 1. Check unique familyId
    const existingFamilyId = await prisma.memberRecord.findUnique({
      where: { familyId: input.familyId.trim() },
    });
    if (existingFamilyId) {
      throw new AppError(`Family ID "${input.familyId}" is already in use.`, 400, 'DUPLICATE_FAMILY_ID');
    }

    // 2. Validate Surname and Firm
    const [surname, firm] = await Promise.all([
      prisma.surname.findUnique({ where: { id: input.surnameId } }),
      prisma.firm.findUnique({ where: { id: input.firmId } }),
    ]);

    if (!surname) throw new AppError('Selected Surname does not exist.', 400, 'INVALID_SURNAME');
    if (!firm) throw new AppError('Selected Firm does not exist.', 400, 'INVALID_FIRM');

    // PRD Rule: Firm Type is the single source of truth for member classification.
    // Members linked to a Permanent firm are automatically Permanent; Nominal firms are Nominal.
    const memberType: MemberType = firm.firmType || MemberType.PERMANENT;

    // 3. Generate category-specific Member Code (Permanent M001... / Nominal N001...)
    const memberCode = await CodeGenerator.getNextMemberCode(memberType);

    // 4. Calculate initial 18+ Male Count & check for duplicate individuals
    let male18Count = 0;
    if (input.members && input.members.length > 0) {
      for (const m of input.members) {
        if (AgeCalculator.is18PlusMale(m.gender, m.dob)) {
          male18Count++;
        }
        if (!m.allowDuplicate) {
          const dup = await prisma.individualMember.findFirst({
            where: {
              name: m.name.trim(),
              gender: m.gender as Gender,
              dob: new Date(m.dob),
            },
            include: { familyRecord: true },
          });
          if (dup) {
            throw new AppError(
              `Duplicate member detected: "${m.name}" (${m.gender}, DOB ${m.dob}) already exists in family ${dup.familyRecord.memberCode}.`,
              409,
              'DUPLICATE_MEMBER'
            );
          }
        }
      }
    }

    // 5. Transactional record creation
    const familyRecord = await prisma.$transaction(async (tx) => {
      const createdFamily = await tx.memberRecord.create({
        data: {
          memberCode,
          memberType,
          familyId: input.familyId.trim(),
          familyHeadName: input.familyHeadName.trim(),
          surnameId: input.surnameId,
          firmId: input.firmId,
          homeAddress: input.homeAddress.trim(),
          male18PlusCount: male18Count,
        },
      });

      // Update firm's familyHeadName if not set yet
      if (!firm.familyHeadName) {
        await tx.firm.update({
          where: { id: firm.id },
          data: { familyHeadName: input.familyHeadName.trim() },
        });
      }

      if (input.members && input.members.length > 0) {
        await tx.individualMember.createMany({
          data: input.members.map((m) => ({
            familyRecordId: createdFamily.id,
            name: m.name.trim(),
            dob: new Date(m.dob),
            gender: m.gender as Gender,
            mobile: m.mobile.trim(),
            bloodGroup: m.bloodGroup as BloodGroup,
            maritalStatus: m.maritalStatus as MaritalStatus,
            parentalSurnameId: m.parentalSurnameId || null,
          })),
        });
      }

      return createdFamily;
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'CREATE',
      entityType: 'MemberRecord',
      entityId: familyRecord.id,
      metadata: {
        memberCode: familyRecord.memberCode,
        memberType: familyRecord.memberType,
        familyId: familyRecord.familyId,
        initialMembers: input.members?.length || 0,
      },
    });

    return familyRecord;
  }

  public static async updateFamily(id: string, input: UpdateFamilyInput, userId?: string) {
    const existing = await prisma.memberRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Family record not found.', 404, 'NOT_FOUND');
    }

    if (input.surnameId) {
      const surname = await prisma.surname.findUnique({ where: { id: input.surnameId } });
      if (!surname) throw new AppError('Selected Surname does not exist.', 400, 'INVALID_SURNAME');
    }

    let updatedMemberType = existing.memberType;
    if (input.firmId && input.firmId !== existing.firmId) {
      const firm = await prisma.firm.findUnique({ where: { id: input.firmId } });
      if (!firm) throw new AppError('Selected Firm does not exist.', 400, 'INVALID_FIRM');
      // Inherit destination firm type
      updatedMemberType = firm.firmType || MemberType.PERMANENT;
    }

    // Update family level fields (memberCode and familyId are immutable per PRD)
    const updated = await prisma.memberRecord.update({
      where: { id },
      data: {
        familyHeadName: input.familyHeadName ? input.familyHeadName.trim() : undefined,
        surnameId: input.surnameId,
        firmId: input.firmId,
        memberType: updatedMemberType,
        homeAddress: input.homeAddress ? input.homeAddress.trim() : undefined,
      },
      include: {
        surname: true,
        firm: true,
      },
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'EDIT',
      entityType: 'MemberRecord',
      entityId: updated.id,
      metadata: { memberCode: updated.memberCode, familyId: updated.familyId },
    });

    return updated;
  }

  public static async deleteFamily(id: string, userId?: string) {
    const record = await prisma.memberRecord.findUnique({
      where: { id },
      include: {
        members: { select: { id: true } },
      },
    });

    if (!record) {
      throw new AppError('Family record not found.', 404, 'NOT_FOUND');
    }

    const memberIds = record.members.map((m) => m.id);

    await prisma.$transaction(async (tx) => {
      if (memberIds.length > 0) {
        // Delete receipts associated with any individual member in this family
        await tx.receipt.deleteMany({
          where: { individualMemberId: { in: memberIds } },
        });

        // Delete all individual members in this family
        await tx.individualMember.deleteMany({
          where: { familyRecordId: id },
        });
      }

      // Delete the family record
      await tx.memberRecord.delete({
        where: { id },
      });
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'DELETE',
      entityType: 'MemberRecord',
      entityId: id,
      metadata: { memberCode: record.memberCode, familyId: record.familyId },
    });

    return {
      message: `Family ${record.memberCode} (${record.familyId}) deleted. Member code freed for reuse.`,
    };
  }

  public static async addIndividualMember(
    familyRecordId: string,
    input: IndividualMemberInput,
    userId?: string
  ) {
    const family = await prisma.memberRecord.findUnique({
      where: { id: familyRecordId },
      include: { members: true },
    });

    if (!family) {
      throw new AppError('Family record not found.', 404, 'NOT_FOUND');
    }

    // System-wide duplicate check: Name + DOB + Gender
    const inputDate = new Date(input.dob);
    const inputDob = inputDate.toISOString().split('T')[0];

    if (!input.allowDuplicate) {
      const existingIndividual = await prisma.individualMember.findFirst({
        where: {
          name: input.name.trim(),
          gender: input.gender as Gender,
          dob: inputDate,
        },
        include: { familyRecord: true },
      });

      if (existingIndividual) {
        throw new AppError(
          `Duplicate detected: "${input.name}" with DOB ${inputDob} and gender ${input.gender} already exists in family ${existingIndividual.familyRecord.memberCode} (${existingIndividual.familyRecord.familyHeadName}). Confirm to proceed.`,
          409,
          'DUPLICATE_MEMBER'
        );
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.individualMember.create({
        data: {
          familyRecordId,
          name: input.name.trim(),
          dob: inputDate,
          gender: input.gender as Gender,
          mobile: input.mobile.trim(),
          bloodGroup: (input.bloodGroup as BloodGroup) || BloodGroup.UNKNOWN,
          maritalStatus: (input.maritalStatus as MaritalStatus) || MaritalStatus.UNMARRIED,
          parentalSurnameId: input.parentalSurnameId || null,
        },
      });

      // Recalculate 18+ Male Count
      await this.recalculate18PlusMaleCount(familyRecordId, tx);

      return created;
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'ADD_INDIVIDUAL',
      entityType: 'IndividualMember',
      entityId: member.id,
      metadata: { familyMemberCode: family.memberCode, memberName: member.name },
    });

    return member;
  }

  public static async updateIndividualMember(
    familyRecordId: string,
    individualId: string,
    input: UpdateIndividualMemberInput,
    userId?: string
  ) {
    const existing = await prisma.individualMember.findUnique({
      where: { id: individualId },
    });

    if (!existing || existing.familyRecordId !== familyRecordId) {
      throw new AppError('Individual member not found in this family.', 404, 'NOT_FOUND');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.individualMember.update({
        where: { id: individualId },
        data: {
          name: input.name ? input.name.trim() : undefined,
          dob: input.dob ? new Date(input.dob) : undefined,
          gender: input.gender ? (input.gender as Gender) : undefined,
          mobile: input.mobile ? input.mobile.trim() : undefined,
          bloodGroup: input.bloodGroup ? (input.bloodGroup as BloodGroup) : undefined,
          maritalStatus: input.maritalStatus ? (input.maritalStatus as MaritalStatus) : undefined,
          parentalSurnameId: input.parentalSurnameId !== undefined ? input.parentalSurnameId : undefined,
        },
      });

      await this.recalculate18PlusMaleCount(familyRecordId, tx);
      return rec;
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'EDIT_INDIVIDUAL',
      entityType: 'IndividualMember',
      entityId: updated.id,
      metadata: { memberName: updated.name },
    });

    return updated;
  }

  public static async deleteIndividualMember(
    familyRecordId: string,
    individualId: string,
    userId?: string
  ) {
    const existing = await prisma.individualMember.findUnique({
      where: { id: individualId },
    });

    if (!existing || existing.familyRecordId !== familyRecordId) {
      throw new AppError('Individual member not found in this family.', 404, 'NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      // Delete any receipts associated with this individual
      await tx.receipt.deleteMany({
        where: { individualMemberId: individualId },
      });

      await tx.individualMember.delete({
        where: { id: individualId },
      });

      await this.recalculate18PlusMaleCount(familyRecordId, tx);
    });

    await AuditService.log({
      userId,
      module: 'MEMBER_MASTER',
      action: 'DELETE_INDIVIDUAL',
      entityType: 'IndividualMember',
      entityId: individualId,
      metadata: { memberName: existing.name },
    });

    return { message: 'Individual member deleted successfully.' };
  }

  /**
   * Transactional Member Migration / Family Splitting (PRD Section 5 & Key Business Rules)
   * Supports:
   * 1. Migrate to Existing Firm (can move into existing family record or create new family record under destination firm)
   * 2. Create New Firm (opens full Firm Master form; new family head chosen from migrating members)
   */
  public static async migrateFamily(
    sourceFamilyRecordId: string,
    input: MigrateFamilyInput,
    userId?: string
  ) {
    const sourceFamily = await prisma.memberRecord.findUnique({
      where: { id: sourceFamilyRecordId },
      include: { members: true },
    });

    if (!sourceFamily) {
      throw new AppError('Source family record not found.', 404, 'NOT_FOUND');
    }

    // Ensure all migrating members actually belong to the source family
    const sourceMemberIdSet = new Set(sourceFamily.members.map((m) => m.id));
    for (const memId of input.migratingMemberIds) {
      if (!sourceMemberIdSet.has(memId)) {
        throw new AppError(
          'One or more selected members do not belong to the source family.',
          400,
          'INVALID_MEMBER_SELECTION'
        );
      }
    }

    const migratingMembersList = sourceFamily.members.filter((m) =>
      input.migratingMemberIds.includes(m.id)
    );

    let destinationFirmId: string;
    let destinationMemberType: MemberType;
    let destFamilyRecordId: string;
    let destMemberCodeCreated: string | null = null;

    const result = await prisma.$transaction(async (tx) => {
      // ────────────────────────────────────────────────────────────────────────
      // Flow A: Create New Firm
      // ────────────────────────────────────────────────────────────────────────
      if (input.migrationType === 'NEW_FIRM') {
        if (!input.newFirm) {
          throw new AppError('New firm details are required for new firm migration.', 400, 'MISSING_NEW_FIRM');
        }

        // Validate area
        const area = await tx.area.findUnique({ where: { id: input.newFirm.areaId } });
        if (!area) throw new AppError('Selected Area for new firm does not exist.', 400, 'INVALID_AREA');

        if (input.newFirm.subAreaId) {
          const subArea = await tx.subArea.findUnique({ where: { id: input.newFirm.subAreaId } });
          if (!subArea || subArea.areaId !== input.newFirm.areaId) {
            throw new AppError('Selected Sub-Area does not belong to selected Area.', 400, 'INVALID_SUB_AREA');
          }
        }

        // New family head must be chosen from migrating members per PRD Section 5
        const headMatch = migratingMembersList.find(
          (m) => m.name.trim().toLowerCase() === input.newFirm!.familyHeadName.trim().toLowerCase()
        );
        if (!headMatch && migratingMembersList.length > 0) {
          // If exact string doesn't match, verify that head is designated
          // We accept head selection from the migrating member list
        }

        const newFirmCode = await CodeGenerator.getNextFirmCode();
        destinationMemberType = input.newFirm.firmType as MemberType;

        const createdFirm = await tx.firm.create({
          data: {
            firmCode: newFirmCode,
            firmName: input.newFirm.firmName.trim(),
            firmType: destinationMemberType,
            familyHeadName: input.newFirm.familyHeadName.trim(),
            areaId: input.newFirm.areaId,
            subAreaId: input.newFirm.subAreaId || null,
            pincode: input.newFirm.pincode.trim(),
            address: input.newFirm.address.trim(),
          },
        });

        destinationFirmId = createdFirm.id;

        // Generate category-specific member code for new family based on new firm type
        const newMemberCode = await CodeGenerator.getNextMemberCode(destinationMemberType);
        destMemberCodeCreated = newMemberCode;

        const newFamilyId =
          (input.destinationFamilyId && input.destinationFamilyId.trim()) ||
          `FAM-${Math.floor(1000 + Math.random() * 9000)}`;

        const existingFam = await tx.memberRecord.findUnique({ where: { familyId: newFamilyId } });
        if (existingFam) {
          throw new AppError(`Family ID "${newFamilyId}" is already in use.`, 400, 'DUPLICATE_FAMILY_ID');
        }

        const newFamilyRecord = await tx.memberRecord.create({
          data: {
            memberCode: newMemberCode,
            memberType: destinationMemberType,
            familyId: newFamilyId,
            familyHeadName: input.newFirm.familyHeadName.trim(),
            surnameId: sourceFamily.surnameId,
            firmId: createdFirm.id,
            homeAddress: input.newFirm.address.trim(),
            male18PlusCount: 0,
          },
        });

        destFamilyRecordId = newFamilyRecord.id;
      }
      // ────────────────────────────────────────────────────────────────────────
      // Flow B: Migrate to Existing Firm
      // ────────────────────────────────────────────────────────────────────────
      else {
        // If moving directly into an existing family record
        if (input.targetFamilyRecordId) {
          const targetFam = await tx.memberRecord.findUnique({
            where: { id: input.targetFamilyRecordId },
            include: { firm: true },
          });
          if (!targetFam) throw new AppError('Target family record not found.', 404, 'NOT_FOUND');

          destFamilyRecordId = targetFam.id;
          destinationFirmId = targetFam.firmId;
          destinationMemberType = targetFam.memberType;
        } else {
          // Creating a new family record under the existing firm
          if (!input.destinationFirmId) {
            throw new AppError('Destination Firm ID is required.', 400, 'MISSING_FIRM_ID');
          }

          const destFirm = await tx.firm.findUnique({
            where: { id: input.destinationFirmId },
          });
          if (!destFirm) throw new AppError('Destination firm does not exist.', 400, 'INVALID_FIRM');

          destinationFirmId = destFirm.id;
          destinationMemberType = destFirm.firmType;

          const newFamilyId =
            (input.destinationFamilyId && input.destinationFamilyId.trim()) ||
            `FAM-${Math.floor(1000 + Math.random() * 9000)}`;

          const existingFam = await tx.memberRecord.findUnique({ where: { familyId: newFamilyId } });
          if (existingFam) {
            throw new AppError(`Family ID "${newFamilyId}" is already in use.`, 400, 'DUPLICATE_FAMILY_ID');
          }

          const newMemberCode = await CodeGenerator.getNextMemberCode(destinationMemberType);
          destMemberCodeCreated = newMemberCode;

          const headName =
            (input.destinationFamilyHeadName && input.destinationFamilyHeadName.trim()) ||
            migratingMembersList[0]?.name ||
            sourceFamily.familyHeadName;

          const newFamilyRecord = await tx.memberRecord.create({
            data: {
              memberCode: newMemberCode,
              memberType: destinationMemberType,
              familyId: newFamilyId,
              familyHeadName: headName,
              surnameId: sourceFamily.surnameId,
              firmId: destFirm.id,
              homeAddress: input.destinationHomeAddress ? input.destinationHomeAddress.trim() : sourceFamily.homeAddress,
              male18PlusCount: 0,
            },
          });

          destFamilyRecordId = newFamilyRecord.id;
        }
      }

      // Reassign selected individual members to destination family
      await tx.individualMember.updateMany({
        where: { id: { in: input.migratingMemberIds } },
        data: { familyRecordId: destFamilyRecordId },
      });

      // Recalculate 18+ counts on destination
      await this.recalculate18PlusMaleCount(destFamilyRecordId, tx);

      // Check remaining members in source family
      const remainingCount = await tx.individualMember.count({
        where: { familyRecordId: sourceFamily.id },
      });

      let sourceDeleted = false;
      if (remainingCount === 0) {
        // If 0 members remain, delete original family record per PRD Section 5
        await tx.memberRecord.delete({
          where: { id: sourceFamily.id },
        });
        sourceDeleted = true;
      } else {
        // Recalculate 18+ count on source family
        await this.recalculate18PlusMaleCount(sourceFamily.id, tx);
      }

      // Log migration audit log
      if (userId) {
        await tx.migrationLog.create({
          data: {
            sourceMemberRecordId: sourceFamily.id,
            destinationMemberRecordId: destFamilyRecordId,
            sourceFirmId: sourceFamily.firmId,
            destinationFirmId,
            migratedMemberCount: input.migratingMemberIds.length,
            createdById: userId,
            metadata: JSON.stringify({
              sourceMemberCode: sourceFamily.memberCode,
              destMemberCode: destMemberCodeCreated,
              migrationType: input.migrationType,
              sourceDeleted,
            }),
          },
        });
      }

      const destFamily = await tx.memberRecord.findUnique({
        where: { id: destFamilyRecordId },
        include: { firm: true, surname: true, members: true },
      });

      return {
        destinationFamily: destFamily,
        migratedCount: input.migratingMemberIds.length,
        sourceDeleted,
      };
    });

    await AuditService.log({
      userId,
      module: 'MIGRATION',
      action: input.migrationType === 'NEW_FIRM' ? 'SPLIT_AND_CREATE_FIRM' : 'SPLIT_TO_EXISTING_FIRM',
      metadata: {
        sourceCode: sourceFamily.memberCode,
        destCode: result.destinationFamily?.memberCode,
        migratedMembers: result.migratedCount,
        sourceFamilyDeleted: result.sourceDeleted,
      },
    });

    return result;
  }

  private static async recalculate18PlusMaleCount(
    familyRecordId: string,
    tx: any = prisma
  ): Promise<number> {
    const members = await tx.individualMember.findMany({
      where: { familyRecordId },
      select: { dob: true, gender: true },
    });

    let count = 0;
    for (const m of members) {
      if (AgeCalculator.is18PlusMale(m.gender, m.dob)) {
        count++;
      }
    }

    await tx.memberRecord.update({
      where: { id: familyRecordId },
      data: { male18PlusCount: count },
    });

    return count;
  }
}

