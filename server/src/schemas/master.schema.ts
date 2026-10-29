import { z } from 'zod';

export const createAreaSchema = z.object({
  name: z.string().trim().min(2, 'Area name must be at least 2 characters long'),
});

export const createSubAreaSchema = z.object({
  name: z.string().trim().min(2, 'Sub-area name must be at least 2 characters long'),
});

export const createSurnameSchema = z.object({
  name: z.string().trim().min(2, 'Surname must be at least 2 characters long'),
});

export const createFirmSchema = z.object({
  firmName: z.string().trim().min(2, 'Firm name must be at least 2 characters long'),
  firmType: z.enum(['PERMANENT', 'NOMINAL']).default('PERMANENT'),
  familyHeadName: z.string().trim().optional().default(''),
  areaId: z.string().uuid('Valid Area ID is required'),
  subAreaId: z.string().uuid('Valid Sub-Area ID is required').optional().nullable(),
  pincode: z.string().trim().min(6, 'Valid 6-digit Pincode is required').default('388001'),
  address: z.string().trim().min(3, 'Firm address is required'),
});

export const updateFirmSchema = z.object({
  firmName: z.string().trim().min(2, 'Firm name must be at least 2 characters long').optional(),
  firmType: z.enum(['PERMANENT', 'NOMINAL']).optional(),
  familyHeadName: z.string().trim().optional(),
  areaId: z.string().uuid('Valid Area ID is required').optional(),
  subAreaId: z.string().uuid('Valid Sub-Area ID is required').optional().nullable(),
  pincode: z.string().trim().min(6, 'Valid 6-digit Pincode is required').optional(),
  address: z.string().trim().min(3, 'Firm address is required').optional(),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type CreateSubAreaInput = z.infer<typeof createSubAreaSchema>;
export type CreateSurnameInput = z.infer<typeof createSurnameSchema>;
export type CreateFirmInput = z.infer<typeof createFirmSchema>;
export type UpdateFirmInput = z.infer<typeof updateFirmSchema>;

