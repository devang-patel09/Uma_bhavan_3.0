import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CodeGenerator } from '../utils/codeGenerator.js';
import { AgeCalculator } from '../utils/ageCalculator.js';
import { NumberToWords } from '../utils/numberToWords.js';
import { GenerateReceiptInput, ValidateEligibilityInput } from '../schemas/receipt.schema.js';

export interface ReceiptQueryOptions {
  search?: string;
  receiptTypeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export class ReceiptService {
  public static async getReceiptTypes() {
    return prisma.receiptType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  public static async validateEligibility(input: ValidateEligibilityInput) {
    const [member, receiptType] = await Promise.all([
      prisma.individualMember.findUnique({
        where: { id: input.individualMemberId },
        include: { familyRecord: true },
      }),
      prisma.receiptType.findUnique({
        where: { id: input.receiptTypeId },
      }),
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

    if (receiptType.name.toLowerCase().includes('yuvak mandal') && age > 45) {
      return {
        eligible: false,
        reason: `Member is ${age} years old. Yuvak Mandal receipts are strictly for members aged 18 to 45.`,
        age,
        defaultAmount: receiptType.defaultAmount,
      };
    }

    return {
      eligible: true,
      age,
      defaultAmount: receiptType.defaultAmount,
      receiptTypeName: receiptType.name,
      memberName: member.name,
      memberCode: member.familyRecord.memberCode,
    };
  }

  public static async generateReceipt(input: GenerateReceiptInput, userId: string) {
    // 1. Check eligibility
    const eligibility = await this.validateEligibility({
      individualMemberId: input.individualMemberId,
      receiptTypeId: input.receiptTypeId,
    });

    if (!eligibility.eligible) {
      throw new AppError(eligibility.reason || 'Member is not eligible for this receipt type.', 400, 'INELIGIBLE_MEMBER');
    }

    // 2. Prevent duplicate receipt on same calendar date for same member + receipt type
    const targetDate = input.customDate ? new Date(input.customDate) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingToday = await prisma.receipt.findFirst({
      where: {
        individualMemberId: input.individualMemberId,
        receiptTypeId: input.receiptTypeId,
        status: 'ACTIVE',
        generatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingToday) {
      throw new AppError(
        'A receipt of this type has already been generated for this member today.',
        409,
        'DUPLICATE_RECEIPT'
      );
    }

    // 3. Generate sequential Receipt Number (R000001, R000002...) with gap reuse
    const receiptNumber = await CodeGenerator.getNextReceiptNumber();
    const verificationHash = Buffer.from(
      `UB-${receiptNumber}-${input.individualMemberId}-${targetDate.toISOString()}`
    ).toString('base64');

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        individualMemberId: input.individualMemberId,
        receiptTypeId: input.receiptTypeId,
        amount: new Decimal(input.amount),
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
        amount: input.amount,
        type: receipt.receiptType.name,
        member: receipt.individualMember.name,
      },
    });

    return this.formatReceiptVoucher(receipt);
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
