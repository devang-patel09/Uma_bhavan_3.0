import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { NumberToWords } from '../src/utils/numberToWords.js';
import { ReceiptService } from '../src/services/receipt.service.js';
import { ReportService } from '../src/services/report.service.js';

describe('Receipts, Currency In Words & Niyari Report Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('NumberToWords Converter', () => {
    it('should convert 500 to "Rupees Five Hundred Only"', () => {
      expect(NumberToWords.toIndianRupees(500)).toBe('Rupees Five Hundred Only');
    });

    it('should convert 1000 to "Rupees One Thousand Only"', () => {
      expect(NumberToWords.toIndianRupees(1000)).toBe('Rupees One Thousand Only');
    });

    it('should convert 25500 to "Rupees Twenty Five Thousand Five Hundred Only"', () => {
      expect(NumberToWords.toIndianRupees(25500)).toBe('Rupees Twenty Five Thousand Five Hundred Only');
    });
  });

  describe('Receipt Eligibility Logic', () => {
    it('should reject female members from subscription receipt types', async () => {
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_fem',
        name: 'Geetaben',
        gender: 'FEMALE',
        dob: new Date('1985-01-01'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_1',
        name: 'Samaj',
        defaultAmount: 1000 as any,
      } as any);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_fem',
        receiptTypeId: 'rt_1',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Only male community members are eligible');
    });

    it('should reject male members aged 46+ from Yuvak Mandal receipts', async () => {
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_senior',
        name: 'Ramanlal Patel',
        gender: 'MALE',
        dob: new Date('1975-01-01'), // 51 years old
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_ym',
        name: 'Yuvak Mandal',
        defaultAmount: 500 as any,
      } as any);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_senior',
        receiptTypeId: 'rt_ym',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('strictly for members aged 18 to 45');
    });
  });

  describe('Receipt Same-Day Duplicate Prevention', () => {
    it('should throw 409 DUPLICATE_RECEIPT if active receipt exists on same date', async () => {
      vi.spyOn(ReceiptService, 'validateEligibility').mockResolvedValue({
        eligible: true,
        age: 25,
        defaultAmount: 500 as any,
        receiptTypeName: 'Yuvak Mandal',
        memberName: 'Rajesh',
        memberCode: 'M001',
      });

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue({
        id: 'rc_existing',
        receiptNumber: 'R000001',
        status: 'ACTIVE',
      } as any);

      await expect(
        ReceiptService.generateReceipt(
          {
            individualMemberId: 'mem_1',
            receiptTypeId: 'rt_1',
            amount: 500,
          },
          'usr_admin'
        )
      ).rejects.toThrow('A receipt of this type has already been generated for this member today.');
    });
  });

  describe('ReportService Niyari Filters', () => {
    it('should filter female records and map parental surname', async () => {
      vi.spyOn(prisma.individualMember, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.individualMember, 'findMany').mockResolvedValue([
        {
          id: 'fem_1',
          name: 'Hetalben Patel',
          gender: 'FEMALE',
          dob: new Date('2000-01-01'),
          mobile: '9825012345',
          maritalStatus: 'MARRIED',
          bloodGroup: 'B_POSITIVE',
          parentalSurname: { displayName: 'Patel' },
          familyRecord: {
            memberCode: 'M001',
            memberType: 'PERMANENT',
            familyId: 'FAM-1001',
            surname: { displayName: 'Patel' },
            firm: {
              firmName: 'Shree Umiya Krushi Kendra',
              firmCode: 'F001',
              area: { displayName: 'Station Road' },
            },
          },
        },
      ] as any);

      const result = await ReportService.getNiyariReport({});
      expect(result.total).toBe(1);
      expect(result.members[0].parentalSurname).toBe('Patel');
      expect(result.members[0].memberCode).toBe('M001');
    });
  });
});
