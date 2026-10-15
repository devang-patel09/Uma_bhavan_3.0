import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional().default('mysql://root:password@localhost:3306/uma_bhavan_dev'),
  JWT_SECRET: z.string().default('default-dev-secret-key-change-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('72h'),
  COOKIE_SECRET: z.string().default('default-cookie-secret-key'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /**
   * AES-256-CBC key for backup file encryption.
   * Min 16 chars. Required for backup/restore operations.
   * Generate with: openssl rand -hex 32
   */
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
