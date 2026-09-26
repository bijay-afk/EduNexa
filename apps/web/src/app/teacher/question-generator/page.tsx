'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { QuestionType } from '@edunexa/types';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton } from '@edunexa/ui';
import { apiRequest, getSession, fetchChapter, fetchGenerations, type ChapterRow, type GenerationRow, type TopicRow } from '@/lib/api';
import { useGrade10, useSubjects } from '@/lib/queries';

const QUESTION_TYPES: QuestionType[] = [
  'MCQ',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'NUMERICAL',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
];

const EXAM_TYPES = ['PAST', 'GRADE_INCREMENT', 'MODEL', 'PREBOARD'] as const;

type MarksMode = 'auto' | 'per-question' | 'per-type';

interface ArchiveSubject {
  subject: string;
  subjectSlug: string;
  papers: number;
  latestYear: number | null;
}

interface GenerationResult {
  id: string;
  state: string;
  resultCount: number;
  error: string | null;
  items?: { id: string; questionId: string | null; state: string }[];
}

export default function QuestionGeneratorPage() {
  const { curriculumId, grade, isLoading: chainLoading } = useGrade10();
  const { data: subjectsData, isLoading: subjectsLoading } = useSubjects();
  const subjects = subjectsData?.items ?? [];

  const archiveQuery = useQuery({
    queryKey: ['archive-subjects'],
    queryFn: () =>
      apiRequest<ArchiveSubject[]>('/question-generation/archive-subjects', {
        token: getSession()?.token,
      }),
  });
  const archiveSubjects = archiveQuery.data ?? [];

  const [subjectId, setSubjectId] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [archiveSubject, setArchiveSubject] = useState('');
  const [examTypes, setExamTypes] = useState<string[]>(['PAST', 'MODEL', 'PREBOARD']);
  const [types, setTypes] = useState<QuestionType[]>(['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER']);
  const [marksMode, setMarksMode] = useState<MarksMode>('auto');
  const [perQuestionMarks, setPerQuestionMarks] = useState('2,3,4,5');
  const [perTypeMarks, setPerTypeMarks] = useState<Record<string, string>>({ SHORT_ANSWER: '2', LONG_ANSWER: '4', MCQ: '1' });
  const [count, setCount] = useState(20);
  const [totalMarks, setTotalMarks] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [easy, setEasy] = useState(30);
  const [medium, setMedium] = useState(50);
  const [hard, setHard] = useState(20);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const historyQuery = useQuery({
    queryKey: ['generations', historyVersion],
    queryFn: fetchGenerations,
    enabled: !!getSession()?.token,
  });

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId],
  );

  const subjectDetail = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => apiRequest<{ id: string; name: string; chapters: ChapterRow[] }>(`/subjects/${subjectId}`),
    enabled: !!subjectId,
  });
  const chapters = subjectDetail.data?.chapters ?? [];

  // All topics for the selected chapters, fetched in one query keyed on the
  // sorted chapter-id list (hooks stay top-level and stable).
  const chaptersKey = [...selectedChapters].sort().join(',');
  const chaptersDetail = useQuery({
    queryKey: ['chapters-detail', chaptersKey],
    queryFn: () => Promise.all(selectedChapters.map((id) => fetchChapter(id))),
    enabled: selectedChapters.length > 0,
  });

  function topicsForChapter(chapterId: string): TopicRow[] {
    return chaptersDetail.data?.find((d) => d.id === chapterId)?.topics ?? [];
  }

  const listOfTopics = useMemo(
    () =>
      selectedChapters.flatMap((cid) =>
        topicsForChapter(cid).map((t) => ({ ...t, chapterId: cid })),
      ),
    [selectedChapters, chaptersDetail.data],
  );

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function selectChapter(id: string) {
    setSelectedChapters((prev) => {
      const next = toggle(prev, id);
      const removed = prev.find((x) => x !== id && !next.includes(x));
      if (removed) {
        const removedTopicIds = new Set(topicsForChapter(removed).map((t) => t.id));
        setSelectedTopics((topics) => topics.filter((t) => !removedTopicIds.has(t)));
      }
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const session = getSession();
    if (!session?.token) {
      setError('You must be signed in as a teacher to generate questions.');
      setLoading(false);
      return;
    }
    if (!subjectId) {
      setError('Select a subject.');
      setLoading(false);
      return;
    }
    if (!curriculumId || !grade?.id) {
      setError('Curriculum data is still loading.');
      setLoading(false);
      return;
    }
    const diffTotal = easy + medium + hard;
    if (diffTotal !== 100) {
      setError(`Difficulty percentages must add up to 100 (currently ${diffTotal}).`);
      setLoading(false);
      return;
    }

    const marks = marksMode === 'per-question'
      ? perQuestionMarks.split(',').map((m) => Number(m.trim()))
      : undefined;
    if (marksMode === 'per-question' && (!marks || marks.some((m) => !Number.isFinite(m) || m <= 0))) {
      setError('Enter per-question marks as positive comma-separated numbers.');
      setLoading(false);
      return;
    }

    const marksPerType = marksMode === 'per-type'
      ? Object.fromEntries(
          types
            .filter((t) => Number(perTypeMarks[t]) > 0 && Number.isFinite(Number(perTypeMarks[t])))
            .map((t) => [t, Number(perTypeMarks[t])]),
        )
      : undefined;

    const config = {
      curriculumId,
      gradeId: grade.id,
      subjectId,
      chapterIds: selectedChapters.length ? selectedChapters : undefined,
      topicIds: selectedTopics.length ? selectedTopics : undefined,
      archiveSubject: archiveSubject.trim() || subject?.name,
      archiveExamTypes: examTypes.length ? examTypes : undefined,
      count,
      totalMarks,
      durationMinutes,
      marks,
      marksPerType,
      autoAllocateMarks: marksMode === 'auto',
      difficultyDistribution: { EASY: easy / 100, MEDIUM: medium / 100, HARD: hard / 100 },
      questionTypeDistribution: Object.fromEntries(
        QUESTION_TYPES.map((t) => [t, types.includes(t) ? 1 / Math.max(types.length, 1) : 0]),
      ),
      includeSolutions: true,
      includeExplanations: true,
      includeHints: false,
    };

    try {
      const res = await apiRequest<GenerationResult>('/question-generation', {
        method: 'POST',
        body: JSON.stringify(config),
        token: session.token,
      });
      setResult(res);
      setHistoryVersion((v) => v + 1);
      poll(res.id, session.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function poll(generationId: string, token: string) {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts++;
      try {
        const status = await apiRequest<GenerationResult>(
          `/question-generation/${generationId}`,
          { token },
        );
        setResult(status);
        if (status.state === 'COMPLETED' || status.state === 'PARTIAL' || status.state === 'FAILED') {
          window.clearInterval(timer);
        } else if (attempts > 120) {
          window.clearInterval(timer);
        }
      } catch {
        if (attempts > 120) window.clearInterval(timer);
      }
    }, 1500);
  }

  const loadingTree = chainLoading || subjectsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI question generator</h1>
        <p className="text-muted-foreground">
          Generates draft questions by cutting real questions from the SEE paper archive
          (Supabase), grounded strictly in the CDC curriculum — no API key or Redis needed.
          Flexible marks, chapters, subjects, and exam types.
        </p>
      </div>

      {loadingTree ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Select the CDC subject, chapters and topics. The engine pulls matching SEE papers
              from the archive database and extracts real questions from their OCR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Subject (curriculum)">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setSelectedChapters([]);
                    setSelectedTopics([]);
                  }}
                >
                  <option value="">Select a subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s._count?.chapters ?? 0} chapters)
                    </option>
                  ))}
                </select>
              </Field>

              {subjectId && (
                <Field label="Chapters (leave unchecked for the whole subject)">
                  <div className="flex flex-wrap gap-2">
                    {chapters.map((ch) => {
                      const active = selectedChapters.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => selectChapter(ch.id)}
                          className={`rounded-md border px-3 py-1.5 text-sm ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground'
                          }`}
                        >
                          {ch.name}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}

              {selectedChapters.length > 0 && (
                <Field label="Topics (optional; leave unchecked for whole chapters)">
                  {chaptersDetail.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading topics…</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {listOfTopics.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTopics((prev) => toggle(prev, t.id))}
                          className={`rounded-md border px-3 py-1 text-xs ${
                            selectedTopics.includes(t.id)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Paper archive subject (override)">
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={archiveSubject}
                    onChange={(e) => setArchiveSubject(e.target.value)}
                  >
                    <option value="">{subject?.name ?? 'Auto (curriculum subject)'}</option>
                    {archiveSubjects.map((a) => (
                      <option key={a.subjectSlug} value={a.subject}>
                        {a.subject} ({a.papers} papers)
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Exam types</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAM_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setExamTypes((prev) => toggle(prev, t))}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          examTypes.includes(t)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Question types</p>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypes((prev) => toggle(prev, t))}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          types.includes(t)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField label="Question count" value={count} onChange={(v) => setCount(Number(v))} />
                <NumberField label="Total marks" value={totalMarks} onChange={(v) => setTotalMarks(Number(v))} />
                <NumberField label="Duration (min)" value={durationMinutes} onChange={(v) => setDurationMinutes(Number(v))} />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Marks allocation</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['auto', 'Auto (split total marks)'],
                      ['per-question', 'Exact marks per question'],
                      ['per-type', 'Marks per question type'],
                    ] as [MarksMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMarksMode(mode)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        marksMode === mode
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {marksMode === 'per-question' && (
                <NumberField
                  label="Marks per question (comma separated, e.g. 2,3,4,5)"
                  value={perQuestionMarks}
                  onChange={(v) => setPerQuestionMarks(String(v))}
                  text
                />
              )}
              {marksMode === 'per-type' && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {types.map((t) => (
                    <NumberField
                      key={t}
                      label={`${t} marks`}
                      value={perTypeMarks[t] ?? ''}
                      onChange={(v) => setPerTypeMarks((prev) => ({ ...prev, [t]: String(v) }))}
                      text
                    />
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Difficulty distribution (%)</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberField label="Easy %" value={easy} onChange={(v) => setEasy(Number(v))} />
                  <NumberField label="Medium %" value={medium} onChange={(v) => setMedium(Number(v))} />
                  <NumberField label="Hard %" value={hard} onChange={(v) => setHard(Number(v))} />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={loading}>
                {loading ? 'Generating…' : 'Generate draft questions'}
              </Button>

              {result && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                  Generation <code>{result.id}</code> — status{' '}
                  <strong>{result.state}</strong>
                  {result.error ? <span className="text-destructive"> — {result.error}</span> : null}
                  {result.state === 'COMPLETED' ? (
                    <p className="mt-1">
                      {result.resultCount} draft questions created{selectedChapters.length ? ` across the selected chapters` : ''}. Review them, fill in answers, and approve to build your question bank.
                    </p>
                  ) : result.state === 'QUEUED' || result.state === 'PROCESSING' ? (
                    <p className="mt-1 text-muted-foreground">
                      Queued on the AI worker — this usually takes a few minutes on a local
                      Ollama box. This page keeps polling.
                    </p>
                  ) : result.state === 'VALIDATING' ? (
                    <p className="mt-1 text-muted-foreground">
                      Retrieved archive sources — validating the generated questions…
                    </p>
                  ) : result.state === 'PARTIAL' ? (
                    <p className="mt-1">
                      {result.resultCount} draft questions created; some items were rejected
                      during validation. Check the item rows for details.
                    </p>
                  ) : result.state === 'FAILED' ? (
                    <p className="mt-1 text-destructive">
                      Generation failed. Head to the question archive, or retry with fewer
                      questions.
                    </p>
                  ) : null}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
      <GenerationHistory
        rows={historyQuery.data ?? []}
        loading={historyQuery.isLoading}
        onRefresh={() => setHistoryVersion((v) => v + 1)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function stateBadge(rows: GenerationRow[], state: string, index: number) {
  const variant =
    state === 'COMPLETED'
      ? 'default'
      : state === 'FAILED'
        ? 'outline'
        : 'secondary';
  const cls =
    state === 'FAILED'
      ? 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium border-transparent bg-destructive/10 text-destructive'
      : undefined;
  return (
    <Badge key={`${state}-${index}`} variant={variant as 'default' | 'secondary' | 'outline'} className={cls}>
      {state}
    </Badge>
  );
}

function GenerationHistory({
  rows,
  loading,
  onRefresh,
}: {
  rows: GenerationRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Generation history</CardTitle>
          <CardDescription>
            Your recent runs — every run is audited and available in the question bank
            review queue before publishing.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} type="button">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No generations yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {stateBadge(rows, row.state, 0)}
                    <code className="text-xs text-muted-foreground">{row.id.slice(0, 8)}</code>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {row.status === 'LLM' ? 'LLM' : 'Archive extract'}
                    {row.provider ? ` · ${row.provider}` : ''}
                    {row.model ? ` · ${row.model}` : ''}
                    {row.curriculumCode ? ` · ${row.curriculumCode}` : ''}
                    {row.resultCount > 0 ? ` · ${row.resultCount} draft(s)` : ''}
                  </p>
                  {row.error ? (
                    <p className="mt-1 text-xs text-destructive">{row.error}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  text,
}: {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  text?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={text ? 'text' : 'number'}
        min={text ? undefined : 1}
        value={value}
        onChange={(e) => onChange(text ? e.target.value : Number(e.target.value))}
      />
    </div>
  );
}