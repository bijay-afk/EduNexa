import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiQueueService } from './ai-queue.service';
import { questionGenerationConfigSchema, questionSourceSchema } from '@edunexa/validation';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AiQueueService,
  ) {}

  /**
   * Resolve the grounding source server-side (spec §34).
   * - CURRICULUM: the approved NEB Grade 10 curriculum.
   * - ASMITA_SET_BOOK: the Asmita Class 10 "set book" scaffold (seeded under
   *   the ASMITA-SET-10 curriculum) — the loader that feeds the worker every
   *   grounded set-book chapter/topic so questions can be generated from them.
   */
  private async resolveSource(parsed: {
    source: 'CURRICULUM' | 'ASMITA_SET_BOOK';
    curriculumId: string;
    gradeId: string;
    chapterIds: string[];
    topicIds: string[];
  }) {
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
      const topicCount = await this.prisma.topic.count({
        where: { id: { in: parsed.topicIds }, chapter: { subject: { gradeId: parsed.gradeId } } },
      });
      if (topicCount < parsed.topicIds.length) {
        throw new BadRequestException(
          'Some topicIds do not belong to the Asmita Class 10 set book',
        );
      }
      return {
        source: 'ASMITA_SET_BOOK' as const,
        curriculumId: curriculum.id,
        curriculumName: curriculum.name,
        gradeId: parsed.gradeId,
        chapterIds: parsed.chapterIds,
        topicIds: parsed.topicIds,
      };
    }

    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: parsed.curriculumId },
      select: { id: true, name: true },
    });
    if (!curriculum) throw new NotFoundException('Curriculum not found');

    const topicCount = await this.prisma.topic.count({
      where: { id: { in: parsed.topicIds } },
    });
    if (topicCount < parsed.topicIds.length) {
      throw new BadRequestException('Some topicIds do not exist in the curriculum');
    }

    return {
      source: 'CURRICULUM' as const,
      curriculumId: curriculum.id,
      curriculumName: curriculum.name,
      gradeId: parsed.gradeId,
      chapterIds: parsed.chapterIds,
      topicIds: parsed.topicIds,
    };
  }

  /**
   * Enqueue a syllabus-grounded generation job (spec §34).
   * The config is schema-validated here; curriculum/source resolution happens
   * immediately so the queue payload always carries a proven grounding.
   */
  async enqueueGeneration(teacherId: string, config: unknown) {
    const parsed = questionGenerationConfigSchema.parse(config);
    const source = questionSourceSchema.parse(parsed.source ?? 'CURRICULUM');
    const grounding = await this.resolveSource({
      source,
      curriculumId: parsed.curriculumId,
      gradeId: parsed.gradeId,
      chapterIds: parsed.chapterIds,
      topicIds: parsed.topicIds,
    });

    const generation = await this.prisma.aiGeneration.create({
      data: {
        teacherId,
        config: { ...parsed, ...grounding },
        state: 'QUEUED',
      },
    });

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

  async getGeneration(generationId: string): Promise<{
    id: string;
    state: string;
    resultCount: number;
    createdAt: Date;
    error: string | null;
  }> {
    const generation = await this.prisma.aiGeneration.findUnique({
      where: { id: generationId },
      select: { id: true, state: true, resultCount: true, createdAt: true, error: true },
    });
    if (!generation) throw new NotFoundException('Generation not found');
    return generation;
  }
}