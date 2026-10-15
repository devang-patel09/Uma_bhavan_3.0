import { z } from 'zod';

export const importTypeSchema = z.enum(['areas', 'surnames', 'firms', 'members']);

export const validateImportSchema = z.object({
  type: importTypeSchema,
  rows: z.array(z.record(z.any())).min(1, 'Import file must contain at least one data row'),
});

export const commitImportSchema = z.object({
  type: importTypeSchema,
  rows: z.array(z.record(z.any())).min(1, 'No valid records to commit'),
});

export type ImportType = z.infer<typeof importTypeSchema>;
export type ValidateImportInput = z.infer<typeof validateImportSchema>;
export type CommitImportInput = z.infer<typeof commitImportSchema>;
