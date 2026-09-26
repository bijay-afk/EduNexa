import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import type { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  paperArchive: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  paperArchivePage: {
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  archiveQuestion: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  ocrRevision: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  topic: { findUnique: vi.fn() },
  chapter: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn(), findMany: vi.fn() },
  question: { create: vi.fn() },
  questionBank: { upsert: vi.fn() },
  questionBankItem: { findUnique: vi.fn(), create: vi.fn() },
  curriculum: { findFirst: vi.fn() },
  grade: { findFirst: vi.fn() },
  $transaction: vi.fn(),
};

function service(): ArchiveService {
  return new ArchiveService(prismaMock as unknown as PrismaService);
}

describe('ArchiveService.extractQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates rows on first extraction and preserves curation on re-extraction', async () => {
    (prismaMock.paperArchive.findUnique as Mock).mockResolvedValue({
      id: 'paper-1',
      subject: 'Mathematics',
      subjectSlug: 'mathematics',
      examType: 'PAST',
      year: 2082,
      paperYear: 2026,
      pages: [
        { id: 'page-1', pageOrder: 1, ocrText: '1. Factorise x2 - 9. (2)\n2. Solve 2x = 8. (2)' },
      ],
    });
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue(null);
    (prismaMock.archiveQuestion.create as Mock).mockResolvedValue({ id: 'aq-1' });

    const svc = service();
    const first = await svc.extractQuestions('paper-1');
    expect(first.created).toBe(2);

    // Re-extraction: same key found -> update path.
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue({ id: 'aq-1' });
    const second = await svc.extractQuestions('paper-1');
    expect(second.created).toBe(0);
    expect(second.updated).toBe(2);
    expect(prismaMock.archiveQuestion.update).toHaveBeenCalled();
  });

  it('throws NotFound for an unknown paper', async () => {
    (prismaMock.paperArchive.findUnique as Mock).mockResolvedValue(null);
    await expect(service().extractQuestions('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ArchiveService.updateQuestion (curriculum mapping)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('laterally derives chapterId from a mapped topic and approves the mapping', async () => {
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue({
      id: 'aq-1',
      subjectId: null,
      chapterId: null,
      topicId: null,
      mappingStatus: 'UNMAPPED',
      mappedById: null,
      mappedAt: null,
    });
    (prismaMock.topic.findUnique as Mock).mockResolvedValue({
      id: 'topic-1',
      chapterId: 'ch-9',
    });
    const updated = { id: 'aq-1', topicId: 'topic-1', chapterId: 'ch-9', mappingStatus: 'APPROVED' };
    (prismaMock.archiveQuestion.update as Mock).mockResolvedValue(updated);

    const result = await service().updateQuestion('aq-1', 'user-1', { topicId: 'topic-1' });
    const data = (prismaMock.archiveQuestion.update as Mock).mock.calls[0][0].data;
    expect(data.chapterId).toBe('ch-9');
    expect(data.mappingStatus).toBe('APPROVED');
    expect(data.mappedById).toBe('user-1');
    expect(result.mappingStatus).toBe('APPROVED');
  });

  it('rejects a topic that does not belong to the given chapter', async () => {
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue({
      id: 'aq-1',
      subjectId: null,
      chapterId: null,
      topicId: null,
      mappingStatus: 'UNMAPPED',
      mappedById: null,
      mappedAt: null,
    });
    (prismaMock.topic.findUnique as Mock).mockResolvedValue({ id: 'topic-1', chapterId: 'other' });

    await expect(
      service().updateQuestion('aq-1', 'user-1', { topicId: 'topic-1', chapterId: 'ch-9' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ArchiveService.importQuestion (provenance → question bank)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to import an unmapped question', async () => {
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue({
      id: 'aq-1',
      importedQuestionId: null,
      topicId: null,
      mappingStatus: 'UNMAPPED',
    });
    await expect(service().importQuestion('aq-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('imports a mapped question and stores full provenance in sourceRefs', async () => {
    (prismaMock.archiveQuestion.findUnique as Mock).mockResolvedValue({
      id: 'aq-1',
      paperArchiveId: 'paper-1',
      paperArchivePageId: 'page-3',
      sourceText: 'Prove the theorem of Pythagoras.',
      sourcePageNumber: 3,
      questionNumber: 7,
      marks: 5,
      options: null,
      questionType: null,
      topicId: 'topic-1',
      subject: 'Mathematics',
      examYear: 2082,
      paperYear: 2026,
      importedQuestionId: null,
    });
    (prismaMock.topic.findUnique as Mock).mockResolvedValue({ id: 'topic-1' });
    (prismaMock.question.create as Mock).mockResolvedValue({ id: 'q-99' });
    (prismaMock.questionBank.upsert as Mock).mockResolvedValue({ id: 'bank-1' });
    (prismaMock.questionBankItem.findUnique as Mock).mockResolvedValue(null);

    const q = await service().importQuestion('aq-1', 'teacher-1');
    const created = (prismaMock.question.create as Mock).mock.calls[0][0].data;
    expect(created.topicId).toBe('topic-1');
    expect(created.marks).toBe(5);
    expect(created.difficulty).toBe('MEDIUM');
    expect(created.status).toBe('DRAFT');
    expect(created.sourceRefs.sourceType).toBe('PAPER_ARCHIVE');
    expect(created.sourceRefs.archivePageId).toBe('page-3');
    expect(created.sourceRefs.sourcePageNumber).toBe(3);
    expect(created.sourceRefs.sourceLocator).toContain('SEE (2026) Mathematics — Q7 page 3');
    expect(prismaMock.questionBankItem.create).toHaveBeenCalledWith({
      data: { bankId: 'bank-1', questionId: 'q-99' },
    });
    expect(prismaMock.archiveQuestion.update).toHaveBeenCalledWith({
      where: { id: 'aq-1' },
      data: expect.objectContaining({
        state: 'APPROVED',
        importedQuestionId: 'q-99',
        importedById: 'teacher-1',
      }),
    });
    expect(q).toEqual({ id: 'q-99' });
  });
});

describe('ArchiveService.saveOcr (revisioned OCR correction)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an incremented revision and moves the page to review', async () => {
    (prismaMock.$transaction as Mock).mockImplementation((ops) => Promise.all(ops));
    (prismaMock.paperArchivePage.findUnique as Mock).mockResolvedValueOnce(
      { id: 'page-1' },
    );
    (prismaMock.ocrRevision.findFirst as Mock).mockResolvedValue({ version: 2 });
    (prismaMock.paperArchivePage.findUnique as Mock).mockResolvedValueOnce({
      id: 'page-1',
      revisions: [],
    });

    const result = await service().saveOcr('page-1', 'reviewer-1', {
      ocrText: '1. Corrected OCR',
      reason: 'typos',
    });
    const create = (prismaMock.ocrRevision.create as Mock).mock.calls[0][0].data;
    expect(create.version).toBe(3);
    expect(create.editedById).toBe('reviewer-1');
    expect(create.editingReason).toBe('typos');
    const pageUpdate = (prismaMock.paperArchivePage.update as Mock).mock.calls[0][0].data;
    expect(pageUpdate.ocrState).toBe('OCR_REVIEW');
    expect(pageUpdate.ocrText).toBe('1. Corrected OCR');
    expect(result).toBeDefined();
  });
});

describe('ArchiveService.coverage (mapping queue + coverage dashboard)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns health, a mapping queue, and per-chapter analytics from live data', async () => {
    (prismaMock.paperArchive.count as Mock).mockResolvedValueOnce(158);
    (prismaMock.paperArchivePage.count as Mock)
      .mockResolvedValueOnce(879)
      .mockResolvedValueOnce(877)
      .mockResolvedValueOnce(800)
      .mockResolvedValueOnce(50);
    (prismaMock.archiveQuestion.count as Mock)
      .mockResolvedValueOnce(100) // extracted
      .mockResolvedValueOnce(40) // mapped (APPROVED mappingStatus)
      .mockResolvedValueOnce(30); // approved (APPROVED state)
    (prismaMock.curriculum.findFirst as Mock).mockResolvedValueOnce({ id: 'cur-1' });
    (prismaMock.grade.findFirst as Mock).mockResolvedValueOnce({ id: 'g1', name: 'Grade 10' });
    (prismaMock.subject.findMany as Mock).mockResolvedValueOnce([
      {
        id: 'subj-math',
        name: 'Mathematics',
        order: 1,
        chapters: [
          {
            id: 'ch1',
            name: 'Algebra',
            order: 1,
            topics: [
              { id: 't1', name: 'Factorization', order: 1 },
              { id: 't2', name: 'Quadratic equations', order: 2 },
            ],
          },
          { id: 'ch2', name: 'Geometry', order: 2, topics: [{ id: 't3', name: 'Triangles', order: 1 }] },
          { id: 'ch3', name: 'Trigonometry', order: 3, topics: [] },
        ],
      },
    ]);
    const gb = prismaMock.archiveQuestion.groupBy as Mock;
    gb.mockResolvedValueOnce([
      { chapterId: 'ch1', _count: { _all: 30 } },
      { chapterId: 'ch2', _count: { _all: 10 } },
    ]) // chapter rollup
      .mockResolvedValueOnce([{ topicId: 't1', _count: { _all: 30 } }]) // topic rollup
      .mockResolvedValueOnce([{ subject: 'Mathematics', _count: { _all: 80 } }]) // by subject
      .mockResolvedValueOnce([
        { mappingStatus: 'APPROVED', _count: { _all: 40 } },
        { mappingStatus: 'UNMAPPED', _count: { _all: 55 } },
        { mappingStatus: 'SUGGESTED', _count: { _all: 5 } },
      ])
      .mockResolvedValueOnce([
        { state: 'EXTRACTED', _count: { _all: 60 } },
        { state: 'APPROVED', _count: { _all: 30 } },
        { state: 'IN_REVIEW', _count: { _all: 10 } },
      ])
      .mockResolvedValueOnce([{ examType: 'PAST', _count: { _all: 90 } }])
      .mockResolvedValueOnce([{ examYear: 2082, _count: { _all: 60 } }]);

    const c = await service().coverage();

    expect(c.dataHealth).toEqual({
      papers: 158,
      pages: 879,
      pagesWithOcr: 877,
      ocrApproved: 800,
      ocrInReview: 50,
      ocrPending: 2,
      extractedQuestions: 100,
      mappedQuestions: 40,
      unmappedQuestions: 60,
      approvedQuestions: 30,
    });

    // Mapping queue
    expect(c.mappingQueue.byMappingStatus).toEqual([
      { mappingStatus: 'UNMAPPED', questions: 55 },
      { mappingStatus: 'SUGGESTED', questions: 5 },
      { mappingStatus: 'APPROVED', questions: 40 },
      { mappingStatus: 'REJECTED', questions: 0 },
    ]);
    expect(c.mappingQueue.byState).toEqual([
      { state: 'EXTRACTED', questions: 60 },
      { state: 'IN_REVIEW', questions: 10 },
      { state: 'APPROVED', questions: 30 },
      { state: 'REJECTED', questions: 0 },
    ]);

    // Coverage analytics
    expect(c.coverage.totalQuestions).toBe(100);
    expect(c.coverage.byExamType[0]).toEqual({ examType: 'PAST', questions: 90 });
    expect(c.coverage.byYear).toEqual([{ year: 2082, questions: 60 }]);
    expect(c.coverage.gaps).toEqual([
      { subjectId: 'subj-math', subjectName: 'Mathematics', chapterId: 'ch3', chapterName: 'Trigonometry' },
    ]);

    // Per-chapter percentages relative to mapped questions
    const algebra = c.curriculum.subjects[0].chapters[0];
    expect(algebra.mappedQuestions).toBe(30);
    expect(algebra.mappedPercent).toBe(75);
    expect(algebra.topics[0]).toEqual({ id: 't1', name: 'Factorization', mapped: 30 });
    const geometry = c.curriculum.subjects[0].chapters[1];
    expect(geometry.mappedPercent).toBe(25);
  });
});