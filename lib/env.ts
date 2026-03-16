import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),
  DAILY_TOKEN_LIMIT: z.coerce.number().default(100000),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.coerce.boolean().default(true),
});

const env = envSchema.safeParse(process.env);

export function getEnv() {
  if (!env.success) {
    throw new Error(`Invalid environment variables: ${env.error.message}`);
  }

  return env.data;
}

export function assertSupabaseEnv() {
  const current = getEnv();
  if (!current.NEXT_PUBLIC_SUPABASE_URL || !current.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return current;
}
