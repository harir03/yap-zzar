import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  RAZORPAY_KEY_ID: z.string().default('rzp_test_demo'),
  RAZORPAY_KEY_SECRET: z.string().default('demo_secret'),

  OPENWA_URL: z.string().default('http://localhost:2785'),
  OPENWA_API_KEY: z.string().default(''),
  OPENWA_SESSION: z.string().default('yap-zzar'),

  GEMINI_API_KEY: z.string().default(''),
  YOUTUBE_API_KEY: z.string().default(''),

  DATABASE_PATH: z.string().default('./data/yap-zzar.sqlite'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
