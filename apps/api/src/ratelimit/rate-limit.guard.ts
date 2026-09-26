import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimiterService } from './rate-limiter.service';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator';
import type { UserRole } from '@edunexa/types';

/**
 * Route-level rate-limit guard. Policy comes from the nearest @RateLimit:
 *
 *   handler metadata → controller metadata → DEFAULT_RATE_LIMIT.
 *
 * Actors are keyed as `role:id` for authenticated requests and `ip:{ip}` for
 * public routes (login/register counters abuse). Admins get an elevated budget
 * via resolveLimit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string; role: UserRole } }>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const options: RateLimitOptions =
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, handler) ??
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, controller) ??
      DEFAULT_RATE_LIMIT;

    const user = request.user;
    const key = user ? `${user.role.toLowerCase()}:${user.id}` : `ip:${clientIp(request)}`;
    const result = this.limiter.tryConsume(key, resolveLimit(options.limit, user?.role), options.windowMs);

    if (!result.allowed) {
      const res = context.switchToHttp().getResponse<void & { setHeader(k: string, v: string): void }>();
      res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      throw new HttpException(
        { message: `Rate limit exceeded for this route. Try again in ${Math.ceil(result.retryAfterMs / 1000)}s.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

/** Elevated budget for privileged roles; the base quota stays on standard users. */
export function resolveLimit(base: number, role?: UserRole): number {
  if (role === 'SUPER_ADMIN') return base * 20;
  if (role === 'ADMIN') return base * 5;
  return base;
}

function clientIp(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return request.ip ?? 'unknown';
}