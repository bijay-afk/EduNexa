export { cn } from '@class10/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, { ...init, headers });
  } catch (cause) {
    throw new Error(`Unable to reach the API at ${API_BASE} — is the server running?`, { cause });
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