import { z } from 'zod';

export const generateReceiptSchema = z.object({
  individualMemberId: z.string().uuid('Valid Individual Member ID is required'),
  receiptTypeId: z.string().uuid('Valid Receipt Type ID is required'),
  periodType: z.enum(['MONTHLY', 'YEARLY']).default('YEARLY'),
  periodYear: z.coerce.number().int().min(2000).max(2100).default(2026),
  periodMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  amount: z.coerce.number().positive('Receipt amount must be greater than 0').optional(),
  customDate: z.string().optional(),
});

export const validateEligibilitySchema = z.object({
  individualMemberId: z.string().uuid('Valid Individual Member ID is required'),
  receiptTypeId: z.string().uuid('Valid Receipt Type ID is required'),
  periodType: z.enum(['MONTHLY', 'YEARLY']).optional().default('YEARLY'),
  periodYear: z.coerce.number().int().min(2000).max(2100).optional().default(2026),
  periodMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
});

export const batchReceiptSchema = z.object({
  receiptTypeName: z.enum(['Samaj', 'Yuvak Mandal']),
  periodType: z.enum(['MONTHLY', 'YEARLY']),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  // Optional override for custom member exclusion/selection
  excludedMemberIds: z.array(z.string().uuid()).optional().default([]),
});

export const receiptConfigUpdateSchema = z.object({
  yuvakMandalUpperAge: z.coerce.number().int().min(18).max(100).optional(),
  samajMonthlyAmount: z.coerce.number().positive().optional(),
  samajYearlyAmount: z.coerce.number().positive().optional(),
  yuvakMonthlyAmount: z.coerce.number().positive().optional(),
  yuvakYearlyAmount: z.coerce.number().positive().optional(),
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
export type BatchReceiptInput = z.infer<typeof batchReceiptSchema>;
export type ReceiptConfigUpdateInput = z.infer<typeof receiptConfigUpdateSchema>;
export type NiyariFilterInput = z.infer<typeof niyariFilterSchema>;

