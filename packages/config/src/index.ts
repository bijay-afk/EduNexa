/**
 * Shared env schema (spec §65). Apps parse their OWN env with this as the base.
 * No secrets are ever logged or committed.
 */
export const envSchema = {
  NODE_ENV: ['development', 'test', 'staging', 'production'] as const,
  DATABASE_URL: 'postgresql://user:pass@host:5432/db?schema=public',
  REDIS_URL: 'redis://localhost:6379',
} as const;

export const envVarsSchema = {
  NODE_ENV: { default: 'development' },
};

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const API_PREFIX = '/api/v1';
export const PORT = 3100;
export const BCRYPT_ROUNDS = 12;
export const SESSION_COOKIE = 'edunexa_session';
