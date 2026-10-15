import { prisma } from '../db/prisma.js';

export class CodeGenerator {
  /**
   * Generates the next available Firm Code (e.g. F001, F002...).
   * Reuses the lowest available deleted or unused number gap.
   */
  public static async getNextFirmCode(): Promise<string> {
    const existingFirms = await prisma.firm.findMany({
      select: { firmCode: true },
    });

    const usedNumbers = new Set<number>();
    for (const firm of existingFirms) {
      const match = firm.firmCode.match(/^F(\d+)$/i);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return `F${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Generates the next available Member Code:
   * Permanent: M001, M002...
   * Nominal: N001, N002...
   * Reuses the lowest available number gap per category.
   */
  public static async getNextMemberCode(type: 'PERMANENT' | 'NOMINAL'): Promise<string> {
    const prefix = type === 'PERMANENT' ? 'M' : 'N';
    const regex = type === 'PERMANENT' ? /^M(\d+)$/i : /^N(\d+)$/i;

    const existingRecords = await prisma.memberRecord.findMany({
      where: { memberType: type },
      select: { memberCode: true },
    });

    const usedNumbers = new Set<number>();
    for (const rec of existingRecords) {
      const match = rec.memberCode.match(regex);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Generates the next available Receipt Number (R000001, R000002...).
   * Reuses available number gaps if deleted per PRD Section 10.
   */
  public static async getNextReceiptNumber(): Promise<string> {
    const existingReceipts = await prisma.receipt.findMany({
      select: { receiptNumber: true },
    });

    const usedNumbers = new Set<number>();
    for (const rec of existingReceipts) {
      const match = rec.receiptNumber.match(/^R(\d+)$/i);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }

    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return `R${nextNumber.toString().padStart(6, '0')}`;
  }
}
