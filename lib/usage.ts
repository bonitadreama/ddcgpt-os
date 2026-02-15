import { getEnv } from '@/lib/env';

export function enforceDailyCap(tokenEstimate: number) {
  const env = getEnv();
  if (tokenEstimate > env.DAILY_TOKEN_LIMIT) {
    throw new Error('Daily token cap exceeded for current plan.');
  }
}
