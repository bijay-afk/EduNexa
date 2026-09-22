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

/** Resolve the seeded Grade-10 id by walking curriculums → grades. */
export function useGrade10() {
  const curriculums = useQuery({ queryKey: ['curriculums'], queryFn: fetchCurriculums });
  const curriculumId = curriculums.data?.[0]?.id ?? null;

  const grades = useQuery({
    queryKey: ['grades', curriculumId],
    queryFn: () => fetchGrades(curriculumId!),
    enabled: !!curriculumId,
  });

  const grade = grades.data?.find((g) => g.code === '10') ?? grades.data?.[0];
  return { grade, ...grades };
}

export function useSubjects() {
  const { grade } = useGrade10();
  return useQuery({
    queryKey: ['subjects', grade?.id],
    queryFn: () => fetchSubjectsByGrade(grade!.id),
    enabled: !!grade?.id,
  });
}

export function useSubject(subjectId: string) {
  return useQuery({ queryKey: ['subject', subjectId], queryFn: () => fetchSubject(subjectId) });
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