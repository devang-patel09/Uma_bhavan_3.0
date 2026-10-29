import { Decimal } from '@prisma/client/runtime/library';
import { PeriodType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CodeGenerator } from '../utils/codeGenerator.js';
import { AgeCalculator } from '../utils/ageCalculator.js';
import { NumberToWords } from '../utils/numberToWords.js';
import {
  GenerateReceiptInput,
  ValidateEligibilityInput,
  BatchReceiptInput,
  ReceiptConfigUpdateInput,
} from '../schemas/receipt.schema.js';

export interface ReceiptQueryOptions {
  search?: string;
  receiptTypeId?: string;
  periodType?: 'MONTHLY' | 'YEARLY';
  periodYear?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export class ReceiptService {
  public static async getConfig() {
    let config = await prisma.receiptConfig.findFirst();
    if (!config) {
      config = await prisma.receiptConfig.create({
        data: {
          yuvakMandalUpperAge: 45,
          samajMonthlyAmount: new Decimal(100.0),
          samajYearlyAmount: new Decimal(1200.0),
          yuvakMonthlyAmount: new Decimal(50.0),
          yuvakYearlyAmount: new Decimal(500.0),
        },
      });
    }
    return {
      id: config.id,
      yuvakMandalUpperAge: config.yuvakMandalUpperAge,
      samajMonthlyAmount: Number(config.samajMonthlyAmount),
      samajYearlyAmount: Number(config.samajYearlyAmount),
      yuvakMonthlyAmount: Number(config.yuvakMonthlyAmount),
      yuvakYearlyAmount: Number(config.yuvakYearlyAmount),
      updatedAt: config.updatedAt,
    };
  }

  public static async updateConfig(input: ReceiptConfigUpdateInput, userId?: string) {
    const current = await this.getConfig();

    const updated = await prisma.receiptConfig.update({
      where: { id: current.id },
      data: {
        yuvakMandalUpperAge: input.yuvakMandalUpperAge,
        samajMonthlyAmount: input.samajMonthlyAmount !== undefined ? new Decimal(input.samajMonthlyAmount) : undefined,
        samajYearlyAmount: input.samajYearlyAmount !== undefined ? new Decimal(input.samajYearlyAmount) : undefined,
        yuvakMonthlyAmount: input.yuvakMonthlyAmount !== undefined ? new Decimal(input.yuvakMonthlyAmount) : undefined,
        yuvakYearlyAmount: input.yuvakYearlyAmount !== undefined ? new Decimal(input.yuvakYearlyAmount) : undefined,
      },
    });

    await AuditService.log({
      userId,
      module: 'RECEIPT_CONFIG',
      action: 'UPDATE',
      entityType: 'ReceiptConfig',
      entityId: updated.id,
      metadata: input,
    });

    return {
      id: updated.id,
      yuvakMandalUpperAge: updated.yuvakMandalUpperAge,
      samajMonthlyAmount: Number(updated.samajMonthlyAmount),
      samajYearlyAmount: Number(updated.samajYearlyAmount),
      yuvakMonthlyAmount: Number(updated.yuvakMonthlyAmount),
      yuvakYearlyAmount: Number(updated.yuvakYearlyAmount),
      updatedAt: updated.updatedAt,
    };
  }

  public static async getReceiptTypes() {
    return prisma.receiptType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  public static async validateEligibility(input: ValidateEligibilityInput) {
    const [member, receiptType, config] = await Promise.all([
      prisma.individualMember.findUnique({
        where: { id: input.individualMemberId },
        include: { familyRecord: true },
      }),
      prisma.receiptType.findUnique({
        where: { id: input.receiptTypeId },
      }),
      this.getConfig(),
    ]);

    if (!member) throw new AppError('Member not found.', 404, 'NOT_FOUND');
    if (!receiptType) throw new AppError('Receipt type not found.', 404, 'NOT_FOUND');

    const age = AgeCalculator.calculateAge(member.dob);
    const isMale = member.gender === 'MALE';

    if (!isMale) {
      return {
        eligible: false,
        reason: 'Only male community members are eligible for subscription receipts.',
        age,
        defaultAmount: receiptType.defaultAmount,
      };
    }

    if (age < 18) {
      return {
        eligible: false,
        reason: `Member is ${age} years old. Only adult members aged 18 and above are eligible.`,
        age,
        defaultAmount: receiptType.defaultAmount,
      };
    }

    const isYuvak = receiptType.name.toLowerCase().includes('yuvak mandal');
    if (isYuvak && age > config.yuvakMandalUpperAge) {
      return {
        eligible: false,
        reason: `Member is ${age} years old. Yuvak Mandal receipts are strictly for members aged 18 to ${config.yuvakMandalUpperAge}.`,
        age,
        defaultAmount: receiptType.defaultAmount,
      };
    }

    // Determine configured amount based on period
    const period = input.periodType || 'YEARLY';
    let configuredAmount: number;
    if (isYuvak) {
      configuredAmount = period === 'MONTHLY' ? config.yuvakMonthlyAmount : config.yuvakYearlyAmount;
    } else {
      configuredAmount = period === 'MONTHLY' ? config.samajMonthlyAmount : config.samajYearlyAmount;
    }

    // Check duplicate prevention for period
    const periodYear = input.periodYear || new Date().getFullYear();
    const periodMonth = input.periodMonth;

    const duplicateQuery: Record<string, unknown> = {
      individualMemberId: input.individualMemberId,
      receiptTypeId: input.receiptTypeId,
      status: 'ACTIVE',
    };

    if (period === 'MONTHLY' && periodMonth) {
      // Monthly: at most 1 receipt per member, receipt type, and calendar month
      const startOfMonth = new Date(periodYear, periodMonth - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(periodYear, periodMonth, 0, 23, 59, 59, 999);
      duplicateQuery.OR = [
        { periodType: 'MONTHLY', periodYear, periodMonth },
        { generatedAt: { gte: startOfMonth, lte: endOfMonth } },
      ];
    } else {
      // Yearly: at most 1 receipt per member, receipt type, and calendar year
      const startOfYear = new Date(periodYear, 0, 1, 0, 0, 0);
      const endOfYear = new Date(periodYear, 11, 31, 23, 59, 59, 999);
      duplicateQuery.OR = [
        { periodType: 'YEARLY', periodYear },
        { generatedAt: { gte: startOfYear, lte: endOfYear } },
      ];
    }

    const existingReceipt = await prisma.receipt.findFirst({
      where: duplicateQuery,
    });

    if (existingReceipt) {
      return {
        eligible: false,
        reason: `A receipt of this type has already been generated for this member for ${period === 'MONTHLY' ? `month ${periodMonth}/${periodYear}` : `year ${periodYear}`} (${existingReceipt.receiptNumber}).`,
        age,
        defaultAmount: configuredAmount,
      };
    }

    return {
      eligible: true,
      age,
      defaultAmount: configuredAmount,
      receiptTypeName: receiptType.name,
      memberName: member.name,
      memberCode: member.familyRecord.memberCode,
    };
  }

  public static async generateReceipt(input: GenerateReceiptInput, userId: string) {
    const config = await this.getConfig();
    const receiptType = await prisma.receiptType.findUnique({
      where: { id: input.receiptTypeId },
    });
    if (!receiptType) throw new AppError('Receipt type not found.', 404, 'NOT_FOUND');

    const eligibility = await this.validateEligibility({
      individualMemberId: input.individualMemberId,
      receiptTypeId: input.receiptTypeId,
      periodType: input.periodType,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    });

    if (!eligibility.eligible) {
      throw new AppError(eligibility.reason || 'Member is not eligible for this receipt.', 400, 'INELIGIBLE_MEMBER');
    }

    const member = await prisma.individualMember.findUnique({
      where: { id: input.individualMemberId },
      include: { familyRecord: true },
    });
    if (!member) throw new AppError('Member not found.', 404, 'NOT_FOUND');

    // Use passed amount or admin-configured amount
    const isYuvak = receiptType.name.toLowerCase().includes('yuvak mandal');
    let finalAmount = input.amount;
    if (!finalAmount) {
      if (isYuvak) {
        finalAmount = input.periodType === 'MONTHLY' ? config.yuvakMonthlyAmount : config.yuvakYearlyAmount;
      } else {
        finalAmount = input.periodType === 'MONTHLY' ? config.samajMonthlyAmount : config.samajYearlyAmount;
      }
    }

    const targetDate = input.customDate ? new Date(input.customDate) : new Date();
    const receiptNumber = await CodeGenerator.getNextReceiptNumber();
    const verificationHash = Buffer.from(
      `UB-${receiptNumber}-${input.individualMemberId}-${targetDate.toISOString()}`
    ).toString('base64');

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        individualMemberId: input.individualMemberId,
        familyRecordId: member.familyRecordId,
        receiptTypeId: input.receiptTypeId,
        periodType: (input.periodType as PeriodType) || PeriodType.YEARLY,
        periodYear: input.periodYear || targetDate.getFullYear(),
        periodMonth: input.periodType === 'MONTHLY' ? input.periodMonth || targetDate.getMonth() + 1 : null,
        amount: new Decimal(finalAmount),
        generatedAt: targetDate,
        status: 'ACTIVE',
        createdById: userId,
        verificationHash,
      },
      include: {
        receiptType: true,
        individualMember: {
          include: {
            familyRecord: {
              include: {
                firm: true,
                surname: true,
              },
            },
          },
        },
      },
    });

    await AuditService.log({
      userId,
      module: 'RECEIPT',
      action: 'GENERATE',
      entityType: 'Receipt',
      entityId: receipt.id,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        amount: finalAmount,
        type: receipt.receiptType.name,
        periodType: receipt.periodType,
        periodYear: receipt.periodYear,
        member: receipt.individualMember.name,
      },
    });

    return this.formatReceiptVoucher(receipt);
  }

  /**
   * Bulk Batch Preview Workflow (PRD Section 8)
   * Automatically finds eligible male members, filters by age & period duplicates,
   * and reports eligible and ineligible members with clear reasons.
   */
  public static async getBatchPreview(input: BatchReceiptInput) {
    const config = await this.getConfig();

    const receiptType = await prisma.receiptType.findFirst({
      where: {
        name: { contains: input.receiptTypeName },
        active: true,
      },
    });

    if (!receiptType) {
      throw new AppError(`Receipt Type "${input.receiptTypeName}" not found.`, 404, 'NOT_FOUND');
    }

    const isYuvak = input.receiptTypeName.toLowerCase().includes('yuvak mandal');
    let configuredAmount: number;
    if (isYuvak) {
      configuredAmount = input.periodType === 'MONTHLY' ? config.yuvakMonthlyAmount : config.yuvakYearlyAmount;
    } else {
      configuredAmount = input.periodType === 'MONTHLY' ? config.samajMonthlyAmount : config.samajYearlyAmount;
    }

    // Retrieve all male individual members with their family and firm
    const maleMembers = await prisma.individualMember.findMany({
      where: {
        gender: 'MALE',
      },
      include: {
        familyRecord: {
          include: {
            firm: { include: { area: true } },
            surname: true,
          },
        },
      },
      orderBy: [
        { familyRecord: { memberCode: 'asc' } },
        { name: 'asc' },
      ],
    });

    // Date range for period duplicate checking
    const periodYear = input.periodYear;
    const periodMonth = input.periodMonth;

    let startPeriodDate: Date;
    let endPeriodDate: Date;
    if (input.periodType === 'MONTHLY' && periodMonth) {
      startPeriodDate = new Date(periodYear, periodMonth - 1, 1, 0, 0, 0);
      endPeriodDate = new Date(periodYear, periodMonth, 0, 23, 59, 59, 999);
    } else {
      startPeriodDate = new Date(periodYear, 0, 1, 0, 0, 0);
      endPeriodDate = new Date(periodYear, 11, 31, 23, 59, 59, 999);
    }

    // Fetch existing active receipts for this receipt type in this period
    const existingReceipts = await prisma.receipt.findMany({
      where: {
        receiptTypeId: receiptType.id,
        status: 'ACTIVE',
        OR: [
          input.periodType === 'MONTHLY' && periodMonth
            ? { periodType: 'MONTHLY', periodYear, periodMonth }
            : { periodType: 'YEARLY', periodYear },
          { generatedAt: { gte: startPeriodDate, lte: endPeriodDate } },
        ],
      },
      select: {
        individualMemberId: true,
        receiptNumber: true,
        periodType: true,
        periodYear: true,
        periodMonth: true,
      },
    });

    const receiptedMemberMap = new Map<string, string>();
    for (const r of existingReceipts) {
      receiptedMemberMap.set(r.individualMemberId, r.receiptNumber);
    }

    const eligibleMembers: any[] = [];
    const ineligibleMembers: any[] = [];

    const now = new Date();

    for (const m of maleMembers) {
      const age = AgeCalculator.calculateAge(m.dob, now);
      const isUnder18 = age < 18;
      const isAboveUpperAge = isYuvak && age > config.yuvakMandalUpperAge;
      const existingReceiptNo = receiptedMemberMap.get(m.id);

      const memberItem = {
        id: m.id,
        name: m.name,
        dob: m.dob.toISOString().split('T')[0],
        age,
        gender: m.gender,
        mobile: m.mobile,
        familyRecordId: m.familyRecordId,
        memberCode: m.familyRecord?.memberCode || '',
        familyId: m.familyRecord?.familyId || '',
        familyHeadName: m.familyRecord?.familyHeadName || '',
        firmName: m.familyRecord?.firm?.firmName || '',
        firmCode: m.familyRecord?.firm?.firmCode || '',
        areaName: m.familyRecord?.firm?.area?.displayName || '',
        amount: configuredAmount,
      };

      if (isUnder18) {
        ineligibleMembers.push({
          ...memberItem,
          reason: `Underage: Member is ${age} years old (minimum age is 18).`,
        });
      } else if (isAboveUpperAge) {
        ineligibleMembers.push({
          ...memberItem,
          reason: `Age exceeded: Member is ${age} years old (upper limit is ${config.yuvakMandalUpperAge} for Yuvak Mandal).`,
        });
      } else if (existingReceiptNo) {
        ineligibleMembers.push({
          ...memberItem,
          reason: `Already receipted for this ${input.periodType.toLowerCase()} period (${existingReceiptNo}).`,
        });
      } else {
        eligibleMembers.push(memberItem);
      }
    }

    return {
      receiptTypeId: receiptType.id,
      receiptTypeName: receiptType.name,
      periodType: input.periodType,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth || null,
      configuredAmount,
      totalEligible: eligibleMembers.length,
      totalIneligible: ineligibleMembers.length,
      totalAmount: eligibleMembers.length * configuredAmount,
      eligibleMembers,
      ineligibleMembers,
    };
  }

  /**
   * Bulk Batch Commit and Generation (PRD Section 8)
   */
  public static async generateBatch(input: BatchReceiptInput, userId: string) {
    const preview = await this.getBatchPreview(input);

    if (preview.eligibleMembers.length === 0) {
      throw new AppError('No eligible members found for batch generation in this period.', 400, 'NO_ELIGIBLE_MEMBERS');
    }

    const excludedSet = new Set(input.excludedMemberIds || []);
    const membersToGenerate = preview.eligibleMembers.filter((m: any) => !excludedSet.has(m.id));

    if (membersToGenerate.length === 0) {
      throw new AppError('All eligible members were excluded from this batch.', 400, 'ALL_EXCLUDED');
    }

    const targetDate = new Date();

    // Transactionally generate all receipts
    const createdReceipts = await prisma.$transaction(async (tx) => {
      const generatedList = [];

      for (const m of membersToGenerate) {
        const receiptNumber = await CodeGenerator.getNextReceiptNumber();
        const verificationHash = Buffer.from(
          `UB-${receiptNumber}-${m.id}-${targetDate.toISOString()}`
        ).toString('base64');

        const rec = await tx.receipt.create({
          data: {
            receiptNumber,
            individualMemberId: m.id,
            familyRecordId: m.familyRecordId,
            receiptTypeId: preview.receiptTypeId,
            periodType: input.periodType as PeriodType,
            periodYear: input.periodYear,
            periodMonth: input.periodType === 'MONTHLY' ? input.periodMonth : null,
            amount: new Decimal(preview.configuredAmount),
            generatedAt: targetDate,
            status: 'ACTIVE',
            createdById: userId,
            verificationHash,
          },
          include: {
            receiptType: true,
            individualMember: {
              include: {
                familyRecord: {
                  include: {
                    firm: true,
                    surname: true,
                  },
                },
              },
            },
          },
        });

        generatedList.push(rec);
      }

      return generatedList;
    });

    await AuditService.log({
      userId,
      module: 'RECEIPT',
      action: 'BATCH_GENERATE',
      metadata: {
        receiptTypeName: preview.receiptTypeName,
        periodType: input.periodType,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        batchCount: createdReceipts.length,
        totalAmount: createdReceipts.length * preview.configuredAmount,
      },
    });

    return createdReceipts.map((r) => this.formatReceiptVoucher(r));
  }


  public static async getAll(options: ReceiptQueryOptions = {}) {
    const { search, receiptTypeId, fromDate, toDate, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (receiptTypeId) {
      where.receiptTypeId = receiptTypeId;
    }

    if (fromDate || toDate) {
      where.generatedAt = {};
      if (fromDate) (where.generatedAt as any).gte = new Date(fromDate);
      if (toDate) (where.generatedAt as any).lte = new Date(toDate);
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { receiptNumber: { contains: term } },
        { individualMember: { name: { contains: term } } },
        { individualMember: { mobile: { contains: term } } },
        { individualMember: { familyRecord: { memberCode: { contains: term } } } },
        { individualMember: { familyRecord: { familyId: { contains: term } } } },
      ];
    }

    const [total, receipts] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          receiptType: true,
          individualMember: {
            include: {
              familyRecord: {
                include: {
                  firm: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      receipts: receipts.map((r) => this.formatReceiptVoucher(r)),
    };
  }

  public static async getById(id: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        receiptType: true,
        individualMember: {
          include: {
            familyRecord: {
              include: {
                firm: { include: { area: true } },
                surname: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) throw new AppError('Receipt not found.', 404, 'NOT_FOUND');

    return this.formatReceiptVoucher(receipt);
  }

  public static async verifyReceipt(id: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        receiptType: true,
        individualMember: {
          include: {
            familyRecord: {
              include: {
                firm: true,
              },
            },
          },
        },
      },
    });

    if (!receipt || receipt.status !== 'ACTIVE') {
      return {
        valid: false,
        message: 'Invalid or cancelled receipt certificate.',
      };
    }

    return {
      valid: true,
      receiptNumber: receipt.receiptNumber,
      memberName: receipt.individualMember.name,
      memberCode: receipt.individualMember.familyRecord.memberCode,
      familyId: receipt.individualMember.familyRecord.familyId,
      firmName: receipt.individualMember.familyRecord.firm.firmName,
      receiptType: receipt.receiptType.name,
      amount: Number(receipt.amount),
      generatedAt: receipt.generatedAt,
      samaj: 'Uma Bhavan Community Management Platform',
      location: 'Anand, Gujarat (388001)',
    };
  }

  public static async delete(id: string, userId?: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) throw new AppError('Receipt not found.', 404, 'NOT_FOUND');

    await prisma.receipt.delete({
      where: { id },
    });

    await AuditService.log({
      userId,
      module: 'RECEIPT',
      action: 'DELETE',
      entityType: 'Receipt',
      entityId: id,
      metadata: { receiptNumber: receipt.receiptNumber },
    });

    return {
      message: `Receipt ${receipt.receiptNumber} deleted successfully. Number freed for reuse.`,
    };
  }

  private static formatReceiptVoucher(r: any) {
    const amountNum = Number(r.amount);
    return {
      id: r.id,
      receiptNumber: r.receiptNumber,
      receiptTypeId: r.receiptTypeId,
      receiptTypeName: r.receiptType.name,
      individualMemberId: r.individualMemberId,
      memberName: r.individualMember.name,
      memberDob: r.individualMember.dob,
      memberMobile: r.individualMember.mobile,
      familyRecordId: r.individualMember.familyRecord?.id,
      memberCode: r.individualMember.familyRecord?.memberCode,
      familyId: r.individualMember.familyRecord?.familyId,
      familyHeadName: r.individualMember.familyRecord?.familyHeadName,
      firmName: r.individualMember.familyRecord?.firm?.firmName,
      firmCode: r.individualMember.familyRecord?.firm?.firmCode,
      amount: amountNum,
      amountInWords: NumberToWords.toIndianRupees(amountNum),
      generatedAt: r.generatedAt,
      status: r.status,
      verificationHash: r.verificationHash,
      samajInfo: {
        name: 'UMA BHAVAN',
        city: 'Anand',
        state: 'Gujarat',
        pincode: '388001',
        phone: '+91 2692 250000',
      },
    };
  }
}
