import { z } from 'zod';

export const generateReceiptSchema = z.object({
  individualMemberId: z.string().uuid('Valid Individual Member ID is required'),
  receiptTypeId: z.string().uuid('Valid Receipt Type ID is required'),
  amount: z.coerce.number().positive('Receipt amount must be greater than 0'),
  customDate: z.string().optional(),
});

export const validateEligibilitySchema = z.object({
  individualMemberId: z.string().uuid('Valid Individual Member ID is required'),
  receiptTypeId: z.string().uuid('Valid Receipt Type ID is required'),
});

export const niyariFilterSchema = z.object({
  surnameId: z.string().uuid().optional().or(z.literal('')),
  areaId: z.string().uuid().optional().or(z.literal('')),
  firmId: z.string().uuid().optional().or(z.literal('')),
  maritalStatus: z.enum(['MARRIED', 'UNMARRIED']).optional(),
  memberType: z.enum(['PERMANENT', 'NOMINAL']).optional(),
  minAge: z.coerce.number().min(0).optional(),
  maxAge: z.coerce.number().max(120).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
});

export type GenerateReceiptInput = z.infer<typeof generateReceiptSchema>;
export type ValidateEligibilityInput = z.infer<typeof validateEligibilitySchema>;
export type NiyariFilterInput = z.infer<typeof niyariFilterSchema>;
