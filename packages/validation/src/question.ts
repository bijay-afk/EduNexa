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

export const questionSourceSchema = z.enum(['CURRICULUM', 'ASMITA_SET_BOOK']);

/**
 * Teacher question-generation configuration (spec §23–24).
 * Schema validation only; curriculum/source validation happens server-side.
 */
export const questionGenerationConfigSchema = z.object({
  /**
   * Grounding source. Defaults to the approved curriculum; ASMITA_SET_BOOK
   * grounds generation on an Asmita Class 10 set-book scaffold (imported via
   * the set-book loader when its source content is available).
   */
  source: questionSourceSchema.default('CURRICULUM'),
  curriculumId: z.string().min(1),
  gradeId: z.string().min(1),
  subjectId: z.string().min(1),
  chapterIds: z.array(z.string().min(1)).min(1),
  topicIds: z.array(z.string().min(1)).min(1),
  setBookId: z.string().min(1).optional(),
  setBookChapterIds: z.array(z.string().min(1)).optional(),
  count: z.number().int().min(1).max(200),
  totalMarks: z.number().int().min(1).max(300),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  difficultyDistribution: z.record(difficultySchema, z.number().min(0)),
  questionTypeDistribution: z.record(questionTypeSchema, z.number().min(0)),
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