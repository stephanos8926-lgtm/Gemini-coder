import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  ADMIN_SECRET_KEY: z.string().min(1, 'ADMIN_SECRET_KEY is required').default('rapidforge-admin-secret-123'),
  CSRF_SECRET: z.string().min(1, 'CSRF_SECRET is required').default('rapidforge-csrf-secret-456'),
  // Add other required env vars here
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.issues, null, 2));
  process.exit(1);
}

export const env = _env.data;
