import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { RetrievalService, significantTerms } from './retrieval.service';
import type { PrismaService } from '../prisma/prisma.service';

const rowMatching = {
  pageId: 'page-1',
  pageOrder: 2,
  imageUrl: 'http://img/p1.jpg',
  ocrText: '1. Solve quadratic equations using the formula. (SEE Mathematics 2082)',
  ocrState: 'OCR_APPROVED',
  paperId: 'paper-1',
  paperTitle: 'SEE Model Mathematics 2082',
  subject: 'Mathematics',
  paperYear: 2082,
  examYear: 2082,
};

const rowOther = {
  pageId: 'page-2',
  pageOrder: 1,
  imageUrl: 'http://img/p2.jpg',
  ocrText: 'Define a set and show the union of two sets in a Venn diagram.',
  ocrState: 'OCR_COMPLETED',
  paperId: 'paper-2',
  paperTitle: 'SEE Set 2081',
  subject: 'Mathematics',
  paperYear: 2081,
  examYear: null,
};

function sqlText(sql: Prisma.Sql): string {
  const raw = sql as unknown as { text?: string | string[]; strings?: string[] };
  if (Array.isArray(raw.text)) return raw.text.join('');
  return raw.text ?? raw.strings?.join('') ?? '';
}

function sqlValues(sql: Prisma.Sql): unknown[] {
  return (sql as unknown as { values?: unknown[] }).values ?? [];
}

describe('significantTerms', () => {
  it('extracts lowercase alphanumeric terms of length > 2', () => {
    expect(significantTerms(['Quadratic Equations', 'Mathematics'])).toEqual(
      expect.arrayContaining(['quadratic', 'equations', 'mathematics']),
    );
  });

  it('ignores short/filter tokens entirely', () => {
    expect(significantTerms(['a is see set'])).toEqual(['see', 'set']);
  });
});

describe('RetrievalService.retrieve (keyword path)', () => {
  const queryRaw = vi.fn();
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  const service = new RetrievalService(prisma);

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('returns only pages whose OCR matches at least one term, ranked by hits', async () => {
    queryRaw.mockResolvedValue([rowMatching, rowOther]);

    const results = await service.retrieve({ keywords: ['quadratic'], limit: 5 });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      kind: 'PAPER',
      pageId: 'page-1',
      method: 'keyword',
      subject: 'Mathematics',
      ocrState: 'OCR_APPROVED',
    });
    expect(results[0].count).toBeGreaterThan(0);
    expect(results[0].snippet).toContain('quadratic');
  });

  it('scopes by archive subject and exam types', async () => {
    queryRaw.mockResolvedValue([]);

    await service.retrieve({
      keywords: ['quadratic'],
      archiveSubject: 'Mathematics',
      archiveExamTypes: ['PAST'],
      limit: 3,
    });

    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    const values = sqlValues(sql);
    expect(values).toContain('%quadratic%');
    expect(values).toContain('PAST');
    expect(sqlText(sql)).toContain('p."subject" ILIKE');
    expect(sqlText(sql)).toContain('p."examType" IN');
  });

  it('restricts retrieval to the approved-source OCR states', async () => {
    queryRaw.mockResolvedValue([]);

    await service.retrieve({ keywords: ['quadratic'], limit: 1 });

    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sqlValues(sql)).toEqual(expect.arrayContaining(['OCR_APPROVED']));
    expect(sqlValues(sql)).toEqual(expect.arrayContaining(['OCR_REVIEW']));
    expect(sqlValues(sql)).toEqual(expect.arrayContaining(['OCR_COMPLETED']));
  });

  it('returns [] without hitting SQL when no significant terms exist', async () => {
    const results = await service.retrieve({ keywords: ['is', 'a'], limit: 5 });
    expect(results).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('RetrievalService.retrieveByVector (pgvector path)', () => {
  it('builds a cosine-similarity query and marks results as embedding', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ ...rowMatching, score: 0.921 }]);
    const service = new RetrievalService({ $queryRaw: queryRaw } as unknown as PrismaService);

    const results = await service.retrieveByVector([0.1, 0.2, 0.3], {
      keywords: ['quadratic'],
      archiveSubject: 'Mathematics',
    });

    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sqlText(sql)).toContain('CAST');
    expect(sqlText(sql)).toContain('vector');
    expect(sqlText(sql)).toContain('"embedding" IS NOT NULL');
    expect(sqlValues(sql)).toContain('[0.1,0.2,0.3]');
    expect(results[0]).toMatchObject({ method: 'embedding', score: 0.921 });
  });
});