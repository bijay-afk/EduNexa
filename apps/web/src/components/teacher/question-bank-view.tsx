'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, FlaskConical, Pencil, Search, ShieldAlert, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input } from '@edunexa/ui';
import {
  fetchBankQuestions,
  setQuestionStatus,
  updateQuestion,
  type BankQuestion,
  type QuestionStatus,
} from '../../lib/api';

const STATUS_FILTERS: ('ALL' | QuestionStatus)[] = [
  'ALL',
  'PENDING_REVIEW',
  'IN_REVIEW',
  'DRAFT',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
];

const STATUS_STYLES: Record<QuestionStatus, string> = {
  DRAFT: 'border-muted-foreground/40 text-muted-foreground',
  PENDING_REVIEW: 'border-amber-500/50 text-amber-600',
  IN_REVIEW: 'border-blue-500/50 text-blue-600',
  APPROVED: 'border-emerald-500/60 text-emerald-600',
  REJECTED: 'border-destructive/50 text-destructive',
  ARCHIVED: 'border-muted text-muted-foreground',
};

interface EditState {
  id: string;
  content: string;
  explanation: string;
  marks: number;
  difficulty: BankQuestion['difficulty'];
  questionType: string;
  options: string;
  correctAnswer: string;
  tags: string;
}

export function QuestionBankView() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBankQuestions({
        ...(status !== 'ALL' ? { status } : {}),
        ...(term.trim() ? { q: term.trim() } : {}),
        limit: 100,
      });
      setQuestions(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your question bank');
    } finally {
      setLoading(false);
    }
  }, [status, term]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const act = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      setNotice(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (q: BankQuestion) =>
    setEditing({
      id: q.id,
      content: q.content,
      explanation: q.explanation ?? '',
      marks: q.marks,
      difficulty: q.difficulty,
      questionType: q.questionType,
      options: q.options?.join('\n') ?? '',
      correctAnswer: q.correctAnswer?.join('\n') ?? '',
      tags: q.tags?.join(', ') ?? '',
    });

  const saveEdit = async () => {
    if (!editing) return;
    await act(editing.id, () =>
      updateQuestion(editing.id, {
        question: { content: editing.content },
        explanation: editing.explanation || undefined,
        marks: editing.marks,
        difficulty: editing.difficulty,
        questionType: editing.questionType,
        options: editing.options
          ?.split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
        correctAnswer: editing.correctAnswer
          ?.split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
        tags: editing.tags
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
      'Question saved',
    );
    setEditing(null);
  };

  const approve = (q: BankQuestion) =>
    act(q.id, () => setQuestionStatus(q.id, 'APPROVED'), 'Question approved');
  const reject = (q: BankQuestion) =>
    act(q.id, () => setQuestionStatus(q.id, 'REJECTED', 'Rejected in teacher review'), 'Question rejected');

  const provType = (q: BankQuestion) => q.sourceRefs?.sourceType;

const dupFlagged = (q: BankQuestion): boolean =>
  q.sourceRefs?.validation != null &&
  typeof q.sourceRefs.validation === 'object' &&
  'duplicate' in q.sourceRefs.validation &&
  (q.sourceRefs.validation.duplicate as { found?: boolean } | undefined)?.found === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search content, topics, tags…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                status === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {loading
          ? 'Loading your question bank…'
          : questions.length === 0
            ? 'Your question bank is empty under this filter'
            : `${questions.length} question${questions.length === 1 ? '' : 's'} shown`}
      </p>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No questions here yet. Questions you author or generate will appear for review.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="py-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {q.topic.chapter.subject.name} · {q.topic.chapter.name} · {q.topic.name}
                  </Badge>
                  <Badge variant="outline">{q.questionType}</Badge>
                  <Badge variant="outline">{q.difficulty}</Badge>
                  <Badge variant="outline">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
                  <Badge className={STATUS_STYLES[q.status]}>{q.status.replaceAll('_', ' ')}</Badge>
                  {provType(q) === 'AI_GENERATED' ? (
                    <Badge className="border-purple-500/50 text-purple-600">
                      <FlaskConical className="mr-1 h-3 w-3" aria-hidden /> AI generated
                    </Badge>
                  ) : provType(q) === 'PAPER_ARCHIVE' ? (
                    <Badge variant="outline">From paper archive</Badge>
                  ) : null}
                  {dupFlagged(q) && (
                    <Badge className="border-amber-500/50 text-amber-600">
                      <ShieldAlert className="mr-1 h-3 w-3" aria-hidden /> duplicate flagged
                    </Badge>
                  )}
                  {q.sourceRefs?.generatedAt && (
                    <Badge variant="outline" className="text-xs">
                      {q.sourceRefs.model ?? 'AI'} · {new Date(q.sourceRefs.generatedAt).toLocaleString()}
                    </Badge>
                  )}
                </div>

                {editing?.id === q.id ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      rows={3}
                      value={editing.content}
                      onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-sm">
                        Marks
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                          value={editing.marks}
                          onChange={(e) => setEditing({ ...editing, marks: Number(e.target.value) })}
                        />
                      </label>
                      <label className="text-sm">
                        Difficulty
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                          value={editing.difficulty}
                          onChange={(e) =>
                            setEditing({ ...editing, difficulty: e.target.value as BankQuestion['difficulty'] })
                          }
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        Type
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                          value={editing.questionType}
                          onChange={(e) => setEditing({ ...editing, questionType: e.target.value })}
                        >
                          {['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL', 'MATCHING', 'ORDERING'].map(
                            (t) => (
                              <option key={t} value={t}>
                                {t.replaceAll('_', ' ')}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm">
                      Options (one per line)
                      <textarea
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={3}
                        value={editing.options}
                        onChange={(e) => setEditing({ ...editing, options: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm">
                      Correct answer (one per line)
                      <textarea
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={2}
                        value={editing.correctAnswer}
                        onChange={(e) => setEditing({ ...editing, correctAnswer: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm">
                      Explanation
                      <textarea
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={2}
                        value={editing.explanation}
                        onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                      />
                    </label>
                    <label className="block text-sm">
                      Tags (comma separated)
                      <Input
                        className="mt-1"
                        value={editing.tags}
                        onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveEdit()} disabled={busyId === q.id}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{q.content}</p>
                    {q.explanation && <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {q.status !== 'APPROVED' && q.status !== 'ARCHIVED' && (
                        <Button size="sm" onClick={() => approve(q)} disabled={busyId === q.id}>
                          <Check className="mr-1 h-4 w-4" aria-hidden /> Approve
                        </Button>
                      )}
                      {(q.status === 'PENDING_REVIEW' || q.status === 'IN_REVIEW' || q.status === 'DRAFT') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reject(q)}
                          disabled={busyId === q.id}
                        >
                          <X className="mr-1 h-4 w-4" aria-hidden /> Reject
                        </Button>
                      )}
                      {q.status !== 'APPROVED' && q.status !== 'ARCHIVED' && (
                        <Button size="sm" variant="outline" onClick={() => startEdit(q)}>
                          <Pencil className="mr-1 h-4 w-4" aria-hidden /> Edit
                        </Button>
                      )}
                      {q.sourceRefs?.curriculum && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {q.sourceRefs.curriculum.curriculumName ?? 'NEB Curriculum'} · v{q.versions}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}