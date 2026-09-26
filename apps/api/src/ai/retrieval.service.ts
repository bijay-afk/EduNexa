import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaperExamType, OcrState } from '@prisma/client';

/** OCR states that count as "retrievable/approved source" for generation. */
const RETRIEVABLE_OCR_STATES: OcrState[] = ['OCR_COMPLETED', 'OCR_REVIEW', 'OCR_APPROVED'];

export interface RetrievalQuery {
  /** SEE archive subject name to scope on (e.g. "Mathematics"). */
  archiveSubject?: string;
  archiveExamTypes?: PaperExamType[];
  /** Keyword terms (topic names, subject name) used by the keyword path. */
  keywords: string[];
  limit?: number;
}

export interface RetrievedSource {
  kind: 'PAPER';
  pageId: string;
  paperId: string;
  paperTitle: string;
  subject: string;
  paperYear: number | null;
  examYear: number | null;
  pageOrder: number;
  imageUrl: string | null;
  score: number;
  count: number;
  method: 'embedding' | 'keyword';
  snippet: string;
  ocrState: OcrState;
}

const PAGE_COLUMNS = Prisma.sql`
  pg."id" AS "pageId", pg."pageOrder", pg."imageUrl", pg."ocrText", pg."ocrState",
  p."id" AS "paperId", p."title" AS "paperTitle", p."subject", p."paperYear", p."year" AS "examYear"
`;

@Injectable()
export class RetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Source-scoped retrieval over the SEE archive, restricted to OCR pages that
   * have been reviewed/approved (the "approved source" trust boundary).
   *
   * Keyword path: ILIKE scoring over ocrText. Works with zero API keys.
   * Vector path (`retrieveByVector`): pgvector cosine similarity, active once
   * embeddings + quotas are available.
   */
  async retrieve(q: RetrievalQuery): Promise<RetrievedSource[]> {
    const terms = significantTerms(q.keywords);
    if (!terms.length) return [];
    const limit = q.limit ?? 5;

    const patterns = terms.map((t) => `%${encodeLike(t)}%`);
    const rows = await this.prisma.$queryRaw<RetrievedSourceRow[]>(
      this.scopedQuery(q, Prisma.sql`pg."ocrText" ILIKE ANY (ARRAY[${Prisma.join(patterns)}])`),
    );

    const scored = rows
      .map((row) => this.scoreByKeyword(row, terms))
      .filter((r): r is RetrievedSource => r !== null)
      .sort((a, b) => b.score - a.score || a.pageOrder - b.pageOrder)
      .slice(0, limit);

    return scored;
  }

  /**
   * pgvector cosine retrieval. `vector` is expected in the same space as the
   * stored page embeddings (default text-embedding-3-small / 1536 dims).
   */
  async retrieveByVector(
    vector: number[],
    q: Omit<RetrievalQuery, 'limit'> & { limit?: number },
  ): Promise<RetrievedSource[]> {
    const limit = q.limit ?? 5;
    const vec = `[${vector.join(',')}]`;
    const rows = await this.prisma.$queryRaw<RetrievedSourceRow[]>(
      Prisma.sql`SELECT ${PAGE_COLUMNS},
          1 - (pg."embedding" <=> CAST(${vec} AS vector)) AS "score"
        FROM "PaperArchivePage" pg
        JOIN "PaperArchive" p ON p."id" = pg."paperId"
        WHERE pg."embedding" IS NOT NULL
          AND pg."ocrState" IN (${Prisma.join(RETRIEVABLE_OCR_STATES.map((s) => Prisma.sql`${s}::"OcrState"`))})
          ${this.subjectFilter(q.archiveSubject)}
          ${queryExamFilter(q.archiveExamTypes)}
        ORDER BY pg."embedding" <=> CAST(${vec} AS vector)
        LIMIT ${limit}`,
    );
    return rows.map((row) => ({
      kind: 'PAPER' as const,
      pageId: row.pageId,
      paperId: row.paperId,
      paperTitle: row.paperTitle,
      subject: row.subject,
      paperYear: row.paperYear,
      examYear: row.examYear,
      pageOrder: row.pageOrder,
      imageUrl: row.imageUrl,
      ocrState: row.ocrState,
      score: row.score ?? 1,
      count: 1,
      method: 'embedding' as const,
      snippet: snippetFor(row.ocrText ?? '', []),
    }));
  }

  private scopedQuery(q: RetrievalQuery, keywordWhere: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`SELECT ${PAGE_COLUMNS}
      FROM "PaperArchivePage" pg
      JOIN "PaperArchive" p ON p."id" = pg."paperId"
      WHERE pg."ocrState" IN (${Prisma.join(RETRIEVABLE_OCR_STATES.map((s) => Prisma.sql`${s}::"OcrState"`))})
        AND pg."ocrText" IS NOT NULL AND pg."ocrText" <> ''
        ${this.subjectFilter(q.archiveSubject)}
        ${queryExamFilter(q.archiveExamTypes)}
        AND ${keywordWhere}`;
  }

  private subjectFilter(subject?: string): Prisma.Sql {
    if (!subject) return Prisma.sql`AND TRUE`;
    return Prisma.sql`AND p."subject" ILIKE ${`%${encodeLike(subject)}%`}`;
  }

  private scoreByKeyword(
    row: RetrievedSourceRow,
    terms: string[],
  ): RetrievedSource | null {
    const text = (row.ocrText ?? '').toLowerCase();
    const hits: number[] = [];
    for (const term of terms) {
      const idx = text.indexOf(term);
      if (idx >= 0) hits.push(idx);
    }
    if (!hits.length) return null;
    const first = Math.min(...hits);
    const count = hits.length;
    const score = 1 + count / 10 - Math.min(first / 5000, 0.5);
    return {
      kind: 'PAPER',
      pageId: row.pageId,
      paperId: row.paperId,
      paperTitle: row.paperTitle,
      subject: row.subject,
      paperYear: row.paperYear,
      examYear: row.examYear,
      pageOrder: row.pageOrder,
      imageUrl: row.imageUrl,
      ocrState: row.ocrState,
      score,
      count,
      method: 'keyword',
      snippet: snippetFor(row.ocrText ?? '', terms),
    };
  }
}

interface RetrievedSourceRow {
  pageId: string;
  pageOrder: number;
  imageUrl: string | null;
  ocrText: string | null;
  ocrState: OcrState;
  paperId: string;
  paperTitle: string;
  subject: string;
  paperYear: number | null;
  examYear: number | null;
  score?: number;
}

function queryExamFilter(examTypes?: PaperExamType[]): Prisma.Sql {
  if (!examTypes?.length) return Prisma.sql`AND TRUE`;
  return Prisma.sql`AND p."examType" IN (${Prisma.join(examTypes.map((e) => Prisma.sql`${e}::"PaperExamType"`))})`;
}

/** Lowercase, alphanumeric-only terms of length > 2. */
export function significantTerms(keywords: string[]): string[] {
  const seen = new Set<string>();
  for (const kw of keywords) {
    for (const token of kw.toLowerCase().split(/[^a-z0-9\u0900-\u097F]+/)) {
      if (token.length > 2) seen.add(token);
    }
  }
  return [...seen];
}

function encodeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function snippetFor(text: string, terms: string[], width = 260): string {
  const target = terms.length
    ? Math.min(...terms.map((t) => text.toLowerCase().indexOf(t)).filter((i) => i >= 0))
    : -1;
  if (target < 0) return `${text.slice(0, width)}${text.length > width ? '…' : ''}`;
  const start = Math.max(0, target - 70);
  const end = Math.min(text.length, start + width);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}