'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileScan, ScanText, Undo2 } from 'lucide-react';
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
  extractArchiveQuestions,
  fetchArchiveCoverage,
  fetchArchivePaper,
  fetchArchiveQuestions,
  type ArchiveCoverage,
  type PaperPageRow,
} from '@/lib/api';
import { ArchiveQuestionRow } from '@/components/teacher/archive-question-row';

const OCR_STYLE: Record<string, { label: string; cls: string }> = {
  OCR_APPROVED: { label: 'approved', cls: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300' },
  OCR_REVIEW: { label: 'in review', cls: 'border-amber-600/40 text-amber-700 dark:text-amber-300' },
  OCR_COMPLETED: { label: 'unreviewed', cls: 'border-muted-foreground/40 text-muted-foreground' },
  OCR_REJECTED: { label: 'rejected', cls: 'border-destructive/40 text-destructive' },
  PENDING: { label: 'no OCR', cls: 'border-muted-foreground/40 text-muted-foreground' },
};

function matchSubject(subjectName: string, coverage?: ArchiveCoverage) {
  if (!coverage) return undefined;
  const needle = subjectName.toLowerCase().replace(/\s+/g, ' ');
  return coverage.curriculum.subjects.find(
    (s) =>
      s.name.toLowerCase() === needle ||
      needle.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(needle),
  );
}

export default function ArchivePaperDetail() {
  const params = useParams<{ paperId: string }>();
  const paperId = params.paperId;
  const queryClient = useQueryClient();
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<string | null>(null);

  const paper = useQuery({
    queryKey: ['archive-paper', paperId],
    queryFn: () => fetchArchivePaper(paperId),
    enabled: !!paperId,
  });
  const coverage = useQuery({ queryKey: ['archive-coverage'], queryFn: fetchArchiveCoverage });
  const questions = useQuery({
    queryKey: ['archive-questions', paperId],
    queryFn: () => fetchArchiveQuestions({ paperId, limit: '100' }),
    enabled: !!paperId,
  });

  const matchedSubject = useMemo(
    () => matchSubject(paper.data?.subject ?? '', coverage.data),
    [paper.data?.subject, coverage.data],
  );

  async function runExtraction() {
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await extractArchiveQuestions(paperId);
      setExtractResult(`Extraction complete — ${res.created} new, ${res.updated} refreshed.`);
      await queryClient.invalidateQueries({ queryKey: ['archive-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['archive-paper'] });
      await queryClient.invalidateQueries({ queryKey: ['archive-coverage'] });
    } catch (err) {
      setExtractResult(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  if (paper.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!paper.data) {
    return <p className="text-sm text-muted-foreground">Paper not found.</p>;
  }

  const p = paper.data;

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
        <h1 className="text-2xl font-bold">{p.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{p.examType}</Badge>
          {p.year ? <Badge variant="outline">BS {p.year}</Badge> : null}
          {p.paperYear ? <Badge variant="outline">AD {p.paperYear}</Badge> : null}
          <Badge variant="outline">{p.processingStatus}</Badge>
          <span className="text-muted-foreground">
            {p.pages.length > 0 ? p.pages[0].imageUrl : p.imageDir}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Question extraction</CardTitle>
            <CardDescription>
              Deterministically cut questions from the approved page OCR. Re-running preserves any
              mappings and approval state you already saved.
            </CardDescription>
          </div>
          <Button onClick={runExtraction} disabled={extracting}>
            <ScanText className="mr-2 h-4 w-4" aria-hidden />
            {extracting ? 'Extracting…' : 'Extract questions'}
          </Button>
        </CardHeader>
        {extractResult ? (
          <CardContent className="pt-0">
            <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">{extractResult}</p>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>
            Review each scan against its OCR, correct, and approve. An approved page is the trust
            base for every question extracted from it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.pages.map((page) => (
              <PageCard key={page.id} page={page} paperId={p.id} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted questions</CardTitle>
          <CardDescription>
            Each row traces to a scan page and can be mapped to a Grade 10 chapter/topic and then
            imported into your question bank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (questions.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions extracted yet — run &quot;Extract questions&quot; above.
            </p>
          ) : (
            (questions.data?.items ?? []).map((q) => (
              <ArchiveQuestionRow
                key={q.id}
                q={q}
                coverage={coverage.data}
                matchedSubjectId={matchedSubject?.id}
                onChanged={() => {
                  queryClient.invalidateQueries({ queryKey: ['archive-questions'] });
                  queryClient.invalidateQueries({ queryKey: ['archive-coverage'] });
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageCard({ page, paperId }: { page: PaperPageRow; paperId: string }) {
  const style = OCR_STYLE[page.ocrState] ?? OCR_STYLE.PENDING;
  const extracted = page._count?.extractedQuestions ?? 0;
  return (
    <Link
      href={`/teacher/archive/${paperId}/pages/${page.id}`}
      className="group rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">page {page.pageOrder}</span>
        <Badge variant="outline" className={style.cls}>
          {style.label}
        </Badge>
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <FileScan className="h-3 w-3" aria-hidden />
        {extracted} questions · open review
      </p>
    </Link>
  );
}