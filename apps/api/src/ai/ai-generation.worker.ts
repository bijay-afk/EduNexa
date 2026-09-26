import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { QUESTION_GENERATION_QUEUE } from './ai-queue.service';
import { AiGenerationService } from './ai-generation.service';
import type { PrismaService } from '../prisma/prisma.service';

interface QueueJobData {
  generationId: string;
  generator?: string;
}

interface QueueJob {
  data: QueueJobData;
}

/**
 * BullMQ worker (spec §16–§20) for the LLM generation path.
 *
 * - Concurrency is configurable via AI_CONCURRENCY (default 1 — one Ollama
 *   inference slot at a time; raise only after load tests).
 * - Retries/backoff come from the queue's default job options (3 attempts,
 *   exponential 2s).
 * - AI_JOB_TIMEOUT_MS guards against runaway/hung inference; exceed it and the
 *   job fails, is retried with backoff, then lands in FAILED.
 * - Generation state is driven here (QUEUED -> PROCESSING -> ... -> final by
 *   AiGenerationService).
 *
 * If Redis is unreachable the worker is not `available` and AiService falls
 * back to running generation synchronously in the request (dev convenience).
 */
@Injectable()
export class AiGenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationWorker.name);
  private worker?: Worker;
  private connection?: Redis;
  private warned = false;

  /** True once the Redis-backed worker is listening. */
  available = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly generationService: AiGenerationService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const concurrency = Math.max(this.config.get<number>('AI_CONCURRENCY') ?? 1, 1);
    const timeoutMs = this.config.get<number>('AI_JOB_TIMEOUT_MS') ?? 15 * 60 * 1000;

    let connection: Redis;
    try {
      connection = new Redis(url, { maxRetriesPerRequest: null, enableOfflineQueue: false });
    } catch (err) {
      this.logger.warn(`Redis unavailable (${String(err).slice(0, 80)}) — AI generation will run synchronously.`);
      return;
    }
    this.connection = connection;

    connection.on('ready', () => {
      this.available = true;
      this.logger.log(`AI worker online (concurrency=${concurrency}, timeout=${timeoutMs}ms)`);
    });
    connection.on('error', (err: Error) => {
      this.available = false;
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(
          `AI queue connection error (${err.message}). Generation will fall back to synchronous execution until Redis reconnects.`,
        );
      }
    });

    this.worker = new Worker(
      QUESTION_GENERATION_QUEUE,
      (job) => runQueueJob({ prisma: this.prisma, generationService: this.generationService }, job, timeoutMs),
      {
        connection,
        concurrency,
        // BullMQ marks jobs as stalled after lockDuration; a 15-minute LLM batch
        // must never be double-run, so the lock outlives the max timeout.
        lockDuration: timeoutMs + 60_000,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
    this.available = false;
  }
}

/**
 * Main queue-job body (kept side-effect-testable, independent of Redis).
 * Updates the generation to PROCESSING, runs the trusted pipeline with a
 * hard timeout, and on failure records a FAILED state with a friendly message
 * before letting BullMQ retry/backoff take over.
 */
export async function runQueueJob(
  deps: { prisma: Pick<PrismaService, 'aiGeneration'>; generationService: Pick<AiGenerationService, 'generate'> },
  job: QueueJob,
  timeoutMs: number,
): Promise<void> {
  const { generationId } = job.data;
  await deps.prisma.aiGeneration.update({
    where: { id: generationId },
    data: { state: 'PROCESSING' },
  });

  try {
    await withTimeout(deps.generationService.generate(generationId), timeoutMs);
  } catch (err) {
    const message = friendlyError(err);
    try {
      await deps.prisma.aiGeneration.update({
        where: { id: generationId },
        data: { state: 'FAILED', error: message },
      });
    } catch {
      // Best-effort audit; the throw below is what drives retries.
    }
    throw err;
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Generation job timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function friendlyError(err: unknown): string {
  const message = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Generation failed';
  if (/ollama|11434|ECONNREFUSED|fetch failed|socket hang up/i.test(message)) {
    return 'Ollama is not reachable. Start it with `ollama serve`, verify the model is pulled, then retry.';
  }
  return message.slice(0, 500);
}