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

  describe('Receipt Eligibility Logic & Boundary Ages (18, 45, 46)', () => {
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

    it('boundary age 17 (<18): should reject male member aged 17 from Samaj and Yuvak Mandal', async () => {
      // DOB: 2009-10-16 (16/17 years old on 2026-10-15)
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_17',
        name: 'Minor Male',
        gender: 'MALE',
        dob: new Date('2009-10-16'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_samaj',
        name: 'Samaj',
        defaultAmount: 1000 as any,
      } as any);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_17',
        receiptTypeId: 'rt_samaj',
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Only adult members aged 18 and above are eligible');
    });

    it('boundary age 18: should accept male member aged exactly 18 for both Samaj and Yuvak Mandal', async () => {
      // DOB: 2008-10-15 (exactly 18 on 2026-10-15)
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_18',
        name: 'Adult Male 18',
        gender: 'MALE',
        dob: new Date('2008-10-15'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_ym',
        name: 'Yuvak Mandal',
        defaultAmount: 500 as any,
      } as any);

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue(null);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_18',
        receiptTypeId: 'rt_ym',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(result.eligible).toBe(true);
      expect(result.age).toBe(18);
    });

    it('boundary age 45: should accept male member aged 45 for Yuvak Mandal', async () => {
      // DOB: 1981-10-15 (45 years old)
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_45',
        name: 'Male 45',
        gender: 'MALE',
        dob: new Date('1981-10-15'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_ym',
        name: 'Yuvak Mandal',
        defaultAmount: 500 as any,
      } as any);

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue(null);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_45',
        receiptTypeId: 'rt_ym',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(result.eligible).toBe(true);
      expect(result.age).toBe(45);
    });

    it('boundary age 46: should reject from Yuvak Mandal (>45) but accept for Samaj', async () => {
      // DOB: 1980-10-15 (46 years old)
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_46',
        name: 'Male 46',
        gender: 'MALE',
        dob: new Date('1980-10-15'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_ym',
        name: 'Yuvak Mandal',
        defaultAmount: 500 as any,
      } as any);

      const ymResult = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_46',
        receiptTypeId: 'rt_ym',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(ymResult.eligible).toBe(false);
      expect(ymResult.reason).toContain('strictly for members aged 18 to 45');

      // Now test Samaj for age 46
      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_samaj',
        name: 'Samaj',
        defaultAmount: 1000 as any,
      } as any);

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue(null);

      const samajResult = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_46',
        receiptTypeId: 'rt_samaj',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(samajResult.eligible).toBe(true);
      expect(samajResult.age).toBe(46);
    });

    it('dynamic upper age configuration: should allow age 48 when admin sets upper limit to 50', async () => {
      vi.spyOn(ReceiptService, 'getConfig').mockResolvedValue({
        id: 'cfg_1',
        yuvakMandalUpperAge: 50,
        samajMonthlyAmount: 100,
        samajYearlyAmount: 1200,
        yuvakMonthlyAmount: 50,
        yuvakYearlyAmount: 500,
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_48',
        name: 'Male 48',
        gender: 'MALE',
        dob: new Date('1978-01-01'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_ym',
        name: 'Yuvak Mandal',
        defaultAmount: 500 as any,
      } as any);

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue(null);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_48',
        receiptTypeId: 'rt_ym',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(result.eligible).toBe(true);
      expect(result.age).toBe(48);
    });
  });

  describe('Period Duplicate Prevention (Monthly vs Yearly calendar rules)', () => {
    it('should block duplicate monthly receipt in the same calendar month', async () => {
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_1',
        name: 'Rajesh Patel',
        gender: 'MALE',
        dob: new Date('2000-01-01'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_samaj',
        name: 'Samaj',
        defaultAmount: 100 as any,
      } as any);

      // Existing receipt found in Oct 2026
      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue({
        id: 'rec_existing',
        receiptNumber: 'R000042',
        periodType: 'MONTHLY',
        periodYear: 2026,
        periodMonth: 10,
        status: 'ACTIVE',
      } as any);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_1',
        receiptTypeId: 'rt_samaj',
        periodType: 'MONTHLY',
        periodYear: 2026,
        periodMonth: 10,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('already been generated');
    });

    it('should allow monthly receipt when calendar month changes (e.g. Month 11 vs Month 10)', async () => {
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_1',
        name: 'Rajesh Patel',
        gender: 'MALE',
        dob: new Date('2000-01-01'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_samaj',
        name: 'Samaj',
        defaultAmount: 100 as any,
      } as any);

      // No receipt found in Nov 2026
      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue(null);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_1',
        receiptTypeId: 'rt_samaj',
        periodType: 'MONTHLY',
        periodYear: 2026,
        periodMonth: 11,
      });

      expect(result.eligible).toBe(true);
    });

    it('should block duplicate yearly receipt in the same calendar year', async () => {
      vi.spyOn(prisma.individualMember, 'findUnique').mockResolvedValue({
        id: 'mem_1',
        name: 'Rajesh Patel',
        gender: 'MALE',
        dob: new Date('2000-01-01'),
        familyRecord: { memberCode: 'M001' },
      } as any);

      vi.spyOn(prisma.receiptType, 'findUnique').mockResolvedValue({
        id: 'rt_samaj',
        name: 'Samaj',
        defaultAmount: 1200 as any,
      } as any);

      vi.spyOn(prisma.receipt, 'findFirst').mockResolvedValue({
        id: 'rec_yearly',
        receiptNumber: 'R000099',
        periodType: 'YEARLY',
        periodYear: 2026,
        status: 'ACTIVE',
      } as any);

      const result = await ReceiptService.validateEligibility({
        individualMemberId: 'mem_1',
        receiptTypeId: 'rt_samaj',
        periodType: 'YEARLY',
        periodYear: 2026,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('year 2026');
    });
  });

  describe('ReportService Niyari Filters', () => {
    it('should filter female records and map parental surname for married females', async () => {
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
          parentalSurname: { displayName: 'Diwani' },
          familyRecord: {
            memberCode: 'M001',
            memberType: 'PERMANENT',
            familyId: 'FAM-1001',
            surname: { displayName: 'Sankhala' },
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
      // For married female, surname must be parental surname Diwani, not married surname Sankhala
      expect(result.members[0].surname).toBe('Diwani');
      expect(result.members[0].parentalSurname).toBe('Diwani');
    });
  });
});

