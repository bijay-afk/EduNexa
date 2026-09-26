'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Skeleton,
  buttonVariants,
} from '@edunexa/ui';
import {
  fetchArchiveCoverage,
  fetchArchivePapers,
  type PaperRow,
} from '@/lib/api';

const EXAM_TYPES = ['PAST', 'GRADE_INCREMENT', 'MODEL', 'PREBOARD'] as const;
const STATUSES = ['IMPORTED', 'METADATA_REVIEW', 'METADATA_VERIFIED', 'REJECTED'] as const;

const OCR_BADGE: Record<string, { label: string; cls: string }> = {
  approved: { label: 'approved', cls: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300' },
  review: { label: 'in review', cls: 'border-amber-600/40 text-amber-700 dark:text-amber-300' },
  completed: { label: 'unreviewed', cls: 'border-muted-foreground/40 text-muted-foreground' },
  pending: { label: 'no OCR', cls: 'border-muted-foreground/40 text-muted-foreground' },
  rejected: { label: 'rejected', cls: 'border-destructive/40 text-destructive' },
};

const fmt = (v: number) => v.toLocaleString('en-US');

export default function ArchiveHome() {
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [year, setYear] = useState('');

  const coverage = useQuery({ queryKey: ['archive-coverage'], queryFn: fetchArchiveCoverage });
  const papers = useQuery({
    queryKey: ['archive-papers', subject, examType, processingStatus, year],
    queryFn: () =>
      fetchArchivePapers({
        subject,
        examType,
        processingStatus,
        year,
      }),
  });

  const archiveSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const row of (papers.data?.items ?? []).map((p) => p.subject)) set.add(row);
    for (const row of coverage.data?.archiveSubjects ?? []) set.add(row.subject);
    return [...set].sort();
  }, [papers.data, coverage.data]);

  const health = coverage.data?.dataHealth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEE archive</h1>
        <p className="text-muted-foreground">
          Verified scans and OCR for the Grade 10 archive — every extracted question traces back to a
          source page, and human review gates correctness.
        </p>
      </div>

      {!coverage.data ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="SEE papers" value={fmt(health?.papers ?? 0)} />
          <Stat label="Scanned pages" value={fmt(health?.pages ?? 0)} sub={`${fmt(health?.pagesWithOcr ?? 0)} with OCR`} />
          <Stat label="Extracted questions" value={fmt(health?.extractedQuestions ?? 0)} sub={`${fmt(health?.mappedQuestions ?? 0)} mapped`} />
          <Stat label="OCR approved" value={fmt(health?.ocrApproved ?? 0)} sub={`${fmt(health?.ocrInReview ?? 0)} in review · ${fmt(health?.ocrPending ?? 0)} pending`} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Papers</CardTitle>
          <CardDescription>
            Filter the archive and open a paper to review OCR, run extraction, and map questions to the
            curriculum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Subject</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">All subjects</option>
                {archiveSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Exam type</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
              >
                <option value="">All exam types</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Year (BS or AD)</p>
              <Input
                type="number"
                placeholder="e.g. 2082"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Metadata status</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={processingStatus}
                onChange={(e) => setProcessingStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {papers.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (papers.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No papers match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Subject</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Year</th>
                    <th className="pb-2 pr-4 font-medium">OCR</th>
                    <th className="pb-2 pr-4 font-medium">Mapped</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(papers.data?.items ?? []).map((p) => (
                    <PaperRowView key={p.id} paper={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {coverage.data?.mappingQueue ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Mapping queue</CardTitle>
              <CardDescription>
                Extracted questions that still need a human mapping decision.
              </CardDescription>
            </div>
            <Link href="/teacher/archive/mappings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Open queue
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {coverage.data.mappingQueue.byMappingStatus.map((s) => (
                <div key={s.mappingStatus} className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">{s.mappingStatus.toLowerCase()}</p>
                  <p className="mt-1 text-2xl font-bold">{s.questions}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {coverage.data?.curriculum.subjects.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Curriculum coverage</CardTitle>
            <CardDescription>
              Share of human-approved archive mappings landing in each Grade 10 chapter (
              {coverage.data.coverage.mappedQuestions} mapped of {coverage.data.coverage.totalQuestions} extracted).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {coverage.data.curriculum.subjects.map((subject) => (
              <div key={subject.id}>
                <p className="text-sm font-semibold">{subject.name}</p>
                <div className="mt-2 space-y-3">
                  {subject.chapters.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <p className="text-xs font-medium leading-tight">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.mappedQuestions} mapped
                          {c.topics.some((t) => t.mapped > 0)
                            ? ` · top: ${[...c.topics]
                                .sort((a, b) => b.mapped - a.mapped)
                                .slice(0, 2)
                                .map((t) => `${t.name} (${t.mapped})`)
                                .join(', ')}`
                            : ' · no topics yet'}
                        </p>
                      </div>
                      <Progress value={c.mappedPercent} className="h-2 flex-1" />
                      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                        {c.mappedPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {coverage.data.coverage.byYear.length ? (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold">Questions by year & exam type</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coverage.data.coverage.byYear.map((y) => (
                    <Badge key={y.year ?? 'unknown'} variant="outline" className="font-mono text-xs">
                      {y.year ?? 'unknown'}: {y.questions}
                    </Badge>
                  ))}
                  {coverage.data.coverage.byExamType.map((t) => (
                    <Badge key={t.examType} variant="outline" className="font-mono text-xs">
                      {t.examType}: {t.questions}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {coverage.data.coverage.gaps.length ? (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold">Coverage gaps — no questions mapped yet</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {coverage.data.coverage.gaps.map((g) => (
                    <li key={`${g.subjectId}-${g.chapterId}`}>
                      {g.subjectName} · {g.chapterName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function PaperRowView({ paper }: { paper: PaperRow }) {
  const strongest = (['approved', 'review', 'completed', 'rejected', 'pending'] as const).find(
    (k) => ((paper.ocr as Record<string, number>)[k] ?? 0) > 0,
  );
  const badge = strongest ? OCR_BADGE[strongest] : OCR_BADGE.pending;
  return (
    <tr className="border-b hover:bg-accent/40">
      <td className="py-2.5 pr-4">
        <Link
          href={`/teacher/archive/${paper.id}`}
          className="line-clamp-2 font-medium underline-offset-2 hover:underline"
        >
          {paper.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-muted-foreground">{paper.subject}</td>
      <td className="py-2.5 pr-4">
        <Badge variant="outline">{paper.examType}</Badge>
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs">
        {paper.year ?? '—'} {paper.paperYear ? `(${paper.paperYear})` : ''}
      </td>
      <td className="py-2.5 pr-4">
        <Badge variant="outline" className={badge.cls}>
          {badge.label} · {paper.pageCount}p
        </Badge>
      </td>
      <td className="py-2.5 pr-4 font-mono">{paper.mappedQuestions}</td>
      <td className="py-2.5 pr-4">
        <Badge variant="outline">{paper.processingStatus}</Badge>
      </td>
    </tr>
  );
}