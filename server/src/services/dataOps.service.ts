import { MemberType, Gender, BloodGroup, MaritalStatus } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { CodeGenerator } from '../utils/codeGenerator.js';
import { AgeCalculator } from '../utils/ageCalculator.js';
import { ImportType } from '../schemas/dataOps.schema.js';

export interface RowValidationError {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
}

export class DataOpsService {
  /**
   * Template structures with headers and sample records
   */
  public static getTemplate(type: ImportType) {
    switch (type) {
      case 'areas':
        return {
          type: 'areas',
          filename: 'Uma_Bhavan_Area_Template.csv',
          headers: ['Area Name'],
          sampleRows: [
            { 'Area Name': 'Station Road' },
            { 'Area Name': 'Gamdi Vad' },
            { 'Area Name': 'Amul Dairy Road' },
          ],
        };
      case 'surnames':
        return {
          type: 'surnames',
          filename: 'Uma_Bhavan_Surname_Template.csv',
          headers: ['Surname'],
          sampleRows: [
            { Surname: 'Patel' },
            { Surname: 'Amin' },
            { Surname: 'Desai' },
          ],
        };
      case 'firms':
        return {
          type: 'firms',
          filename: 'Uma_Bhavan_Firm_Template.csv',
          headers: ['Firm Name', 'Area Name', 'Pincode', 'Address'],
          sampleRows: [
            {
              'Firm Name': 'Shree Umiya Krushi Kendra',
              'Area Name': 'Station Road',
              Pincode: '388001',
              Address: 'Shop 12, APMC Market, Anand',
            },
            {
              'Firm Name': 'Sardar Patel Hardware Stores',
              'Area Name': 'Gamdi Vad',
              Pincode: '388001',
              Address: 'Opp. Tower, Gamdi Vad, Anand',
            },
          ],
        };
      case 'members':
        return {
          type: 'members',
          filename: 'Uma_Bhavan_Member_Template.csv',
          headers: [
            'Member Type',
            'Family ID',
            'Family Head Name',
            'Surname',
            'Firm Code',
            'Home Address',
            'Member Name',
            'DOB (YYYY-MM-DD)',
            'Gender (MALE/FEMALE)',
            'Mobile',
            'Blood Group',
            'Marital Status',
            'Parental Surname',
          ],
          sampleRows: [
            {
              'Member Type': 'PERMANENT',
              'Family ID': 'FAM-1001',
              'Family Head Name': 'Patel Kiritbhai Somabhai',
              Surname: 'Patel',
              'Firm Code': 'F001',
              'Home Address': '12 Sardar Patel Society, Anand',
              'Member Name': 'Patel Kiritbhai Somabhai',
              'DOB (YYYY-MM-DD)': '1972-04-12',
              'Gender (MALE/FEMALE)': 'MALE',
              Mobile: '9825012345',
              'Blood Group': 'B_POSITIVE',
              'Marital Status': 'MARRIED',
              'Parental Surname': 'Patel',
            },
          ],
        };
    }
  }

  /**
   * Validates uploaded batch import rows and returns preview metrics
   */
  public static async validateImport(type: ImportType, rows: Record<string, any>[]) {
    const validRows: Record<string, any>[] = [];
    const errorRows: RowValidationError[] = [];

    if (type === 'areas') {
      const existingAreas = await prisma.area.findMany();
      const existingNormSet = new Set(existingAreas.map((a) => a.nameNormalized));
      const seenBatchSet = new Set<string>();

      rows.forEach((row, index) => {
        const rowNumber = index + 1;
        const rawName = (row['Area Name'] || row['name'] || '').toString().trim();
        const errors: string[] = [];

        if (!rawName) {
          errors.push('Area Name is required.');
        } else {
          const norm = rawName.toLowerCase();
          if (existingNormSet.has(norm)) {
            errors.push(`Area "${rawName}" already exists in database.`);
          } else if (seenBatchSet.has(norm)) {
            errors.push(`Duplicate area "${rawName}" found in uploaded batch.`);
          } else {
            seenBatchSet.add(norm);
          }
        }

        if (errors.length > 0) {
          errorRows.push({ rowNumber, data: row, errors });
        } else {
          validRows.push({ displayName: rawName, nameNormalized: rawName.toLowerCase() });
        }
      });
    } else if (type === 'surnames') {
      const existingSurnames = await prisma.surname.findMany();
      const existingNormSet = new Set(existingSurnames.map((s) => s.nameNormalized));
      const seenBatchSet = new Set<string>();

      rows.forEach((row, index) => {
        const rowNumber = index + 1;
        const rawName = (row['Surname'] || row['name'] || '').toString().trim();
        const errors: string[] = [];

        if (!rawName) {
          errors.push('Surname is required.');
        } else {
          const norm = rawName.toLowerCase();
          if (existingNormSet.has(norm)) {
            errors.push(`Surname "${rawName}" already exists in database.`);
          } else if (seenBatchSet.has(norm)) {
            errors.push(`Duplicate surname "${rawName}" found in uploaded batch.`);
          } else {
            seenBatchSet.add(norm);
          }
        }

        if (errors.length > 0) {
          errorRows.push({ rowNumber, data: row, errors });
        } else {
          validRows.push({ displayName: rawName, nameNormalized: rawName.toLowerCase() });
        }
      });
    } else if (type === 'firms') {
      const areas = await prisma.area.findMany();
      const areaMap = new Map(areas.map((a) => [a.displayName.toLowerCase(), a.id]));

      rows.forEach((row, index) => {
        const rowNumber = index + 1;
        const firmName = (row['Firm Name'] || row['firmName'] || '').toString().trim();
        const areaName = (row['Area Name'] || row['areaName'] || '').toString().trim();
        const pincode = (row['Pincode'] || row['pincode'] || '388001').toString().trim();
        const address = (row['Address'] || row['address'] || '').toString().trim();
        const errors: string[] = [];

        if (!firmName) errors.push('Firm Name is required.');
        if (!areaName) {
          errors.push('Area Name is required.');
        } else if (!areaMap.has(areaName.toLowerCase())) {
          errors.push(`Area "${areaName}" does not exist in master records. Please add Area first.`);
        }
        if (!address) errors.push('Address is required.');

        if (errors.length > 0) {
          errorRows.push({ rowNumber, data: row, errors });
        } else {
          validRows.push({
            firmName,
            areaId: areaMap.get(areaName.toLowerCase())!,
            pincode,
            address,
          });
        }
      });
    } else if (type === 'members') {
      const [surnames, firms, existingFamilies] = await Promise.all([
        prisma.surname.findMany(),
        prisma.firm.findMany(),
        prisma.memberRecord.findMany({ select: { familyId: true } }),
      ]);

      const surnameMap = new Map(surnames.map((s) => [s.displayName.toLowerCase(), s.id]));
      const firmMap = new Map(firms.map((f) => [f.firmCode.toLowerCase(), f.id]));
      const existingFamilyIdSet = new Set(existingFamilies.map((f) => f.familyId.toLowerCase()));
      const seenBatchFamilyIds = new Set<string>();

      rows.forEach((row, index) => {
        const rowNumber = index + 1;
        const mType = (row['Member Type'] || row['memberType'] || 'PERMANENT').toString().toUpperCase();
        const famId = (row['Family ID'] || row['familyId'] || '').toString().trim();
        const headName = (row['Family Head Name'] || row['familyHeadName'] || '').toString().trim();
        const surName = (row['Surname'] || row['surname'] || '').toString().trim();
        const fCode = (row['Firm Code'] || row['firmCode'] || '').toString().trim();
        const hAddress = (row['Home Address'] || row['homeAddress'] || '').toString().trim();
        const memName = (row['Member Name'] || row['memberName'] || headName).toString().trim();
        const dobStr = (row['DOB (YYYY-MM-DD)'] || row['dob'] || '').toString().trim();
        const gender = (row['Gender (MALE/FEMALE)'] || row['gender'] || 'MALE').toString().toUpperCase();
        const mobile = (row['Mobile'] || row['mobile'] || '').toString().trim();
        const bloodGroup = (row['Blood Group'] || row['bloodGroup'] || 'UNKNOWN').toString().toUpperCase();
        const marital = (row['Marital Status'] || row['maritalStatus'] || 'UNMARRIED').toString().toUpperCase();
        const parentalSurnameStr = (row['Parental Surname'] || row['parentalSurname'] || '').toString().trim();

        const errors: string[] = [];

        if (mType !== 'PERMANENT' && mType !== 'NOMINAL') errors.push('Member Type must be PERMANENT or NOMINAL.');
        if (!famId) {
          errors.push('Family ID is required.');
        } else if (existingFamilyIdSet.has(famId.toLowerCase())) {
          errors.push(`Family ID "${famId}" already exists in database.`);
        }

        if (!headName) errors.push('Family Head Name is required.');
        if (!surName || !surnameMap.has(surName.toLowerCase())) {
          errors.push(`Surname "${surName}" does not exist in master records.`);
        }
        if (!fCode || !firmMap.has(fCode.toLowerCase())) {
          errors.push(`Firm Code "${fCode}" does not exist in master records.`);
        }
        if (!hAddress) errors.push('Home Address is required.');
        if (dobStr && isNaN(Date.parse(dobStr))) errors.push('DOB must be a valid date (YYYY-MM-DD).');
        if (gender !== 'MALE' && gender !== 'FEMALE') errors.push('Gender must be MALE or FEMALE.');
        if (!mobile) errors.push('Mobile number is required.');

        if (errors.length > 0) {
          errorRows.push({ rowNumber, data: row, errors });
        } else {
          seenBatchFamilyIds.add(famId.toLowerCase());
          validRows.push({
            memberType: mType as MemberType,
            familyId: famId,
            familyHeadName: headName,
            surnameId: surnameMap.get(surName.toLowerCase())!,
            firmId: firmMap.get(fCode.toLowerCase())!,
            homeAddress: hAddress,
            member: {
              name: memName,
              dob: dobStr ? new Date(dobStr) : new Date('1990-01-01'),
              gender: gender as Gender,
              mobile,
              bloodGroup: (['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'].includes(bloodGroup) ? bloodGroup : 'UNKNOWN') as BloodGroup,
              maritalStatus: (marital === 'MARRIED' ? 'MARRIED' : 'UNMARRIED') as MaritalStatus,
              parentalSurnameId: parentalSurnameStr && surnameMap.has(parentalSurnameStr.toLowerCase()) ? surnameMap.get(parentalSurnameStr.toLowerCase()) : null,
            },
          });
        }
      });
    }

    return {
      type,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      validRows,
      errorRows,
    };
  }

  /**
   * Transactional batch commit of verified rows (PRD Section 13)
   */
  public static async commitImport(type: ImportType, validRows: Record<string, any>[], userId?: string) {
    if (validRows.length === 0) {
      throw new AppError('No valid rows provided for import.', 400, 'NO_VALID_ROWS');
    }

    const insertedCount = await prisma.$transaction(async (tx) => {
      if (type === 'areas') {
        await tx.area.createMany({
          data: validRows.map((r) => ({
            displayName: r.displayName,
            nameNormalized: r.nameNormalized,
          })),
          skipDuplicates: true,
        });
        return validRows.length;
      } else if (type === 'surnames') {
        await tx.surname.createMany({
          data: validRows.map((r) => ({
            displayName: r.displayName,
            nameNormalized: r.nameNormalized,
          })),
          skipDuplicates: true,
        });
        return validRows.length;
      } else if (type === 'firms') {
        let count = 0;
        for (const row of validRows) {
          const firmCode = await CodeGenerator.getNextFirmCode();
          await tx.firm.create({
            data: {
              firmCode,
              firmName: row.firmName,
              areaId: row.areaId,
              pincode: row.pincode,
              address: row.address,
            },
          });
          count++;
        }
        return count;
      } else if (type === 'members') {
        let count = 0;
        for (const row of validRows) {
          const memberCode = await CodeGenerator.getNextMemberCode(row.memberType);
          const is18Plus = AgeCalculator.is18PlusMale(row.member.gender, row.member.dob);

          const fam = await tx.memberRecord.create({
            data: {
              memberCode,
              memberType: row.memberType,
              familyId: row.familyId,
              familyHeadName: row.familyHeadName,
              surnameId: row.surnameId,
              firmId: row.firmId,
              homeAddress: row.homeAddress,
              male18PlusCount: is18Plus ? 1 : 0,
            },
          });

          await tx.individualMember.create({
            data: {
              familyRecordId: fam.id,
              name: row.member.name,
              dob: row.member.dob,
              gender: row.member.gender,
              mobile: row.member.mobile,
              bloodGroup: row.member.bloodGroup,
              maritalStatus: row.member.maritalStatus,
              parentalSurnameId: row.member.parentalSurnameId,
            },
          });

          count++;
        }
        return count;
      }

      return 0;
    });

    await AuditService.log({
      userId,
      module: 'EXCEL_IMPORT',
      action: 'COMMIT',
      metadata: { type, recordsImported: insertedCount },
    });

    return {
      success: true,
      message: `Successfully imported ${insertedCount} ${type} record(s).`,
      count: insertedCount,
    };
  }

  /**
   * Generates formatted CSV string for direct data exports
   */
  public static async exportData(type: string, userId?: string) {
    let filename = `Uma_Bhavan_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    let csv = '';

    if (type === 'areas') {
      const areas = await prisma.area.findMany({
        orderBy: { displayName: 'asc' },
        include: { _count: { select: { firms: true } } },
      });
      csv = 'Area Name,Linked Firms,Created At\n' +
        areas.map((a) => `"${a.displayName}",${a._count.firms},"${a.createdAt.toISOString()}"`).join('\n');
    } else if (type === 'surnames') {
      const surnames = await prisma.surname.findMany({
        orderBy: { displayName: 'asc' },
        include: { _count: { select: { memberRecords: true, individualMembers: true } } },
      });
      csv = 'Surname,Linked Families,Linked Members,Created At\n' +
        surnames.map((s) => `"${s.displayName}",${s._count.memberRecords},${s._count.individualMembers},"${s.createdAt.toISOString()}"`).join('\n');
    } else if (type === 'firms') {
      const firms = await prisma.firm.findMany({
        orderBy: { firmCode: 'asc' },
        include: { area: true, _count: { select: { memberRecords: true } } },
      });
      csv = 'Firm Code,Firm Name,Area,Pincode,Address,Linked Families\n' +
        firms.map((f) => `"${f.firmCode}","${f.firmName}","${f.area.displayName}","${f.pincode}","${f.address.replace(/"/g, '""')}",${f._count.memberRecords}`).join('\n');
    } else if (type === 'members') {
      const members = await prisma.individualMember.findMany({
        orderBy: { familyRecord: { memberCode: 'asc' } },
        include: {
          parentalSurname: true,
          familyRecord: {
            include: { surname: true, firm: true },
          },
        },
      });
      csv = 'Member Code,Member Type,Family ID,Family Head,Surname,Firm,Member Name,DOB,Age,Gender,Mobile,Blood Group,Marital Status,Parental Surname\n' +
        members.map((m) => {
          const age = AgeCalculator.calculateAge(m.dob);
          return `"${m.familyRecord.memberCode}","${m.familyRecord.memberType}","${m.familyRecord.familyId}","${m.familyRecord.familyHeadName}","${m.familyRecord.surname.displayName}","${m.familyRecord.firm.firmName}","${m.name}","${m.dob.toISOString().split('T')[0]}",${age},"${m.gender}","${m.mobile}","${m.bloodGroup}","${m.maritalStatus}","${m.parentalSurname?.displayName || ''}"`;
        }).join('\n');
    } else if (type === 'receipts') {
      const receipts = await prisma.receipt.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { generatedAt: 'desc' },
        include: {
          receiptType: true,
          individualMember: { include: { familyRecord: { include: { firm: true } } } },
        },
      });
      csv = 'Receipt Number,Receipt Type,Member Name,Member Code,Family ID,Firm,Amount,Generated At\n' +
        receipts.map((r) => `"${r.receiptNumber}","${r.receiptType.name}","${r.individualMember.name}","${r.individualMember.familyRecord.memberCode}","${r.individualMember.familyRecord.familyId}","${r.individualMember.familyRecord.firm.firmName}",${Number(r.amount)},"${r.generatedAt.toISOString()}"`).join('\n');
    }

    await AuditService.log({
      userId,
      module: 'EXCEL_EXPORT',
      action: 'EXPORT',
      metadata: { type, filename },
    });

    return { filename, csv };
  }
}
