import { HttpException, HttpStatus, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

/**
 * Nullable 429 helper so guards can set Retry-After before the request dies.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * In-memory sliding-window rate limiter. Intentionally zero-dependency and
 * single-instance friendly — the production deployment is one NestJS instance
 * behind a single queue worker (spec §35). Buckets are keyed by an opaque
 * actor string (e.g. `ip:${ip}` or `teacher:${userId}`).
 *
 * Distributed deployments should swap this for Redis-backed counters; the
 * guard interface stays identical.
 */
@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, number[]>();
  private readonly sweep: NodeJS.Timeout;

  constructor(private readonly now: () => number = Date.now) {
    // Old, empty buckets are deleted so an idle key never leaks memory.
    this.sweep = setInterval(() => this.sweepExpired(now()), 5 * 60 * 1000);
    this.sweep.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweep);
  }

  /**
   * Attempt to consume one request for `key`. Throws a 429 HttpException when
   * the window is exhausted (with Retry-After surfaced on the exception).
   */
  consume(key: string, limit: number, windowMs: number): void {
    const result = this.tryConsume(key, limit, windowMs);
    if (!result.allowed) {
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `Rate limit exceeded — slow down`, retryAfterMs: result.retryAfterMs },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Non-throwing variant (unit-tested directly). */
  tryConsume(key: string, limit: number, windowMs: number): RateLimitResult {
    if (limit <= 0) return { allowed: false, retryAfterMs: windowMs };

    const timestamp = this.now();
    const cutoff = timestamp - windowMs;
    const prev = this.buckets.get(key);
    const kept = (prev ?? []).filter((t) => t >= cutoff);

    if (kept.length >= limit) {
      this.buckets.set(key, kept);
      const oldest = kept[0];
      return { allowed: false, retryAfterMs: Math.max(oldest + windowMs - timestamp, 0) };
    }

    kept.push(timestamp);
    this.buckets.set(key, kept);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Reset an actor's budget (e.g. after a successful login). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Test/support helper: current outstanding count for a key. */
  peek(key: string): number {
    return this.buckets.get(key)?.length ?? 0;
  }

  private sweepExpired(now: number): void {
    for (const [key, stamps] of this.buckets) {
      const live = stamps.filter((t) => now - t < 5 * 60 * 1000);
      if (live.length === 0) this.buckets.delete(key);
      else this.buckets.set(key, live);
    }
  }
}