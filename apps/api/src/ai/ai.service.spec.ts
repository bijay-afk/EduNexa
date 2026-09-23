import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prismaMock, AiServiceHarness } from '../testing/ai-service.harness';
import { questionGenerationConfigSchema } from '@edunexa/validation';

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

describe('questionGenerationConfigSchema source default', () => {
  it('defaults source to CURRICULUM when omitted', () => {
    const parsed = questionGenerationConfigSchema.parse(validConfig());
    expect(parsed.source).toBe('CURRICULUM');
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

  it('resolves the NEB curriculum when source is CURRICULUM', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({
      id: 'cur-1',
      name: 'Nepal Grade 10 Curriculum',
    });
    (prismaMock.topic.count as Mock).mockResolvedValue(1);

    const service = new AiServiceHarness();
    const config = validConfig({ topicIds: ['topic-1'] });
    await service.service.enqueueGeneration('teacher-1', config);

    expect(prismaMock.curriculum.findUnique).toHaveBeenCalledWith({ where: { id: 'cur-1' }, select: { id: true, name: true } });
    const createdConfig = (prismaMock.aiGeneration.create as Mock).mock.calls[0][0].data.config;
    expect(createdConfig.source).toBe('CURRICULUM');
    expect(createdConfig.curriculumName).toBe('Nepal Grade 10 Curriculum');
  });

  it('throws NotFound when the CURRICULUM does not exist', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue(null);

    const service = new AiServiceHarness();
    await expect(service.service.enqueueGeneration('teacher-1', validConfig())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest when CURRICULUM topicIds are missing', async () => {
    (prismaMock.curriculum.findUnique as Mock).mockResolvedValue({ id: 'cur-1', name: 'C' });
    (prismaMock.topic.count as Mock).mockResolvedValue(0);

    const service = new AiServiceHarness();
    await expect(service.service.enqueueGeneration('teacher-1', validConfig())).rejects.toBeInstanceOf(BadRequestException);
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
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1' }),
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
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1', gradeId: 'x' }),
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
        validConfig({ source: 'ASMITA_SET_BOOK', curriculumId: 'asmita-1', topicIds: ['nope'] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});