export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  AUTHOR = 'AUTHOR',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

/** Granular permission keys (spec §54). Enforced server-side. */
export type PermissionKey =
  | 'content:create'
  | 'content:update'
  | 'content:publish'
  | 'content:review'
  | 'question:create'
  | 'question:update'
  | 'question:review'
  | 'question_generation:create'
  | 'quiz:create'
  | 'assignment:create'
  | 'exam:create'
  | 'student:read'
  | 'performance:read'
  | 'analytics:read'
  | 'audit:read'
  | 'user:manage'
  | 'curriculum:manage';

export type ContentType = 'NOTE' | 'EXAMPLE' | 'FORMULA' | 'EXERCISE' | 'VIDEO';

export type ContentBlockType =
  | 'heading'
  | 'paragraph'
  | 'formula'
  | 'example'
  | 'list'
  | 'image'
  | 'video'
  | 'important'
  | 'common-mistake';

export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  latex?: string;
  children?: ContentBlock[];
  src?: string;
  alt?: string;
  items?: string[];
}

export type QuestionType =
  | 'MCQ'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'FILL_IN_BLANK'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'NUMERICAL'
  | 'MATCHING'
  | 'ORDERING';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export type Visibility = 'PUBLIC' | 'ORGANIZATION' | 'CLASS' | 'TEACHER_PRIVATE';

export type ContentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type GenerationState = 'QUEUED' | 'PROCESSING' | 'VALIDATING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';

export interface SourceReference {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  contentId?: string;
  contentVersionId?: string;
}

/** Structured AI question output (spec §29). */
export interface GeneratedQuestion {
  questionType: QuestionType;
  question: { content: string };
  options?: string[];
  correctAnswer: string[];
  explanation: string;
  difficulty: QuestionDifficulty;
  marks: number;
  hint?: string;
  sourceReferences: SourceReference[];
}

/** Question-generation configuration a teacher submits (spec §23–24). */
export interface QuestionGenerationConfig {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  chapterIds: string[];
  topicIds: string[];
  count: number;
  totalMarks: number;
  durationMinutes?: number;
  difficultyDistribution: Partial<Record<QuestionDifficulty, number>>;
  questionTypeDistribution: Partial<Record<QuestionType, number>>;
  includeSolutions?: boolean;
  includeExplanations?: boolean;
  includeHints?: boolean;
  randomizationSeed?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: Record<string, unknown> | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Progress record for one topic/content item (spec §13). */
export interface ProgressRecord {
  userId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  contentId?: string;
  completed: boolean;
  completedAt: string | null;
  score?: number | null;
}

export interface Bookmark {
  id: string;
  userId: string;
  contentType: 'NOTE' | 'TOPIC' | 'QUESTION' | 'FORMULA' | 'EXAMPLE';
  contentId: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}