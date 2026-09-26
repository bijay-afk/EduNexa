export { cn } from '@edunexa/ui';

// Same-origin base: /api/v1/* is proxied server-side by the Next.js rewrite in
// next.config.ts (local dev → localhost:3100, production → the live Render API).
// This avoids CORS entirely and removes the old absolute-URL/localhost fallback
// that broke subjects/content whenever the API moved or the site was deployed.
const API_BASE = '';

const serverApiBase = () =>
  process.env.API_UPSTREAM ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3100');

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'edunexa_token';
const USER_KEY = 'edunexa_user';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Minimal API client using the platform's { data, meta, error } envelope.
 * Throws on network failure or API error so TanStack Query can surface them.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;

  // Relative URLs only work in the browser; on the server (SSR/prerender)
  // resolve an absolute origin instead so fetch() can parse the URL.
  const base = API_BASE || (typeof window === 'undefined' ? serverApiBase() : '');

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${path}`, { ...init, headers });
  } catch (cause) {
    throw new Error(
      `Unable to reach the API at ${base || `${typeof window !== 'undefined' ? window.location.origin : '(server)'}`} — is the API running?`,
      { cause },
    );
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    const err = body?.error as ApiError | undefined;
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

// ----------------------------------------------------------------------------
// Domain row shapes returned by the curriculum API
// ----------------------------------------------------------------------------

export interface CurriculumRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface GradeRow {
  id: string;
  code: string;
  name: string;
  order: number;
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string;
  order: number;
  _count?: { chapters: number };
}

export interface ChapterRow {
  id: string;
  name: string;
  order: number;
  _count?: { topics: number };
}

export interface TopicRow {
  id: string;
  name: string;
  order: number;
  summary?: string | null;
}

export interface SubjectDetail {
  id: string;
  name: string;
  code: string;
  grade: { id: string; name: string };
  chapters: ChapterRow[];
}

export interface ChapterDetail {
  id: string;
  name: string;
  order: number;
  subject: { id: string; name: string };
  topics: TopicRow[];
}

export interface TopicDetail {
  id: string;
  name: string;
  order: number;
  summary?: string | null;
  chapter: { id: string; name: string; subject: { id: string; name: string } };
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'formula' | 'example' | 'list' | 'image' | 'important';
  text?: string;
  latex?: string;
  items?: string[];
  src?: string;
  alt?: string;
  children?: ContentBlock[];
  solution?: string;
}

export interface ContentRow {
  id: string;
  contentType: string;
  title: string;
  order: number;
  blocks: ContentBlock[];
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ----------------------------------------------------------------------------
// SEE archive + OCR review (v0.2 academic trust)
// ----------------------------------------------------------------------------

export type OcrState = 'PENDING' | 'OCR_COMPLETED' | 'OCR_REVIEW' | 'OCR_APPROVED' | 'OCR_REJECTED';
export type MappingStatus = 'UNMAPPED' | 'SUGGESTED' | 'APPROVED' | 'REJECTED';
export type ArchiveQuestionState = 'EXTRACTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
export type ArchiveStatus = 'IMPORTED' | 'METADATA_REVIEW' | 'METADATA_VERIFIED' | 'REJECTED';

export interface PaperRow {
  id: string;
  title: string;
  subject: string;
  subjectSlug: string;
  examType: 'PAST' | 'GRADE_INCREMENT' | 'MODEL' | 'PREBOARD';
  year: number | null;
  paperYear: number | null;
  language: string;
  paperCode: string | null;
  processingStatus: ArchiveStatus;
  verifiedAt: string | null;
  pageCount: number;
  createdAt: string;
  ocr: { approved: number; review: number; completed: number; pending: number; rejected: number };
  mappedQuestions: number;
}

export interface PaperPageRow {
  id: string;
  pageOrder: number;
  imageUrl: string;
  ocrText: string | null;
  ocrState: OcrState;
  ocrReviewedAt: string | null;
  _count?: { extractedQuestions: number };
}

export interface PaperDetail {
  id: string;
  title: string;
  subject: string;
  subjectSlug: string;
  examType: string;
  year: number | null;
  paperYear: number | null;
  imageDir: string;
  language: string;
  paperCode: string | null;
  processingStatus: ArchiveStatus;
  sourceUrl: string;
  verifiedAt: string | null;
  pages: PaperPageRow[];
}

export interface ArchiveQuestionRow {
  id: string;
  sourceText: string;
  sourcePageNumber: number;
  questionNumber: number | null;
  marks: number | null;
  questionType: string | null;
  options: string[] | null;
  subject: string;
  examYear: number | null;
  paperYear: number | null;
  state: ArchiveQuestionState;
  mappingStatus: MappingStatus;
  subjectId: string | null;
  chapterId: string | null;
  topicId: string | null;
  importedQuestionId: string | null;
  createdAt: string;
  paper: { id: string; title: string; examType: string };
  page: { id: string; pageOrder: number; imageUrl: string };
}

export interface OcrRevisionRow {
  id: string;
  version: number;
  ocrText: string;
  editedById: string | null;
  editingReason: string | null;
  status: OcrState;
  createdAt: string;
}

export interface PageDetail {
  id: string;
  pageOrder: number;
  imageUrl: string;
  ocrText: string | null;
  ocrState: OcrState;
  ocrReviewedById: string | null;
  ocrReviewedAt: string | null;
  reviewNote: string | null;
  paper: {
    id: string;
    title: string;
    subject: string;
    examType: string;
    year: number | null;
    paperYear: number | null;
    imageDir: string;
    processingStatus: ArchiveStatus;
  };
  revisions: OcrRevisionRow[];
}

export interface ArchiveCoverage {
  dataHealth: {
    papers: number;
    pages: number;
    pagesWithOcr: number;
    ocrApproved: number;
    ocrInReview: number;
    ocrPending: number;
    extractedQuestions: number;
    mappedQuestions: number;
    unmappedQuestions: number;
    approvedQuestions: number;
  };
  archiveSubjects: { subject: string; questions: number }[];
  mappingQueue: {
    byMappingStatus: { mappingStatus: MappingStatus; questions: number }[];
    byState: { state: ArchiveQuestionState; questions: number }[];
  };
  coverage: {
    totalQuestions: number;
    mappedQuestions: number;
    unmappedQuestions: number;
    byExamType: { examType: string; questions: number }[];
    byYear: { year: number | null; questions: number }[];
    gaps: {
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
    }[];
  };
  curriculum: {
    gradeId: string | null;
    subjects: {
      id: string;
      name: string;
      order: number;
      chapters: {
        id: string;
        name: string;
        order: number;
        mappedQuestions: number;
        mappedPercent: number;
        topics: { id: string; name: string; mapped: number }[];
      }[];
    }[];
  };
}

export interface ExtractResult {
  paperId: string;
  created: number;
  updated: number;
}

export const fetchArchivePapers = (params?: Record<string, string>) =>
  apiRequest<Paginated<PaperRow>>(`/archive/papers${qs(params)}`, {
    token: getSession()?.token,
  });

export const fetchArchivePaper = (paperId: string) =>
  apiRequest<PaperDetail>(`/archive/papers/${paperId}`, { token: getSession()?.token });

export const extractArchiveQuestions = (paperId: string) =>
  apiRequest<ExtractResult>(`/archive/papers/${paperId}/extract`, {
    method: 'POST',
    token: getSession()?.token,
  });

export const fetchArchiveQuestions = (params?: Record<string, string>) =>
  apiRequest<Paginated<ArchiveQuestionRow>>(`/archive/questions${qs(params)}`, {
    token: getSession()?.token,
  });

export const updateArchiveQuestion = (
  id: string,
  body: Record<string, unknown>,
) =>
  apiRequest<ArchiveQuestionRow>(`/archive/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token: getSession()?.token,
  });

export const importArchiveQuestion = (id: string, topicId?: string) =>
  apiRequest<{ id: string }>(`/archive/questions/${id}/import`, {
    method: 'POST',
    body: JSON.stringify({ topicId }),
    token: getSession()?.token,
  });

export const fetchArchivePage = (pageId: string) =>
  apiRequest<PageDetail>(`/archive/pages/${pageId}`, { token: getSession()?.token });

export const saveOcrText = (pageId: string, ocrText: string, reason?: string) =>
  apiRequest<PageDetail>(`/archive/pages/${pageId}/ocr`, {
    method: 'PATCH',
    body: JSON.stringify({ ocrText, reason }),
    token: getSession()?.token,
  });

export const approveArchivePage = (pageId: string, note?: string) =>
  apiRequest<PaperPageRow>(`/archive/pages/${pageId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
    token: getSession()?.token,
  });

export const rejectArchivePage = (pageId: string, note: string) =>
  apiRequest<PaperPageRow>(`/archive/pages/${pageId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
    token: getSession()?.token,
  });

export const fetchArchiveCoverage = () =>
  apiRequest<ArchiveCoverage>('/archive/coverage', { token: getSession()?.token });

function qs(params?: Record<string, string>): string {
  if (!params) return '';
  const search = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
  return search ? `?${search}` : '';
}

// ----------------------------------------------------------------------------
// Teacher question bank + AI generation (trusted content pipeline)
// ----------------------------------------------------------------------------

export type QuestionStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface BankQuestion {
  id: string;
  topicId: string;
  ownerId: string;
  questionType: string;
  content: string;
  options: string[] | null;
  correctAnswer: string[] | null;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  marks: number;
  hint: string | null;
  tags: string[] | null;
  status: QuestionStatus;
  sourceRefs: QuestionSourceRefs | null;
  versions: number;
  createdAt: string;
  updatedAt: string;
  topic: {
    id: string;
    name: string;
    chapter: { id: string; name: string; subject: { id: string; name: string } };
  };
}

export interface QuestionSourceRefs {
  sourceType?: 'PAPER_ARCHIVE' | 'AI_GENERATED';
  archivePaperId?: string;
  archivePageId?: string;
  subject?: string;
  curriculum?: {
    curriculumCode?: string | null;
    curriculumName?: string | null;
    gradeId?: string | null;
    subjectId?: string | null;
    chapterId?: string | null;
    topicId?: string | null;
  };
  aiGenerationItemId?: string;
  generatedAt?: string;
  model?: string;
  validation?: Record<string, unknown>;
  sources?: { title?: string; pageOrder?: number; method?: string; score?: number }[];
  requested?: Record<string, unknown>;
  generated?: Record<string, unknown>;
}

export interface GenerationItemRow {
  id: string;
  questionId: string | null;
  generatedJson: Record<string, unknown> | null;
  validationErrors: unknown;
  retrievedSources: unknown;
  validation: Record<string, unknown> | null;
  state: string;
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface GenerationRow {
  id: string;
  state: string;
  status: 'LLM' | 'ARCHIVE_EXTRACT' | null;
  provider: string | null;
  model: string | null;
  curriculumCode: string | null;
  config: Record<string, unknown> | null;
  resultCount: number;
  error: string | null;
  createdAt: string;
  items: GenerationItemRow[];
}

export const fetchBankQuestions = (params?: { status?: QuestionStatus; q?: string; page?: number; limit?: number }) => {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.q) query.q = params.q;
  if (params?.page) query.page = String(params.page);
  if (params?.limit) query.limit = String(params.limit);
  return apiRequest<Paginated<BankQuestion>>(`/questions/bank${qs(query)}`, {
    token: getSession()?.token,
  });
};

export const fetchQuestion = (questionId: string) =>
  apiRequest<BankQuestion>(`/questions/${questionId}`, { token: getSession()?.token });

export const updateQuestion = (questionId: string, body: Record<string, unknown>) =>
  apiRequest<BankQuestion>(`/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token: getSession()?.token,
  });

export const setQuestionStatus = (
  questionId: string,
  status: QuestionStatus,
  note?: string,
) =>
  apiRequest<BankQuestion>(`/questions/${questionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
    token: getSession()?.token,
  });

export const fetchGenerations = () =>
  apiRequest<GenerationRow[]>(`/question-generation`, { token: getSession()?.token });

export const fetchGeneration = (generationId: string) =>
  apiRequest<GenerationRow>(`/question-generation/${generationId}`, {
    token: getSession()?.token,
  });

// ----------------------------------------------------------------------------
// Curriculum fetchers
// ----------------------------------------------------------------------------

export const fetchCurriculums = () => apiRequest<CurriculumRow[]>('/curriculums');

export const fetchGrades = (curriculumId: string) =>
  apiRequest<GradeRow[]>(`/curriculums/${curriculumId}/grades`);

export const fetchSubjectsByGrade = (gradeId: string) =>
  apiRequest<Paginated<SubjectRow>>(`/grades/${gradeId}/subjects?limit=100`);

export const fetchSubject = (subjectId: string) => apiRequest<SubjectDetail>(`/subjects/${subjectId}`);

export const fetchChapter = (chapterId: string) => apiRequest<ChapterDetail>(`/chapters/${chapterId}`);

export const fetchTopic = (topicId: string) => apiRequest<TopicDetail>(`/topics/${topicId}`);

export const fetchTopicContent = (topicId: string) =>
  apiRequest<ContentRow[]>(`/topics/${topicId}/content`);