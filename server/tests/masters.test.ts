import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { CodeGenerator } from '../src/utils/codeGenerator.js';
import { AreaService } from '../src/services/area.service.js';
import { SurnameService } from '../src/services/surname.service.js';
import { FirmService } from '../src/services/firm.service.js';

describe('Master Data Services & Business Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CodeGenerator', () => {
    it('should generate F001 when no firms exist', async () => {
      vi.spyOn(prisma.firm, 'findMany').mockResolvedValue([]);
      const code = await CodeGenerator.getNextFirmCode();
      expect(code).toBe('F001');
    });

    it('should reuse deleted lowest gap in firm sequence (e.g. F001, F003 present -> returns F002)', async () => {
      vi.spyOn(prisma.firm, 'findMany').mockResolvedValue([
        { firmCode: 'F001' },
        { firmCode: 'F003' },
      ] as any);
      const code = await CodeGenerator.getNextFirmCode();
      expect(code).toBe('F002');
    });

    it('should generate M001 for Permanent and N001 for Nominal', async () => {
      vi.spyOn(prisma.memberRecord, 'findMany').mockResolvedValue([]);
      const permCode = await CodeGenerator.getNextMemberCode('PERMANENT');
      const nomCode = await CodeGenerator.getNextMemberCode('NOMINAL');
      expect(permCode).toBe('M001');
      expect(nomCode).toBe('N001');
    });
  });

  describe('AreaService', () => {
    it('should throw "Area already inserted." on case-insensitive duplicate', async () => {
      vi.spyOn(prisma.area, 'findUnique').mockResolvedValue({
        id: 'area_1',
        nameNormalized: 'station road',
        displayName: 'Station Road',
      } as any);

      await expect(AreaService.create({ name: 'STATION ROAD' })).rejects.toThrow(
        'Area already inserted.'
      );
    });

    it('should block deletion if linked firms exist', async () => {
      vi.spyOn(prisma.area, 'findUnique').mockResolvedValue({
        id: 'area_1',
        displayName: 'Gamdi Vad',
        _count: { firms: 3 },
      } as any);

      await expect(AreaService.delete('area_1')).rejects.toThrow(
        'Cannot delete area "Gamdi Vad" because 3 firm(s) are linked to it.'
      );
    });
  });

  describe('SurnameService', () => {
    it('should throw "Surname already inserted." on case-insensitive duplicate', async () => {
      vi.spyOn(prisma.surname, 'findUnique').mockResolvedValue({
        id: 'sur_1',
        nameNormalized: 'patel',
        displayName: 'Patel',
      } as any);

      await expect(SurnameService.create({ name: 'patel' })).rejects.toThrow(
        'Surname already inserted.'
      );
    });

    it('should block deletion if linked member records exist', async () => {
      vi.spyOn(prisma.surname, 'findUnique').mockResolvedValue({
        id: 'sur_1',
        displayName: 'Patel',
        _count: { memberRecords: 5, individualMembers: 20 },
      } as any);

      await expect(SurnameService.delete('sur_1')).rejects.toThrow(
        'Cannot delete surname "Patel" because it is associated with 5 family record(s)'
      );
    });
  });

  describe('FirmService', () => {
    it('should block deletion if associated family records exist', async () => {
      vi.spyOn(prisma.firm, 'findUnique').mockResolvedValue({
        id: 'firm_1',
        firmCode: 'F001',
        firmName: 'Shree Umiya Krushi Kendra',
        _count: { memberRecords: 2 },
      } as any);

      await expect(FirmService.delete('firm_1')).rejects.toThrow(
        'Cannot delete firm "Shree Umiya Krushi Kendra (F001)" because 2 family record(s) are associated with it.'
      );
    });

    it('should create firm with auto-generated code and valid area', async () => {
      vi.spyOn(prisma.area, 'findUnique').mockResolvedValue({ id: 'area_1', displayName: 'Station Road' } as any);
      vi.spyOn(prisma.firm, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.firm, 'create').mockResolvedValue({
        id: 'firm_1',
        firmCode: 'F001',
        firmName: 'Shree Umiya Krushi Kendra',
        areaId: 'area_1',
        pincode: '388001',
        address: 'APMC Market',
      } as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await FirmService.create({
        firmName: 'Shree Umiya Krushi Kendra',
        areaId: 'area_1',
        pincode: '388001',
        address: 'APMC Market',
      });

      expect(result.firmCode).toBe('F001');
      expect(result.firmName).toBe('Shree Umiya Krushi Kendra');
    });
  });
});
