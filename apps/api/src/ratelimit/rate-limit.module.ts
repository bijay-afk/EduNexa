import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * In-memory sliding-window rate limiting (spec §35). Guard targets the routes
 * that matter: auth, AI generation, question submission, expensive searches.
 */
@Global()
@Module({
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}