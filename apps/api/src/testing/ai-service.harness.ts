import { vi } from 'vitest';
import { AiService } from '../ai/ai.service';
import type { AiQueueService } from '../ai/ai-queue.service';
import type { PrismaService } from '../prisma/prisma.service';

export const prismaMock = {
  curriculum: { findUnique: vi.fn() },
  grade: { findUnique: vi.fn() },
  topic: { count: vi.fn() },
  aiGeneration: {
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findUnique: vi.fn(),
  },
};

const queueMock = {
  queue: { add: vi.fn() },
};

export class AiServiceHarness {
  readonly service: AiService;

  constructor() {
    prismaMock.aiGeneration.create.mockResolvedValue({ id: 'gen-1' });
    prismaMock.aiGeneration.update.mockResolvedValue({ id: 'gen-1' });
    prismaMock.aiGeneration.findUniqueOrThrow.mockResolvedValue({
      id: 'gen-1',
      state: 'QUEUED',
      queueJobId: 'job-1',
      config: {},
    });
    queueMock.queue.add.mockResolvedValue({ id: 'job-1' });
    this.service = new AiService(
      prismaMock as unknown as PrismaService,
      queueMock as unknown as AiQueueService,
    );
  }
}