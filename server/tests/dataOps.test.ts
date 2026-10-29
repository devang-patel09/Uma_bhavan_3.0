import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { DataOpsService } from '../src/services/dataOps.service.js';

describe('Data Operations, Templates, Import Validation & Exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CSV Templates', () => {
    it('should generate template headers for areas, surnames, firms, and members', () => {
      const areaTpl = DataOpsService.getTemplate('areas');
      const surnameTpl = DataOpsService.getTemplate('surnames');
      const firmTpl = DataOpsService.getTemplate('firms');
      const memberTpl = DataOpsService.getTemplate('members');

      expect(areaTpl.headers).toContain('Area Name');
      expect(surnameTpl.headers).toContain('Surname');
      expect(firmTpl.headers).toContain('Firm Name');
      expect(memberTpl.headers).toContain('Family ID');
      expect(memberTpl.headers).toContain('Member Type');
    });
  });

  describe('Import Validation Pipeline', () => {
    it('should identify missing required fields and duplicate database areas', async () => {
      vi.spyOn(prisma.area, 'findMany').mockResolvedValue([
        { id: '1', displayName: 'Station Road', nameNormalized: 'station road' },
      ] as any);

      const result = await DataOpsService.validateImport('areas', [
        { 'Area Name': 'Station Road' }, // Duplicate in DB
        { 'Area Name': '' }, // Empty
        { 'Area Name': 'Gamdi Vad' }, // Valid
      ]);

      expect(result.totalRows).toBe(3);
      expect(result.validCount).toBe(1);
      expect(result.errorCount).toBe(2);
      expect(result.errorRows[0].errors[0]).toContain('already exists in database');
      expect(result.errorRows[1].errors[0]).toContain('Area Name is required');
    });

    it('should validate firm rows and reject unknown area names', async () => {
      vi.spyOn(prisma.area, 'findMany').mockResolvedValue([
        { id: 'area_1', displayName: 'Station Road', nameNormalized: 'station road' },
      ] as any);

      const result = await DataOpsService.validateImport('firms', [
        {
          'Firm Name': 'Shree Umiya Krushi Kendra',
          'Area Name': 'Station Road',
          Pincode: '388001',
          Address: 'Shop 12',
        },
        {
          'Firm Name': 'Unknown Firm',
          'Area Name': 'Non-existent Area',
          Pincode: '388001',
          Address: 'Shop 99',
        },
      ]);

      expect(result.validCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errorRows[0].errors[0]).toContain('does not exist in master records');
    });
  });

  describe('CSV Data Exports', () => {
    it('should generate formatted CSV export for firms', async () => {
      vi.spyOn(prisma.firm, 'findMany').mockResolvedValue([
        {
          firmCode: 'F001',
          firmName: 'Shree Umiya Krushi Kendra',
          firmType: 'PERMANENT',
          familyHeadName: 'Patel Kiritbhai',
          area: { displayName: 'Station Road' },
          subArea: { displayName: 'Station West' },
          pincode: '388001',
          address: 'APMC Market',
          _count: { memberRecords: 2 },
        },
      ] as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await DataOpsService.exportData('firms', 'usr_admin');
      expect(result.csv).toContain('Firm Code,Firm Name,Firm Type,Area,Sub-Area,Family Head,Pincode,Address,Linked Families');
      expect(result.csv).toContain('"F001","Shree Umiya Krushi Kendra","PERMANENT","Station Road","Station West","Patel Kiritbhai"');
    });

    it('should generate formatted CSV export for niyari female demographics', async () => {
      vi.spyOn(prisma.individualMember, 'findMany').mockResolvedValue([
        {
          name: 'Patel Gitaben',
          dob: new Date('1985-05-15'),
          gender: 'FEMALE',
          mobile: '9825012345',
          maritalStatus: 'MARRIED',
          parentalSurname: { displayName: 'Amin' },
          familyRecord: {
            memberCode: 'M001',
            familyId: 'FAM-1001',
            surname: { displayName: 'Patel' },
            firm: {
              firmName: 'Shree Umiya Krushi Kendra',
              area: { displayName: 'Station Road' },
            },
          },
        },
      ] as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await DataOpsService.exportData('niyari', 'usr_admin');
      expect(result.csv).toContain('Sl. No.,Member Name,Parental Surname,Member Code,Family ID,Age,Gender,Mobile,Firm Name,Area,Marital Status');
      expect(result.csv).toContain('1,"Patel Gitaben","Amin","M001","FAM-1001"');
    });
  });
});
