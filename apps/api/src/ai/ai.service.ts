import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiQueueService } from './ai-queue.service';
import { AiGenerationProcessor } from './ai-generation.processor';
import {
  questionGenerationConfigSchema,
  questionSourceSchema,
} from '@edunexa/validation';
import type { PaperExamType } from '@prisma/client';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AiQueueService,
    private readonly processor: AiGenerationProcessor,
  ) {}

  /**
   * Resolve the grounding source server-side (spec §34).
   * - CURRICULUM: the approved NEB Grade 10 curriculum.
   * - ASMITA_SET_BOOK: the Asmita Class 10 "set book" scaffold (seeded under
   *   the ASMITA-SET-10 curriculum) — the loader that feeds the worker every
   *   grounded set-book chapter/topic so questions can be generated from them.
   * - PAPER_ARCHIVE: scanned SEE question papers (OCR text + page images) —
   *   the major source for generation; retrieves OCR'd pages filtered by
   *   subject and optional exam types as grounding context.
   */
  private async resolveSource(parsed: {
    source: 'CURRICULUM' | 'ASMITA_SET_BOOK' | 'PAPER_ARCHIVE';
    curriculumId: string;
    gradeId: string;
    subjectId?: string;
    chapterIds?: string[];
    topicIds?: string[];
    archiveSubject?: string;
    archiveExamTypes?: PaperExamType[];
  }) {
    if (parsed.source === 'PAPER_ARCHIVE') {
      if (!parsed.archiveSubject) {
        throw new BadRequestException(
          'PAPER_ARCHIVE generation requires archiveSubject (e.g. "Mathematics").',
        );
      }
      const archiveCount = await this.prisma.paperArchive.count({
        where: {
          ...(parsed.archiveSubject ? { subject: { contains: parsed.archiveSubject } } : {}),
          ...(parsed.archiveExamTypes?.length
            ? { examType: { in: parsed.archiveExamTypes } }
            : {}),
        },
      });
      if (!archiveCount) {
        throw new BadRequestException(
          'No SEE paper archive records match the given subject/exam-type filters. Run the paper-archive loader (db:seed:papers) first.',
        );
      }
      return {
        source: 'PAPER_ARCHIVE' as const,
        sampledArchiveCount: archiveCount,
        ...(parsed.archiveSubject ? { archiveSubject: parsed.archiveSubject } : {}),
        ...(parsed.archiveExamTypes?.length
          ? { archiveExamTypes: parsed.archiveExamTypes }
          : {}),
      };
    }

    if (parsed.source === 'ASMITA_SET_BOOK') {
      const curriculum = await this.prisma.curriculum.findUnique({
        where: { code: 'ASMITA-SET-10' },
        select: { id: true, name: true },
      });
      if (!curriculum) {
        throw new BadRequestException(
          'Asmita set book is not loaded. Run the set-book loader (db:seed) first.',
        );
      }
      const grade = await this.prisma.grade.findUnique({
        where: { id: parsed.gradeId },
        select: { curriculumId: true },
      });
      if (!grade || grade.curriculumId !== curriculum.id) {
        throw new BadRequestException('gradeId must belong to the Asmita Class 10 set book');
      }
      if (parsed.curriculumId !== curriculum.id) {
        throw new BadRequestException('curriculumId must be the Asmita Class 10 set book');
      }
      const topicCount = parsed.topicIds?.length
        ? await this.prisma.topic.count({
            where: { id: { in: parsed.topicIds }, chapter: { subject: { gradeId: parsed.gradeId } } },
          })
        : 0;
      if (parsed.topicIds?.length && topicCount < parsed.topicIds.length) {
        throw new BadRequestException(
          'Some topicIds do not belong to the Asmita Class 10 set book',
        );
      }
      return {
        source: 'ASMITA_SET_BOOK' as const,
        curriculumId: curriculum.id,
        curriculumName: curriculum.name,
        gradeId: parsed.gradeId,
        chapterIds: parsed.chapterIds ?? [],
        topicIds: parsed.topicIds ?? [],
      };
    }

    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: parsed.curriculumId },
      select: { id: true, name: true },
    });
    if (!curriculum) throw new NotFoundException('Curriculum not found');

    // If the subject belongs to this curriculum, derive the matching archive
    // subject (the engine cuts real SEE questions for it) when the caller
    // opted into ARCHIVE_EXTRACT or asked for a subject but no archive subject.
    const subject = parsed.subjectId
      ? await this.prisma.subject.findUnique({
          where: { id: parsed.subjectId },
          select: { id: true, name: true },
        })
      : null;
    if (parsed.subjectId && !subject) throw new NotFoundException('Subject not found');
    const derivedArchiveSubject = subject ? subject.name : undefined;

    const topicCount = parsed.topicIds?.length
        ? await this.prisma.topic.count({
            where: { id: { in: parsed.topicIds } },
          })
        : 0;
    if (parsed.topicIds?.length && topicCount < parsed.topicIds.length) {
      throw new BadRequestException('Some topicIds do not exist in the curriculum');
    }

    return {
      source: 'CURRICULUM' as const,
      curriculumId: curriculum.id,
      curriculumName: curriculum.name,
      gradeId: parsed.gradeId,
      subjectId: subject?.id,
      chapterIds: parsed.chapterIds ?? [],
      topicIds: parsed.topicIds ?? [],
      archiveSubject: parsed.archiveSubject ?? derivedArchiveSubject,
    };
  }

  /**
   * Enqueue a syllabus-grounded generation job (spec §34).
   * The config is schema-validated here; curriculum/source resolution happens
   * immediately so the queue payload always carries a proven grounding.
   *
   * ARCHIVE_EXTRACT runs synchronously (zero API keys, zero Redis): real
   * questions are cut straight from the paper archive DB and persisted as
   * drafts before the method returns.
   */
  async enqueueGeneration(teacherId: string, config: unknown) {
    const parsed = questionGenerationConfigSchema.parse(config);
    const source = questionSourceSchema.parse(parsed.source ?? 'CURRICULUM');
    const generator = parsed.generator ?? 'ARCHIVE_EXTRACT';
    const grounding = await this.resolveSource({
      source,
      curriculumId: parsed.curriculumId,
      gradeId: parsed.gradeId,
      subjectId: parsed.subjectId,
      chapterIds: parsed.chapterIds,
      topicIds: parsed.topicIds,
      archiveSubject: parsed.archiveSubject,
      archiveExamTypes: parsed.archiveExamTypes,
    });

    const state = generator === 'ARCHIVE_EXTRACT' ? 'PROCESSING' : 'QUEUED';
    const generation = await this.prisma.aiGeneration.create({
      data: {
        teacherId,
        config: { ...parsed, ...grounding, generator },
        state,
      },
    });

    if (generator === 'ARCHIVE_EXTRACT') {
      try {
        await this.processor.process(generation.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        await this.prisma.aiGeneration.update({
          where: { id: generation.id },
          data: { state: 'FAILED', error: message },
        });
        throw new BadRequestException(message);
      }
      return this.prisma.aiGeneration.findUniqueOrThrow({ where: { id: generation.id } });
    }

    const job = await this.queue.queue.add('generate', {
      generationId: generation.id,
      teacherId,
      config: { ...parsed, ...grounding },
    });

    await this.prisma.aiGeneration.update({
      where: { id: generation.id },
      data: { queueJobId: job.id },
    });

    return this.prisma.aiGeneration.findUniqueOrThrow({ where: { id: generation.id } });
  }

  /** Subjects available in the paper archive, for the teacher generator form. */
  async listArchiveSubjects() {
    const rows = await this.prisma.paperArchive.groupBy({
      by: ['subject', 'subjectSlug'],
      _count: { _all: true },
      _max: { paperYear: true },
    });
    return rows
      .map((r) => ({
        subject: r.subject,
        subjectSlug: r.subjectSlug,
        papers: r._count._all,
        latestYear: r._max.paperYear,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }

  /** Papers in the archive, newest first, for the generator form. */
  async listArchivePapers() {
    const rows = await this.prisma.paperArchive.findMany({
      select: {
        id: true,
        title: true,
        subject: true,
        examType: true,
        year: true,
        paperYear: true,
        pageCount: true,
      },
      orderBy: { paperYear: 'desc' },
    });
    return rows;
  }

  async getGeneration(generationId: string): Promise<{
    id: string;
    state: string;
    resultCount: number;
    createdAt: Date;
    error: string | null;
    provider: string | null;
    model: string | null;
    items?: { id: string; questionId: string | null; state: string }[];
  }> {
    const generation = await this.prisma.aiGeneration.findUnique({
      where: { id: generationId },
      select: {
        id: true,
        state: true,
        resultCount: true,
        createdAt: true,
        error: true,
        provider: true,
        model: true,
        items: {
          select: { id: true, questionId: true, state: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!generation) throw new NotFoundException('Generation not found');
    return generation;
  }
}