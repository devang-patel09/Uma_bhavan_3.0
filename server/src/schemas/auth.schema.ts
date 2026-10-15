import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().optional().default(false),
});

export const recoveryCodeVerifySchema = z.object({
  username: z.string().trim().min(3, 'Username is required'),
  recoveryCode: z.string().trim().min(6, 'Valid recovery code is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const passwordResetRequestSchema = z.object({
  username: z.string().trim().min(3, 'Username is required'),
});

export const passwordResetVerifySchema = z.object({
  username: z.string().trim().min(3, 'Username is required'),
  otp: z.string().trim().min(4, 'Valid OTP is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RecoveryCodeVerifyInput = z.infer<typeof recoveryCodeVerifySchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetVerifyInput = z.infer<typeof passwordResetVerifySchema>;
