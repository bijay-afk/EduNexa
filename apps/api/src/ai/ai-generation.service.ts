import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RetrievalService, significantTerms, type RetrievedSource } from './retrieval.service';
import { LlmProvider } from './providers/llm-provider';
import { generatedQuestionSchema, type GeneratedQuestionInput } from '@edunexa/validation';
import type { PaperExamType, QuestionDifficulty, QuestionType } from '@prisma/client';

const QUESTION_TYPES: QuestionType[] = [
  'MCQ',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'NUMERICAL',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'what', 'which', 'your', 'are', 'was',
  'has', 'have', 'from', 'into', 'each', 'state', 'give', 'find', 'write',
]);

interface GenerationConfig {
  source?: 'CURRICULUM' | 'ASMITA_SET_BOOK' | 'PAPER_ARCHIVE';
  curriculumId?: string;
  curriculumCode?: string;
  curriculumName?: string;
  gradeId?: string;
  subjectId?: string;
  chapterIds?: string[];
  topicIds?: string[];
  archiveSubject?: string;
  archiveExamTypes?: PaperExamType[];
  count?: number;
  totalMarks?: number;
  marks?: number[];
  marksPerType?: Partial<Record<QuestionType, number>>;
  autoAllocateMarks?: boolean;
  difficultyDistribution?: Partial<Record<QuestionDifficulty, number>>;
  questionTypeDistribution?: Partial<Record<QuestionType, number>>;
  includeSolutions?: boolean;
  includeExplanations?: boolean;
  includeHints?: boolean;
  randomizationSeed?: string;
}

interface ScopeTopic {
  id: string;
  name: string;
  chapterId: string;
  chapterName: string;
}

interface Scope {
  curriculumCode?: string;
  curriculumName?: string;
  gradeId?: string;
  subjectId?: string;
  subjectName: string;
  topics: ScopeTopic[];
}

interface MarksPlan {
  type: QuestionType;
  marks: number;
  difficulty: QuestionDifficulty;
}

/**
 * Trusted LLM question-generation pipeline (Sprint 3, spec §28–§38).
 *
 * LLM output is treated as UNTRUSTED data. Every generated item passes through:
 *   1. Structured-output contract (zod)         -> rejects malformed JSON
 *   2. Curriculum hierarchy validation           -> rejects invalid references,
 *      and authoritative references are attached server-side
 *   3. Answer grounding validation               -> flags answers unsupported by sources
 *   4. Difficulty validation                     -> records requested vs generated
 *   5. Duplicate detection                       -> normalized exact-text match
 *   6. Provenance + audit                        -> sourceRefs, item validation, AuditLog
 * Generated questions enter PENDING_REVIEW (teacher approval gate) — they are
 * never auto-approved.
 */
@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: RetrievalService,
    private readonly llm: LlmProvider,
  ) {}

  async generate(generationId: string): Promise<void> {
    const generation = await this.prisma.aiGeneration.findUniqueOrThrow({
      where: { id: generationId },
    });
    const config = (generation.config ?? {}) as GenerationConfig;
    const count = Math.min(Math.max(config.count ?? 10, 1), 300);

    const scope = await this.resolveScope(config);
    const plan = this.buildPlan(config, count);

    // Source-scoped retrieval: keyword path always works; pgvector path is
    // preferred once embeddings + API quota are available.
    const retrievalQuery = {
      archiveSubject: config.archiveSubject ?? scope.subjectName,
      archiveExamTypes: config.archiveExamTypes,
      keywords: [...scope.topics.map((t) => t.name), scope.subjectName],
    };
    let sources: RetrievedSource[] = await this.retrieval.retrieve({
      ...retrievalQuery,
      limit: 5,
    });
    if (this.llm.isConfigured && scope.topics.length) {
      try {
        const [vector] = await this.llm.embedTexts([retrievalQuery.keywords.join(' ')]);
        sources = await this.retrieval.retrieveByVector(vector, { ...retrievalQuery, limit: 5 });
      } catch (err) {
        this.logger.warn(`Vector retrieval unavailable (${String(err).slice(0, 120)}); using keyword retrieval.`);
      }
    }

    // Grounding phase done: the per-item structured-output/validation phase begins.
    await this.prisma.aiGeneration.update({
      where: { id: generationId },
      data: { state: 'VALIDATING' },
    });

    let created = 0;
    let failed = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    const seenNorm: Map<string, string> = new Map();

    for (let i = 0; i < count; i++) {
      const target = plan[i];
      const topic = scope.topics[i % scope.topics.length];

      if (!topic) break;

      const completion = await this.llm
        .completeJson(this.buildMessages(scope, topic, target, sources))
        .catch((err: unknown) => {
          this.logger.warn(`LLM call failed for item ${i}: ${String(err).slice(0, 120)}`);
          return null;
        });
      if (!completion) {
        failed++;
        await this.prisma.aiGenerationItem.create({
          data: {
            generationId,
            generatedJson: toJson({ error: 'LLM call failed' }),
            validationErrors: toJson(['llm_call_failed']),
            state: 'FAILED',
            promptTokens: 0,
            completionTokens: 0,
          },
        });
        continue;
      }
      const { json, promptTokens: pt, completionTokens: ct } = completion;
      promptTokens += pt;
      completionTokens += ct;

      const parsed = generatedQuestionSchema.safeParse(json);
      if (!parsed.success) {
        failed++;
        await this.prisma.aiGenerationItem.create({
          data: {
            generationId,
            generatedJson: toJson(json),
            validationErrors: parsed.error.flatten() as unknown as Prisma.InputJsonValue,
            retrievedSources: sources as unknown as Prisma.InputJsonValue,
            validation: {
              structured: { ok: false },
              curriculum: { valid: false, reason: 'structured output rejected' },
            },
            state: 'PARTIAL',
            promptTokens: pt,
            completionTokens: ct,
          },
        });
        continue;
      }
      const dto = parsed.data;

      const curriculum = await this.validateCurriculum(dto, scope, topic);
      const answer = await this.validateAnswer(dto, sources);
      const difficulty = this.validateDifficulty(dto, target.difficulty);
      const duplicate = await this.checkDuplicate(dto, topic.id, seenNorm);
      const ok = curriculum.valid;

      if (!ok) {
        failed++;
        await this.prisma.aiGenerationItem.create({
          data: {
            generationId,
            generatedJson: toJson(dto),
            validationErrors: Prisma.DbNull,
            retrievedSources: sources as unknown as Prisma.InputJsonValue,
            validation: { structured: { ok: true }, curriculum, answer, difficulty, duplicate },
            state: 'PARTIAL',
            promptTokens: pt,
            completionTokens: ct,
          },
        });
        continue;
      }

      // Persist the question in the teacher's review queue (PENDING_REVIEW).
      const sourceRefs: Prisma.InputJsonValue = {
        sourceType: 'AI_GENERATED',
        curriculum: {
          curriculumCode: scope.curriculumCode,
          curriculumName: scope.curriculumName,
          gradeId: scope.gradeId,
          subjectId: scope.subjectId ?? undefined,
          chapterId: topic.chapterId,
          topicId: topic.id,
        },
        requested: { type: target.type, marks: target.marks, difficulty: target.difficulty },
        generated: {
          difficulty: dto.difficulty,
          questionType: dto.questionType,
          marks: target.marks,
        },
        validation: {
          structured: { ok: true },
          curriculum,
          answer,
          difficulty,
          duplicate,
        },
        sources: toSources(sources),
        model: this.llm.model,
        generatedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue;

      const question = await this.prisma.question.create({
        data: {
          topicId: topic.id,
          ownerId: generation.teacherId,
          questionType: dto.questionType,
          content: toShort(dto.question.content),
          options: dto.options?.length ? (dto.options as Prisma.InputJsonValue) : undefined,
          correctAnswer: dto.correctAnswer as Prisma.InputJsonValue,
          explanation: dto.explanation ?? undefined,
          hint: dto.hint ?? undefined,
          difficulty: dto.difficulty,
          // Marks allocation is authoritative from the teacher's config/plan.
          marks: target.marks,
          status: 'PENDING_REVIEW',
          tags: ['ai-generated', scope.subjectName],
          sourceRefs,
          generatedById: generation.teacherId,
        },
      });

      await this.ensureBankMembership(generation.teacherId, question.id);

      const item = await this.prisma.aiGenerationItem.create({
        data: {
          generationId,
          questionId: question.id,
          generatedJson: toJson(dto),
          validationErrors: Prisma.DbNull,
          retrievedSources: toSources(sources),
          validation: { structured: { ok: true }, curriculum, answer, difficulty, duplicate },
          state: 'COMPLETED',
          promptTokens: pt,
          completionTokens: ct,
        },
      });

      await this.prisma.question.update({
        where: { id: question.id },
        data: {
          sourceRefs: {
            ...(sourceRefs as Record<string, unknown>),
            aiGenerationItemId: item.id,
          } as Prisma.InputJsonValue,
        },
      });

      seenNorm.set(normalize(dto.question.content), question.id);
      created++;
    }

    const state = failed === 0 ? 'COMPLETED' : created > 0 ? 'PARTIAL' : 'FAILED';
    await this.prisma.aiGeneration.update({
      where: { id: generationId },
      data: {
        state,
        resultCount: created,
        status: 'LLM',
        provider: this.llm.provider,
        model: this.llm.model,
        curriculumCode: scope.curriculumCode,
        usageMeta: {
          promptTokens,
          completionTokens,
          model: this.llm.model,
          sources: toSources(sources),
        },
        // All items failed — surface an actionable cause instead of a silent FAILED.
        ...(state === 'FAILED'
          ? {
              error:
                'No questions could be created this run. Confirm the AI provider/model is running and correct (Ollama: `ollama serve`, then `ollama list`) and that topics are in scope.',
            }
          : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: generation.teacherId,
        action: 'question_generation.completed',
        entityType: 'AiGeneration',
        entityId: generationId,
        meta: { created, failed, state, provider: this.llm.provider, model: this.llm.model },
      },
    });

    this.logger.log(
      `Generation ${generationId}: created=${created} failed=${failed} state=${state}`,
    );
  }

  // --------------------------------------------------------------------------
  // Curriculum scope + prompt
  // --------------------------------------------------------------------------

  private async resolveScope(config: GenerationConfig): Promise<Scope> {
    const topics: ScopeTopic[] = [];

    if (config.topicIds?.length) {
      const rows = await this.prisma.topic.findMany({
        where: { id: { in: config.topicIds } },
        select: {
          id: true,
          name: true,
          chapterId: true,
          chapter: { select: { name: true } },
        },
      });
      for (const t of rows)
        topics.push({ id: t.id, name: t.name, chapterId: t.chapterId, chapterName: t.chapter.name });
    } else if (config.chapterIds?.length) {
      const rows = await this.prisma.chapter.findMany({
        where: { id: { in: config.chapterIds } },
        select: { id: true, name: true, topics: { select: { id: true, name: true } } },
      });
      for (const c of rows)
        for (const t of c.topics)
          topics.push({ id: t.id, name: t.name, chapterId: c.id, chapterName: c.name });
    } else if (config.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: config.subjectId },
        select: {
          id: true,
          name: true,
          gradeId: true,
          chapters: {
            select: { id: true, name: true, topics: { select: { id: true, name: true } } },
            take: 12,
          },
        },
      });
      if (subject) {
        for (const c of subject.chapters)
          for (const t of c.topics)
            topics.push({ id: t.id, name: t.name, chapterId: c.id, chapterName: c.name });
      }
    }

    if (!topics.length) {
      throw new Error('No curriculum topics in scope — seed the curriculum before generating.');
    }

    const subjectName =
      (await this.prisma.subject.findUnique({ where: { id: config.subjectId }, select: { name: true } }))?.name ??
      config.archiveSubject ??
      '';

    return {
      curriculumCode: config.curriculumCode,
      curriculumName: config.curriculumName,
      gradeId: config.gradeId,
      subjectId: config.subjectId,
      subjectName,
      topics,
    };
  }

  private buildMessages(
    scope: Scope,
    topic: ScopeTopic,
    target: MarksPlan,
    sources: RetrievedSource[],
  ) {
    const system = [
      'You are an expert NEB/CDC Class 10 examination question writer.',
      'You generate ONE structured question, strictly grounded in the approved curriculum',
      'topic and the provided SEE archive source excerpts.',
      'You must NOT invent facts, numbers, people, or context that are not present in the',
      'provided sources or implied by the topic name.',
      'Return ONLY a single JSON object (no prose, no markdown fences) with exactly this shape:',
      JSON.stringify({
        questionType: '',
        question: { content: '' },
        options: [],
        correctAnswer: [''],
        explanation: '',
        difficulty: 'EASY|MEDIUM|HARD',
        marks: 1,
        hint: '',
        sourceReferences: [],
      }),
      `questionType must be one of: ${QUESTION_TYPES.join(', ')}.`,
      'For MCQ provide exactly 4 options and correctAnswer as the label array.',
      'For SHORT_ANSWER/LONG_ANSWER/NUMERICAL, correctAnswer is an array with the full expected answer.',
      'explanation must reference the relevant source excerpt.',
      'sourceReferences may be an empty array — the platform verifies and attaches authoritative references.',
    ].join(' ');

    const user = [
      `Subject: ${scope.subjectName}`,
      `Chapter: ${topic.chapterName}`,
      `Topic: ${topic.name}`,
      `Requested: type=${target.type}, marks=${target.marks}, difficulty=${target.difficulty}`,
      '',
      'Approved source excerpts (SEE archive pages):',
      ...sources.map(
        (s, i) =>
          `[${i + 1}] ${s.paperTitle} (${s.subject}, BS ${s.examYear ?? s.paperYear ?? '?'}) page ${s.pageOrder}:\n${s.snippet}`,
      ),
      '',
      'Generate exactly one JSON object now.',
    ].join('\n');

    return [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ];
  }

  // --------------------------------------------------------------------------
  // Validation layer
  // --------------------------------------------------------------------------

  private async validateCurriculum(
    dto: GeneratedQuestionInput,
    scope: Scope,
    topic: ScopeTopic,
  ): Promise<{ valid: boolean; reason?: string }> {
    for (const ref of dto.sourceReferences) {
      if (ref.topicId && ref.topicId !== topic.id) {
        return { valid: false, reason: `topicId ${ref.topicId} does not belong to the requested topic` };
      }
      if (ref.chapterId && ref.chapterId !== topic.chapterId) {
        return { valid: false, reason: `chapterId ${ref.chapterId} does not belong to the requested chapter` };
      }
      if (ref.subjectId && scope.subjectId && ref.subjectId !== scope.subjectId) {
        return { valid: false, reason: `subjectId ${ref.subjectId} does not match the requested subject` };
      }
    }
    return { valid: true };
  }

  private async validateAnswer(
    dto: GeneratedQuestionInput,
    sources: RetrievedSource[],
  ): Promise<{ supported: boolean; coverage: number; grounded: boolean }> {
    const corpus =
      sources.map((s) => s.snippet).join(' ') + dto.explanation + dto.question.content;
    if (!sources.length) return { supported: false, coverage: 0, grounded: false };

    const answerText = [...dto.correctAnswer, dto.explanation].join(' ');
    const terms = significantTerms([answerText]).filter((t) => !STOPWORDS.has(t));
    if (!terms.length) return { supported: true, coverage: 1, grounded: true };

    const lower = corpus.toLowerCase();
    const supported = terms.filter((t) => lower.includes(t)).length;
    const coverage = supported / terms.length;
    return { supported: coverage >= 0.4, coverage, grounded: true };
  }

  private validateDifficulty(
    dto: GeneratedQuestionInput,
    requested: QuestionDifficulty,
  ): {
    requestedDifficulty: QuestionDifficulty;
    generatedDifficulty: QuestionDifficulty;
    result: boolean;
  } {
    return {
      requestedDifficulty: requested,
      generatedDifficulty: dto.difficulty,
      result: requested === dto.difficulty,
    };
  }

  private async checkDuplicate(
    dto: GeneratedQuestionInput,
    topicId: string,
    seenNorm: Map<string, string>,
  ): Promise<{ found: boolean; matchedQuestionId?: string | null }> {
    const norm = normalize(dto.question.content);
    const existingRun = seenNorm.get(norm);
    if (existingRun) return { found: true, matchedQuestionId: existingRun as string | null };

    const candidates = await this.prisma.question.findMany({
      where: {
        topicId,
        status: { in: ['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'DRAFT'] },
      },
      select: { id: true, content: true },
      take: 500,
    });
    const match = candidates.find((c) => normalize(c.content) === norm);
    return match ? { found: true, matchedQuestionId: match.id } : { found: false, matchedQuestionId: null };
  }

  // --------------------------------------------------------------------------
  // Marks plan (authoritative per the teacher's config), reuses ARCHIVE_EXTRACT
  // allocation semantics.
  // --------------------------------------------------------------------------

  private buildPlan(config: GenerationConfig, count: number): MarksPlan[] {
    const types = this.expandTypes(config.questionTypeDistribution, count);
    const marks = this.expandMarks(config, count, config.totalMarks ?? count);
    const difficulties = this.expandDifficulties(config.difficultyDistribution, count, marks);
    return Array.from({ length: count }, (_, i) => ({
      type: types[i],
      marks: marks[i],
      difficulty: difficulties[i],
    }));
  }

  private expandTypes(dist?: GenerationConfig['questionTypeDistribution'], count = 1): QuestionType[] {
    const out: QuestionType[] = [];
    if (dist) {
      const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
      for (const [k, v] of Object.entries(dist)) {
        const type = k as QuestionType;
        if (!QUESTION_TYPES.includes(type)) continue;
        for (let j = 0; j < Math.round(((v ?? 0) / total) * count); j++) out.push(type);
      }
    }
    while (out.length < count) out.push('SHORT_ANSWER');
    return out.slice(0, count);
  }

  private expandMarks(config: GenerationConfig, count = 1, totalMarks = count): number[] {
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
    dist?: GenerationConfig['difficultyDistribution'],
    count = 1,
    marks: number[] = [],
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

  private async ensureBankMembership(teacherId: string, questionId: string): Promise<void> {
    const bank = await this.prisma.questionBank.upsert({
      where: { ownerId: teacherId },
      update: {},
      create: { ownerId: teacherId },
    });
    const exists = await this.prisma.questionBankItem.findUnique({
      where: { bankId_questionId: { bankId: bank.id, questionId } },
    });
    if (!exists) {
      await this.prisma.questionBankItem.create({ data: { bankId: bank.id, questionId } });
    }
  }
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '').trim();
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toShort(text: string): string {
  return text.length > 4000 ? text.slice(0, 4000) : text;
}

function toSources(sources: RetrievedSource[]): Prisma.InputJsonValue {
  return sources.map((s) => ({
    kind: s.kind,
    pageId: s.pageId,
    paperId: s.paperId,
    title: s.paperTitle,
    subject: s.subject,
    paperYear: s.paperYear,
    examYear: s.examYear,
    pageOrder: s.pageOrder,
    imageUrl: s.imageUrl,
    method: s.method,
    score: s.score,
  })) as unknown as Prisma.InputJsonValue;
}