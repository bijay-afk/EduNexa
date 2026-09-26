import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma, QuestionStatus } from '@prisma/client';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';

const QUESTION_INCLUDE = {
  topic: { include: { chapter: { include: { subject: true } } } },
} as const;

export interface BankFilters {
  status?: QuestionStatus;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateQuestionDto) {
    const topic = await this.prisma.topic.findUnique({ where: { id: dto.topicId } });
    if (!topic) throw new NotFoundException('Topic not found');

    const question = await this.prisma.question.create({
      data: {
        topicId: dto.topicId,
        ownerId,
        questionType: dto.questionType,
        content: dto.question.content,
        options: dto.options ?? undefined,
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        difficulty: dto.difficulty,
        marks: dto.marks,
        hint: dto.hint,
        status: 'DRAFT',
      },
    });

    // Auto-add to the owner's question bank.
    await this.ensureBankMembership(ownerId, question.id);
    return question;
  }

  async listByTopic(topicId: string, page: number, limit: number) {
    const visibleStatuses: QuestionStatus[] = ['DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED'];
    const where = { topicId, status: { in: visibleStatuses } };
    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        select: {
          id: true,
          questionType: true,
          content: true,
          difficulty: true,
          marks: true,
          status: true,
          tags: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items: questions, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** A teacher's own question bank with curriculum join + provenance (sourceRefs). */
  async listByOwner(ownerId: string, filters: BankFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.QuestionWhereInput = {
      ownerId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q
        ? {
            OR: [
              { content: { contains: filters.q, mode: 'insensitive' } },
              { tags: { has: filters.q } },
            ],
          }
        : {}),
    };
    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        include: QUESTION_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items: questions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(ownerId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ownerId },
      include: QUESTION_INCLUDE,
    });
    if (!question) throw new NotFoundException('Question not found or not owned by you');
    return question;
  }

  async update(ownerId: string, questionId: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ownerId },
    });
    if (!question) throw new NotFoundException('Question not found or not owned by you');
    if (question.status === 'APPROVED' || question.status === 'ARCHIVED') {
      throw new BadRequestException('Approved or archived questions cannot be edited');
    }

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...(dto.questionType !== undefined ? { questionType: dto.questionType } : {}),
        ...(dto.question?.content !== undefined ? { content: dto.question.content } : {}),
        ...(dto.options !== undefined ? { options: dto.options as Prisma.InputJsonValue } : {}),
        ...(dto.correctAnswer !== undefined
          ? { correctAnswer: dto.correctAnswer as Prisma.InputJsonValue }
          : {}),
        ...(dto.explanation !== undefined ? { explanation: dto.explanation } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.marks !== undefined ? { marks: dto.marks } : {}),
        ...(dto.hint !== undefined ? { hint: dto.hint } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        versions: question.versions + 1,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: ownerId,
        action: 'question.updated',
        entityType: 'Question',
        entityId: questionId,
        meta: { fromVersion: question.versions, toVersion: updated.versions },
      },
    });
    return updated;
  }

  async setStatus(
    ownerId: string,
    questionId: string,
    status: QuestionStatus,
    note?: string,
  ) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ownerId },
    });
    if (!question) throw new NotFoundException('Question not found or not owned by you');

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { status },
    });

    if (status === 'APPROVED') {
      await this.ensureBankMembership(ownerId, questionId);
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: ownerId,
        action: 'question.status_change',
        entityType: 'Question',
        entityId: questionId,
        meta: { from: question.status, to: status, note: note ?? null },
      },
    });
    return updated;
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
      await this.prisma.questionBankItem.create({ data: { bankId: bank.id, questionId } });
    }
  }
}