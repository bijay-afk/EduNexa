import { vi } from 'vitest';
import { AiService } from '../ai/ai.service';
import { AiGenerationProcessor } from '../ai/ai-generation.processor';
import type { AiQueueService } from '../ai/ai-queue.service';
import type { PrismaService } from '../prisma/prisma.service';

export const prismaMock = {
  curriculum: { findUnique: vi.fn() },
  grade: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn() },
  topic: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  chapter: { findMany: vi.fn() },
  paperArchive: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  question: { create: vi.fn() },
  aiGenerationItem: { create: vi.fn() },
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
  readonly processor: AiGenerationProcessor;

  constructor() {
    prismaMock.aiGeneration.create.mockResolvedValue({ id: 'gen-1' });
    prismaMock.aiGeneration.update.mockResolvedValue({ id: 'gen-1' });
    prismaMock.aiGeneration.findUniqueOrThrow.mockResolvedValue({
      id: 'gen-1',
      state: 'QUEUED',
      queueJobId: 'job-1',
      config: {
        archiveSubject: 'Mathematics',
        archiveExamTypes: ['PAST', 'MODEL'],
        subjectId: 'sub-1',
        count: 10,
        totalMarks: 10,
        marks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        autoAllocateMarks: true,
        preferExactCount: true,
      },
      teacherId: 'teacher-1',
    });
    prismaMock.aiGeneration.findUnique.mockResolvedValue({
      id: 'gen-1',
      state: 'COMPLETED',
      resultCount: 5,
      createdAt: new Date(),
      error: null,
      provider: null,
      model: null,
      items: [],
    });
    queueMock.queue.add.mockResolvedValue({ id: 'job-1' });
    prismaMock.subject.findUnique.mockResolvedValue({ id: 'sub-1', name: 'Mathematics' });
    prismaMock.paperArchive.findMany.mockResolvedValue([
      { id: 'paper-1', pages: [{ id: 'page-1', ocrText: '1. Factorise x2 - 9' }] },
    ]);
    prismaMock.question.create.mockResolvedValue({ id: 'q-1' });
    prismaMock.aiGenerationItem.create.mockResolvedValue({ id: 'item-1' });

    this.processor = new AiGenerationProcessor(prismaMock as unknown as PrismaService);
    this.service = new AiService(
      prismaMock as unknown as PrismaService,
      queueMock as unknown as AiQueueService,
      this.processor,
    );
  }
}