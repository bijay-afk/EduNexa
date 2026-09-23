import { z } from 'zod';

const questionTypeSchema = z.enum([
  'MCQ',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'NUMERICAL',
  'MATCHING',
  'ORDERING',
]);

const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const questionSourceSchema = z.enum(['CURRICULUM', 'ASMITA_SET_BOOK', 'PAPER_ARCHIVE']);

/** Which engine actually produces the questions (spec §29, §34). */
export const questionGeneratorSchema = z.enum(['LLM', 'ARCHIVE_EXTRACT']);

/**
 * Teacher question-generation configuration (spec §23–24).
 * Schema validation only; curriculum/source validation happens server-side.
 *
 * Mark allocation is fully flexible: either exact marks are supplied per
 * question (marks), or per question type (marksPerType), or the engine
 * distributes `totalMarks` across `count` questions automatically
 * (autoAllocateMarks).
 */
export const questionGenerationConfigSchema = z.object({
  /**
   * Grounding source. Defaults to the approved NEB curriculum; ASMITA_SET_BOOK
   * grounds on the Asmita Class 10 set-book scaffold; PAPER_ARCHIVE grounds on
   * real scanned SEE question papers (OCR text) filtered by subject + exam type.
   */
  source: questionSourceSchema.default('CURRICULUM'),
  /** Which engine produces questions. ARCHIVE_EXTRACT works with no API key. */
  generator: questionGeneratorSchema.default('ARCHIVE_EXTRACT'),
  curriculumId: z.string().min(1),
  gradeId: z.string().min(1),
  subjectId: z.string().min(1),
  /** Flexible chapters: omit for "whole subject", or list specific ones (CDC codes or ids). */
  chapterIds: z.array(z.string().min(1)).optional(),
  /** Flexible topics: omit for "whole chapters", or list specific ones. */
  topicIds: z.array(z.string().min(1)).optional(),
  setBookId: z.string().min(1).optional(),
  setBookChapterIds: z.array(z.string().min(1)).optional(),
  /** PAPER_ARCHIVE: restrict grounding to papers of this subject name, if given */
  archiveSubject: z.string().min(1).optional(),
  /** PAPER_ARCHIVE: which paper exams to draw questions from. Defaults to all. */
  archiveExamTypes: z.array(z.enum(['PAST', 'GRADE_INCREMENT', 'MODEL', 'PREBOARD'])).optional(),
  /**
   * How many questions to produce. If `marks` / `marksPerType` are absent the
   * engine divides `totalMarks` evenly across this many questions.
   */
  count: z.number().int().min(1).max(300),
  /** Total marks. Ignored when explicit marks/marksPerType are provided. */
  totalMarks: z.number().int().min(1).max(500).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  /** Flexible marks per question (length should equal `count`). */
  marks: z.array(z.number().positive().max(50)).optional(),
  /** Flexible marks per question type (e.g. SHORT_ANSWER: 2). */
  marksPerType: z.record(questionTypeSchema, z.number().positive().max(50)).optional(),
  /** Divide totalMarks across count questions when marks aren't explicit. */
  autoAllocateMarks: z.boolean().default(true),
  /** Pigeons exactly the requested question count regardless of harder availability. */
  preferExactCount: z.boolean().default(true),
  difficultyDistribution: z.record(difficultySchema, z.number().min(0)).optional(),
  questionTypeDistribution: z.record(questionTypeSchema, z.number().min(0)).optional(),
  includeSolutions: z.boolean().default(true),
  includeExplanations: z.boolean().default(true),
  includeHints: z.boolean().default(false),
  randomizationSeed: z.string().optional(),
});

export const createQuestionSchema = z.object({
  questionType: questionTypeSchema,
  question: z.object({ content: z.string().min(1).max(4000) }),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.array(z.string().min(1)).min(1),
  explanation: z.string().max(4000).optional(),
  difficulty: difficultySchema.default('MEDIUM'),
  marks: z.number().positive().max(50).default(1),
  hint: z.string().max(1000).optional(),
  topicId: z.string().min(1),
});

export type QuestionGenerationConfigInput = z.infer<typeof questionGenerationConfigSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;