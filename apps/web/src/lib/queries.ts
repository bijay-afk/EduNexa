import { useQuery } from '@tanstack/react-query';
import {
  fetchChapter,
  fetchCurriculums,
  fetchGrades,
  fetchSubject,
  fetchSubjectsByGrade,
  fetchTopic,
  fetchTopicContent,
} from './api';

/**
 * Resolve the seeded Grade-10 id by walking curriculums → grades.
 *
 * Loading and error state is merged across the whole chain so consumers never
 * see a "no data" flash while the curriculum and grade rows are still loading,
 * and a failure in any upstream query surfaces as an error.
 */
export function useGrade10() {
  const curriculums = useQuery({ queryKey: ['curriculums'], queryFn: fetchCurriculums });
  const curriculumId = curriculums.data?.[0]?.id ?? null;

  const grades = useQuery({
    queryKey: ['grades', curriculumId],
    queryFn: () => fetchGrades(curriculumId!),
    enabled: !!curriculumId,
  });

  const grade = grades.data?.find((g) => g.code === '10') ?? grades.data?.[0];

  const isLoading = curriculums.isLoading || grades.isLoading;
  const isError = curriculums.isError || grades.isError;
  const error = curriculums.error ?? grades.error;

  return { grade, isLoading, isError, error };
}

export function useSubjects() {
  const { grade, isLoading: chainLoading, isError: chainError, error: chainErrorValue } = useGrade10();
  const subjects = useQuery({
    queryKey: ['subjects', grade?.id],
    queryFn: () => fetchSubjectsByGrade(grade!.id),
    enabled: !!grade?.id,
  });

  return {
    ...subjects,
    isLoading: subjects.isLoading || chainLoading,
    isError: subjects.isError || chainError,
    error: subjects.error ?? chainErrorValue ?? new Error('Failed to load subjects'),
  };
}

export function useSubject(subjectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => fetchSubject(subjectId),
    enabled: options?.enabled,
  });
}

export function useChapter(chapterId: string) {
  return useQuery({ queryKey: ['chapter', chapterId], queryFn: () => fetchChapter(chapterId) });
}

export function useTopic(topicId: string) {
  return useQuery({ queryKey: ['topic', topicId], queryFn: () => fetchTopic(topicId) });
}

export function useTopicContent(topicId: string) {
  return useQuery({
    queryKey: ['topic-content', topicId],
    queryFn: () => fetchTopicContent(topicId),
  });
}