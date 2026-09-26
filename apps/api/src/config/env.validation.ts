import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().startsWith('postgresql://').or(z.string().startsWith('postgres://')),
  REDIS_URL: z
    .string()
    .min(1)
    .default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'ollama']).default('openai'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_CHAT_BASE_URL: z.string().optional(),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_EMBEDDING_BASE_URL: z.string().optional(),
  // Production queue (BullMQ) controls for the LLM generation worker.
  // Concurrency stays at 1 on Ollama so a single CPU GPU/CPU box is not
  // thrashed; raise carefully after load tests (spec §17).
  AI_CONCURRENCY: z.coerce.number().int().min(1).default(1),
  AI_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AI_MAX_QUESTIONS_PER_GENERATION: z.coerce.number().int().min(1).default(20),
  // Dev convenience only: when Redis is down, fall back to running LLM
  // generation synchronously in the request. Set false in production so AI
  // requests fail safely (503) instead of flooding Ollama with in-process
  // calls the queue was meant to serialize (spec §11, §40).
  AI_SYNC_FALLBACK: z.enum(['true', 'false']).default('true'),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  return parsed.data;
}