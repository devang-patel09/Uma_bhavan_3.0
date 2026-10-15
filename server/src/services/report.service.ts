import { prisma } from '../db/prisma.js';
import { AgeCalculator } from '../utils/ageCalculator.js';
import { NiyariFilterInput } from '../schemas/receipt.schema.js';

export class ReportService {
  /**
   * Niyari Report: Identify female members by surname with comprehensive demographic filters (PRD Section 9)
   */
  public static async getNiyariReport(input: NiyariFilterInput) {
    const {
      surnameId,
      areaId,
      firmId,
      maritalStatus,
      memberType,
      minAge,
      maxAge,
      search,
      page = 1,
      limit = 50,
    } = input;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      gender: 'FEMALE',
    };

    if (maritalStatus) {
      where.maritalStatus = maritalStatus;
    }

    if (surnameId) {
      where.OR = [
        { parentalSurnameId: surnameId },
        { familyRecord: { surnameId } },
      ];
    }

    if (areaId) {
      where.familyRecord = {
        ...(where.familyRecord as Record<string, unknown> || {}),
        firm: { areaId },
      };
    }

    if (firmId) {
      where.familyRecord = {
        ...(where.familyRecord as Record<string, unknown> || {}),
        firmId,
      };
    }

    if (memberType) {
      where.familyRecord = {
        ...(where.familyRecord as Record<string, unknown> || {}),
        memberType,
      };
    }

    if (search) {
      const term = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: term } },
            { mobile: { contains: term } },
            { familyRecord: { memberCode: { contains: term } } },
            { familyRecord: { familyId: { contains: term } } },
          ],
        },
      ];
    }

    const [total, rawMembers] = await Promise.all([
      prisma.individualMember.count({ where }),
      prisma.individualMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          parentalSurname: true,
          familyRecord: {
            include: {
              surname: true,
              firm: {
                include: { area: true },
              },
            },
          },
        },
      }),
    ]);

    // Calculate age and filter by age boundary if specified
    const mapped = rawMembers.map((m, index) => {
      const calculatedAge = AgeCalculator.calculateAge(m.dob);
      const effectiveSurname = m.parentalSurname?.displayName || m.familyRecord.surname.displayName;

      return {
        sl: skip + index + 1,
        id: m.id,
        name: m.name,
        dob: m.dob.toISOString().split('T')[0],
        age: calculatedAge,
        parentalSurname: effectiveSurname,
        memberCode: m.familyRecord.memberCode,
        memberType: m.familyRecord.memberType,
        familyId: m.familyRecord.familyId,
        mobile: m.mobile,
        maritalStatus: m.maritalStatus,
        bloodGroup: m.bloodGroup,
        firmName: m.familyRecord.firm.firmName,
        firmCode: m.familyRecord.firm.firmCode,
        areaName: m.familyRecord.firm.area.displayName,
      };
    });

    const filtered = mapped.filter((m) => {
      if (minAge !== undefined && m.age < minAge) return false;
      if (maxAge !== undefined && m.age > maxAge) return false;
      return true;
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      members: filtered,
    };
  }

  /**
   * Reports Central Aggregations (PRD Section 15 & Dashboard)
   */
  public static async getReportsSummary() {
    const [
      totalFirms,
      totalFamilies,
      totalMembers,
      permanentFamilies,
      nominalFamilies,
      maleMembers,
      femaleMembers,
      male18PlusMembers,
      receiptStats,
      monthlyCollections,
      recentActivities,
    ] = await Promise.all([
      prisma.firm.count(),
      prisma.memberRecord.count(),
      prisma.individualMember.count(),
      prisma.memberRecord.count({ where: { memberType: 'PERMANENT' } }),
      prisma.memberRecord.count({ where: { memberType: 'NOMINAL' } }),
      prisma.individualMember.count({ where: { gender: 'MALE' } }),
      prisma.individualMember.count({ where: { gender: 'FEMALE' } }),
      prisma.memberRecord.aggregate({ _sum: { male18PlusCount: true } }),
      prisma.receipt.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.receipt.findMany({
        where: { status: 'ACTIVE' },
        select: { amount: true, generatedAt: true, receiptType: { select: { name: true } } },
        orderBy: { generatedAt: 'desc' },
        take: 100,
      }),
      prisma.auditLog.findMany({
        orderBy: { occurredAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalCollection = Number(receiptStats._sum.amount || 0);

    return {
      stats: {
        totalFirms,
        totalFamilies,
        totalMembers,
        permanentMembers: permanentFamilies,
        nominalMembers: nominalFamilies,
        maleMembers,
        femaleMembers,
        male18PlusMembers: male18PlusMembers._sum.male18PlusCount || 0,
        totalReceipts: receiptStats._count,
        totalCollection,
      },
      recentActivities,
      recentReceipts: monthlyCollections,
    };
  }
}
