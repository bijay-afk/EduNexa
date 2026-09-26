import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Max requests allowed within the window for one actor (user or IP). */
  limit: number;
  /** Sliding window in milliseconds. */
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  limit: 120,
  windowMs: 60_000,
};

/**
 * Declare a per-route rate-limit policy. Applied on the handler; falls back to
 * controller-level metadata, then DEFAULT_RATE_LIMIT. Admins get an elevated
 * quota automatically (see RateLimitGuard).
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return SetMetadata(RATE_LIMIT_KEY, options);
}