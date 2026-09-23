'use client';

import { useSubjects } from '@/lib/queries';

/** Live-ish headline numbers; falls back to honest demo counts when the API is down. */
export function HeroStats() {
  const { data, isLoading, isError } = useSubjects();
  const liveCount = data?.items.length;

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="border-t-2 border-primary pt-5">
        <p className="font-display text-5xl font-semibold">{isLoading ? '…' : (liveCount ?? 'sample')}</p>
        <p className="mt-2 text-sm text-muted-foreground">Subjects in the Class 10 curriculum</p>
      </div>
      <div className="border-t-2 border-primary pt-5">
        <p className="font-display text-5xl font-semibold">100%</p>
        <p className="mt-2 text-sm text-muted-foreground">Syllabus-aligned learning content</p>
      </div>
      <div className="border-t-2 border-primary pt-5">
        <p className="font-display text-5xl font-semibold">Free</p>
        <p className="mt-2 text-sm text-muted-foreground">For every Class 10 student</p>
      </div>
      {isError ? (
        <p className="text-xs text-muted-foreground md:col-span-3">
          Sample subject count shown — start the API to see live numbers.
        </p>
      ) : null}
    </div>
  );
}