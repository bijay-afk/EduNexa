import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }
    try {
      const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        lazyConnect: true,
      });
      await redis.connect();
      await redis.ping();
      checks.redis = 'ok';
      redis.disconnect();
    } catch {
      checks.redis = 'down';
    }
    const ready = Object.values(checks).every((v) => v === 'ok');
    return { ready, checks };
  }
}