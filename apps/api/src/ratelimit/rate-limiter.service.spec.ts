import { describe, expect, it, vi } from 'vitest';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService (sliding window)', () => {
  it('allows requests up to the limit within the window', () => {
    const clock = { t: 1000 };
    const limiter = new RateLimiterService(() => clock.t);

    expect(limiter.tryConsume('ip:1.2.3.4', 3, 10_000)).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(limiter.tryConsume('ip:1.2.3.4', 3, 10_000)).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(limiter.tryConsume('ip:1.2.3.4', 3, 10_000)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it('blocks once the window is exhausted and reports Retry-After', () => {
    const clock = { t: 1000 };
    const limiter = new RateLimiterService(() => clock.t);
    const opts = { limit: 2, windowMs: 10_000 };

    limiter.tryConsume('ip:9.9.9.9', opts.limit, opts.windowMs);
    limiter.tryConsume('ip:9.9.9.9', opts.limit, opts.windowMs);
    const blocked = limiter.tryConsume('ip:9.9.9.9', opts.limit, opts.windowMs);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('is a sliding window: old hits expire and allow again', () => {
    const clock = { t: 0 };
    const limiter = new RateLimiterService(() => clock.t);

    limiter.tryConsume('user:a', 1, 5_000);
    expect(limiter.tryConsume('user:a', 1, 5_000).allowed).toBe(false);

    clock.t = 5_001;
    expect(limiter.tryConsume('user:a', 1, 5_000).allowed).toBe(true);
  });

  it('keys actors independently', () => {
    const limiter = new RateLimiterService();
    limiter.tryConsume('ip:a', 1, 60_000);
    expect(limiter.tryConsume('ip:b', 1, 60_000).allowed).toBe(true);
  });

  it('consume() throws a 429 for exhausted keys', () => {
    const clock = { t: 0 };
    const limiter = new RateLimiterService(() => clock.t);
    limiter.tryConsume('k', 1, 60_000);

    expect(() => limiter.consume('k', 1, 60_000)).toThrowError(/rate limit/i);
  });

  it('reset() clears the budget', () => {
    const clock = { t: 0 };
    const limiter = new RateLimiterService(() => clock.t);
    limiter.tryConsume('k', 1, 60_000);
    limiter.reset('k');
    expect(limiter.tryConsume('k', 1, 60_000).allowed).toBe(true);
    expect(limiter.peek('k')).toBe(1);
  });

  it('clears the sweep interval on destroy', () => {
    const limiter = new RateLimiterService();
    const spy = vi.spyOn(global, 'clearInterval');
    limiter.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
  });
});