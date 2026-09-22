import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { QuestionStatus } from '@prisma/client';
import type { CreateQuestionDto } from './dto/create-question.dto';

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
    const visibleStatuses: QuestionStatus[] = ['DRAFT', 'APPROVED'];
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

  async setStatus(questionId: string, ownerId: string, status: 'APPROVED' | 'REJECTED') {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ownerId },
    });
    if (!question) throw new NotFoundException('Question not found or not owned by you');
    return this.prisma.question.update({ where: { id: questionId }, data: { status } });
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