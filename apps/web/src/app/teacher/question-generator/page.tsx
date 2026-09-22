'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { QuestionType } from '@class10/types';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@class10/ui';
import { apiRequest } from '@/lib/api';

const questionTypes: QuestionType[] = ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL'];

interface GenForm {
  subject: string;
  chapters: string;
  topics: string;
  count: number;
  totalMarks: number;
  durationMinutes: number;
  types: QuestionType[];
  easy: number;
  medium: number;
  hard: number;
}

export default function QuestionGeneratorPage() {
  const [result, setResult] = useState<{ id: string; state: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<GenForm>({
    defaultValues: {
      subject: 'Mathematics',
      chapters: 'Algebra',
      topics: 'Quadratic Equations',
      count: 20,
      totalMarks: 40,
      durationMinutes: 60,
      types: ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER'],
      easy: 30,
      medium: 50,
      hard: 20,
    },
  });
  const types = watch('types');

  async function onSubmit(values: GenForm) {
    setLoading(true);
    setError(null);
    const diffTotal = values.easy + values.medium + values.hard;
    if (diffTotal !== 100) {
      setError(`Difficulty percentages must add up to 100 (currently ${diffTotal}).`);
      setLoading(false);
      return;
    }
    const config = {
      curriculumId: 'NEP-GRADE10',
      gradeId: 'grade-10',
      subjectId: values.subject.toLowerCase(),
      chapterIds: [values.chapters],
      topicIds: [values.topics],
      count: values.count,
      totalMarks: values.totalMarks,
      durationMinutes: values.durationMinutes,
      difficultyDistribution: {
        EASY: values.easy / 100,
        MEDIUM: values.medium / 100,
        HARD: values.hard / 100,
      },
      questionTypeDistribution: Object.fromEntries(
        questionTypes.map((t) => [t, types.includes(t) ? 1 / Math.max(types.length, 1) : 0]),
      ),
      includeSolutions: true,
      includeExplanations: true,
      includeHints: false,
    };

    const token = typeof window !== 'undefined' ? localStorage.getItem('class10_token') : null;
    try {
      const res = await apiRequest<{ id: string; state: string }>('/question-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        token: token ?? undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function toggleType(t: QuestionType) {
    setValue(
      'types',
      types.includes(t) ? types.filter((x) => x !== t) : [...types, t],
      { shouldValidate: true },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">AI question generator</h1>
        <p className="text-muted-foreground">
          Syllabus-grounded generation: select chapters and topics, configure the mix, then review and
          approve drafts into your question bank.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Spec §23–24 — chapters, topics, types, difficulty, marks</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Grid2>
              <Field label="Subject" {...register('subject')} />
              <Field label="Chapters" {...register('chapters')} />
              <Field label="Topics" {...register('topics')} />
            </Grid2>
            <Grid3>
              <NumberField label="Questions" type="number" {...register('count', { valueAsNumber: true })} />
              <NumberField label="Total marks" type="number" {...register('totalMarks', { valueAsNumber: true })} />
              <NumberField label="Duration (min)" type="number" {...register('durationMinutes', { valueAsNumber: true })} />
            </Grid3>

            <div>
              <p className="mb-2 text-sm font-medium">Question types</p>
              <div className="flex flex-wrap gap-2">
                {questionTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
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

            <div>
              <p className="mb-2 text-sm font-medium">Difficulty distribution (%)</p>
              <Grid3>
                <NumberField label="Easy %" type="number" {...register('easy', { valueAsNumber: true })} />
                <NumberField label="Medium %" type="number" {...register('medium', { valueAsNumber: true })} />
                <NumberField label="Hard %" type="number" {...register('hard', { valueAsNumber: true })} />
              </Grid3>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Enqueuing…' : 'Generate draft questions'}
            </Button>

            {result && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                Generation <code>{result.id}</code> — status{' '}
                <strong>{result.state}</strong>. The worker (Phase 5) runs retrieval, generation,
                validation, and de-duplication before drafts appear for review.
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input {...props} />
    </div>
  );
}

function NumberField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input {...props} />
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>;
}