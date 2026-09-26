import { vi } from 'vitest';
import { AiService } from '../ai/ai.service';
import { AiGenerationProcessor } from '../ai/ai-generation.processor';
import type { AiGenerationWorker } from '../ai/ai-generation.worker';
import type { AiGenerationService } from '../ai/ai-generation.service';
import type { AiQueueService } from '../ai/ai-queue.service';
import type { PrismaService } from '../prisma/prisma.service';

export const prismaMock = {
  curriculum: { findUnique: vi.fn() },
  grade: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn(), findMany: vi.fn() },
  topic: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  chapter: { findMany: vi.fn() },
  paperArchive: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  question: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  questionBank: { upsert: vi.fn() },
  questionBankItem: { findUnique: vi.fn(), create: vi.fn() },
  aiGenerationItem: { create: vi.fn() },
  aiGeneration: {
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
};

export const queueMock = {
  queue: { add: vi.fn() },
};

export const workerMock: Pick<AiGenerationWorker, 'available'> = {
  available: false,
};

export const generationServiceMock = {
  generate: vi.fn(),
};

export class AiServiceHarness {
  readonly service: AiService;
  readonly processor: AiGenerationProcessor;
  readonly generationService: AiGenerationService;

  constructor(options: { workerAvailable?: boolean } = {}) {
    prismaMock.aiGeneration.create.mockResolvedValue({ id: 'gen-1', state: 'QUEUED' });
    prismaMock.aiGeneration.update.mockResolvedValue({ id: 'gen-1' });
    prismaMock.aiGeneration.count.mockResolvedValue(0);
    workerMock.available = options.workerAvailable ?? false;
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
      status: 'LLM',
      resultCount: 5,
      createdAt: new Date(),
      error: null,
      provider: 'openai',
      model: 'gpt-4o-mini',
      curriculumCode: 'NEP-GRADE10',
      items: [],
    });
    prismaMock.aiGeneration.findMany.mockResolvedValue([]);
    queueMock.queue.add.mockResolvedValue({ id: 'job-1' });
    prismaMock.subject.findUnique.mockResolvedValue({ id: 'sub-1', name: 'Mathematics' });
    prismaMock.paperArchive.findMany.mockResolvedValue([
      { id: 'paper-1', pages: [{ id: 'page-1', ocrText: '1. Factorise x2 - 9' }] },
    ]);
    prismaMock.question.create.mockResolvedValue({ id: 'q-1' });
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.questionBank.upsert.mockResolvedValue({ id: 'bank-1', ownerId: 'teacher-1' });
    prismaMock.questionBankItem.findUnique.mockResolvedValue(null);
    prismaMock.questionBankItem.create.mockResolvedValue({ id: 'b-item-1' });
    prismaMock.aiGenerationItem.create.mockResolvedValue({ id: 'item-1' });
    prismaMock.question.update.mockResolvedValue({ id: 'q-1' });
    generationServiceMock.generate.mockResolvedValue(undefined);

    this.processor = new AiGenerationProcessor(prismaMock as unknown as PrismaService);
    this.generationService = generationServiceMock as unknown as AiGenerationService;
    this.service = new AiService(
      prismaMock as unknown as PrismaService,
      queueMock as unknown as AiQueueService,
      this.processor,
      this.generationService,
      workerMock as unknown as AiGenerationWorker,
    );
  }
}