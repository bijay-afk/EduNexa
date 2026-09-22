import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';
import { API_PREFIX } from '@class10/config';

// Requires Postgres + Redis. Provisioned in CI via services; skip locally when absent.
const hasDb = !!process.env.DATABASE_URL;
const hasRedis = !!process.env.REDIS_URL;

describe.skipIf(!hasDb || !hasRedis)('Health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/health`).expect(200);
    expect(res.body.data).toEqual({ status: 'ok', uptime: expect.any(Number) });
  });

  it('GET /ready reports ready when db + redis respond', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/ready`).expect(200);
    expect(res.body.data.ready).toBe(true);
    expect(res.body.data.checks.database).toBe('ok');
    expect(res.body.data.checks.redis).toBe('ok');
  });

  it('uses the standard error envelope for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get(`${API_PREFIX}/does-not-exist`).expect(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});