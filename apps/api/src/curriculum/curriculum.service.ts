import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildPagination, type Paginated } from '../common/utils/pagination';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async listCurriculums() {
    return this.prisma.curriculum.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listGrades(curriculumId: string) {
    return this.prisma.grade.findMany({
      where: { curriculumId },
      select: { id: true, name: true, code: true, order: true },
      orderBy: { order: 'asc' },
    });
  }

  async listSubjects(gradeId: string, page: number, limit: number): Promise<Paginated<object>> {
    const where = { gradeId };
    const [total, rows] = await Promise.all([
      this.prisma.subject.count({ where }),
      this.prisma.subject.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          order: true,
          _count: { select: { chapters: true } },
        },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return buildPagination(rows, total, { page, limit });
  }

  async getSubject(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        code: true,
        order: true,
        grade: { select: { id: true, name: true } },
        chapters: {
          select: { id: true, name: true, order: true, _count: { select: { topics: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async getChapter(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        name: true,
        order: true,
        subject: { select: { id: true, name: true } },
        topics: { select: { id: true, name: true, order: true, summary: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    return chapter;
  }

  async getTopic(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        name: true,
        order: true,
        summary: true,
        chapter: {
          select: { id: true, name: true, subject: { select: { id: true, name: true } } },
        },
      },
    });
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async getTopicContent(topicId: string) {
    return this.prisma.contentItem.findMany({
      where: { topicId, status: 'PUBLISHED' },
      select: { id: true, contentType: true, title: true, order: true, blocks: true },
      orderBy: { order: 'asc' },
    });
  }
}