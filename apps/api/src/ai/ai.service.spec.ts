import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { prismaMock, queueMock, generationServiceMock, AiServiceHarness } from '../testing/ai-service.harness';
import { questionGenerationConfigSchema } from '@edunexa/validation';
import { extractQuestions } from './question-extractor';

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    curriculumId: 'cur-1',
    gradeId: 'grade-1',
    subjectId: 'sub-1',
    chapterIds: ['ch-1'],
    topicIds: ['topic-1'],
    count: 10,
    totalMarks: 10,
    difficultyDistribution: { EASY: 1, MEDIUM: 0, HARD: 0 },
    questionTypeDistribution: { MCQ: 1 },
    ...overrides,
  };
}

describe('questionGenerationConfigSchema source + generator default', () => {
  it('defaults source to CURRICULUM when omitted', () => {
    const parsed = questionGenerationConfigSchema.parse(validConfig());
    expect(parsed.source).toBe('CURRICULUM');
  });

  it('defaults generator to ARCHIVE_EXTRACT', () => {
    const parsed = questionGenerationConfigSchema.parse(validConfig());
    expect(parsed.generator).toBe('ARCHIVE_EXTRACT');
  });

  it('accepts flexible marks arrays', () => {
    const parsed = questionGenerationConfigSchema.parse(validConfig({ marks: [1, 2, 3] }));
    expect(parsed.marks).toEqual([1, 2, 3]);
  });

  it('accepts an explicit ASMITA_SET_BOOK source', () => {
    const parsed = questionGenerationConfigSchema.parse(
      validConfig({ source: 'ASMITA_SET_BOOK' }),
    );
    expect(parsed.source).toBe('ASMITA_SET_BOOK');
  });

  it('rejects an unknown source', () => {
    expect(() => questionGenerationConfigSchema.parse(validConfig({ source: 'SOMETHING' }))).toThrow();
  });
});

describe('AiService.resolveSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the NEB curriculum when source is CURRICULUM (LLM path)', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({
      id: 'cur-1',
      name: 'Nepal Grade 10 Curriculum',
    });
    (prismaMock.topic.count as Mock).mockResolvedValue(1);
    (prismaMock.subject.findUnique as Mock).mockResolvedValue({ id: 'sub-1', name: 'Mathematics' });

    const service = new AiServiceHarness();
    const config = validConfig({ topicIds: ['topic-1'], generator: 'LLM' });
    await service.service.enqueueGeneration('teacher-1', config);

    expect(prismaMock.curriculum.findUnique).toHaveBeenCalledWith({ where: { id: 'cur-1' }, select: { id: true, name: true, code: true } });
    const createdConfig = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data.config;
    expect(createdConfig.source).toBe('CURRICULUM');
    expect(createdConfig.curriculumName).toBe('Nepal Grade 10 Curriculum');
  });

  it('throws NotFound when the CURRICULUM does not exist', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue(null);

    const service = new AiServiceHarness();
    await expect(service.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM' }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest when CURRICULUM topicIds are missing', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'cur-1', name: 'C' });
    (prismaMock.topic.count as Mock).mockResolvedValue(0);

    const service = new AiServiceHarness();
    await expect(service.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM' }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves the Asmita set book when source is ASMITA_SET_BOOK', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({
      id: 'asmita-1',
      name: 'Asmita Class 10 Set Book',
    });
    (prismaMock.grade.findUnique as Mock).mockResolvedValue({ curriculumId: 'asmita-1' });
    (prismaMock.topic.count as Mock).mockResolvedValue(1);

    const service = new AiServiceHarness();
    const config = validConfig({
      source: 'ASMITA_SET_BOOK',
      curriculumId: 'asmita-1',
      gradeId: 'asmita-grade',
      topicIds: ['asmita-topic-1'],
      generator: 'LLM',
    });
    await service.service.enqueueGeneration('teacher-1', config);

    expect(prismaMock.curriculum.findUnique).toHaveBeenCalledWith({
      where: { code: 'ASMITA-SET-10' },
      select: { id: true, name: true },
    });
    const createdConfig = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data.config;
    expect(createdConfig.source).toBe('ASMITA_SET_BOOK');
    expect(createdConfig.curriculumName).toBe('Asmita Class 10 Set Book');
    expect(createdConfig.setBookId).toBeUndefined();
  });

  it('throws BadRequest when the Asmita set book scaffold is not loaded', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue(null);

    const service = new AiServiceHarness();
    await expect(
      service.service.enqueueGeneration(
        'teacher-1',
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1', generator: 'LLM' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when gradeId does not belong to the Asmita set book', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'asmita-1', name: 'S' });
    (prismaMock.grade.findUnique as Mock).mockResolvedValue({ curriculumId: 'other' });

    const service = new AiServiceHarness();
    await expect(
      service.service.enqueueGeneration(
        'teacher-1',
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1', gradeId: 'x', generator: 'LLM' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when topicIds are outside the Asmita set book', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'asmita-1', name: 'S' });
    (prismaMock.grade.findUnique as Mock).mockResolvedValue({ curriculumId: 'asmita-1' });
    (prismaMock.topic.count as Mock).mockResolvedValue(0);

    const service = new AiServiceHarness();
    await expect(
      service.service.enqueueGeneration(
        'teacher-1',
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1', topicIds: ['nope'], generator: 'LLM' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires archiveSubject for PAPER_ARCHIVE source', async () => {
    const service = new AiServiceHarness();
    await expect(
      service.service.enqueueGeneration(
        'teacher-1',
        validConfig({
          source: 'PAPER_ARCHIVE',
          archiveExamTypes: ['PAST'],
          generator: 'ARCHIVE_EXTRACT',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('runs ARCHIVE_EXTRACT synchronously and persists drafts', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'cur-1', name: 'C' });
    (prismaMock.topic.count as Mock).mockResolvedValue(1);
    (prismaMock.topic.findMany as Mock).mockResolvedValue([{ id: 'topic-1' }, { id: 'topic-2' }]);
    (prismaMock.chapter.findMany as Mock).mockResolvedValue([
      { topics: [{ id: 'topic-1' }, { id: 'topic-2' }] },
    ]);
    (prismaMock.paperArchive.count as Mock).mockResolvedValue(3);
    (prismaMock.paperArchive.findMany as Mock).mockResolvedValue([
      {
        id: 'paper-1',
        pages: [
          { id: 'page-1', ocrText: '1. Factorise x2 - 9. (2)\n2. Solve 2x = 8. (2)' },
        ],
      },
    ]);

    const harness = new AiServiceHarness();
    const config = validConfig({
      source: 'CURRICULUM',
      archiveSubject: 'Mathematics',
      generator: 'ARCHIVE_EXTRACT',
    });
    const result = await harness.service.enqueueGeneration('teacher-1', config);

    expect(prismaMock.question.create).toHaveBeenCalled();
    expect(prismaMock.aiGenerationItem.create).toHaveBeenCalled();
    expect(result.id).toBe('gen-1');
  });
});

describe('AiService queue dispatch (spec §16–§20, §24–§25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.aiGeneration.count.mockResolvedValue(0);
  });

  function curriculumMocks() {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'cur-1', name: 'C' });
    (prismaMock.topic.count as Mock).mockResolvedValue(1);
  }

  it('enqueues an LLM generation to BullMQ and returns QUEUED when the worker is available', async () => {
    curriculumMocks();
    const harness = new AiServiceHarness({ workerAvailable: true });

    await harness.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM', count: 5 }));

    expect(queueMock.queue.add).toHaveBeenCalledWith('llm', {
      generationId: 'gen-1',
      generator: 'LLM',
    });
    expect(generationServiceMock.generate).not.toHaveBeenCalled();
    const created = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data;
    expect(created.state).toBe('QUEUED');
    expect(created.config.count).toBe(5);
  });

  it('runs LLM synchronously as a dev fallback when no Redis worker is available', async () => {
    curriculumMocks();
    const harness = new AiServiceHarness();

    await harness.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM', count: 5 }));

    expect(generationServiceMock.generate).toHaveBeenCalledWith('gen-1');
    expect(queueMock.queue.add).not.toHaveBeenCalled();
  });

  it('rejects with 409 when the teacher already has an active generation', async () => {
    curriculumMocks();
    const harness = new AiServiceHarness();
    (prismaMock.aiGeneration.count as Mock).mockResolvedValue(1);

    await expect(
      harness.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM' })),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.aiGeneration.create).not.toHaveBeenCalled();
  });

  it('clamps an in-range request to AI_MAX_QUESTIONS_PER_GENERATION', async () => {
    curriculumMocks();
    const harness = new AiServiceHarness();

    await harness.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM', count: 100 }));

    const created = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data;
    expect(created.config.count).toBe(20);
  });

  it('leaves counts under the cap untouched', async () => {
    curriculumMocks();
    const harness = new AiServiceHarness();

    await harness.service.enqueueGeneration('teacher-1', validConfig({ generator: 'LLM', count: 5 }));

    const created = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data;
    expect(created.config.count).toBe(5);
  });
});

describe('question-extractor', () => {
  it('extracts numbered questions with marks', () => {
    const out = extractQuestions(
      "Group 'A'\n1. Simplify: 3x + 2x. (5)\n2. Find the value of x if 2x=10. (2+3)\nGroup 'B'\n1. Prove the theorem of Pythagoras.\n",
    );
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0].text).toContain('Simplify');
    expect(out[0].marks).toBe(5);
    expect(out[1].marks).toBe(5);
  });

  it('keeps option lines glued to their question', () => {
    const out = extractQuestions(
      '1. Choose the correct answer:\na) 1\nb) 2\nc) 3\nd) 4\n2. State Newtons law.',
    );
    const mcq = out.find((q) => q.options && q.options.length === 4);
    expect(mcq).toBeDefined();
  });
});