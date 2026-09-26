'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@edunexa/ui';
import { FileScan } from 'lucide-react';
import {
  importArchiveQuestion,
  updateArchiveQuestion,
  type ArchiveCoverage,
  type ArchiveQuestionRow as ArchiveQuestionData,
} from '@/lib/api';

const STATE_STYLE: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'approved', cls: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300' },
  IN_REVIEW: { label: 'in review', cls: 'border-amber-600/40 text-amber-700 dark:text-amber-300' },
  EXTRACTED: { label: 'extracted', cls: 'border-muted-foreground/40 text-muted-foreground' },
  REJECTED: { label: 'rejected', cls: 'border-destructive/40 text-destructive' },
};

export function ArchiveQuestionRow({
  q,
  coverage,
  matchedSubjectId,
  showPaper,
  onChanged,
}: {
  q: ArchiveQuestionData;
  coverage?: ArchiveCoverage;
  matchedSubjectId?: string;
  showPaper?: boolean;
  onChanged: () => void;
}) {
  const stateStyle = STATE_STYLE[q.state] ?? STATE_STYLE.EXTRACTED;
  const [subjectId, setSubjectId] = useState<string | undefined>(
    q.subjectId ?? matchedSubjectId ?? undefined,
  );
  const [chapterId, setChapterId] = useState(q.chapterId ?? '');
  const [topicId, setTopicId] = useState(q.topicId ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const subjects = coverage?.curriculum.subjects ?? [];
  const subject = subjects.find((s) => s.id === subjectId);
  const chapters = subject?.chapters ?? [];
  const topics = chapters.find((c) => c.id === chapterId)?.topics ?? [];

  const mapped = q.topicId != null && q.mappingStatus === 'APPROVED';
  const importable = mapped && q.importedQuestionId == null;

  async function saveMapping() {
    if (!chapterId) {
      setMessage('Choose a chapter before saving the mapping.');
      return;
    }
    setBusy('mapping');
    setMessage(null);
    try {
      await updateArchiveQuestion(q.id, {
        subjectId,
        chapterId,
        topicId: topicId || undefined,
        mappingStatus: 'APPROVED',
      });
      setMessage('Mapping approved.');
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Mapping failed');
    } finally {
      setBusy(null);
    }
  }

  async function doImport() {
    setBusy('import');
    setMessage(null);
    try {
      await importArchiveQuestion(q.id);
      setMessage('Imported into your question bank as a draft (teacher review required).');
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className="mr-2 font-mono text-xs text-muted-foreground">Q{q.questionNumber ?? '?'}</span>
          {q.sourceText}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline">{q.questionType ?? 'freeform'}</Badge>
          {q.marks != null ? <Badge variant="outline">{q.marks} marks</Badge> : null}
          <Badge variant="outline" className={stateStyle.cls}>
            {stateStyle.label}
          </Badge>
          {q.importedQuestionId ? (
            <Badge variant="default">in bank</Badge>
          ) : (
            <Badge
              variant="outline"
              className={
                q.mappingStatus === 'APPROVED'
                  ? 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-muted-foreground/40 text-muted-foreground'
              }
            >
              {q.mappingStatus.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-end">
        <p className="flex items-center gap-1 text-muted-foreground">
          <FileScan className="h-3.5 w-3.5" aria-hidden />
          {showPaper ? (
            <>
              <Link
                href={`/teacher/archive/${q.paper.id}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {q.paper.title}
              </Link>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <Link
            href={`/teacher/archive/${q.paper.id}/pages/${q.page.id}`}
            className="underline-offset-2 hover:underline"
          >
            page {q.sourcePageNumber} · {q.subject} {q.examYear ? `(${q.examYear})` : ''}
          </Link>
        </p>

        <div className="flex flex-1 flex-wrap items-end gap-2 sm:justify-end">
          <select
            className="h-9 w-44 rounded-md border border-input bg-transparent px-2 text-sm"
            value={subjectId ?? ''}
            onChange={(e) => {
              setSubjectId(e.target.value || undefined);
              setChapterId('');
              setTopicId('');
            }}
          >
            <option value="">Subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 w-44 rounded-md border border-input bg-transparent px-2 text-sm"
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setTopicId('');
            }}
          >
            <option value="">Chapter…</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 w-44 rounded-md border border-input bg-transparent px-2 text-sm"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">Topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={saveMapping} disabled={busy === 'mapping'}>
            {busy === 'mapping' ? 'Saving…' : mapped ? 'Re-map' : 'Approve mapping'}
          </Button>
          <Button size="sm" onClick={doImport} disabled={!importable || busy === 'import'}>
            {busy === 'import' ? 'Importing…' : q.importedQuestionId ? 'Imported' : 'Import to bank'}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}