'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GitBranch, ShieldX, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from '@edunexa/ui';
import {
  approveArchivePage,
  fetchArchivePage,
  rejectArchivePage,
  saveOcrText,
} from '@/lib/api';

const STATE_STYLE: Record<string, { label: string; cls: string }> = {
  OCR_APPROVED: { label: 'approved', cls: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-300' },
  OCR_REVIEW: { label: 'review needed', cls: 'border-amber-600/40 text-amber-700 dark:text-amber-300' },
  OCR_COMPLETED: { label: 'unreviewed OCR', cls: 'border-muted-foreground/40 text-muted-foreground' },
  OCR_REJECTED: { label: 'rejected', cls: 'border-destructive/40 text-destructive' },
  PENDING: { label: 'no OCR', cls: 'border-muted-foreground/40 text-muted-foreground' },
};

export default function OcrReviewPage() {
  const params = useParams<{ paperId: string; pageId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paperId, pageId } = params;

  const page = useQuery({
    queryKey: ['archive-page', pageId],
    queryFn: () => fetchArchivePage(pageId),
    enabled: !!pageId,
  });

  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const current = page.data;

  // Seed the textarea from the loaded page (React's derived-state pattern).
  if (current && text === '' && current.ocrText != null) {
    setText(current.ocrText);
  }

  async function save() {
    if (text.trim() === '') {
      setMessage('OCR text cannot be empty.');
      return;
    }
    setBusy('save');
    setMessage(null);
    try {
      const updated = await saveOcrText(pageId, text, reason || undefined);
      setText(updated.ocrText ?? '');
      setReason('');
      await refetch();
      setMessage('Revision saved. Page is now awaiting approval.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy('approve');
    setMessage(null);
    try {
      await approveArchivePage(pageId, note || undefined);
      setNote('');
      await refetch();
      setMessage('Page OCR approved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejectNote.trim()) {
      setMessage('A rejection reason is required.');
      return;
    }
    setBusy('reject');
    setMessage(null);
    try {
      await rejectArchivePage(pageId, rejectNote);
      setRejectNote('');
      await refetch();
      setMessage('Page OCR rejected.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  }

  async function refetch() {
    await queryClient.invalidateQueries({ queryKey: ['archive-page', pageId] });
    await queryClient.invalidateQueries({ queryKey: ['archive-paper', paperId] });
    await queryClient.invalidateQueries({ queryKey: ['archive-coverage'] });
  }

  if (page.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-6 w-64" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    return <p className="text-sm text-muted-foreground">Page not found.</p>;
  }

  const style = STATE_STYLE[current.ocrState] ?? STATE_STYLE.PENDING;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/teacher/archive/${paperId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
          {current.paper.title}
        </Link>
        <h1 className="text-2xl font-bold">Page {current.pageOrder} — OCR review</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{current.paper.subject}</Badge>
          {current.paper.examType ? <Badge variant="outline">{current.paper.examType}</Badge> : null}
          <Badge variant="outline" className={style.cls}>
            {style.label}
          </Badge>
          {current.reviewNote ? (
            <span className="text-muted-foreground">note: {current.reviewNote}</span>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">{message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scanned page</CardTitle>
            <CardDescription>
              The scan is the source of truth — verify the OCR against it before approving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={current.imageUrl}
                alt={`Page ${current.pageOrder} scan`}
                width={800}
                height={1100}
                className="h-auto w-full"
                unoptimized
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OCR text</CardTitle>
            <CardDescription>
              Edit to fix OCR mistakes. Every save creates a versioned revision; approval locks the
              page for extraction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-[22rem] w-full rounded-md border border-input bg-transparent p-3 font-mono text-xs leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Edit reason (optional)</p>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. fixed OCR typos" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Approval note (optional)</p>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. verified against scan" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={save} disabled={busy === 'save'}>
                <GitBranch className="mr-2 h-4 w-4" aria-hidden />
                {busy === 'save' ? 'Saving…' : 'Save revision'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-600/50 text-emerald-700 dark:text-emerald-300"
                onClick={approve}
                disabled={busy === 'approve'}
              >
                <Check className="mr-2 h-4 w-4" aria-hidden />
                Approve
              </Button>
            </div>
            <div className="space-y-1 border-t pt-3">
              <p className="text-sm font-medium">Reject</p>
              <div className="flex gap-2">
                <Input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Required — what is wrong with this OCR?"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={reject}
                  disabled={busy === 'reject'}
                >
                  <ShieldX className="mr-2 h-4 w-4" aria-hidden />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revision history</CardTitle>
          <CardDescription>
            Every correction is stored. Version 1 is the original OCR load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {current.revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revisions yet.</p>
          ) : (
            current.revisions.map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">v{r.version}</Badge>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                  {r.editedById ? <span>· editor {r.editedById}</span> : null}
                  {r.editingReason ? <span>· {r.editingReason}</span> : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                  {r.ocrText.slice(0, 600)}
                  {r.ocrText.length > 600 ? '…' : ''}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/archive/${paperId}`)}>
          Done — back to paper
        </Button>
      </div>
    </div>
  );
}