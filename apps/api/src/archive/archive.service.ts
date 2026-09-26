import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ArchiveQuestionState,
  MappingStatus,
  PaperExamType,
  Prisma,
  QuestionDifficulty,
  QuestionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { extractQuestions } from '../ai/question-extractor';
import { buildPagination, type Paginated } from '../common/utils/pagination';

const QUEUE_MAPPING_STATUSES = Object.values(MappingStatus) as MappingStatus[];
const QUEUE_QUESTION_STATES = Object.values(ArchiveQuestionState) as ArchiveQuestionState[];

function tooLong(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.length > 12000 ? value.slice(0, 12000) : value;
}

/** Short stable hash so a re-extraction of the same block produces the same key. */
function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function inferType(question: { questionType?: QuestionType | null; options?: unknown; marks?: number | null }): QuestionType {
  if (question.questionType) return question.questionType;
  if (Array.isArray(question.options) && question.options.length >= 2) return 'MCQ';
  const marks = question.marks ?? 1;
  if (marks >= 6) return 'LONG_ANSWER';
  return 'SHORT_ANSWER';
}

function inferDifficulty(marks: number): QuestionDifficulty {
  if (marks >= 6) return 'HARD';
  if (marks >= 3) return 'MEDIUM';
  return 'EASY';
}

@Injectable()
export class ArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Papers
  // --------------------------------------------------------------------------

  async listPapers(params: {
    subject?: string;
    examType?: string;
    year?: number;
    processingStatus?: string;
    page: number;
    limit: number;
  }): Promise<Paginated<object>> {
    const where: Prisma.PaperArchiveWhereInput = {
      ...(params.subject ? { subject: { contains: params.subject, mode: 'insensitive' } } : {}),
      ...(params.examType ? { examType: params.examType as Prisma.PaperArchiveWhereInput['examType'] } : {}),
      ...(params.processingStatus
        ? { processingStatus: params.processingStatus as Prisma.EnumArchiveStatusFilter }
        : {}),
      ...(params.year ? { OR: [{ year: params.year }, { paperYear: params.year }] } : {}),
    };

    const [total, papers] = await Promise.all([
      this.prisma.paperArchive.count({ where }),
      this.prisma.paperArchive.findMany({
        where,
        select: {
          id: true,
          title: true,
          subject: true,
          subjectSlug: true,
          examType: true,
          year: true,
          paperYear: true,
          language: true,
          paperCode: true,
          processingStatus: true,
          verifiedAt: true,
          pageCount: true,
          createdAt: true,
        },
        orderBy: [{ paperYear: 'desc' }, { subject: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    const paperIds = papers.map((p) => p.id);
    const [ocrRollups, mappedRollups] = await Promise.all([
      paperIds.length
        ? this.prisma.paperArchivePage.groupBy({
            by: ['paperId', 'ocrState'],
            where: { paperId: { in: paperIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      paperIds.length
        ? this.prisma.archiveQuestion.groupBy({
            by: ['paperArchiveId'],
            where: { paperArchiveId: { in: paperIds }, mappingStatus: 'APPROVED' as MappingStatus },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const items = papers.map((paper) => {
      const ocr = { approved: 0, review: 0, completed: 0, pending: 0, rejected: 0 };
      for (const row of ocrRollups.filter((r) => r.paperId === paper.id)) {
        const key = row.ocrState.toLowerCase() as keyof typeof ocr;
        if (key in ocr) ocr[key] += row._count._all;
      }
      const mapped = mappedRollups.find((r) => r.paperArchiveId === paper.id)?._count._all ?? 0;
      return { ...paper, ocr, mappedQuestions: mapped };
    });

    return buildPagination(items, total, { page: params.page, limit: params.limit });
  }

  async getPaper(paperId: string) {
    const paper = await this.prisma.paperArchive.findUnique({
      where: { id: paperId },
      include: {
        pages: {
          select: {
            id: true,
            pageOrder: true,
            imageUrl: true,
            ocrText: true,
            ocrState: true,
            ocrReviewedAt: true,
            _count: { select: { extractedQuestions: true } },
          },
          orderBy: { pageOrder: 'asc' },
        },
      },
    });
    if (!paper) throw new NotFoundException('Paper not found');
    return paper;
  }

  // --------------------------------------------------------------------------
  // Question extraction (SEE scan → OCR → extracted question with provenance)
  // --------------------------------------------------------------------------

  async extractQuestions(paperId: string): Promise<{
    paperId: string;
    created: number;
    updated: number;
  }> {
    const paper = await this.prisma.paperArchive.findUnique({
      where: { id: paperId },
      select: {
        id: true,
        subject: true,
        subjectSlug: true,
        examType: true,
        year: true,
        paperYear: true,
        pages: {
          where: { ocrText: { not: null } },
          orderBy: { pageOrder: 'asc' },
          select: { id: true, pageOrder: true, ocrText: true },
        },
      },
    });
    if (!paper) throw new NotFoundException('Paper not found');

    let created = 0;
    let updated = 0;

    for (const page of paper.pages) {
      const extracted = extractQuestions(page.ocrText ?? '');
      for (let i = 0; i < extracted.length; i++) {
        const q = extracted[i];
        const questionNumber = i + 1;
        const sourceKey = `${page.pageOrder}#${questionNumber}#${hashText(q.text)}`;
        const data: Prisma.ArchiveQuestionUncheckedCreateInput = {
          paperArchiveId: paper.id,
          paperArchivePageId: page.id,
          sourceKey,
          sourceText: tooLong(q.text) ?? q.text,
          sourcePageNumber: page.pageOrder,
          questionNumber,
          marks: q.marks ?? null,
          options: q.options?.length ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
          subject: paper.subject,
          subjectSlug: paper.subjectSlug,
          examType: paper.examType,
          examYear: paper.year,
          paperYear: paper.paperYear,
        };
        const existing = await this.prisma.archiveQuestion.findUnique({
          where: {
            paperArchivePageId_sourceKey: { paperArchivePageId: page.id, sourceKey },
          },
        });
        if (existing) {
          await this.prisma.archiveQuestion.update({
            where: { id: existing.id },
            data: {
              sourceText: tooLong(q.text) ?? q.text,
              options: data.options instanceof Array ? data.options : Prisma.JsonNull,
              marks: q.marks ?? null,
            },
          });
          updated++;
        } else {
          await this.prisma.archiveQuestion.create({ data });
          created++;
        }
      }
    }

    return { paperId: paper.id, created, updated };
  }

  // --------------------------------------------------------------------------
  // Extracted questions: list / detail / curation / mapping / import
  // --------------------------------------------------------------------------

  async listQuestions(params: {
    subject?: string;
    examType?: string;
    paperId?: string;
    year?: number;
    state?: string;
    mappingStatus?: string;
    chapterId?: string;
    topicId?: string;
    imported?: string;
    page: number;
    limit: number;
  }): Promise<Paginated<object>> {
    const where: Prisma.ArchiveQuestionWhereInput = {
      ...(params.subject ? { subject: { contains: params.subject, mode: 'insensitive' } } : {}),
      ...(params.paperId ? { paperArchiveId: params.paperId } : {}),
      ...(params.examType ? { examType: params.examType as Prisma.ArchiveQuestionWhereInput['examType'] } : {}),
      ...(params.year ? { OR: [{ examYear: params.year }, { paperYear: params.year }] } : {}),
      ...(params.state ? { state: params.state as ArchiveQuestionState } : {}),
      ...(params.mappingStatus ? { mappingStatus: params.mappingStatus as MappingStatus } : {}),
      ...(params.chapterId ? { chapterId: params.chapterId } : {}),
      ...(params.topicId ? { topicId: params.topicId } : {}),
      ...(params.imported === 'true'
        ? { importedQuestionId: { not: null } }
        : params.imported === 'false'
          ? { importedQuestionId: null }
          : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.archiveQuestion.count({ where }),
      this.prisma.archiveQuestion.findMany({
        where,
        select: {
          id: true,
          sourceText: true,
          sourcePageNumber: true,
          questionNumber: true,
          marks: true,
          questionType: true,
          options: true,
          subject: true,
          examYear: true,
          paperYear: true,
          state: true,
          mappingStatus: true,
          subjectId: true,
          chapterId: true,
          topicId: true,
          importedQuestionId: true,
          createdAt: true,
          paper: { select: { id: true, title: true, examType: true } },
          page: { select: { id: true, pageOrder: true, imageUrl: true } },
        },
        orderBy: [{ paperYear: 'desc' }, { sourcePageNumber: 'asc' }, { questionNumber: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    return buildPagination(items, total, { page: params.page, limit: params.limit });
  }

  async getQuestion(questionId: string) {
    const question = await this.prisma.archiveQuestion.findUnique({
      where: { id: questionId },
      include: {
        paper: true,
        page: {
          select: { id: true, pageOrder: true, imageUrl: true, ocrState: true },
        },
      },
    });
    if (!question) throw new NotFoundException('Extracted question not found');
    return question;
  }

  async updateQuestion(questionId: string, userId: string, dto: {
    sourceText?: string;
    marks?: number;
    questionType?: QuestionType;
    subjectId?: string;
    chapterId?: string;
    topicId?: string;
    mappingStatus?: MappingStatus;
    state?: ArchiveQuestionState;
    options?: string[];
  }) {
    const question = await this.prisma.archiveQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Extracted question not found');

    let subjectId = dto.subjectId ?? question.subjectId ?? undefined;
    let chapterId = dto.chapterId ?? question.chapterId ?? undefined;
    let topicId = dto.topicId ?? question.topicId ?? undefined;

    if (dto.topicId) {
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
        select: { id: true, chapterId: true },
      });
      if (!topic) throw new BadRequestException('Topic not found');
      if (dto.chapterId && topic.chapterId !== dto.chapterId) {
        throw new BadRequestException('Topic does not belong to the given chapter');
      }
      topicId = topic.id;
      chapterId = topic.chapterId;
    }

    if (dto.chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: dto.chapterId },
        select: { id: true, subjectId: true },
      });
      if (!chapter) throw new BadRequestException('Chapter not found');
      chapterId = chapter.id;
      subjectId = subjectId ?? chapter.subjectId;
    }

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
      if (!subject) throw new BadRequestException('Subject not found');
      if (chapterId) {
        const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
        if (chapter && chapter.subjectId !== dto.subjectId) {
          throw new BadRequestException('Chapter does not belong to the given subject');
        }
      }
      subjectId = dto.subjectId;
    }

    // A human confirming a chapter/topic/subject is an approved mapping unless
    // the reviewer explicitly overrides the mappingStatus.
    const mappingChanged = !!(dto.subjectId || dto.chapterId || dto.topicId);
    const mappingStatus =
      dto.mappingStatus ?? (mappingChanged ? ('APPROVED' as MappingStatus) : question.mappingStatus);

    return this.prisma.archiveQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.sourceText !== undefined ? { sourceText: tooLong(dto.sourceText) ?? dto.sourceText } : {}),
        ...(dto.marks !== undefined ? { marks: dto.marks } : {}),
        ...(dto.questionType !== undefined ? { questionType: dto.questionType } : {}),
        ...(dto.options !== undefined
          ? { options: dto.options as Prisma.InputJsonValue }
          : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        subjectId: subjectId ?? null,
        chapterId: chapterId ?? null,
        topicId: topicId ?? null,
        mappingStatus,
        mappedById: mappingChanged || dto.mappingStatus ? userId : question.mappedById,
        mappedAt: mappingChanged || dto.mappingStatus ? new Date() : question.mappedAt,
      },
    });
  }

  /** Import a mapped, human-verified extracted question into the teacher bank. */
  async importQuestion(questionId: string, userId: string, topicId?: string) {
    const question = await this.prisma.archiveQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Extracted question not found');
    if (question.importedQuestionId) {
      throw new BadRequestException('This question has already been imported into a question bank');
    }

    const targetTopicId = topicId ?? question.topicId;
    if (!targetTopicId) {
      throw new BadRequestException(
        'Map the question to an approved curriculum topic first (set chapter/topic).',
      );
    }

    const topic = await this.prisma.topic.findUnique({ where: { id: targetTopicId } });
    if (!topic) throw new BadRequestException('Mapped topic not found');

    const questionType = inferType(question);
    const marks = question.marks ?? 1;
    const sourceLocator = [
      'SEE',
      question.paperYear ? `(${question.paperYear})` : undefined,
      question.subject,
      question.questionNumber ? `— Q${question.questionNumber}` : undefined,
      `page ${question.sourcePageNumber}`,
    ]
      .filter(Boolean)
      .join(' ');

    const created = await this.prisma.question.create({
      data: {
        topicId: topic.id,
        ownerId: userId,
        questionType,
        content: tooLong(question.sourceText) ?? question.sourceText,
        options:
          questionType === 'MCQ' && Array.isArray(question.options)
            ? (question.options as Prisma.InputJsonValue)
            : undefined,
        correctAnswer: { value: [] as string[] } as Prisma.InputJsonValue,
        difficulty: inferDifficulty(marks),
        marks,
        status: 'DRAFT',
        tags: ['see-archive', question.subject],
        sourceRefs: {
          sourceType: 'PAPER_ARCHIVE',
          archiveId: question.paperArchiveId,
          archivePageId: question.paperArchivePageId,
          sourcePageNumber: question.sourcePageNumber,
          questionNumber: question.questionNumber,
          sourceLocator,
          subject: question.subject,
          examYear: question.examYear,
          paperYear: question.paperYear,
        },
      },
    });

    await this.ensureBankMembership(userId, created.id);

    await this.prisma.archiveQuestion.update({
      where: { id: questionId },
      data: {
        state: 'APPROVED' as ArchiveQuestionState,
        importedById: userId,
        importedQuestionId: created.id,
        importedAt: new Date(),
      },
    });

    return created;
  }

  // --------------------------------------------------------------------------
  // OCR review workflow (scan ⇄ OCR, edit, approve, reject, revisions)
  // --------------------------------------------------------------------------

  async getPage(pageId: string) {
    const page = await this.prisma.paperArchivePage.findUnique({
      where: { id: pageId },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            subject: true,
            subjectSlug: true,
            examType: true,
            year: true,
            paperYear: true,
            imageDir: true,
            processingStatus: true,
          },
        },
        revisions: { orderBy: { version: 'desc' }, take: 20 },
      },
    });
    if (!page) throw new NotFoundException('Paper page not found');
    return page;
  }

  async saveOcr(pageId: string, userId: string, dto: { ocrText: string; reason?: string }) {
    const page = await this.prisma.paperArchivePage.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) throw new NotFoundException('Paper page not found');

    const last = await this.prisma.ocrRevision.findFirst({
      where: { pageId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    const ocrText = tooLong(dto.ocrText) ?? dto.ocrText;

    await this.prisma.$transaction([
      this.prisma.paperArchivePage.update({
        where: { id: pageId },
        data: {
          ocrText,
          ocrState: 'OCR_REVIEW',
          ocrReviewedById: userId,
          ocrReviewedAt: new Date(),
        },
      }),
      this.prisma.ocrRevision.create({
        data: {
          pageId,
          version: nextVersion,
          ocrText,
          editedById: userId,
          editingReason: dto.reason,
          status: 'OCR_REVIEW',
        },
      }),
    ]);

    return this.getPage(pageId);
  }

  async approvePage(pageId: string, userId: string, note?: string) {
    await this.requirePage(pageId);
    return this.prisma.paperArchivePage.update({
      where: { id: pageId },
      data: {
        ocrState: 'OCR_APPROVED',
        ocrReviewedById: userId,
        ocrReviewedAt: new Date(),
        reviewNote: note,
      },
    });
  }

  async rejectPage(pageId: string, userId: string, note: string) {
    await this.requirePage(pageId);
    return this.prisma.paperArchivePage.update({
      where: { id: pageId },
      data: {
        ocrState: 'OCR_REJECTED',
        ocrReviewedById: userId,
        ocrReviewedAt: new Date(),
        reviewNote: note,
      },
    });
  }

  async listRevisions(pageId: string, limit: number) {
    await this.requirePage(pageId);
    return this.prisma.ocrRevision.findMany({
      where: { pageId },
      orderBy: { version: 'desc' },
      take: limit,
    });
  }

  // --------------------------------------------------------------------------
  // Data health + curriculum coverage dashboard
  // --------------------------------------------------------------------------

  async coverage() {
    const [papers, pages, pagesWithOcr, ocrApproved, ocrReview, extracted, mapped, approved] =
      await Promise.all([
        this.prisma.paperArchive.count(),
        this.prisma.paperArchivePage.count(),
        this.prisma.paperArchivePage.count({ where: { ocrText: { not: null } } }),
        this.prisma.paperArchivePage.count({ where: { ocrState: 'OCR_APPROVED' } }),
        this.prisma.paperArchivePage.count({ where: { ocrState: 'OCR_REVIEW' } }),
        this.prisma.archiveQuestion.count(),
        this.prisma.archiveQuestion.count({ where: { mappingStatus: 'APPROVED' as MappingStatus } }),
        this.prisma.archiveQuestion.count({ where: { state: 'APPROVED' as ArchiveQuestionState } }),
      ]);

    const curriculum = await this.prisma.curriculum.findFirst({
      where: { status: 'PUBLISHED' },
      select: { id: true },
    });
    const grade = curriculum
      ? await this.prisma.grade.findFirst({
          where: { curriculumId: curriculum.id, code: '10' },
          select: { id: true, name: true },
        })
      : null;

    const subjects = grade
      ? await this.prisma.subject.findMany({
          where: { gradeId: grade.id },
          select: {
            id: true,
            name: true,
            order: true,
            chapters: {
              select: {
                id: true,
                name: true,
                order: true,
                topics: { select: { id: true, name: true }, orderBy: { order: 'asc' } },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        })
      : [];

    const chapterIds = subjects.flatMap((s) => s.chapters.map((c) => c.id));
    const chapterRollups = chapterIds.length
      ? await this.prisma.archiveQuestion.groupBy({
          by: ['chapterId'],
          where: {
            chapterId: { in: chapterIds },
            mappingStatus: 'APPROVED' as MappingStatus,
          },
          _count: { _all: true },
        })
      : [];
    const chapterCount = new Map(chapterRollups.map((r) => [r.chapterId, r._count._all]));

    const topicRollups = chapterIds.length
      ? await this.prisma.archiveQuestion.groupBy({
          by: ['topicId'],
          where: {
            chapterId: { in: chapterIds },
            mappingStatus: 'APPROVED' as MappingStatus,
          },
          _count: { _all: true },
        })
      : [];
    const topicCount = new Map(topicRollups.map((r) => [r.topicId, r._count._all]));

    const byArchiveSubject = await this.prisma.archiveQuestion.groupBy({
      by: ['subject'],
      _count: { _all: true },
      orderBy: { _count: { subject: 'desc' } },
    });

    const [byMappingStatus, byQuestionState, byExamType, byYear] = await Promise.all([
      this.prisma.archiveQuestion.groupBy({
        by: ['mappingStatus'],
        _count: { _all: true },
      }),
      this.prisma.archiveQuestion.groupBy({
        by: ['state'],
        _count: { _all: true },
      }),
      this.prisma.archiveQuestion.groupBy({
        by: ['examType'],
        _count: { _all: true },
        orderBy: { _count: { examType: 'desc' } },
      }),
      this.prisma.archiveQuestion.groupBy({
        by: ['examYear'],
        _count: { _all: true },
        orderBy: { examYear: 'desc' },
      }),
    ]);

    return {
      dataHealth: {
        papers,
        pages,
        pagesWithOcr,
        ocrApproved,
        ocrInReview: ocrReview,
        ocrPending: pages - pagesWithOcr,
        extractedQuestions: extracted,
        mappedQuestions: mapped,
        unmappedQuestions: extracted - mapped,
        approvedQuestions: approved,
      },
      archiveSubjects: byArchiveSubject.map((r) => ({ subject: r.subject, questions: r._count._all })),
      mappingQueue: {
        byMappingStatus: QUEUE_MAPPING_STATUSES.map((v) => ({
          mappingStatus: v,
          questions: (byMappingStatus as { mappingStatus: MappingStatus; _count: { _all: number } }[]).find(
            (r) => r.mappingStatus === v,
          )?._count?._all ?? 0,
        })),
        byState: QUEUE_QUESTION_STATES.map((v) => ({
          state: v,
          questions: (byQuestionState as { state: ArchiveQuestionState; _count: { _all: number } }[]).find(
            (r) => r.state === v,
          )?._count?._all ?? 0,
        })),
      },
      coverage: {
        totalQuestions: extracted,
        mappedQuestions: mapped,
        unmappedQuestions: extracted - mapped,
        byExamType: (byExamType as { examType: PaperExamType; _count: { _all: number } }[]).map((r) => ({
          examType: r.examType,
          questions: r._count._all,
        })),
        byYear: (byYear as { examYear: number | null; _count: { _all: number } }[]).map((r) => ({
          year: r.examYear,
          questions: r._count._all,
        })),
        gaps: subjects.flatMap((s) =>
          s.chapters
            .filter((c) => (chapterCount.get(c.id) ?? 0) === 0)
            .map((c) => ({ subjectId: s.id, subjectName: s.name, chapterId: c.id, chapterName: c.name })),
        ),
      },
      curriculum: {
        gradeId: grade?.id ?? null,
        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          chapters: s.chapters.map((c) => {
            const mappedQuestions = chapterCount.get(c.id) ?? 0;
            return {
              id: c.id,
              name: c.name,
              order: c.order,
              mappedQuestions,
              mappedPercent: mapped > 0 ? Math.round((mappedQuestions / mapped) * 100) : 0,
              topics: c.topics.map((t) => ({ id: t.id, name: t.name, mapped: topicCount.get(t.id) ?? 0 })),
            };
          }),
        })),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async requirePage(pageId: string) {
    const page = await this.prisma.paperArchivePage.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) throw new NotFoundException('Paper page not found');
    return page;
  }

  private async ensureBankMembership(ownerId: string, questionId: string): Promise<void> {
    const bank = await this.prisma.questionBank.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId },
    });
    const exists = await this.prisma.questionBankItem.findUnique({
      where: { bankId_questionId: { bankId: bank.id, questionId } },
    });
    if (!exists) {
      await this.prisma.questionBankItem.create({
        data: { bankId: bank.id, questionId: questionId },
      });
    }
  }
}