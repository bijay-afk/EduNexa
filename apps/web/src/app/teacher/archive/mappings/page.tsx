'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Undo2, ListTodo } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@edunexa/ui';
import {
  fetchArchiveCoverage,
  fetchArchiveQuestions,
} from '@/lib/api';
import { ArchiveQuestionRow } from '@/components/teacher/archive-question-row';

const MAPPING_STATUS_FILTER = ['', 'UNMAPPED', 'SUGGESTED', 'APPROVED', 'REJECTED'] as const;
const STATE_FILTER = ['', 'EXTRACTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as const;

export default function MappingQueuePage() {
  const queryClient = useQueryClient();
  const [mappingStatus, setMappingStatus] = useState('UNMAPPED');
  const [state, setState] = useState('');
  const [subject, setSubject] = useState('');
  const [imported, setImported] = useState('');
  const [page, setPage] = useState(1);

  const coverage = useQuery({ queryKey: ['archive-coverage'], queryFn: fetchArchiveCoverage });
  const queue = useQuery({
    queryKey: ['archive-questions', 'queue', mappingStatus, state, subject, imported, page],
    queryFn: () =>
      fetchArchiveQuestions({
        mappingStatus,
        state,
        subject,
        imported,
        page: String(page),
        limit: '50',
      }),
  });

  useEffect(() => setPage(1), [mappingStatus, state, subject, imported]);

  const mq = coverage.data?.mappingQueue;
  const badgeFor = (s: string) =>
    s === 'APPROVED'
      ? 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300'
      : s === 'REJECTED'
        ? 'border-destructive/40 text-destructive'
        : s === 'SUGGESTED'
          ? 'border-sky-600/40 text-sky-700 dark:text-sky-300'
          : 'border-muted-foreground/40 text-muted-foreground';

  const items = queue.data?.items ?? [];
  const total = queue.data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/teacher/archive"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
          Back to archive
        </Link>
        <h1 className="text-2xl font-bold">Mapping queue</h1>
        <p className="text-muted-foreground">
          Work through extracted SEE questions that are still unmapped, uncertain, or rejected. Map
          to a Grade 10 chapter/topic, then import into your question bank.
        </p>
      </div>

      {mq ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mq.byMappingStatus.map((s) => (
            <button
              key={s.mappingStatus}
              type="button"
              onClick={() => setMappingStatus(s.mappingStatus)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                mappingStatus === s.mappingStatus ? 'border-primary/60 bg-primary/5' : 'hover:bg-accent/40'
              }`}
            >
              <p className="flex items-center justify-between text-sm text-muted-foreground">
                {s.mappingStatus.toLowerCase()}
                <Badge variant="outline" className={badgeFor(s.mappingStatus)}>
                  {s.questions}
                </Badge>
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {total} questions match the current filters. Approvals here are counted in the coverage
            dashboard on the archive home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden />
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={mappingStatus}
              onChange={(e) => setMappingStatus(e.target.value)}
            >
              {MAPPING_STATUS_FILTER.map((s) => (
                <option key={s} value={s}>
                  Mapping: {s || 'any'}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {STATE_FILTER.map((s) => (
                <option key={s} value={s}>
                  State: {s || 'any'}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Subject: any</option>
              {(coverage.data?.archiveSubjects ?? []).map((s) => (
                <option key={s.subject} value={s.subject}>
                  {s.subject}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={imported}
              onChange={(e) => setImported(e.target.value)}
            >
              <option value="">Import: any</option>
              <option value="true">Already imported</option>
              <option value="false">Not yet imported</option>
            </select>
          </div>

          {queue.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here — this bucket is empty. Try another filter.
            </p>
          ) : (
            <>
              {items.map((q) => (
                <ArchiveQuestionRow
                  key={q.id}
                  q={q}
                  coverage={coverage.data}
                  showPaper
                  onChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ['archive-questions'] });
                    queryClient.invalidateQueries({ queryKey: ['archive-coverage'] });
                  }}
                />
              ))}
              {queue.data?.meta && page * 50 < queue.data.meta.total ? (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                    Load more ({total - page * 50} remaining)
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}