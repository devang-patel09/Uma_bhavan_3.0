import { z } from 'zod';

export const individualMemberInputSchema = z.object({
  name: z.string().trim().min(2, 'Member name must be at least 2 characters long'),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid Date of Birth is required'),
  gender: z.enum(['MALE', 'FEMALE'], { required_error: 'Gender is required' }),
  mobile: z.string().trim().min(10, 'Valid 10-digit mobile number is required'),
  bloodGroup: z
    .enum([
      'A_POSITIVE',
      'A_NEGATIVE',
      'B_POSITIVE',
      'B_NEGATIVE',
      'AB_POSITIVE',
      'AB_NEGATIVE',
      'O_POSITIVE',
      'O_NEGATIVE',
      'UNKNOWN',
    ])
    .default('UNKNOWN'),
  maritalStatus: z.enum(['MARRIED', 'UNMARRIED']).default('UNMARRIED'),
  parentalSurnameId: z.string().uuid('Valid parental surname ID is required').optional().nullable(),
  allowDuplicate: z.boolean().optional().default(false),
});

export const updateIndividualMemberSchema = individualMemberInputSchema.partial();


export const createFamilySchema = z.object({
  memberType: z.enum(['PERMANENT', 'NOMINAL']).optional(),
  familyId: z.string().trim().min(2, 'Unique Family ID is required'),
  familyHeadName: z.string().trim().min(2, 'Family Head Name is required'),
  surnameId: z.string().uuid('Valid Surname ID is required'),
  firmId: z.string().uuid('Valid Firm ID is required'),
  homeAddress: z.string().trim().min(3, 'Home Address is required'),
  members: z.array(individualMemberInputSchema).optional().default([]),
});

export const updateFamilySchema = z.object({
  familyHeadName: z.string().trim().min(2, 'Family Head Name is required').optional(),
  surnameId: z.string().uuid('Valid Surname ID is required').optional(),
  firmId: z.string().uuid('Valid Firm ID is required').optional(),
  homeAddress: z.string().trim().min(3, 'Home Address is required').optional(),
});

export const migrateFamilySchema = z.object({
  migrationType: z.enum(['EXISTING_FIRM', 'NEW_FIRM']).default('EXISTING_FIRM'),
  destinationFirmId: z.string().uuid().optional(),
  targetFamilyRecordId: z.string().uuid().optional(),
  destinationFamilyId: z.string().trim().optional(),
  destinationFamilyHeadName: z.string().trim().optional(),
  destinationHomeAddress: z.string().trim().optional(),
  newFirm: z
    .object({
      firmName: z.string().trim().min(2, 'Firm name must be at least 2 characters long'),
      firmType: z.enum(['PERMANENT', 'NOMINAL']).default('PERMANENT'),
      familyHeadName: z.string().trim().min(2, 'Family head name is required'),
      areaId: z.string().uuid('Valid Area ID is required'),
      subAreaId: z.string().uuid().optional().nullable(),
      pincode: z.string().trim().min(6).default('388001'),
      address: z.string().trim().min(3, 'Firm address is required'),
    })
    .optional(),
  migratingMemberIds: z.array(z.string().uuid()).min(1, 'Select at least one member to migrate'),
});

export type IndividualMemberInput = z.infer<typeof individualMemberInputSchema>;
export type UpdateIndividualMemberInput = z.infer<typeof updateIndividualMemberSchema>;
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type MigrateFamilyInput = z.infer<typeof migrateFamilySchema>;

