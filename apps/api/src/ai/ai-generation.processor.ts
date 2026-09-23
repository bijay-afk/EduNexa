import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { extractQuestions, type ExtractedQuestion } from './question-extractor';
import type { PaperExamType, Prisma, QuestionType, QuestionDifficulty } from '@prisma/client';

const QUESTION_TYPES: QuestionType[] = [
  'MCQ',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'NUMERICAL',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
];

interface MarksPlan {
  type: QuestionType;
  marks: number;
  difficulty: QuestionDifficulty;
}

interface GenerateConfig {
  archiveSubject?: string;
  archiveExamTypes?: PaperExamType[];
  subjectId?: string;
  chapterIds?: string[];
  topicIds?: string[];
  count: number;
  totalMarks?: number;
  marks?: number[];
  marksPerType?: Partial<Record<QuestionType, number>>;
  autoAllocateMarks?: boolean;
  difficultyDistribution?: Partial<Record<QuestionDifficulty, number>>;
  questionTypeDistribution?: Partial<Record<QuestionType, number>>;
  randomizationSeed?: string;
}

@Injectable()
export class AiGenerationProcessor {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ARCHIVE_EXTRACT mode (works with zero API keys): cut real questions from
   * scanned SEE papers in the database and persist them as drafts. Fully
   * deterministic and grounded strictly in the DB + CDC-based archive.
   */
  async process(generationId: string): Promise<void> {
    const generation = await this.prisma.aiGeneration.findUniqueOrThrow({
      where: { id: generationId },
    });
    const config = generation.config as unknown as GenerateConfig;

    const count = config.count ?? 20;
    const totalMarks = config.totalMarks ?? count;
    if (!config.archiveSubject) {
      throw new Error('ARCHIVE_EXTRACT requires archiveSubject in the generation config');
    }

    // 1. Papers matching the requested subject + exam types.
    const papers = await this.prisma.paperArchive.findMany({
      where: {
        subject: { contains: config.archiveSubject, mode: 'insensitive' },
        ...(config.archiveExamTypes?.length ? { examType: { in: config.archiveExamTypes } } : {}),
      },
      include: { pages: { orderBy: { pageOrder: 'asc' }, where: { ocrText: { not: null } } } },
      orderBy: { paperYear: 'desc' },
      take: 40,
    });

    if (!papers.length) {
      throw new Error(
        `No archived SEE papers match subject "${config.archiveSubject}". Run db:seed:papers first.`,
      );
    }

    // 2. Extract candidate questions from OCR.
    const candidates: { question: ExtractedQuestion; paperId: string; pageId: string }[] = [];
    for (const paper of papers) {
      for (const page of paper.pages) {
        if (!page.ocrText) continue;
        for (const q of extractQuestions(page.ocrText)) {
          candidates.push({ question: q, paperId: paper.id, pageId: page.id });
        }
      }
    }
    if (!candidates.length) {
      throw new Error('No questions could be extracted from the matching paper OCR text.');
    }

    // 3. Build the flexible marks plan.
    const plan = this.buildMarksPlan(config, count, totalMarks);

    // 4. Which topics to attach the drafts to.
    const topicIds = await this.resolveTopicIds(config);

    // 5. Deterministic shuffle so reruns with the same seed are identical.
    const shuffled = this.shuffle(candidates, config.randomizationSeed ?? 'see-archive');

    // 6. Persist drafts.
    let created = 0;
    for (let i = 0; i < plan.length; i++) {
      const target = shuffled[i % shuffled.length];
      const assignment = plan[i];
      const topicId =
        topicIds[i % topicIds.length] ??
        (await this.resolveFallbackTopic(config.subjectId));

      const question = await this.prisma.question.create({
        data: {
          topicId,
          ownerId: generation.teacherId,
          questionType: assignment.type,
          content: target.question.text.slice(0, 4000),
          options: target.question.options?.length ? target.question.options : undefined,
          // OCR extraction can't know the correct answer; reviewer must fill it.
          correctAnswer: [] as Prisma.InputJsonValue,
          difficulty: assignment.difficulty,
          marks: assignment.marks,
          status: 'DRAFT',
          tags: ['see-archive', config.archiveSubject],
          sourceRefs: {
            archivePaperId: target.paperId,
            archivePageId: target.pageId,
            subject: config.archiveSubject,
          },
          generatedById: generation.teacherId,
        },
      });

      await this.prisma.aiGenerationItem.create({
        data: {
          generationId,
          questionId: question.id,
          generatedJson: {
            questionType: assignment.type,
            question: { content: target.question.text.slice(0, 4000) },
            difficulty: assignment.difficulty,
            marks: assignment.marks,
            sourceRefs: {
              archivePaperId: target.paperId,
              archivePageId: target.pageId,
            },
          },
          state: 'COMPLETED',
        },
      });
      created++;
    }

    await this.prisma.aiGeneration.update({
      where: { id: generationId },
      data: { state: 'COMPLETED', resultCount: created, status: 'ARCHIVE_EXTRACT' },
    });
    this.logger.log(`Generation ${generationId}: created ${created} draft questions`);
  }

  private buildMarksPlan(config: GenerateConfig, count: number, totalMarks: number): MarksPlan[] {
    const types = this.expandTypes(config.questionTypeDistribution, count);
    const marks = this.expandMarks(config, count, totalMarks);
    const difficulties = this.expandDifficulties(config.difficultyDistribution, count, marks);

    return Array.from({ length: count }, (_, i) => ({
      type: types[i],
      marks: marks[i],
      difficulty: difficulties[i],
    }));
  }

  private expandTypes(dist: GenerateConfig['questionTypeDistribution'], count: number): QuestionType[] {
    const out: QuestionType[] = [];
    if (dist) {
      const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
      const rows = Object.entries(dist)
        .filter(([k]) => (QUESTION_TYPES as string[]).includes(k))
        .map(([k, v]) => ({ t: k as QuestionType, n: Math.round(((v ?? 0) / total) * count) }));
      for (const { t, n } of rows) for (let i = 0; i < n; i++) out.push(t);
    }
    while (out.length < count) out.push('SHORT_ANSWER');
    return out.slice(0, count);
  }

  private expandMarks(config: GenerateConfig, count: number, totalMarks: number): number[] {
    if (config.marks?.length) {
      const arr = [...config.marks];
      while (arr.length < count) arr.push(arr[arr.length - 1] ?? 1);
      return arr.slice(0, count);
    }
    if (config.marksPerType && Object.keys(config.marksPerType).length) {
      const byType = Object.values(config.marksPerType);
      return Array.from({ length: count }, (_, i) => byType[i % byType.length] ?? 1);
    }
    const base = Math.floor(totalMarks / count);
    const rest = totalMarks % count;
    return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0));
  }

  private expandDifficulties(
    dist: GenerateConfig['difficultyDistribution'],
    count: number,
    marks: number[],
  ): QuestionDifficulty[] {
    const out: QuestionDifficulty[] = [];
    if (dist) {
      const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
      const bucket: QuestionDifficulty[] = [];
      for (const [k, v] of Object.entries(dist)) {
        const d = k as QuestionDifficulty;
        for (let i = 0; i < Math.round(((v ?? 0) / total) * count); i++) bucket.push(d);
      }
      while (bucket.length < count) bucket.push('MEDIUM');
      out.push(...bucket.slice(0, count));
    }
    while (out.length < count) out.push(this.difficultyForMarks(marks[out.length] ?? 1));
    return out;
  }

  private difficultyForMarks(marks: number): QuestionDifficulty {
    if (marks >= 4) return 'HARD';
    if (marks >= 2) return 'MEDIUM';
    return 'EASY';
  }

  private async resolveTopicIds(config: GenerateConfig): Promise<string[]> {
    if (config.topicIds?.length) return config.topicIds;
    if (config.chapterIds?.length) {
      const topics = await this.prisma.topic.findMany({
        where: { chapterId: { in: config.chapterIds } },
        select: { id: true },
      });
      return topics.map((t) => t.id);
    }
    if (config.subjectId) {
      const chapters = await this.prisma.chapter.findMany({
        where: { subjectId: config.subjectId },
        select: { topics: { select: { id: true }, take: 25 } },
        take: 10,
      });
      return chapters.flatMap((c) => c.topics.map((t) => t.id));
    }
    return [];
  }

  private async resolveFallbackTopic(subjectId?: string): Promise<string> {
    if (subjectId) {
      const first = await this.prisma.topic.findFirst({
        where: { chapter: { subjectId } },
        select: { id: true },
      });
      if (first) return first.id;
    }
    const rand = await this.prisma.topic.findFirst({ select: { id: true } });
    if (rand) return rand.id;
    throw new Error('No topic exists to attach generated questions to; seed the curriculum first.');
  }

  private shuffle<T>(input: T[], seed: string): T[] {
    const arr = [...input];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    const rand = () => {
      h = (Math.imul(h, 1664525) + 1013904223) | 0;
      return (h >>> 0) / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}