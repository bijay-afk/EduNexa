'use client';

import { useSubjects } from '@/lib/queries';

/** Live-ish headline numbers; falls back to honest demo counts when the API is down. */
export function HeroStats() {
  const { data, isLoading, isError } = useSubjects();
  const liveCount = data?.items.length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="text-3xl font-bold">{isLoading ? '…' : (liveCount ?? 'sample')}</p>
        <p className="mt-1 text-sm text-muted-foreground">Subjects in the Class 10 curriculum</p>
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="text-3xl font-bold">100%</p>
        <p className="mt-1 text-sm text-muted-foreground">Syllabus-aligned learning content</p>
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <p className="text-3xl font-bold">Free</p>
        <p className="mt-1 text-sm text-muted-foreground">For every Class 10 student</p>
      </div>
      {isError ? (
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Sample subject count shown — start the API to see live numbers.
        </p>
      ) : null}
    </div>
  );
}