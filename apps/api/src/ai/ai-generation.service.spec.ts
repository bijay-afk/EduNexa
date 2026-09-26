import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiGenerationService } from './ai-generation.service';
import type { RetrievalService, RetrievedSource } from './retrieval.service';
import type { LlmProvider } from './providers/llm-provider';
import type { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  topic: { findMany: vi.fn() },
  subject: { findUnique: vi.fn() },
  aiGeneration: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  aiGenerationItem: { create: vi.fn() },
  question: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  questionBank: { upsert: vi.fn() },
  questionBankItem: { findUnique: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
};

const retrievalMock = {
  retrieve: vi.fn(),
  retrieveByVector: vi.fn(),
};

const llmMock = {
  isConfigured: false,
  model: 'gpt-4o-mini',
  completeJson: vi.fn(),
  embedTexts: vi.fn(),
};

const GENERATION = {
  id: 'gen-1',
  teacherId: 'teacher-1',
  state: 'QUEUED',
  provider: null,
  model: null,
  curriculumCode: null,
  config: {
    source: 'CURRICULUM',
    subjectId: 'sub-1',
    curriculumId: 'cur-1',
    curriculumCode: 'NEP-10',
    curriculumName: 'Nepal Grade 10 Curriculum',
    gradeId: 'g-1',
    topicIds: ['topic-1'],
    count: 1,
    totalMarks: 2,
    marks: [2],
    autoAllocateMarks: true,
  },
};

const DTO = {
  questionType: 'SHORT_ANSWER',
  question: { content: 'Factorise the quadratic expression x2 - 5x + 6.' },
  correctAnswer: ['(x - 2)(x - 3)'],
  explanation: 'The expression factors as (x - 2)(x - 3).',
  difficulty: 'MEDIUM',
  marks: 2,
  sourceReferences: [],
};

function makeService() {
  return new AiGenerationService(
    prismaMock as unknown as PrismaService,
    retrievalMock as unknown as RetrievalService,
    llmMock as unknown as LlmProvider,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.aiGeneration.findUniqueOrThrow.mockResolvedValue(GENERATION);
  prismaMock.topic.findMany.mockResolvedValue([
    { id: 'topic-1', name: 'Quadratic Equations', chapterId: 'ch-1', chapter: { name: 'Algebra' } },
  ]);
  prismaMock.subject.findUnique.mockResolvedValue({ name: 'Mathematics' });
  prismaMock.question.create.mockResolvedValue({ id: 'q-1' });
  prismaMock.question.findMany.mockResolvedValue([]);
  prismaMock.question.update.mockResolvedValue({ id: 'q-1' });
  prismaMock.questionBank.upsert.mockResolvedValue({ id: 'bank-1', ownerId: 'teacher-1' });
  prismaMock.questionBankItem.findUnique.mockResolvedValue(null);
  prismaMock.questionBankItem.create.mockResolvedValue({ id: 'bank-item-1' });
  prismaMock.aiGenerationItem.create.mockResolvedValue({ id: 'item-1' });
  prismaMock.aiGeneration.update.mockResolvedValue({ id: 'gen-1' });
  prismaMock.auditLog.create.mockResolvedValue({ id: 'log-1' });
  retrievalMock.retrieve.mockResolvedValue([]);
  retrievalMock.retrieveByVector.mockResolvedValue([]);
  llmMock.isConfigured = false;
  llmMock.completeJson.mockResolvedValue({ json: DTO, promptTokens: 9, completionTokens: 4 });
});

describe('AiGenerationService.generate — happy path', () => {
  it('persists the question as PENDING_REVIEW with AI provenance + audit', async () => {
    await makeService().generate('gen-1');

    expect(prismaMock.question.create).toHaveBeenCalledTimes(1);
    const createData = (prismaMock.question.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .data;
    expect(createData.status).toBe('PENDING_REVIEW');
    expect(createData.ownerId).toBe('teacher-1');
    expect(createData.topicId).toBe('topic-1');
    expect(createData.marks).toBe(2);
    expect(createData.sourceRefs.sourceType).toBe('AI_GENERATED');
    expect(createData.sourceRefs.curriculum).toMatchObject({
      curriculumCode: 'NEP-10',
      chapterId: 'ch-1',
      topicId: 'topic-1',
    });
    expect(createData.sourceRefs.model).toBe('gpt-4o-mini');
    expect(createData.sourceRefs.validation.structured.ok).toBe(true);

    expect(prismaMock.aiGenerationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generationId: 'gen-1',
          questionId: 'q-1',
          state: 'COMPLETED',
          promptTokens: 9,
          completionTokens: 4,
          validation: expect.objectContaining({ structured: { ok: true } }),
        }),
      }),
    );

    expect(prismaMock.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceRefs: expect.objectContaining({ aiGenerationItemId: 'item-1' }),
        }),
      }),
    );

    expect(prismaMock.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: 'COMPLETED',
          resultCount: 1,
          status: 'LLM',
          curriculumCode: 'NEP-10',
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'question_generation.completed',
          entityId: 'gen-1',
          meta: expect.objectContaining({ created: 1, failed: 0, state: 'COMPLETED' }),
        }),
      }),
    );
  });
});

describe('AiGenerationService.generate — validation gate', () => {
  it('rejects malformed LLM JSON without creating a question (PARTIAL/FAILED)', async () => {
    llmMock.completeJson.mockResolvedValue({ json: { unexpected: 'shape' }, promptTokens: 1, completionTokens: 1 });

    await makeService().generate('gen-1');

    expect(prismaMock.question.create).not.toHaveBeenCalled();
    expect(prismaMock.aiGenerationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'PARTIAL', validationErrors: expect.anything() }),
      }),
    );
    expect(prismaMock.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'FAILED', resultCount: 0 }) }),
    );
  });

  it('flags a curriculum mismatch: model-referenced topic must match the requested topic', async () => {
    llmMock.completeJson.mockResolvedValue({
      json: { ...DTO, sourceReferences: [{ type: 'CURRICULUM', topicId: 'topic-999' }] },
      promptTokens: 1,
      completionTokens: 1,
    });

    await makeService().generate('gen-1');

    expect(prismaMock.question.create).not.toHaveBeenCalled();
    const itemData = (prismaMock.aiGenerationItem.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].data;
    expect(itemData.state).toBe('PARTIAL');
    expect(itemData.validation.curriculum.valid).toBe(false);
  });

  it('never auto-approves: even a valid duplicate is parked PENDING_REVIEW with a flag', async () => {
    prismaMock.question.findMany.mockResolvedValue([{ id: 'existing-1', content: 'factorise the quadratic expression x2-5x+6' }]);

    await makeService().generate('gen-1');

    expect(prismaMock.question.create).toHaveBeenCalledTimes(1);
    const createData = (prismaMock.question.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .data;
    expect(createData.status).toBe('PENDING_REVIEW');
    expect(createData.sourceRefs.validation.duplicate.found).toBe(true);
    expect(createData.sourceRefs.validation.duplicate.matchedQuestionId).toBe('existing-1');
    expect(prismaMock.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'COMPLETED' }) }),
    );
  });

  it('survives an LLM outage: records a FAILED item and finishes without hanging the run', async () => {
    llmMock.completeJson.mockRejectedValue(new Error('credit_balance_exhausted'));

    await expect(makeService().generate('gen-1')).resolves.toBeUndefined();

    expect(prismaMock.aiGenerationItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'FAILED', validationErrors: expect.anything() }),
      }),
    );
    expect(prismaMock.question.create).not.toHaveBeenCalled();
    expect(prismaMock.aiGeneration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'FAILED', resultCount: 0 }) }),
    );
  });
});

describe('AiGenerationService.generate — retrieval', () => {
  it('upgrades to the pgvector path when the API key is present', async () => {
    llmMock.isConfigured = true;
    llmMock.embedTexts.mockResolvedValue([[0.1, 0.2]]);
    retrievalMock.retrieveByVector.mockResolvedValue([
      {
        kind: 'PAPER',
        pageId: 'page-1',
        paperId: 'paper-1',
        paperTitle: 'SEE Model 2082',
        subject: 'Mathematics',
        paperYear: 2082,
        examYear: 2082,
        pageOrder: 1,
        imageUrl: null,
        score: 0.9,
        count: 1,
        method: 'embedding',
        snippet: 'solved by factorisation',
        ocrState: 'OCR_APPROVED',
      } satisfies RetrievedSource,
    ]);

    await makeService().generate('gen-1');

    expect(llmMock.embedTexts).toHaveBeenCalled();
    expect(retrievalMock.retrieveByVector).toHaveBeenCalled();
    const userMsg = (llmMock.completeJson as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .map((m: { role: string }) => m)
      .find((m: { role: string }) => m.role === 'user').content as string;
    expect(userMsg).toContain('SEE Model 2082');
    expect(userMsg).toContain('Topic: Quadratic Equations');
  });
});