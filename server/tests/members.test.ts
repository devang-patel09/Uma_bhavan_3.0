import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { AgeCalculator } from '../src/utils/ageCalculator.js';
import { MemberService } from '../src/services/member.service.js';

describe('Member Master & Family Migration Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AgeCalculator & Boundary Ages (18, 45, 46)', () => {
    const refDate = new Date('2026-10-03T00:00:00Z');

    it('should calculate age 17 for person born 2008-10-04 (1 day before 18th birthday)', () => {
      const dob = new Date('2008-10-04T00:00:00Z');
      const age = AgeCalculator.calculateAge(dob, refDate);
      expect(age).toBe(17);
      expect(AgeCalculator.is18PlusMale('MALE', dob, refDate)).toBe(false);
      expect(AgeCalculator.getEligibleReceiptTypes('MALE', dob, refDate)).toEqual([]);
    });

    it('should calculate age 18 on 18th birthday (2008-10-03) and qualify for Yuvak Mandal and Samaj', () => {
      const dob = new Date('2008-10-03T00:00:00Z');
      const age = AgeCalculator.calculateAge(dob, refDate);
      expect(age).toBe(18);
      expect(AgeCalculator.is18PlusMale('MALE', dob, refDate)).toBe(true);
      expect(AgeCalculator.getEligibleReceiptTypes('MALE', dob, refDate)).toEqual([
        'Yuvak Mandal',
        'Samaj',
      ]);
    });

    it('should qualify age 45 for Yuvak Mandal and Samaj', () => {
      const dob = new Date('1981-10-03T00:00:00Z'); // Exactly 45
      const age = AgeCalculator.calculateAge(dob, refDate);
      expect(age).toBe(45);
      expect(AgeCalculator.is18PlusMale('MALE', dob, refDate)).toBe(true);
      expect(AgeCalculator.getEligibleReceiptTypes('MALE', dob, refDate)).toEqual([
        'Yuvak Mandal',
        'Samaj',
      ]);
    });

    it('should qualify age 46 for Samaj ONLY (no Yuvak Mandal)', () => {
      const dob = new Date('1980-10-03T00:00:00Z'); // Exactly 46
      const age = AgeCalculator.calculateAge(dob, refDate);
      expect(age).toBe(46);
      expect(AgeCalculator.is18PlusMale('MALE', dob, refDate)).toBe(true);
      expect(AgeCalculator.getEligibleReceiptTypes('MALE', dob, refDate)).toEqual(['Samaj']);
    });
  });

  describe('MemberService Family & Duplicate Rules', () => {
    it('should detect duplicate individual member (Name + DOB + Gender)', async () => {
      vi.spyOn(prisma.memberRecord, 'findUnique').mockResolvedValue({
        id: 'fam_1',
        memberCode: 'M001',
        members: [],
      } as any);

      vi.spyOn(prisma.individualMember, 'findFirst').mockResolvedValue({
        id: 'mem_1',
        name: 'Rajesh Patel',
        dob: new Date('1990-05-15T00:00:00.000Z'),
        gender: 'MALE',
        familyRecord: {
          memberCode: 'M001',
          familyHeadName: 'Kiritbhai',
        },
      } as any);

      await expect(
        MemberService.addIndividualMember('fam_1', {
          name: 'Rajesh Patel',
          dob: '1990-05-15',
          gender: 'MALE',
          mobile: '9825099999',
          allowDuplicate: false,
        })
      ).rejects.toThrow('Duplicate detected: "Rajesh Patel" with DOB 1990-05-15 and gender MALE');
    });

    it('should allow duplicate individual when allowDuplicate flag is true', async () => {
      vi.spyOn(prisma.memberRecord, 'findUnique').mockResolvedValue({
        id: 'fam_1',
        memberCode: 'M001',
        members: [],
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          individualMember: {
            create: vi.fn().mockResolvedValue({
              id: 'mem_2',
              name: 'Rajesh Patel',
              dob: new Date('1990-05-15'),
              gender: 'MALE',
            }),
            findMany: vi.fn().mockResolvedValue([]),
          },
          memberRecord: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await MemberService.addIndividualMember('fam_1', {
        name: 'Rajesh Patel',
        dob: '1990-05-15',
        gender: 'MALE',
        mobile: '9825099999',
        allowDuplicate: true,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Rajesh Patel');
    });

    it('should inherit member classification from Firm Type (Permanent firm -> Permanent member, Nominal firm -> Nominal member)', async () => {
      vi.spyOn(prisma.memberRecord, 'findUnique').mockResolvedValue(null); // familyId unique check
      vi.spyOn(prisma.surname, 'findUnique').mockResolvedValue({ id: 'sur_1' } as any);
      vi.spyOn(prisma.firm, 'findUnique').mockResolvedValue({
        id: 'firm_nom',
        firmType: 'NOMINAL',
        familyHeadName: 'Rameshbhai',
      } as any);
      vi.spyOn(prisma.memberRecord, 'findMany').mockResolvedValue([]); // Code generator

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          memberRecord: {
            create: vi.fn().mockImplementation(async ({ data }: any) => {
              return {
                id: 'fam_new',
                ...data,
              };
            }),
          },
          firm: {
            update: vi.fn().mockResolvedValue({}),
          },
          individualMember: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      const res = await MemberService.createFamily({
        familyId: 'FAM-9999',
        familyHeadName: 'Rameshbhai Patel',
        surnameId: 'sur_1',
        firmId: 'firm_nom',
        homeAddress: 'Anand',
        members: [],
      });

      expect(res.memberType).toBe('NOMINAL');
      expect(res.memberCode).toBe('N001');
    });
  });

  describe('Transactional Member Migration / Family Splitting', () => {
    it('should perform migration to existing firm and delete original family if 0 members remain', async () => {
      const sourceFamily = {
        id: 'fam_source',
        memberCode: 'M001',
        memberType: 'PERMANENT',
        familyId: 'FAM-1001',
        surnameId: 'sur_1',
        firmId: 'firm_1',
        homeAddress: 'Old Address',
        members: [
          { id: 'mem_1', name: 'Kiritbhai', dob: new Date('1970-01-01'), gender: 'MALE' },
          { id: 'mem_2', name: 'Geetaben', dob: new Date('1975-01-01'), gender: 'FEMALE' },
        ],
      };

      vi.spyOn(prisma.memberRecord, 'findUnique').mockImplementation(async ({ where }: any) => {
        if (where.id === 'fam_source') return sourceFamily as any;
        if (where.id === 'fam_dest') {
          return {
            id: 'fam_dest',
            memberCode: 'M002',
            memberType: 'PERMANENT',
            familyId: 'FAM-1002',
            firm: { firmName: 'New Firm' },
            surname: { displayName: 'Patel' },
            members: [],
          } as any;
        }
        return null; // For familyId checks
      });

      vi.spyOn(prisma.firm, 'findUnique').mockResolvedValue({
        id: 'firm_dest',
        firmCode: 'F002',
        firmType: 'PERMANENT',
      } as any);
      vi.spyOn(prisma.memberRecord, 'findMany').mockResolvedValue([]); // Code generator

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          memberRecord: {
            findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
              if (where.id === 'fam_dest') {
                return {
                  id: 'fam_dest',
                  memberCode: 'M002',
                  memberType: 'PERMANENT',
                  familyId: 'FAM-1002',
                  firm: { firmName: 'New Firm' },
                  surname: { displayName: 'Patel' },
                  members: [],
                };
              }
              return null;
            }),
            create: vi.fn().mockResolvedValue({
              id: 'fam_dest',
              memberCode: 'M002',
              memberType: 'PERMANENT',
              familyId: 'FAM-1002',
            }),
            delete: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
          },
          individualMember: {
            updateMany: vi.fn().mockResolvedValue({ count: 2 }),
            count: vi.fn().mockResolvedValue(0), // 0 members left in source
            findMany: vi.fn().mockResolvedValue([]),
          },
          firm: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'firm_dest',
              firmCode: 'F002',
              firmType: 'PERMANENT',
            }),
          },
          migrationLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await MemberService.migrateFamily('fam_source', {
        migrationType: 'EXISTING_FIRM',
        destinationFirmId: 'firm_dest',
        destinationFamilyId: 'FAM-1002',
        destinationFamilyHeadName: 'Kiritbhai Patel',
        migratingMemberIds: ['mem_1', 'mem_2'],
      });

      expect(result.migratedCount).toBe(2);
      expect(result.sourceDeleted).toBe(true);
      expect(result.destinationFamily?.memberCode).toBe('M002');
    });
  });
});

