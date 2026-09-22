import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiQueueService } from './ai-queue.service';
import { questionGenerationConfigSchema } from '@edunexa/validation';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AiQueueService,
  ) {}

  /**
   * Enqueue a syllabus-grounded generation job (spec §34).
   * The config is schema-validated here; curriculum/source resolution and
   * retrieval happen in the worker (Phase 5).
   */
  async enqueueGeneration(teacherId: string, config: unknown) {
    const parsed = questionGenerationConfigSchema.parse(config);

    const generation = await this.prisma.aiGeneration.create({
      data: {
        teacherId,
        config: parsed,
        state: 'QUEUED',
      },
    });

    const job = await this.queue.queue.add('generate', {
      generationId: generation.id,
      teacherId,
      config: parsed,
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