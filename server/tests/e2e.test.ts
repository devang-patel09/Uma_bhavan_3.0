import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { AreaService } from '../src/services/area.service.js';
import { SurnameService } from '../src/services/surname.service.js';
import { FirmService } from '../src/services/firm.service.js';
import { MemberService } from '../src/services/member.service.js';
import { ReceiptService } from '../src/services/receipt.service.js';
import { ReportService } from '../src/services/report.service.js';
import { DataOpsService } from '../src/services/dataOps.service.js';
import { BackupService } from '../src/services/backup.service.js';
import { MemberType, Gender, BloodGroup, MaritalStatus } from '@prisma/client';

describe('Phase 8 — End-to-End System Flow Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute complete community lifecycle from master setup to bulk receipts, migration, and export', async () => {
    // 1. Setup Area & Sub-Area hierarchy
    vi.spyOn(prisma.area, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where?.id === 'area_1') {
        return {
          id: 'area_1',
          displayName: 'Station Road',
          nameNormalized: 'station road',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      }
      return null;
    });
    vi.spyOn(prisma.area, 'create').mockResolvedValue({
      id: 'area_1',
      displayName: 'Station Road',
      nameNormalized: 'station road',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

    const area = await AreaService.create({ name: 'Station Road' }, 'usr_admin');
    expect(area.displayName).toBe('Station Road');

    vi.spyOn(prisma.subArea, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.subArea, 'create').mockResolvedValue({
      id: 'sub_1',
      areaId: area.id,
      displayName: 'Station West',
      nameNormalized: 'station west',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const subArea = await AreaService.createSubArea(area.id, { name: 'Station West' }, 'usr_admin');
    expect(subArea.name).toBe('Station West');

    // 2. Setup Surnames
    vi.spyOn(prisma.surname, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.surname, 'create').mockResolvedValue({
      id: 'sur_patel',
      displayName: 'Patel',
      nameNormalized: 'patel',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const surnamePatel = await SurnameService.create({ name: 'Patel' }, 'usr_admin');
    expect(surnamePatel.displayName).toBe('Patel');

    // 3. Setup Permanent Firm (F001)
    vi.spyOn(prisma.subArea, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where?.id === 'sub_1') {
        return {
          id: 'sub_1',
          areaId: area.id,
          displayName: 'Station West',
          nameNormalized: 'station west',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      }
      return null;
    });
    vi.spyOn(prisma.firm, 'findFirst').mockResolvedValue(null); // Code generator -> F001
    vi.spyOn(prisma.firm, 'create').mockResolvedValue({
      id: 'firm_1',
      firmCode: 'F001',
      firmName: 'Shree Umiya Krushi Kendra',
      firmType: MemberType.PERMANENT,
      familyHeadName: 'Patel Somabhai',
      areaId: area.id,
      subAreaId: subArea.id,
      pincode: '388001',
      address: 'APMC Market, Station Road',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const firm = await FirmService.create({
      firmName: 'Shree Umiya Krushi Kendra',
      firmType: 'PERMANENT',
      familyHeadName: 'Patel Somabhai',
      areaId: area.id,
      subAreaId: subArea.id,
      pincode: '388001',
      address: 'APMC Market, Station Road',
    }, 'usr_admin');
    expect(firm.firmCode).toBe('F001');
    expect(firm.firmType).toBe('PERMANENT');

    // 4. Create Family Record — inherits PERMANENT from Firm
    vi.spyOn(prisma.memberRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.surname, 'findUnique').mockResolvedValue(surnamePatel as any);
    vi.spyOn(prisma.firm, 'findUnique').mockResolvedValue(firm as any);
    vi.spyOn(prisma.memberRecord, 'findFirst').mockResolvedValue(null); // Member code generator -> M001
    vi.spyOn(prisma.individualMember, 'findFirst').mockResolvedValue(null);

    const mockFamilyRecord = {
      id: 'fam_1',
      memberCode: 'M001',
      memberType: MemberType.PERMANENT,
      familyId: 'FAM-1001',
      familyHeadName: 'Patel Somabhai',
      surnameId: surnamePatel.id,
      firmId: firm.id,
      homeAddress: '12 Sardar Patel Society',
      male18PlusCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback({
        memberRecord: {
          create: vi.fn().mockResolvedValue(mockFamilyRecord),
        },
        individualMember: {
          create: vi.fn().mockResolvedValue({
            id: 'mem_1',
            familyRecordId: 'fam_1',
            name: 'Patel Kiritbhai',
            dob: new Date('1980-05-15'),
            gender: Gender.MALE,
            mobile: '9825012345',
            bloodGroup: BloodGroup.B_POSITIVE,
            maritalStatus: MaritalStatus.MARRIED,
            parentalSurnameId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        firm: {
          update: vi.fn().mockResolvedValue({}),
        },
      });
    });

    const family = await MemberService.createFamily({
      familyId: 'FAM-1001',
      familyHeadName: 'Patel Somabhai',
      surnameId: surnamePatel.id,
      firmId: firm.id,
      homeAddress: '12 Sardar Patel Society',
      members: [
        {
          name: 'Patel Kiritbhai',
          dob: '1980-05-15',
          gender: 'MALE',
          mobile: '9825012345',
          bloodGroup: 'B_POSITIVE',
          maritalStatus: 'MARRIED',
        },
      ],
    }, 'usr_admin');

    expect(family.memberCode).toBe('M001');
    expect(family.memberType).toBe('PERMANENT');
    expect(family.male18PlusCount).toBe(1);

    // 5. Niyari Report Rule verification (Married females always listed under Parental Surname)
    vi.spyOn(prisma.individualMember, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.individualMember, 'findMany').mockResolvedValue([
      {
        id: 'mem_female',
        name: 'Patel Gitaben Kiritbhai',
        dob: new Date('1982-08-20'),
        gender: Gender.FEMALE,
        mobile: '9825099999',
        maritalStatus: MaritalStatus.MARRIED,
        bloodGroup: BloodGroup.A_POSITIVE,
        parentalSurnameId: 'sur_desai',
        parentalSurname: { displayName: 'Desai' },
        familyRecord: {
          memberCode: 'M001',
          memberType: MemberType.PERMANENT,
          familyId: 'FAM-1001',
          surname: { displayName: 'Patel' },
          firm: { firmName: 'Shree Umiya Krushi Kendra', firmCode: 'F001', area: { displayName: 'Station Road' } },
        },
      },
    ] as any);

    const niyari = await ReportService.getNiyariReport({});
    expect(niyari.total).toBe(1);
    expect(niyari.members[0].parentalSurname).toBe('Desai');

    // 6. Bulk Receipt Generation Preview & Period Duplicate Check
    vi.spyOn(prisma.receiptConfig, 'findFirst').mockResolvedValue({
      id: 'cfg_1',
      yuvakMandalUpperAge: 45,
      samajMonthlyAmount: 100 as any,
      samajYearlyAmount: 1200 as any,
      yuvakMonthlyAmount: 50 as any,
      yuvakYearlyAmount: 500 as any,
      updatedAt: new Date(),
    } as any);

    vi.spyOn(prisma.receiptType, 'findFirst').mockResolvedValue({
      id: 'rt_samaj',
      name: 'Samaj',
      defaultAmount: 1200 as any,
    } as any);

    vi.spyOn(prisma.individualMember, 'findMany').mockResolvedValue([
      {
        id: 'mem_1',
        name: 'Patel Kiritbhai',
        gender: 'MALE',
        dob: new Date('1980-05-15'), // Age 46 in 2026 -> Eligible for Samaj
        familyRecord: { memberCode: 'M001', familyId: 'FAM-1001', firm: { firmName: 'Shree Umiya' } },
      },
    ] as any);

    vi.spyOn(prisma.receipt, 'findMany').mockResolvedValue([]); // No existing receipts for this year

    const preview = await ReceiptService.getBatchPreview({
      receiptTypeName: 'Samaj',
      periodType: 'YEARLY',
      periodYear: 2026,
    });

    expect(preview.eligibleMembers.length).toBe(1);
    expect(preview.eligibleMembers[0].name).toBe('Patel Kiritbhai');
    expect(preview.configuredAmount).toBe(1200);

    // 7. Verify Data Ops Export format
    vi.spyOn(prisma.firm, 'findMany').mockResolvedValue([
      {
        firmCode: 'F001',
        firmName: 'Shree Umiya Krushi Kendra',
        firmType: 'PERMANENT',
        familyHeadName: 'Patel Somabhai',
        area: { displayName: 'Station Road' },
        subArea: { displayName: 'Station West' },
        pincode: '388001',
        address: 'APMC Market',
        _count: { memberRecords: 1 },
      },
    ] as any);

    const firmExport = await DataOpsService.exportData('firms', 'usr_admin');
    expect(firmExport.csv).toContain('Firm Code,Firm Name,Firm Type,Area,Sub-Area,Family Head');
    expect(firmExport.csv).toContain('"F001","Shree Umiya Krushi Kendra","PERMANENT"');

    // 8. Verify Backup Package & Restore validation
    process.env.BACKUP_ENCRYPTION_KEY = 'test-encryption-key-for-phase8-e2e';
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ migration_name: '20261015054502_update_prd_schema' }] as any);

    // Build a valid backup buffer with real checksum so validateBackup passes
    const { encrypt, sha256 } = await import('../src/utils/crypto.js');
    const dumpContent = 'CREATE TABLE dummy (id INT);';
    const realChecksum = sha256(Buffer.from(dumpContent, 'utf8'));
    const dummyPayload = JSON.stringify({
      version: '1',
      schemaVersion: '20261015054502_update_prd_schema',
      createdAt: new Date().toISOString(),
      checksum: realChecksum,
      dump: dumpContent,
    });
    const encryptedBuf = encrypt(Buffer.from(dummyPayload, 'utf8'), process.env.BACKUP_ENCRYPTION_KEY);

    const validation = await BackupService.validateBackup(encryptedBuf);
    expect(validation.valid).toBe(true);
    expect(validation.checksumMatch).toBe(true);
    expect(validation.schemaVersion).toBe('20261015054502_update_prd_schema');
  });
});
