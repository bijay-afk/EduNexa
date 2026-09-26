import { describe, expect, it } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@edunexa/types';
import { RateLimitGuard, resolveLimit } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimit, RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

function stubReflector(policies: Map<object, RateLimitOptions>): Reflector {
  return {
    get: (key: unknown, target: object) =>
      key === RATE_LIMIT_KEY ? policies.get(target) : undefined,
  } as unknown as Reflector;
}

function buildCtx(user?: { id: string; role: string }, headers: Record<string, string> = {}) {
  const handlerTarget = {};
  const req = { ip: '1.2.3.4', headers, user } as never;
  const res = { setHeader: () => undefined } as never;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => handlerTarget,
    getClass: () => {},
  } as never;
  return { ctx, handlerTarget };
}

describe('resolveLimit', () => {
  it('scales budgets up for administrator roles', () => {
    expect(resolveLimit(10, UserRole.STUDENT)).toBe(10);
    expect(resolveLimit(10, UserRole.TEACHER)).toBe(10);
    expect(resolveLimit(10, UserRole.ADMIN)).toBe(50);
    expect(resolveLimit(10, UserRole.SUPER_ADMIN)).toBe(200);
  });
});

describe('RateLimitGuard', () => {
  it('allows requests under the default policy', () => {
    const guard = new RateLimitGuard(new RateLimiterService(), stubReflector(new Map()));
    expect(guard.canActivate(buildCtx().ctx)).toBe(true);
  });

  it('throws 429 once an authenticated actor exhausts the configured quota', () => {
    const policies = new Map<object, RateLimitOptions>();
    const guard = new RateLimitGuard(new RateLimiterService(), stubReflector(policies));
    const { ctx: actor, handlerTarget } = buildCtx({ id: 'u1', role: 'TEACHER' });
    policies.set(handlerTarget, { limit: 2, windowMs: 60_000 });

    expect(guard.canActivate(actor)).toBe(true);
    expect(guard.canActivate(actor)).toBe(true);
    expect(() => guard.canActivate(actor)).toThrowError(/rate limit/i);
  });

  it('reads @RateLimit via the real decorator and reflector', () => {
    class Test {
      @RateLimit({ limit: 1, windowMs: 60_000 })
      handler() {}
    }
    const guard = new RateLimitGuard(new RateLimiterService(), new Reflector());
    const decorated = Test.prototype.handler;
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '1.2.3.4', headers: {}, user: { id: 'u2', role: 'TEACHER' } }),
        getResponse: () => ({ setHeader: () => undefined }),
      }),
      getHandler: () => decorated,
      getClass: () => Test.prototype,
    } as never;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('keys public traffic by client IP', () => {
    const policies = new Map<object, RateLimitOptions>();
    const guard = new RateLimitGuard(new RateLimiterService(), stubReflector(policies));
    const { ctx: first, handlerTarget } = buildCtx();
    policies.set(handlerTarget, { limit: 1, windowMs: 60_000 });

    expect(guard.canActivate(first)).toBe(true);
    expect(() => guard.canActivate(first)).toThrow(HttpException);
    // A different IP is unaffected.
    expect(guard.canActivate(buildCtx(undefined, { 'x-forwarded-for': '9.9.9.9' }).ctx)).toBe(true);
  });

  it('reports 429 TOO_MANY_REQUESTS for an exhausted actor', () => {
    const policies = new Map<object, RateLimitOptions>();
    const guard = new RateLimitGuard(new RateLimiterService(), stubReflector(policies));
    const { ctx: actor, handlerTarget } = buildCtx({ id: 'u3', role: 'STUDENT' });
    policies.set(handlerTarget, { limit: 0, windowMs: 60_000 });

    let status = 0;
    try {
      guard.canActivate(actor);
    } catch (e) {
      status = (e as HttpException).getStatus();
    }
    expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('falls back to the default policy when no metadata exists', () => {
    const guard = new RateLimitGuard(new RateLimiterService(), stubReflector(new Map()));
    expect(() => guard.canActivate(buildCtx().ctx)).not.toThrow();
  });
});