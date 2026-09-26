import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateQuestionDto } from './dto/create-question.dto';

const prismaMock = {
  topic: { findUnique: vi.fn() },
  question: { create: vi.fn(), count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  questionBank: { upsert: vi.fn() },
  questionBankItem: { findUnique: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
};

const service = new QuestionsService(prismaMock as unknown as PrismaService);

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.topic.findUnique.mockResolvedValue({ id: 'topic-1' });
  prismaMock.questionBank.upsert.mockResolvedValue({ id: 'bank-1', ownerId: 'teacher-1' });
  prismaMock.questionBankItem.findUnique.mockResolvedValue(null);
  prismaMock.questionBankItem.create.mockResolvedValue({ id: 'item-1' });
});

const createDto = (): CreateQuestionDto => ({
  topicId: 'topic-1',
  questionType: 'SHORT_ANSWER',
  question: { content: 'abc' },
  correctAnswer: ['abc'],
  explanation: 'because',
  difficulty: 'MEDIUM',
  marks: 1,
});

describe('QuestionsService.create', () => {
  it('persists a DRAFT question and auto-joins the teacher bank', async () => {
    prismaMock.question.create.mockResolvedValue({ id: 'q-1' });

    await service.create('teacher-1', createDto());

    expect(prismaMock.question.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT', ownerId: 'teacher-1' }) }),
    );
    expect(prismaMock.questionBankItem.create).toHaveBeenCalledWith({
      data: { bankId: 'bank-1', questionId: 'q-1' },
    });
  });

  it('throws NotFound when the topic is missing', async () => {
    prismaMock.topic.findUnique.mockResolvedValue(null);
    await expect(service.create('teacher-1', createDto())).rejects.toThrow(NotFoundException);
    expect(prismaMock.question.create).not.toHaveBeenCalled();
  });
});

describe('QuestionsService.listByOwner (bank)', () => {
  it('filters by status and passes the q search over content + tags', async () => {
    prismaMock.question.count.mockResolvedValue(1);
    prismaMock.question.findMany.mockResolvedValue([]);

    await service.listByOwner('teacher-1', { status: 'PENDING_REVIEW', q: 'factor', page: 1, limit: 20 });

    expect(prismaMock.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: 'teacher-1',
          status: 'PENDING_REVIEW',
          OR: [
            { content: { contains: 'factor', mode: 'insensitive' } },
            { tags: { has: 'factor' } },
          ],
        }),
      }),
    );
  });

  it('returns pagination meta', async () => {
    prismaMock.question.count.mockResolvedValue(25);
    prismaMock.question.findMany.mockResolvedValue([]);

    const page = await service.listByOwner('teacher-1', { page: 2, limit: 10 });
    expect(page.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });
});

describe('QuestionsService.getOne', () => {
  it('includes curriculum join for owned question', async () => {
    prismaMock.question.findFirst.mockResolvedValue({ id: 'q-1', topic: {} });
    const q = await service.getOne('teacher-1', 'q-1');
    expect(q.id).toBe('q-1');
    expect(prismaMock.question.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'q-1', ownerId: 'teacher-1' } }),
    );
  });

  it('throws NotFound when not owned', async () => {
    prismaMock.question.findFirst.mockResolvedValue(null);
    await expect(service.getOne('teacher-1', 'q-404')).rejects.toThrow(NotFoundException);
  });
});

describe('QuestionsService.setStatus (review gate)', () => {
  it('approves a PENDING_REVIEW question into APPROVED + audit trail', async () => {
    prismaMock.question.findFirst.mockResolvedValue({ id: 'q-1', status: 'PENDING_REVIEW' });
    prismaMock.question.update.mockResolvedValue({ id: 'q-1', status: 'APPROVED' });

    const updated = await service.setStatus('teacher-1', 'q-1', 'APPROVED', 'looks good');

    expect(updated.status).toBe('APPROVED');
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'teacher-1',
        action: 'question.status_change',
        entityId: 'q-1',
        meta: { from: 'PENDING_REVIEW', to: 'APPROVED', note: 'looks good' },
      }),
    });
    expect(prismaMock.questionBankItem.create).toHaveBeenCalled();
  });

  it('throws NotFound for questions outside the owner bank', async () => {
    prismaMock.question.findFirst.mockResolvedValue(null);
    await expect(service.setStatus('teacher-1', 'q-404', 'REJECTED')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('QuestionsService.update', () => {
  it('blocks edits once APPROVED', async () => {
    prismaMock.question.findFirst.mockResolvedValue({ id: 'q-1', status: 'APPROVED' });
    await expect(service.update('teacher-1', 'q-1', { explanation: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('applies changes, bumps versions, and writes audit', async () => {
    prismaMock.question.findFirst.mockResolvedValue({ id: 'q-1', status: 'DRAFT', versions: 1 });
    prismaMock.question.update.mockResolvedValue({ id: 'q-1', versions: 2 });

    await service.update('teacher-1', 'q-1', { marks: 3, tags: ['factor'] });

    expect(prismaMock.question.update).toHaveBeenCalledWith({
      where: { id: 'q-1' },
      data: expect.objectContaining({ marks: 3, tags: ['factor'], versions: 2 }),
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'question.updated',
        meta: { fromVersion: 1, toVersion: 2 },
      }),
    });
  });
});